// src/state/store.ts

export type SessionType = 'Perna' | 'Puxadas' | 'Empurradas';
export type SetKind = 'warmup' | 'work';

export type ExerciseStatus = 'pending' | 'done';

export type SetEntry = {
  id: string;
  kind: SetKind;
  weight?: number;
  reps?: number;
  rir?: number; // RIR é natural; pode ficar vazio
};

export type ExerciseEntry = {
  id: string;
  name: string;
  status: ExerciseStatus; // 'done' => concluído/salvo
  sets: SetEntry[];
};

export type AbMode = 'time' | 'weight_reps' | 'reps';

export type AbEntry = {
  id: string;
  name: string;
  mode: AbMode;
};

export type Routine = {
  id: string;
  name: string;
  isArchived: boolean;
  createdAt: string;
};

export type SessionMeta = {
  startedAt?: string; // ISO
  endedAt?: string; // ISO
  durationSec?: number;
  gym?: string; // unidade/filial
};

export type Session = {
  routineId: string;
  exercises: ExerciseEntry[];
  archivedExercises: ExerciseEntry[]; // “deletados” (para re-adicionar depois)
  abs: AbEntry[];
  showAbs: boolean;
  hipMobilityDone: boolean;
  meta: SessionMeta;
};

export const store: {
  routinesById: Record<string, Routine>;
  routineOrder: string[];
  sessionsByRoutineId: Record<string, Session>;
} = {
  routinesById: {},
  routineOrder: [],
  sessionsByRoutineId: {},
};

export function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

/**
 * MVP: persistência ainda não ativa.
 * Mantemos API para depois plugar storage real.
 */
export async function hydrateStore() {
  // seed inicial
  if (store.routineOrder.length === 0) {
    const r1 = seedRoutine('Perna');
    const r2 = seedRoutine('Puxadas');
    const r3 = seedRoutine('Empurradas');
    store.routineOrder.push(r1.id, r2.id, r3.id);
  }
}

export function scheduleSave() {
  // no-op por enquanto
}

function seedRoutine(name: string) {
  const id = uid('routine');
  const r: Routine = {
    id,
    name,
    isArchived: false,
    createdAt: new Date().toISOString(),
  };
  store.routinesById[id] = r;
  return r;
}

export function listActiveRoutines() {
  return store.routineOrder
    .map((id) => store.routinesById[id])
    .filter((r) => r && !r.isArchived);
}

export function listArchivedRoutines() {
  return store.routineOrder
    .map((id) => store.routinesById[id])
    .filter((r) => r && r.isArchived);
}

export function addRoutine(nameDraft: string) {
  const name = nameDraft.trim() || 'Nova rotina';
  const r = seedRoutine(name);
  store.routineOrder.unshift(r.id);
  return r;
}

export function archiveRoutine(routineId: string) {
  const r = store.routinesById[routineId];
  if (!r) return;
  r.isArchived = true;
}

export function unarchiveRoutine(routineId: string) {
  const r = store.routinesById[routineId];
  if (!r) return;
  r.isArchived = false;
}

export function getRoutineName(routineId: string) {
  return store.routinesById[routineId]?.name ?? 'Rotina';
}

function presetExercisesForRoutineName(name: string): string[] {
  // compat: nomes clássicos
  const presets: Record<string, string[]> = {
    Perna: ['Leg Press', 'Mesa Flexora', 'Panturrilha Máquina'],
    Puxadas: ['Puxada na Barra', 'Remada Máquina'],
    Empurradas: [],
  };
  return presets[name] ?? [];
}

function defaultWorkSets(count: number) {
  const sets: SetEntry[] = [];
  for (let i = 0; i < count; i++) {
    sets.push({
      id: uid('work'),
      kind: 'work',
      weight: undefined,
      reps: undefined,
      rir: undefined,
    });
  }
  return sets;
}

function defaultWarmupSet(): SetEntry {
  return {
    id: uid('warm'),
    kind: 'warmup',
    weight: undefined,
    reps: undefined,
    rir: undefined,
  };
}

function makeExercise(name: string): ExerciseEntry {
  // padrão: sem aquecimento obrigatório (você alterna no Exercise)
  // aqui colocamos 3 de trabalho por padrão (como você usava)
  return {
    id: uid('ex'),
    name,
    status: 'pending',
    sets: [...defaultWorkSets(3)],
  };
}

export function ensureSession(routineId: string) {
  if (!store.sessionsByRoutineId[routineId]) {
    const routineName = getRoutineName(routineId);

    const presetNames = presetExercisesForRoutineName(routineName);
    const exercises = presetNames.map((n) => {
      // seus presets antigos vinham com 1 warm + 3 work.
      // como você quer warm opcional, mas “se fez na última aparece”:
      // mantemos warm nos presets iniciais apenas para Perna/Puxadas (histórico).
      const ex = makeExercise(n);
      if (routineName === 'Perna' || routineName === 'Puxadas') {
        ex.sets = [defaultWarmupSet(), ...defaultWorkSets(3)];
      }
      return ex;
    });

    store.sessionsByRoutineId[routineId] = {
      routineId,
      exercises,
      archivedExercises: [],
      abs: [],
      showAbs: false,
      hipMobilityDone: false,
      meta: {
        startedAt: new Date().toISOString(),
      },
    };
  } else {
    const s = store.sessionsByRoutineId[routineId];
    // marca início se ainda não tiver
    if (!s.meta.startedAt) s.meta.startedAt = new Date().toISOString();
  }

  return store.sessionsByRoutineId[routineId];
}

/** Exercícios: novo (em branco) */
export function addExercise(routineId: string) {
  const s = ensureSession(routineId);
  const ex = makeExercise(`Exercício ${s.exercises.length + 1}`);
  s.exercises.push(ex);
  return ex;
}

/** Exercícios: arquivar (“deletar” sem apagar histórico) */
export function archiveExercise(routineId: string, exerciseId: string) {
  const s = ensureSession(routineId);
  const ex = s.exercises.find((e) => e.id === exerciseId);
  if (!ex) return;

  s.exercises = s.exercises.filter((e) => e.id !== exerciseId);
  s.archivedExercises.unshift(ex); // guarda completo (sets etc.)
}

/** Lista de arquivados para re-adicionar */
export function listArchivedExercises(routineId: string) {
  const s = ensureSession(routineId);
  return s.archivedExercises;
}

/** Re-adicionar um exercício arquivado (volta para pendente) */
export function restoreArchivedExercise(routineId: string, archivedExerciseId: string) {
  const s = ensureSession(routineId);
  const ex = s.archivedExercises.find((e) => e.id === archivedExerciseId);
  if (!ex) return undefined;

  s.archivedExercises = s.archivedExercises.filter((e) => e.id !== archivedExerciseId);

  // volta como pendente (pra não “sumir”)
  ex.status = 'pending';
  s.exercises.push(ex);

  return ex;
}

/** “Salvar” exercício => marca como concluído */
export function markExerciseSaved(routineId: string, exerciseId: string) {
  const s = ensureSession(routineId);
  const ex = s.exercises.find((e) => e.id === exerciseId);
  if (!ex) return;
  ex.status = 'done';
}

/** Abdominais (simples por enquanto) */
export function createAbdominal(routineId: string, payload: { name: string; mode: AbMode }) {
  const s = ensureSession(routineId);
  s.abs.push({
    id: uid('ab'),
    name: payload.name,
    mode: payload.mode,
  });
}

export function removeAbdominal(routineId: string, abId: string) {
  const s = ensureSession(routineId);
  s.abs = s.abs.filter((a) => a.id !== abId);
}

/** Finalizar sessão */
export function finalizeSession(routineId: string) {
  const s = ensureSession(routineId);
  const now = new Date();
  s.meta.endedAt = now.toISOString();

  if (s.meta.startedAt) {
    const start = new Date(s.meta.startedAt).getTime();
    const end = now.getTime();
    const sec = Math.max(0, Math.floor((end - start) / 1000));
    s.meta.durationSec = sec;
  }
}