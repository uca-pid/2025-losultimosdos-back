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
};
type RoutineExercise = {
  id: number;
  routineId: number;
  exerciseId: number;
  sets: number;
  reps: number;
  restTime: number;
};


interface TestDB {
  classes: GymClass[];
  muscleGroups: MuscleGroup[];
  exercises: Exercise[];
  routines: Routine[];
  routineExercises: RoutineExercise[];
  CURRENT_USER_ID: string;
  CURRENT_ROLE: "user" | "admin";
}

const G = globalThis as any;
if (!G.__TEST_DB__) {
  const init: TestDB = {
    classes: [],
    muscleGroups: [],
    exercises: [],
    routines: [],
    routineExercises: [],
    CURRENT_USER_ID: "user_test_id",
    CURRENT_ROLE: "user",
  };
  G.__TEST_DB__ = init;
}
const db = G.__TEST_DB__ as TestDB;

const ciEq = (a?: string | null, b?: string | null) =>
  (a ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase();

class PrismaKnownRequestError extends Error {
  code: string;
  meta?: any;
  constructor(message: string, code: string, meta?: any) {
    super(message);
    this.code = code;
    this.meta = meta;
  }
}
export const Prisma = {
  PrismaClientKnownRequestError: PrismaKnownRequestError,
};

export class PrismaClient {
  $transaction = async (fn: any) => await fn(this as any);
  $connect = async () => {};
  $disconnect = async () => {};

  class = {
    findMany: jest.fn(async (args?: any) => {
      if (args?.where?.users?.has) {
        const uid = args.where.users.has as string;
        return db.classes.filter((c) => Array.isArray(c.users) && c.users.includes(uid));
      }
      return db.classes.map((c) => ({ ...c }));
    }),

    findUnique: jest.fn(async ({ where: { id } }: any) => db.classes.find((c) => c.id === id) ?? null),

    create: jest.fn(async ({ data }: any) => {
      const newId = data.id ?? (db.classes.length ? Math.max(...db.classes.map((c) => c.id)) + 1 : 1);
      const row: GymClass = {
        id: newId,
        name: data.name,
        description: data.description,
        date: new Date(data.date),
        time: data.time,
        capacity: data.capacity,
        enrolled: data.enrolled ?? 0,
        createdById: data.createdById ?? db.CURRENT_USER_ID,
        users: Array.isArray(data.users) ? data.users.slice() : [],
      };
      if (!Array.isArray(row.users)) row.users = [];
      db.classes.push(row);
      return { ...row };
    }),

    update: jest.fn(async ({ where: { id }, data }: any) => {
      const idx = db.classes.findIndex((c) => c.id === id);
      if (idx === -1) throw new Error("Class not found");
      const curr = db.classes[idx];
      const copy: GymClass = { ...curr };
      if (!Array.isArray(copy.users)) copy.users = [];
      if (data.name !== undefined) copy.name = data.name;
      if (data.description !== undefined) copy.description = data.description;
      if (data.date !== undefined) copy.date = new Date(data.date);
      if (data.time !== undefined) copy.time = data.time;
      if (data.capacity !== undefined) copy.capacity = data.capacity;
      if (data.enrolled?.increment !== undefined) copy.enrolled = (copy.enrolled ?? 0) + Number(data.enrolled.increment || 0);
      if (data.enrolled?.decrement !== undefined) copy.enrolled = Math.max(0, (copy.enrolled ?? 0) - Number(data.enrolled.decrement || 0));

      if (data.users !== undefined) {
        const u = data.users;
        if (u && typeof u === "object" && !Array.isArray(u) && "push" in u) {
          const val = (u as any).push;
          if (val !== undefined && val !== null) {
            copy.users = Array.isArray(copy.users) ? copy.users.slice() : [];
            copy.users.push(String(val));
          }
        } else if (Array.isArray(u)) {
          copy.users = u.map(String).filter(Boolean);
        } else if (u && typeof u === "object" && "set" in u) {
          const arr = (u as any).set ?? [];
          copy.users = arr.map(String).filter(Boolean);
        }
      }
      db.classes[idx] = copy;
      return { ...copy };
    }),

    delete: jest.fn(async ({ where: { id } }: any) => {
      const idx = db.classes.findIndex((c) => c.id === id);
      if (idx === -1) throw new Error("Class not found");
      const deleted = db.classes.splice(idx, 1)[0];
      return { ...deleted };
    }),
  };

  muscleGroup = {
    findMany: jest.fn(async (args?: any) => {
      const rows = db.muscleGroups.map((mg) => ({ ...mg }));
      if (args?.include?.exercises) {
        return rows.map((mg) => ({ ...mg, exercises: db.exercises.filter((e) => e.muscleGroupId === mg.id) }));
      }
      if (args?.include?._count) {
        return rows.map((mg) => ({
          ...mg,
          _count: { exercises: db.exercises.filter((e) => e.muscleGroupId === mg.id).length },
        }));
      }
      return rows;
    }),

    findUnique: jest.fn(async ({ where: { id }, include }: any) => {
      const mg = db.muscleGroups.find((x) => x.id === Number(id));
      if (!mg) return null;
      const base: any = { ...mg };
      if (include?.exercises) base.exercises = db.exercises.filter((e) => e.muscleGroupId === mg.id);
      if (include?._count) base._count = { exercises: db.exercises.filter((e) => e.muscleGroupId === mg.id).length };
      return base as any;
    }),

    findFirst: jest.fn(async ({ where, include }: any = {}) => {
      const { id, name } = where || {};
      const mg =
        db.muscleGroups.find((x) => {
          const byId = id !== undefined ? x.id === Number(id) : true;
          const byName = name !== undefined ? x.name === (typeof name === "object" && name.equals ? name.equals : name) : true;
          return byId && byName;
        }) || null;
      if (!mg) return null;
      const base: any = { ...mg };
      if (include?.exercises) base.exercises = db.exercises.filter((e) => e.muscleGroupId === mg.id);
      if (include?._count) base._count = { exercises: db.exercises.filter((e) => e.muscleGroupId === mg.id).length };
      return base as any;
    }),

    create: jest.fn(async ({ data }: any) => {
      const dup = db.muscleGroups.some((m) => ciEq(m.name, data?.name));
      if (dup) throw new PrismaKnownRequestError("Unique constraint failed", "P2002", { target: ["name"] });
      const newId = db.muscleGroups.length ? Math.max(...db.muscleGroups.map((mg) => mg.id)) + 1 : 1;
      const row: MuscleGroup = { id: newId, name: data.name };
      db.muscleGroups.push(row);
      return { ...row };
    }),

    update: jest.fn(async ({ where: { id }, data }: any) => {
      const idx = db.muscleGroups.findIndex((mg) => mg.id === Number(id));
      if (idx === -1) throw new Error("Muscle group not found");
      const curr = db.muscleGroups[idx];
      const copy: MuscleGroup = { ...curr };
      if (data.name !== undefined) copy.name = data.name;
      db.muscleGroups[idx] = copy;
      return { ...copy };
    }),

    delete: jest.fn(async ({ where: { id } }: any) => {
      const idx = db.muscleGroups.findIndex((mg) => mg.id === Number(id));
      if (idx === -1) throw new Error("Muscle group not found");
      const deleted = db.muscleGroups.splice(idx, 1)[0];
      return { ...deleted };
    }),
  };

  exercise = {
    findMany: jest.fn(async (args?: any) => {
      let rows = db.exercises.slice();
      const where = args?.where || {};
      if (where?.id?.in && Array.isArray(where.id.in)) {
        const set = new Set(where.id.in.map(Number));
        rows = rows.filter((e) => set.has(e.id));
      }
      if (typeof where?.muscleGroupId === "number") {
        rows = rows.filter((e) => e.muscleGroupId === Number(where.muscleGroupId));
      }
      return rows;
    }),

    findUnique: jest.fn(async ({ where: { id } }: any) => db.exercises.find((e) => e.id === id)),
    create: jest.fn(async ({ data }: any) => {
      const newId = db.exercises.length ? Math.max(...db.exercises.map((e) => e.id)) + 1 : 1;
      const row: Exercise = { id: newId, name: data.name, muscleGroupId: data.muscleGroupId };
      db.exercises.push(row);
      return { ...row };
    }),
    update: jest.fn(async ({ where: { id }, data }: any) => {
      const idx = db.exercises.findIndex((e) => e.id === id);
      if (idx === -1) throw new Error("Exercise not found");
      const curr = db.exercises[idx];
      const copy: Exercise = { ...curr };
      if (data.name !== undefined) copy.name = data.name;
      if (data.muscleGroupId !== undefined) copy.muscleGroupId = data.muscleGroupId;
      db.exercises[idx] = copy;
      return { ...copy };
    }),
    delete: jest.fn(async ({ where: { id } }: any) => {
      const idx = db.exercises.findIndex((e) => e.id === id);
      if (idx === -1) throw new Error("Exercise not found");
      const deleted = db.exercises.splice(idx, 1)[0];
      return { ...deleted };
    }),

    updateMany: jest.fn(async ({ where, data }: any) => {
      let count = 0;
      const matches = (e: any) => {
        if (!where) return true;
        if (typeof where.muscleGroupId === "number") return e.muscleGroupId === Number(where.muscleGroupId);
        if (where.muscleGroupId && typeof where.muscleGroupId === "object" && "equals" in where.muscleGroupId)
          return e.muscleGroupId === Number(where.muscleGroupId.equals);
        return true;
      };

      db.exercises = db.exercises.map((e) => {
        if (!matches(e)) return e;
        count++;
        const copy: any = { ...e };
        if (data && typeof data.muscleGroupId === "object" && data.muscleGroupId !== null && "set" in data.muscleGroupId) {
          copy.muscleGroupId = data.muscleGroupId.set as any;
        }
        return copy;
      });
      return { count };
    }),
  };

  routine = {
    findMany: jest.fn(async (args?: any) => {
      const rows = db.routines.map((r) => ({ ...r }));
      const withExercises = (r: any, include: any) => {
        const rel = db.routineExercises.filter((re) => re.routineId === r.id).map((re) => {
          const base: any = { ...re };
          if (include?.include?.exercise) {
            const ex = db.exercises.find((e) => e.id === re.exerciseId) || null;
            if (ex && include.include.exercise?.include?.muscleGroup) {
              const mg = db.muscleGroups.find((m) => m.id === ex.muscleGroupId) || null;
              base.exercise = { ...ex, muscleGroup: mg };
            } else {
              base.exercise = ex;
            }
          }
          return base;
        });
        return { ...r, exercises: rel };
      };

      let out: any[] = rows;
      if (args?.include?.exercises) out = rows.map((r) => withExercises(r, args.include.exercises));
      if (args?.include?._count) {
        out = out.map((r: any) => ({
          ...r,
          _count: {
            exercises: (r.exercises ?? db.routineExercises.filter((re) => re.routineId === r.id)).length,
          },
        }));
      }
      return out;
    }),

    findUnique: jest.fn(async ({ where: { id }, include }: any) => {
      const r = db.routines.find((x) => x.id === Number(id));
      if (!r) return null;
      let base: any = { ...r };
      if (include?.exercises) {
        const exInc = include.exercises;
        base.exercises = db.routineExercises.filter((re) => re.routineId === r.id).map((re) => {
          const row: any = { ...re };
          if (exInc?.include?.exercise) {
            const ex = db.exercises.find((e) => e.id === re.exerciseId) || null;
            if (ex && exInc.include.exercise?.include?.muscleGroup) {
              const mg = db.muscleGroups.find((m) => m.id === ex.muscleGroupId) || null;
              row.exercise = { ...ex, muscleGroup: mg };
            } else {
              row.exercise = ex;
            }
          }
          return row;
        });
      }
      if (include?._count) base._count = { exercises: db.routineExercises.filter((re) => re.routineId === r.id).length };
      return base;
    }),

    findFirst: jest.fn(async ({ where, include }: any = {}) => {
      const { id, name } = where || {};
      const r =
        db.routines.find((x) => {
          const byId = id !== undefined ? x.id === Number(id) : true;
          const byName = name !== undefined ? x.name === (typeof name === "object" && name.equals ? name.equals : name) : true;
          return byId && byName;
        }) || null;
      if (!r) return null;

      let base: any = { ...r };
      if (include?.exercises) {
        const exInc = include.exercises;
        base.exercises = db.routineExercises.filter((re) => re.routineId === r.id).map((re) => {
          const row: any = { ...re };
          if (exInc?.include?.exercise) {
            const ex = db.exercises.find((e) => e.id === re.exerciseId) || null;
            if (ex && exInc.include.exercise?.include?.muscleGroup) {
              const mg = db.muscleGroups.find((m) => m.id === ex.muscleGroupId) || null;
              row.exercise = { ...ex, muscleGroup: mg };
            } else {
              row.exercise = ex;
            }
          }
          return row;
        });
      }
      if (include?._count) base._count = { exercises: db.routineExercises.filter((re) => re.routineId === r.id).length };
      return base;
    }),

    create: jest.fn(async ({ data }: any) => {
      const newId = db.routines.length ? Math.max(...db.routines.map((r) => r.id)) + 1 : 1;
      const row: Routine = {
        id: newId,
        name: data.name,
        description: data.description ?? null,
        level: data.level ?? "Beginner",
        duration: data.duration ?? null,
        icon: data.icon ?? null,
        users: Array.isArray(data.users) ? data.users.slice() : [],
      } as any;
      db.routines.push(row);
      return { ...row };
    }),

    update: jest.fn(async ({ where: { id }, data }: any) => {
      const idx = db.routines.findIndex((r) => r.id === Number(id));
      if (idx === -1) throw new Error("Routine not found");
      const curr = db.routines[idx];
      const copy: any = { ...curr };
      if (data.name !== undefined) copy.name = data.name;
      if (data.description !== undefined) copy.description = data.description;
      if (data.level !== undefined) copy.level = data.level;
      if (data.duration !== undefined) copy.duration = data.duration;
      if (data.icon !== undefined) copy.icon = data.icon;
      if (data.users !== undefined) {
        const u = data.users;
        if (u && typeof u === "object" && !Array.isArray(u) && "push" in u) {
          const val = (u as any).push;
          if (val !== undefined && val !== null) {
            copy.users = Array.isArray(copy.users) ? copy.users.slice() : [];
            copy.users.push(String(val));
          }
        } else if (Array.isArray(u)) {
          copy.users = u.map((x: any) => String(x)).filter((x: string) => x);
        } else if (u && typeof u === "object" && "set" in u) {
          const arr = (u as any).set ?? [];
          copy.users = arr.map((x: any) => String(x)).filter((x: string) => x);
        }
      }
      db.routines[idx] = copy;
      return { ...copy };
    }),

    delete: jest.fn(async ({ where: { id } }: any) => {
      const idx = db.routines.findIndex((r) => r.id === Number(id));
      if (idx === -1) throw new Error("Routine not found");
      const deleted = db.routines.splice(idx, 1)[0];
      db.routineExercises = db.routineExercises.filter((re) => re.routineId !== deleted.id);
      return { ...deleted };
    }),
  };

  routineExercise = {
    createMany: jest.fn(async ({ data }: any) => {
      const items = Array.isArray(data) ? data : [data];
      let count = 0;
      for (const d of items) {
        const newId = db.routineExercises.length ? Math.max(...db.routineExercises.map((x) => x.id)) + 1 : 1;
        db.routineExercises.push({
          id: newId,
          routineId: Number(d.routineId),
          exerciseId: Number(d.exerciseId),
          sets: d.sets ?? null,
          reps: d.reps ?? null,
          restTime: d.restTime ?? null,
        } as any);
        count++;
      }
      return { count };
    }),

    count: jest.fn(async ({ where }: any = {}) => {
      let rows = db.routineExercises.slice();
      if (where?.routineId !== undefined) rows = rows.filter((re) => re.routineId === Number(where.routineId));
      if (where?.exerciseId !== undefined) rows = rows.filter((re) => re.exerciseId === Number(where.exerciseId));
      if (where?.id?.in && Array.isArray(where.id.in)) {
        const set = new Set(where.id.in.map(Number));
        rows = rows.filter((re) => set.has(re.id));
      }
      return rows.length;
    }),

    findMany: jest.fn(async (args?: any) => {
      let rows: any[] = db.routineExercises.map((re) => ({ ...re }));
      const where = args?.where || {};
      if (where.routineId !== undefined) rows = rows.filter((re) => re.routineId === Number(where.routineId));
      if (where.exerciseId !== undefined) rows = rows.filter((re) => re.exerciseId === Number(where.exerciseId));
      if (args?.include?.exercise) rows = rows.map((re) => ({ ...re, exercise: db.exercises.find((e) => e.id === re.exerciseId) || null }));
      if (args?.include?.routine) rows = rows.map((re) => ({ ...re, routine: db.routines.find((r) => r.id === re.routineId) || null }));
      return rows;
    }),

    create: jest.fn(async ({ data, include }: any) => {
      const newId = db.routineExercises.length ? Math.max(...db.routineExercises.map((x) => x.id)) + 1 : 1;
      const row: RoutineExercise = {
        id: newId,
        routineId: data.routineId,
        exerciseId: data.exerciseId,
        sets: data.sets ?? null,
        reps: data.reps ?? null,
        restTime: data.restTime ?? null,
      } as any;
      db.routineExercises.push(row);

      const base: any = { ...row };
      if (include?.exercise) base.exercise = db.exercises.find((e) => e.id === row.exerciseId) || null;
      if (include?.routine) base.routine = db.routines.find((r) => r.id === row.routineId) || null;
      return base;
    }),

    update: jest.fn(async ({ where: { id }, data, include }: any) => {
      const idx = db.routineExercises.findIndex((re) => re.id === Number(id));
      if (idx === -1) throw new Error("RoutineExercise not found");
      const curr = db.routineExercises[idx];
      const copy: any = { ...curr };
      if (data.sets !== undefined) copy.sets = data.sets;
      if (data.reps !== undefined) copy.reps = data.reps;
      if (data.restTime !== undefined) copy.restTime = data.restTime;
      if (data.routineId !== undefined) copy.routineId = data.routineId;
      if (data.exerciseId !== undefined) copy.exerciseId = data.exerciseId;
      db.routineExercises[idx] = copy;

      const base: any = { ...copy };
      if (include?.exercise) base.exercise = db.exercises.find((e) => e.id === copy.exerciseId) || null;
      if (include?.routine) base.routine = db.routines.find((r) => r.id === copy.routineId) || null;
      return base;
    }),

    delete: jest.fn(async ({ where }: any) => {
      let id: number | undefined;
      let routineId: number | undefined;
      let exerciseId: number | undefined;

      const readPair = (obj: any) => {
        if (!obj) return;
        if (typeof obj.id !== "undefined") id = Number(obj.id);
        if (typeof obj.routineId !== "undefined") routineId = Number(obj.routineId);
        if (typeof obj.exerciseId !== "undefined") exerciseId = Number(obj.exerciseId);
      };

      if (where) {
        readPair(where);
        if (Array.isArray(where.AND)) for (const cond of where.AND) readPair(cond);
        if (where.id_routineId) readPair(where.id_routineId);
        if (where.routineId_id) readPair(where.routineId_id);
        if (where.routineId_exerciseId) readPair(where.routineId_exerciseId);
      }

      const idx = db.routineExercises.findIndex((re) => {
        const okId = typeof id === "number" ? re.id === id : true;
        const okRoutine = typeof routineId === "number" ? re.routineId === routineId : true;
        const okEx = typeof exerciseId === "number" ? re.exerciseId === exerciseId : true;
        return okId && okRoutine && okEx;
      });

      if (idx === -1) throw new Error("RoutineExercise not found");
      const deleted = db.routineExercises.splice(idx, 1)[0];
      return { ...deleted };
    }),

    findUnique: jest.fn(async ({ where: { id }, include }: any) => {
      const re = db.routineExercises.find((x) => x.id === Number(id)) || null;
      if (!re) return null;
      const base: any = { ...re };
      if (include?.exercise) base.exercise = db.exercises.find((e) => e.id === re.exerciseId) || null;
      if (include?.routine) base.routine = db.routines.find((r) => r.id === re.routineId) || null;
      return base;
    }),

    findFirst: jest.fn(async ({ where, include }: any = {}) => {
      const { id, routineId, exerciseId } = where || {};
      const re =
        db.routineExercises.find((x) => {
          const byId = id !== undefined ? x.id === Number(id) : true;
          const byRoutine = routineId !== undefined ? x.routineId === Number(routineId) : true;
          const byExercise = exerciseId !== undefined ? x.exerciseId === Number(exerciseId) : true;
          return byId && byRoutine && byExercise;
        }) || null;

      if (!re) return null;
      const base: any = { ...re };
      if (include?.exercise) base.exercise = db.exercises.find((e) => e.id === re.exerciseId) || null;
      if (include?.routine) base.routine = db.routines.find((r) => r.id === re.routineId) || null;
      return base;
    }),

    deleteMany: jest.fn(async ({ where }: any = {}) => {
      const before = db.routineExercises.length;
      db.routineExercises = db.routineExercises.filter((x) => {
        if (!where) return false;
        if (where.routineId !== undefined) return x.routineId !== Number(where.routineId);
        if (where.exerciseId !== undefined) return x.exerciseId !== Number(where.exerciseId);
        if (where.id && where.id.in) return !where.id.in.map(Number).includes(x.id);
        return true;
      });
      const after = db.routineExercises.length;
      return { count: before - after };
    }),
  };
}
