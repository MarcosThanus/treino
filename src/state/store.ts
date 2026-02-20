export type SetKind = 'warmup' | 'work';

export type SetRow = {
  id: string;
  kind: SetKind;
  weight?: number;
  reps?: number;
  rir?: number;
  note?: string;
};

export type ExerciseState = {
  name: string;
  status: 'pending' | 'done';
  sets: SetRow[];
};

export type SessionState = {
  type: string;
  hideRir: boolean;
  exercises: ExerciseState[];
};

export function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

export const store: {
  sessions: Record<string, SessionState>;
} = {
  sessions: {}
};
