// src/state/store.ts

export type SetKind = 'warmup' | 'work';

export type SetEntry = {
  id: string;
  kind: SetKind;
  weight?: number;
  reps?: number;
  rir?: number; // natural (opcional)
};

export type ExerciseStatus = 'pending' | 'done';

export type ExerciseEntry = {
  id: string;
  name: string;
  status: ExerciseStatus;
  sets: SetEntry[];
};

export type AbsEntry = {
  id: string;
  name: string;
  done: boolean;
};

export type SessionMeta = {
  startedAt?: string;
  endedAt?: string;
  durationSec?: number;
  gym?: string; // unidade/filial
  hipMobilityDone?: boolean;
};

export type Session = {
  routineId: string;
  exercises: ExerciseEntry[];
  abs: AbsEntry[];
  meta: SessionMeta;
};

export type Routine = {
  id: string;
  name: string;
  archived?: boolean;
};

export const store: {
  routines: Record<string, Routine>;
  routineOrder: string[];
  archivedRoutineIds: string[];

  sessionsByRoutineId: Record<string, Session>;

  archivedExercisesByRoutineId: Record<string, ExerciseEntry[]>;
} = {
  routines: {},
  routineOrder: [],
  archivedRoutineIds: [],
  sessionsByRoutineId: {},
  archivedExercisesByRoutineId: {},
};

export function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

/**
 * Persistência real: ainda não.
 * Mas deixamos as funções para manter a arquitetura.
 */
let saveTimer: any = null;
export function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    // placeholder para persistência futura
    // console.log('scheduleSave() - (no-op)');
  }, 150);
}

export async function hydrateStore() {
  // Placeholder: no-op por enquanto.
  // Aqui depois vamos carregar do AsyncStorage (ou outra estratégia).
  if (store.routineOrder.length === 0) {
    // seed inicial padrão
    const r1 = addRoutine('Perna');
    const r2 = addRoutine('Puxadas');
    const r3 = addRoutine('Empurradas');

    ensureSession(r1.id);
    ensureSession(r2.id);
    ensureSession(r3.id);
  }
}

export function listActiveRoutines(): Routine[] {
  return store.routineOrder
    .map((id) => store.routines[id])
    .filter((r) => r && !r.archived);
}

export function listArchivedRoutines(): Routine[] {
  return store.archivedRoutineIds.map((id) => store.routines[id]).filter(Boolean);
}

export function addRoutine(name?: string): Routine {
  const id = uid('routine');
  const routine: Routine = {
    id,
    name: (name && name.trim()) || `Rotina ${store.routineOrder.length + 1}`,
    archived: false,
  };
  store.routines[id] = routine;
  store.routineOrder.push(id);
  // cria sessão on-demand
  return routine;
}

export function archiveRoutine(routineId: string) {
  const r = store.routines[routineId];
  if (!r) return;
  r.archived = true;
  if (!store.archivedRoutineIds.includes(routineId)) {
    store.archivedRoutineIds.push(routineId);
  }
}

export function unarchiveRoutine(routineId: string) {
  const r = store.routines[routineId];
  if (!r) return;
  r.archived = false;
  store.archivedRoutineIds = store.archivedRoutineIds.filter((id) => id !== routineId);
}

export function getRoutineName(routineId: string) {
  return store.routines[routineId]?.name ?? 'Rotina';
}

function defaultAbs(): AbsEntry[] {
  return [
    { id: uid('abs'), name: 'Prancha', done: false },
    { id: uid('abs'), name: 'Abdominal nadador', done: false },
    { id: uid('abs'), name: 'Abdominal máquina', done: false },
  ];
}

function defaultExercisesForRoutineName(name: string): string[] {
  // Empurradas deve começar vazio (como você pediu anteriormente)
  if (name.toLowerCase() === 'empurradas') return [];

  if (name.toLowerCase() === 'perna') {
    return ['Leg Press', 'Mesa Flexora', 'Panturrilha Máquina'];
  }
  if (name.toLowerCase() === 'puxadas') {
    return ['Puxada na Barra', 'Remada Máquina'];
  }
  // rotinas novas começam vazias
  return [];
}

export function ensureSession(routineId: string): Session {
  if (!store.sessionsByRoutineId[routineId]) {
    const routineName = getRoutineName(routineId);

    const exercises: ExerciseEntry[] = defaultExercisesForRoutineName(routineName).map((name) => ({
      id: uid('ex'),
      name,
      status: 'pending',
      sets: [
        // aquecimento opcional (começa com 1 por padrão; você pode remover no ExerciseScreen)
        { id: uid('warm'), kind: 'warmup', weight: undefined, reps: undefined, rir: undefined },
        { id: uid('work'), kind: 'work', weight: undefined, reps: undefined, rir: undefined },
        { id: uid('work'), kind: 'work', weight: undefined, reps: undefined, rir: undefined },
        { id: uid('work'), kind: 'work', weight: undefined, reps: undefined, rir: undefined },
      ],
    }));

    store.sessionsByRoutineId[routineId] = {
      routineId,
      exercises,
      abs: defaultAbs(),
      meta: {
        hipMobilityDone: false,
      },
    };
  }

  // garante start time ao abrir pela primeira vez
  const s = store.sessionsByRoutineId[routineId];
  if (!s.meta.startedAt) {
    s.meta.startedAt = new Date().toISOString();
  }
  return s;
}

export function addExercise(routineId: string): ExerciseEntry {
  const s = ensureSession(routineId);
  const newEx: ExerciseEntry = {
    id: uid('ex'),
    name: `Exercício ${s.exercises.length + 1}`,
    status: 'pending',
    sets: [
      { id: uid('warm'), kind: 'warmup', weight: undefined, reps: undefined, rir: undefined },
      { id: uid('work'), kind: 'work', weight: undefined, reps: undefined, rir: undefined },
      { id: uid('work'), kind: 'work', weight: undefined, reps: undefined, rir: undefined },
      { id: uid('work'), kind: 'work', weight: undefined, reps: undefined, rir: undefined },
    ],
  };
  s.exercises.push(newEx);
  return newEx;
}

export function archiveExercise(routineId: string, exerciseId: string) {
  const s = ensureSession(routineId);
  const idx = s.exercises.findIndex((e) => e.id === exerciseId);
  if (idx < 0) return;

  const [removed] = s.exercises.splice(idx, 1);
  if (!store.archivedExercisesByRoutineId[routineId]) {
    store.archivedExercisesByRoutineId[routineId] = [];
  }
  store.archivedExercisesByRoutineId[routineId].unshift(removed);
}

export function listArchivedExercises(routineId: string): ExerciseEntry[] {
  return store.archivedExercisesByRoutineId[routineId] ?? [];
}

export function restoreArchivedExercise(routineId: string, exerciseId: string): ExerciseEntry | null {
  const arr = store.archivedExercisesByRoutineId[routineId] ?? [];
  const idx = arr.findIndex((e) => e.id === exerciseId);
  if (idx < 0) return null;

  const [restored] = arr.splice(idx, 1);
  ensureSession(routineId).exercises.push(restored);
  return restored;
}

export function toggleHipMobility(routineId: string) {
  const s = ensureSession(routineId);
  s.meta.hipMobilityDone = !s.meta.hipMobilityDone;
}

export function addAbs(routineId: string, name: string) {
  const s = ensureSession(routineId);
  s.abs.push({ id: uid('abs'), name, done: false });
}

export function toggleAbsDone(routineId: string, absId: string) {
  const s = ensureSession(routineId);
  const a = s.abs.find((x) => x.id === absId);
  if (!a) return;
  a.done = !a.done;
}

export function finalizeSession(routineId: string) {
  const s = ensureSession(routineId);
  const end = new Date();
  s.meta.endedAt = end.toISOString();
  if (s.meta.startedAt) {
    const start = new Date(s.meta.startedAt);
    const dur = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000));
    s.meta.durationSec = dur;
  }
}