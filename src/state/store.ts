// src/state/store.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export type SessionType = 'Perna' | 'Puxadas' | 'Empurradas';
export type SetKind = 'warmup' | 'work';

export type SetEntry = {
  id: string;
  kind: SetKind;
  weight?: number;
  reps?: number;
  rir?: number;
  timeSec?: number;
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
  startedAt?: number;
  endedAt?: number;
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

export const store: {
  sessions: Partial<Record<SessionType, SessionEntry>>;
  lastTemplateByType: Partial<Record<SessionType, Omit<SessionEntry, 'meta'> & { meta?: never }>>;
  history: CompletedSession[];
  hydrated: boolean;
} = {
  sessions: {},
  lastTemplateByType: {},
  history: [],
  hydrated: false,
};

export function uid(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

const STORAGE_KEY = 'treino_store_v2';

type Persisted = {
  sessions: typeof store.sessions;
  lastTemplateByType: typeof store.lastTemplateByType;
  history: typeof store.history;
};

function seedFromDiary(): Persisted {
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

  const template = (type: SessionType, exercises: ExerciseEntry[]) => ({
    type,
    exercises,
    hipMobilityDone: false,
    showAbs: false,
    abs: [],
  });

  return {
    sessions: {},
    lastTemplateByType: {
      Perna: template('Perna', pernaExercises),
      Puxadas: template('Puxadas', puxadasExercises),
      Empurradas: template('Empurradas', []),
    },
    history: [],
  };
}

export async function hydrateStore() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = seedFromDiary();
      store.sessions = seeded.sessions;
      store.lastTemplateByType = seeded.lastTemplateByType;
      store.history = seeded.history;
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return;
    }

    const parsed: Persisted = JSON.parse(raw);
    store.sessions = parsed.sessions ?? {};
    store.lastTemplateByType = parsed.lastTemplateByType ?? {};
    store.history = parsed.history ?? [];
  } catch (e) {
    console.warn('hydrateStore failed', e);
  } finally {
    store.hydrated = true;
  }
}

let saveTimer: any = null;
export function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveStore().catch(console.warn);
  }, 250);
}

export async function saveStore() {
  const payload: Persisted = {
    sessions: store.sessions,
    lastTemplateByType: store.lastTemplateByType,
    history: store.history,
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
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

  if (next === 'Prancha') {
    sess.abs.push({
      id: uid('ab'),
      name: 'Prancha',
      mode: 'time',
      sets: [
        { id: uid('abset'), timeSec: undefined },
        { id: uid('abset'), timeSec: undefined },
        { id: uid('abset'), timeSec: undefined },
      ],
    });
  }

  if (next === 'Abdominal Máquina') {
    sess.abs.push({
      id: uid('ab'),
      name: 'Abdominal Máquina',
      mode: 'weight_reps',
      sets: [
        { id: uid('abset'), weight: undefined, reps: undefined },
        { id: uid('abset'), weight: undefined, reps: undefined },
        { id: uid('abset'), weight: undefined, reps: undefined },
      ],
    });
  }

  if (next === 'Abdominal Nadador') {
    sess.abs.push({
      id: uid('ab'),
      name: 'Abdominal Nadador',
      mode: 'reps',
      sets: [
        { id: uid('abset'), reps: undefined },
        { id: uid('abset'), reps: undefined },
        { id: uid('abset'), reps: undefined },
      ],
    });
  }

  if (next === 'Outro Abdominal') {
    sess.abs.push({
      id: uid('ab'),
      name: 'Outro Abdominal',
      mode: 'reps',
      sets: [
        { id: uid('abset'), reps: undefined },
        { id: uid('abset'), reps: undefined },
        { id: uid('abset'), reps: undefined },
      ],
    });
  }

  sess.showAbs = true;
  scheduleSave();
}

export function ensureSession(type: SessionType): SessionEntry {
  if (!store.sessions[type]) {
    const tpl = store.lastTemplateByType[type];
    store.sessions[type] = {
      type,
      exercises: tpl ? tpl.exercises : [],
      meta: {},
      hipMobilityDone: false,
      showAbs: false,
      abs: [],
    };
  }

  const sess = store.sessions[type]!;
  if (!sess.meta.startedAt) {
    sess.meta.startedAt = Date.now();
    scheduleSave();
  }
  return sess;
}