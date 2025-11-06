export {};
import { jest } from "@jest/globals";

type GymClass = {
  id: number;
  name: string;
  description: string;
  date: Date;
  time: string;
  capacity: number;
  enrolled: number;
  createdById: string;
  users: string[];
  sedeId: number;
};
type MuscleGroup = { id: number; name: string };
type Exercise = { id: number; name: string; muscleGroupId: number };
type Routine = {
  id: number;
  name: string;
  description: string | null;
  level: "Beginner" | "Intermediate" | "Advanced";
  duration: number | null;
  icon: string | null;
  users: string[];
  sedeId: number;
};
type RoutineExercise = {
  id: number;
  routineId: number;
  exerciseId: number;
  sets: number;
  reps: number;
  restTime: number;
};

type Sede = {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  users: string[];
};

type Goal = {
  id: number;
  title: string;
  description: string | null;
  category: "USER_REGISTRATIONS" | "CLASS_ENROLLMENTS" | "ROUTINE_ASSIGNMENTS";
  targetValue: number;
  currentValue: number;
  startDate: Date;
  endDate: Date;
  sedeId: number;
  targetClassId: number | null;
  targetRoutineId: number | null;
  createdAt: Date;
  updatedAt: Date;
};

const G = globalThis as any;
G.__TEST_DB__ ??= {
  classes: [] as GymClass[],
  muscleGroups: [] as MuscleGroup[],
  exercises: [] as Exercise[],
  routines: [] as Routine[],
  routineExercises: [] as RoutineExercise[],
  sedes: [] as Sede[],
  goals: [] as Goal[],
  CURRENT_USER_ID: "user_test_id",
  CURRENT_ROLE: "user",
};
const db = G.__TEST_DB__;

declare global {
  var __seedClasses__: (rows: GymClass[]) => void;
  var __resetClasses__: () => void;
  var __setRole__: (role: "user" | "admin") => void;
  var __setUserId__: (id: string) => void;
  var __seedMuscleGroups__: (rows: MuscleGroup[]) => void;
  var __resetMuscleGroups__: () => void;
  var __seedExercises__: (rows: Exercise[]) => void;
  var __resetExercises__: () => void;
  var __seedRoutines__: (rows: Routine[]) => void;
  var __resetRoutines__: () => void;
  var __seedRoutineExercises__: (rows: RoutineExercise[]) => void;
  var __resetRoutineExercises__: () => void;
  var __seedSedes__: (rows: Sede[]) => void;
  var __resetSedes__: () => void;
  var __seedGoals__: (rows: Goal[]) => void;
  var __resetGoals__: () => void;
}

global.__seedMuscleGroups__ = (rows: MuscleGroup[]) => {
  db.muscleGroups = rows.map((r) => ({ ...r }));
};
global.__resetMuscleGroups__ = () => {
  db.muscleGroups = [];
};
global.__seedExercises__ = (rows: Exercise[]) => {
  db.exercises = rows.map((r) => ({ ...r }));
};
global.__resetExercises__ = () => {
  db.exercises = [];
};
global.__seedRoutines__ = (rows: Routine[]) => {
  db.routines = rows.map((r) => ({ ...r }));
};
global.__resetRoutines__ = () => {
  db.routines = [];
};
global.__seedRoutineExercises__ = (rows: RoutineExercise[]) => {
  db.routineExercises = rows.map((r) => ({ ...r }));
};
global.__resetRoutineExercises__ = () => {
  db.routineExercises = [];
};

global.__seedClasses__ = (rows: GymClass[]) => {
  db.classes = rows.map((r) => ({
    ...r,
    date: new Date(r.date),
    users: Array.isArray(r.users) ? r.users.slice() : [],
    enrolled: Number(r.enrolled ?? 0),
  }));
};
global.__resetClasses__ = () => {
  db.classes = [];
};

global.__setRole__ = (role: "user" | "admin") => {
  db.CURRENT_ROLE = role;
};
global.__setUserId__ = (id: string) => {
  db.CURRENT_USER_ID = id;
};

global.__seedSedes__ = (rows: Sede[]) => {
  db.sedes = rows.map((r) => ({
    ...r,
    users: Array.isArray(r.users) ? r.users.slice() : [],
  }));
};
global.__resetSedes__ = () => {
  db.sedes = [];
};

global.__seedGoals__ = (rows: Goal[]) => {
  db.goals = rows.map((r) => ({
    ...r,
    startDate: new Date(r.startDate),
    endDate: new Date(r.endDate),
    createdAt: new Date(r.createdAt),
    updatedAt: new Date(r.updatedAt),
  }));
};
global.__resetGoals__ = () => {
  db.goals = [];
};

beforeAll(() => {
  process.env.NODE_ENV = "test";
});

beforeEach(() => {
  db.CURRENT_ROLE = "user";
  db.CURRENT_USER_ID = "user_test_id";
});

afterAll(async () => {
  jest.clearAllMocks();
});
