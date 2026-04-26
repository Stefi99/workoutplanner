import { WorkoutPlannerState } from "@/lib/types";

const STORAGE_KEY = "workoutplanner.state.v1";

const defaultState: WorkoutPlannerState = {
  user: {
    id: "local-user",
    name: "Demo User",
    email: "demo@workoutplanner.local",
  },
  weeks: [],
  sessions: [],
  ratings: [],
};

export function getDefaultState(): WorkoutPlannerState {
  return structuredClone(defaultState);
}

export function loadState(): WorkoutPlannerState {
  if (typeof window === "undefined") {
    return getDefaultState();
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return getDefaultState();
  }

  try {
    const parsed = JSON.parse(raw) as WorkoutPlannerState;
    return {
      ...getDefaultState(),
      ...parsed,
    };
  } catch {
    return getDefaultState();
  }
}

export function saveState(state: WorkoutPlannerState): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function uid(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}
