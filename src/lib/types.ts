export type RepMode = "count" | "time_seconds" | "time_minutes";

export type Difficulty = "light" | "medium" | "hard";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
}

export interface ExerciseItem {
  id: string;
  workoutName: string;
  picture?: string;
  repMode: RepMode;
  reps: number;
  sourceDocName?: string;
  createdAt: string;
}

export interface WeekFolder {
  id: string;
  name: string;
  order: number;
  exercises: ExerciseItem[];
  createdAt: string;
}

export interface WorkoutSession {
  id: string;
  weekId: string;
  weekName: string;
  startedAt: string;
  endedAt: string;
  completedExerciseIds: string[];
}

export interface DifficultyRating {
  id: string;
  sessionId: string;
  difficulty: Difficulty;
  note?: string;
  createdAt: string;
}

export interface WorkoutPlannerState {
  user: UserProfile;
  weeks: WeekFolder[];
  sessions: WorkoutSession[];
  ratings: DifficultyRating[];
}
