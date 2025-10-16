import RoutineService from "../src/services/routine.service";
import { ApiValidationError } from "../src/services/api-validation-error";
import { PrismaClient } from "@prisma/client";


declare const __seedMuscleGroups__: (rows: any[]) => void;
declare const __resetMuscleGroups__: () => void;
declare const __seedExercises__: (rows: any[]) => void;
declare const __resetExercises__: () => void;
declare const __seedRoutines__: (rows: any[]) => void;
declare const __resetRoutines__: () => void;
declare const __seedRoutineExercises__: (rows: any[]) => void;
declare const __resetRoutineExercises__: () => void;

describe("RoutineService", () => {
  const prisma = new PrismaClient();

  beforeEach(() => {
    jest.restoreAllMocks();

    __resetMuscleGroups__();
    __resetExercises__();
    __resetRoutines__();
    __resetRoutineExercises__();

    __seedMuscleGroups__([
      { id: 1, name: "Pecho" },
      { id: 2, name: "Espalda" },
    ]);

    __seedExercises__([
      { id: 1, name: "Press banca", muscleGroupId: 1 },
      { id: 2, name: "Jalón al pecho", muscleGroupId: 2 },
      { id: 3, name: "Aperturas", muscleGroupId: 1 },
    ]);

    __seedRoutines__([
      {
        id: 10,
        name: "Full Body",
        description: "Rutina general",
        level: "Beginner",
        duration: 45,
        icon: "💪",
        users: ["user_a"],
      },
      {
        id: 11,
        name: "Espalda Pro",
        description: "Back day",
        level: "Intermediate",
        duration: 60,
        icon: "🏋️",
        users: [],
      },
    ]);

    __seedRoutineExercises__([
      { id: 100, routineId: 10, exerciseId: 1, sets: 3, reps: 10, restTime: 60 },
      { id: 101, routineId: 10, exerciseId: 2, sets: 3, reps: 12, restTime: 60 },
      { id: 102, routineId: 11, exerciseId: 2, sets: 4, reps: 8, restTime: 90 },
    ]);
  });

  describe("list", () => {
    test("devuelve rutinas con ejercicios y muscleGroup anidados", async () => {
      const rows = await RoutineService.list();
      expect(Array.isArray(rows)).toBe(true);
  
      const r = rows.find((x: any) => x.id === 10)!;
      expect(r.exercises).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            exercise: expect.objectContaining({
              id: 1,
              muscleGroup: expect.objectContaining({ id: 1, name: "Pecho" }),
            }),
          }),
        ])
      );
    });
  });

  describe("getById", () => {
    test("devuelve la rutina con include", async () => {
      const r = await RoutineService.getById(10);
      expect(r?.id).toBe(10);
      expect(r?.exercises?.length).toBeGreaterThanOrEqual(1);
      expect(r?.exercises?.[0]?.exercise?.muscleGroup?.name).toBeDefined();
    });

    test("lanza 404 si no existe", async () => {
      await expect(RoutineService.getById(999)).rejects.toMatchObject({
        constructor: ApiValidationError,
        statusCode: 404,
        message: "Routine not found",
      });
    });
  });

  describe("create", () => {
    test("crea la rutina y sus exercises (createMany) y devuelve { ...routine, exercises: {count} }", async () => {
      const res = await RoutineService.create({
        name: "Push Day",
        description: "Pecho/Hombro/Tríceps",
        level: "Intermediate" as any,
        duration: 50,
        icon: "🔥",
        users: [],
        exercises: [
          { routineId: 0 as any, exerciseId: 1, sets: 3, reps: 10, restTime: 60 },
          { routineId: 0 as any, exerciseId: 3, sets: 3, reps: 12, restTime: 60 },
        ],
      });
      expect(res.id).toEqual(expect.any(Number));
      expect(res.name).toBe("Push Day");
  
      expect(res.exercises).toEqual(expect.objectContaining({ count: 2 }));
    });
  });

  describe("update", () => {
    test("actualiza campos básicos", async () => {
      const updated = await RoutineService.update(10, {
        name: "Full Body Beginner",
        duration: 55,
        icon: "✨",
      });
      expect(updated?.name).toBe("Full Body Beginner");
      expect(updated?.duration).toBe(55);
      expect(updated?.icon).toBe("✨");
    });

    test("reemplaza exercises por defecto (replaceExercises=true)", async () => {
      const before = await prisma.routineExercise.findMany({ where: { routineId: 10 } });
      expect(before.length).toBeGreaterThanOrEqual(1);

      const res = await RoutineService.update(10, {
        exercises: [
          { exerciseId: 3, sets: 4, reps: 10, restTime: 90 },
        ],
      });

      expect(res?.exercises?.length).toBe(1);
      expect(res?.exercises?.[0]?.exercise?.id).toBe(3);
    });

    test("agrega exercises sin reemplazar cuando replaceExercises=false", async () => {
      const before = await prisma.routineExercise.findMany({ where: { routineId: 11 } });
      expect(before.length).toBe(1);

      const res = await RoutineService.update(11, {
        replaceExercises: false,
        exercises: [{ exerciseId: 1, sets: 2, reps: 15, restTime: 45 }],
      });
      expect(res?.exercises?.length).toBeGreaterThanOrEqual(2);
      expect(res?.exercises?.some((re: any) => re.exercise?.id === 1)).toBe(true);
     });

    test("lanza 400 si alguno de los exerciseId no existe", async () => {
      await expect(
        RoutineService.update(10, {
          exercises: [{ exerciseId: 999, sets: 1, reps: 1, restTime: 1 }],
        })
      ).rejects.toMatchObject({
        constructor: ApiValidationError,
        statusCode: 400,
        message: "Some exerciseId do not exist",
      });
    });

    test("lanza 404 si la rutina no existe", async () => {
      await expect(
        RoutineService.update(999, { name: "X" })
      ).rejects.toMatchObject({
        constructor: ApiValidationError,
        statusCode: 404,
        message: "Routine not found",
      });
    });
  });

  describe("addExercise", () => {
    test("agrega un ejercicio a la rutina", async () => {
      const re = await RoutineService.addExercise(11, { exerciseId: 1, sets: 3, reps: 10, restTime: 60 });
      expect(re.id).toEqual(expect.any(Number));
      expect(re.exercise.id).toBe(1);
      const all = await prisma.routineExercise.findMany({ where: { routineId: 11 } });
      expect(all.some((x) => x.id === re.id)).toBe(true);
    });

    test("404 si rutina no existe", async () => {
      await expect(
        RoutineService.addExercise(999, { exerciseId: 1 })
      ).rejects.toMatchObject({
        constructor: ApiValidationError,
        statusCode: 404,
        message: "Routine not found",
      });
    });

    test("400 si exerciseId no existe", async () => {
      await expect(
        RoutineService.addExercise(10, { exerciseId: 999 })
      ).rejects.toMatchObject({
        constructor: ApiValidationError,
        statusCode: 400,
        message: "exerciseId invalid",
      });
    });
  });

  describe("updateRoutineExercise", () => {
    test("actualiza sets/reps/restTime", async () => {
      const re = await RoutineService.updateRoutineExercise(10, 100, { sets: 5, reps: 5, restTime: 30 });
      expect(re.sets).toBe(5);
      expect(re.reps).toBe(5);
      expect(re.restTime).toBe(30);
    });

    test("404 si no existe o pertenece a otra rutina", async () => {
      await expect(
        RoutineService.updateRoutineExercise(11, 100, { sets: 1 })
      ).rejects.toMatchObject({
        constructor: ApiValidationError,
        statusCode: 404,
        message: "Routine exercise not found",
      });

      await expect(
        RoutineService.updateRoutineExercise(10, 999, { sets: 1 })
      ).rejects.toMatchObject({
        constructor: ApiValidationError,
        statusCode: 404,
        message: "Routine exercise not found",
      });
    });
  });

  describe("removeRoutineExercise", () => {
    test("400 si la rutina quedaría con 0 ejercicios", async () => {
      await expect(
        RoutineService.removeRoutineExercise(11, 102)
      ).rejects.toMatchObject({
        constructor: ApiValidationError,
        statusCode: 400,
        message: "Routine cannot be left without exercises",
      });
    });

    test("404 si no existe o mismatch de rutina", async () => {
      await expect(
        RoutineService.removeRoutineExercise(10, 999)
      ).rejects.toMatchObject({
        constructor: ApiValidationError,
        statusCode: 404,
        message: "Routine exercise not found",
      });

      await expect(
        RoutineService.removeRoutineExercise(10, 102)
      ).rejects.toMatchObject({
        constructor: ApiValidationError,
        statusCode: 404,
        message: "Routine exercise not found",
      });
    });

    test("borra si la rutina tiene 2+ ejercicios", async () => {
      await expect(RoutineService.removeRoutineExercise(10, 100)).resolves.toBeUndefined();
      const left = await prisma.routineExercise.findMany({ where: { routineId: 10 } });
      expect(left.length).toBe(1);
      expect(left[0].id).toBe(101);
    });
  });

  describe("remove", () => {
    test("borra la rutina (y sus pivotes) si existe", async () => {
      await RoutineService.remove(11);
      const r = await prisma.routine.findUnique({ where: { id: 11 } });
      expect(r).toBeNull();
      const pivots = await prisma.routineExercise.findMany({ where: { routineId: 11 } });
      expect(pivots.length).toBe(0);
    });

    test("mapea P2025 a 404", async () => {
      const p = (RoutineService as any).prisma;
      (p.routine.delete as jest.Mock).mockClear();
      (p.routine.delete as jest.Mock).mockRejectedValueOnce({ code: "P2025" });

      await expect(RoutineService.remove(999)).rejects.toMatchObject({
        constructor: ApiValidationError,
        statusCode: 404,
        message: "Routine not found",
      });
      expect(p.routine.delete).toHaveBeenCalledTimes(1);
    });
  });

  describe("assign / unassign", () => {
    test("assign agrega usuario si no estaba", async () => {
      const res = await RoutineService.assign(11, "user_b");
      expect(res.users).toContain("user_b");
    });

    test("assign 404 si no existe rutina", async () => {
      await expect(RoutineService.assign(999, "u")).rejects.toMatchObject({
        constructor: ApiValidationError,
        statusCode: 404,
        message: "Routine not found",
      });
    });

    test("assign 400 si ya estaba", async () => {
      await expect(RoutineService.assign(10, "user_a")).rejects.toMatchObject({
        constructor: ApiValidationError,
        statusCode: 400,
        message: "User already assigned to routine",
      });
    });

    test("unassign quita usuario si estaba", async () => {
      const res = await RoutineService.unassign(10, "user_a");
      expect(res.users.includes("user_a")).toBe(false);
    });

    test("unassign 404 si rutina no existe", async () => {
      await expect(RoutineService.unassign(999, "u")).rejects.toMatchObject({
        constructor: ApiValidationError,
        statusCode: 404,
        message: "Routine not found",
      });
    });

    test("unassign 400 si usuario no estaba", async () => {
      await expect(RoutineService.unassign(10, "user_b")).rejects.toMatchObject({
        constructor: ApiValidationError,
        statusCode: 400,
        message: "User not assigned to routine",
      });
    });
  });

});
