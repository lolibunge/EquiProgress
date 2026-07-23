export type RegistryRating = 1 | 2 | 3 | 4 | 5;

export type ExerciseSessionLog = {
  id: string;
  exerciseName: string;
  responseRating: RegistryRating;
  relaxationRating: RegistryRating;
  understandingRating: RegistryRating;
  tensionRating: RegistryRating;
  notes: string;
  shouldRepeat: boolean;
};

export type TrainingSessionRegistry = {
  id: string;
  horseName: string;
  date: string;
  sessionTitle: string;
  durationMinutes: number | null;

  horseInitialState: string;
  studentInitialState: string;

  connectionRating: RegistryRating;
  relaxationRating: RegistryRating;
  clarityRating: RegistryRating;

  generalNotes: string;
  nextStep: string;

  exercises: ExerciseSessionLog[];

  createdAt: string;
  updatedAt: string;
};

const LOCAL_REGISTRY_KEY = 'equi:session-registry';

function createId() {
  if (typeof window !== 'undefined' && window.crypto && 'randomUUID' in window.crypto) {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createEmptyExerciseLog(): ExerciseSessionLog {
  return {
    id: createId(),
    exerciseName: '',
    responseRating: 3,
    relaxationRating: 3,
    understandingRating: 3,
    tensionRating: 3,
    notes: '',
    shouldRepeat: false,
  };
}

export function createEmptyTrainingSession(): TrainingSessionRegistry {
  const now = new Date().toISOString();

  return {
    id: createId(),
    horseName: '',
    date: new Date().toISOString().slice(0, 10),
    sessionTitle: '',
    durationMinutes: null,

    horseInitialState: '',
    studentInitialState: '',

    connectionRating: 3,
    relaxationRating: 3,
    clarityRating: 3,

    generalNotes: '',
    nextStep: '',

    exercises: [createEmptyExerciseLog()],

    createdAt: now,
    updatedAt: now,
  };
}

export function readLocalTrainingSessions(): TrainingSessionRegistry[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(LOCAL_REGISTRY_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) return [];

    return parsed;
  } catch {
    return [];
  }
}

export function saveLocalTrainingSession(session: TrainingSessionRegistry): TrainingSessionRegistry {
  if (typeof window === 'undefined') return session;

  const currentSessions = readLocalTrainingSessions();

  const updatedSession: TrainingSessionRegistry = {
    ...session,
    updatedAt: new Date().toISOString(),
  };

  const sessionExists = currentSessions.some((entry) => entry.id === session.id);

  const nextSessions = sessionExists
    ? currentSessions.map((entry) => (entry.id === session.id ? updatedSession : entry))
    : [updatedSession, ...currentSessions];

  window.localStorage.setItem(LOCAL_REGISTRY_KEY, JSON.stringify(nextSessions));

  return updatedSession;
}

export function deleteLocalTrainingSession(sessionId: string): void {
  if (typeof window === 'undefined') return;

  const currentSessions = readLocalTrainingSessions();
  const nextSessions = currentSessions.filter((session) => session.id !== sessionId);

  window.localStorage.setItem(LOCAL_REGISTRY_KEY, JSON.stringify(nextSessions));
}