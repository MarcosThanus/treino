// src/state/store.ts
// Opção B: store 100% em memória (sem AsyncStorage) para destravar builds em ambiente restrito.

export type SessionType = 'Perna' | 'Puxadas' | 'Empurradas';
export type SetKind = 'warmup' | 'work';

export type SetEntry = {
  id: string;
  kind: SetKind;
  weight?: number;
  reps?: number;
  rir?: number; // natural
  timeSec?: number; // usado em prancha (abdominais)
};

export type ExerciseEntry = {
  name: string;
  status: 'pending' | 'done';
  sets: SetEntry[];
};

export type AbMode = 'time' | 'weight_reps' | 'reps';

export type AbSet = {
  id: string;
  weight?: number;
  reps?: number;
  timeSec?: number;
};

export type AbExercise = {
  id: string;
  name: 'Prancha' | 'Abdominal Máquina' | 'Abdominal Nadador' | 'Outro Abdominal';
  mode: AbMode;
  sets: AbSet[];
};

export type SessionMeta = {
  gym?: string;
  startedAt?: number; // clique no tipo
  endedAt?: number; // finalizar
  durationSec?: number;
};

export type SessionEntry = {
  type: SessionType;
  exercises: ExerciseEntry[];
  meta: SessionMeta;
  hipMobilityDone: boolean;
  showAbs: boolean;
  abs: AbExercise[];
};

export type CompletedSession = {
  id: string;
  type: SessionType;
  gym?: string;
  startedAt: number;
  endedAt: number;
  durationSec: number;
  hipMobilityDone: boolean;
  abs: AbExercise[];
  exercises: ExerciseEntry[];
};

// ===== util =====
export function uid(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

// ===== seed do TXT (Perna + Puxadas) =====
function seedTemplates() {
  const warm = (weight: number, reps: number): SetEntry => ({
    id: uid('warm'),
    kind: 'warmup',
    weight,
    reps,
  });

  const work = (weight: number, reps: number): SetEntry => ({
    id: uid('work'),
    kind: 'work',
    weight,
    reps,
  });

  const mk = (name: string, sets: SetEntry[]): ExerciseEntry => ({
    name,
    status: 'pending',
    sets,
  });

  const pernaExercises: ExerciseEntry[] = [
    mk('Leg Press', [warm(20, 15), work(42.5, 15), work(65, 15), work(80, 15), work(82.5, 15)]),
    mk('Cadeira Adutora', [warm(35, 15), work(72.5, 15), work(80, 15), work(85.5, 12)]),
    mk('Cadeira Extensora', [work(42.5, 15), work(50, 15), work(57.5, 11), work(57.5, 14)]),
    mk('Mesa Flexora', [work(35, 12), work(42.5, 12), work(50, 8)]),
    mk('Cadeira Flexora', [work(35, 15), work(42.5, 15), work(50, 12)]),
    mk('Abdução de Quadril', [work(72.5, 15), work(80, 15), work(87.5, 14)]),
    mk('Panturrilha com Alteres', [work(10, 22), work(12, 15), work(14, 17)]),
  ];

  const puxadasExercises: ExerciseEntry[] = [
    mk('Remada baixa com Triângulo', [warm(10, 15), work(20, 15), work(25, 15), work(30, 14)]),
    mk('Puxada alta com Triângulo', [warm(15, 15), work(25, 15), work(30, 12), work(35, 10)]),
    mk('Voador Costas', [work(27.5, 10), work(30, 10), work(32.5, 6)]),
    mk('Bíceps Cabo Corda', [work(7.5, 15), work(10, 10), work(12.5, 8)]),
    mk('Bíceps Máquina', [work(20, 10), work(22.5, 8), work(25, 8)]),
    mk('Abdominal Máquina', [work(27.5, 15), work(42.5, 15), work(50, 12)]),
  ];

  return {
    Perna: {
      type: 'Perna' as const,
      exercises: pernaExercises,
      hipMobilityDone: false,
      showAbs: false,
      abs: [],
    },
    Puxadas: {
      type: 'Puxadas' as const,
      exercises: puxadasExercises,
      hipMobilityDone: false,
      showAbs: false,
      abs: [],
    },
    Empurradas: {
      type: 'Empurradas' as const,
      exercises: [],
      hipMobilityDone: false,
      showAbs: false,
      abs: [],
    },
  };
}

function cloneExercises(exs: ExerciseEntry[]): ExerciseEntry[] {
  return exs.map((e) => ({
    name: e.name,
    status: 'pending',
    sets: e.sets.map((s) => ({
      id: uid(s.kind === 'warmup' ? 'warm' : 'work'),
      kind: s.kind,
      weight: s.weight,
      reps: s.reps,
      rir: s.rir,
      timeSec: s.timeSec,
    })),
  }));
}

function cloneAbs(abs: AbExercise[]): AbExercise[] {
  return abs.map((a) => ({
    id: uid('ab'),
    name: a.name,
    mode: a.mode,
    sets: a.sets.map((s) => ({
      id: uid('abset'),
      weight: s.weight,
      reps: s.reps,
      timeSec: s.timeSec,
    })),
  }));
}

// ===== store =====
const seeded = seedTemplates();

export const store: {
  sessions: Partial<Record<SessionType, SessionEntry>>;
  lastTemplateByType: Partial<Record<SessionType, Omit<SessionEntry, 'meta'> & { meta?: never }>>;
  history: CompletedSession[];
  hydrated: boolean; // mantém a mesma interface do App.tsx
} = {
  sessions: {},
  lastTemplateByType: {
    Perna: seeded.Perna,
    Puxadas: seeded.Puxadas,
    Empurradas: seeded.Empurradas,
  },
  history: [],
  hydrated: true,
};

// no-op (para não quebrar App.tsx que chama hydrateStore)
export async function hydrateStore() {
  store.hydrated = true;
}

export function scheduleSave() {
  // no-op por enquanto (sem persistência)
}

// ===== operações =====
export function ensureSession(type: SessionType): SessionEntry {
  if (!store.sessions[type]) {
    const tpl = store.lastTemplateByType[type];
    store.sessions[type] = {
      type,
      exercises: tpl ? cloneExercises(tpl.exercises) : [],
      meta: {},
      hipMobilityDone: tpl ? tpl.hipMobilityDone : false,
      showAbs: tpl ? tpl.showAbs : false,
      abs: tpl ? cloneAbs(tpl.abs) : [],
    };
  }

  const sess = store.sessions[type]!;
  if (!sess.meta.startedAt) {
    sess.meta.startedAt = Date.now();
  }
  return sess;
}

export function addAbdominal(type: SessionType, kind?: AbExercise['name']) {
  const sess = ensureSession(type);

  const order: AbExercise['name'][] = [
    'Prancha',
    'Abdominal Máquina',
    'Abdominal Nadador',
    'Outro Abdominal',
  ];

  const next =
    kind ??
    order.find((n) => !sess.abs.some((a) => a.name === n)) ??
    'Outro Abdominal';

  const make = (name: AbExercise['name']): AbExercise => {
    if (name === 'Prancha') {
      return {
        id: uid('ab'),
        name,
        mode: 'time',
        sets: [
          { id: uid('abset'), timeSec: undefined },
          { id: uid('abset'), timeSec: undefined },
          { id: uid('abset'), timeSec: undefined },
        ],
      };
    }
    if (name === 'Abdominal Máquina') {
      return {
        id: uid('ab'),
        name,
        mode: 'weight_reps',
        sets: [
          { id: uid('abset'), weight: undefined, reps: undefined },
          { id: uid('abset'), weight: undefined, reps: undefined },
          { id: uid('abset'), weight: undefined, reps: undefined },
        ],
      };
    }
    if (name === 'Abdominal Nadador') {
      return {
        id: uid('ab'),
        name,
        mode: 'reps',
        sets: [
          { id: uid('abset'), reps: undefined },
          { id: uid('abset'), reps: undefined },
          { id: uid('abset'), reps: undefined },
        ],
      };
    }
    return {
      id: uid('ab'),
      name: 'Outro Abdominal',
      mode: 'reps',
      sets: [
        { id: uid('abset'), reps: undefined },
        { id: uid('abset'), reps: undefined },
        { id: uid('abset'), reps: undefined },
      ],
    };
  };

  sess.showAbs = true;
  sess.abs.push(make(next));
}