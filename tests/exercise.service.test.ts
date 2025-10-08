import ExerciseService from "../src/services/excersice.service";
import { ApiValidationError } from "../src/services/api-validation-error";
declare const __seedMuscleGroups__: (rows: any[]) => void;
declare const __seedExercises__: (rows: any[]) => void;
declare const __resetExercises__: () => void;
declare const __resetMuscleGroups__: () => void;
declare const __seedRoutines__: (rows: any[]) => void;
declare const __resetRoutines__: () => void;
declare const __seedRoutineExercises__: (rows: any[]) => void;
declare const __resetRoutineExercises__: () => void;
describe("ExerciseService", () => {
  beforeEach(() => {
    __resetExercises__();
    __resetMuscleGroups__();
    __resetRoutines__();
    __resetRoutineExercises__();
    __seedMuscleGroups__([
      { id: 1, name: "Pecho" },
      { id: 2, name: "Espalda" },
    ]);
    __seedExercises__([
      { id: 1, name: "Press banca", muscleGroupId: 1 },
      { id: 2, name: "Jalón al pecho", muscleGroupId: 2 },
    ]);
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });
  describe("list", () => {
    test("arma el where y el include correctamente", async () => {
      const prisma = (ExerciseService as any).prisma;
      const spy = jest.spyOn(prisma.exercise, "findMany");
      await ExerciseService.list({ q: "press", muscleGroupId: 1 });
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          where: {
            AND: [
              { name: { contains: "press", mode: "insensitive" } },
              { muscleGroupId: 1 },
            ],
          },
          orderBy: { id: "desc" },
          include: { muscleGroup: true },
        })
      );
    });
  });
  describe("create", () => {
    test("crea ejercicio cuando el muscleGroup existe", async () => {
      const result = await ExerciseService.create({
        name: "Cruces en polea",
        muscleGroupId: 1,
      });
      expect(result).toEqual(
        expect.objectContaining({
          id: expect.any(Number),
          name: "Cruces en polea",
          muscleGroupId: 1,
        })
      );
    });
    test("lanza ApiValidationError cuando el muscleGroup no existe", async () => {
      await expect(
        ExerciseService.create({ name: "Remo con barra", muscleGroupId: 999 })
      ).rejects.toMatchObject({
        constructor: ApiValidationError,
        message: "muscleGroupId invalid",
        statusCode: 400,
      });
    });
  });
  describe("update", () => {
    test("actualiza nombre y mantiene MG", async () => {
      const updated = await ExerciseService.update(1, {
        name: "Press banca plano",
      });
      expect(updated).toEqual({
        id: 1,
        name: "Press banca plano",
        muscleGroupId: 1,
      });
    });
    test("actualiza muscleGroupId válido", async () => {
      const updated = await ExerciseService.update(1, { muscleGroupId: 2 });
      expect(updated).toEqual({ id: 1, name: "Press banca", muscleGroupId: 2 });
    });
    test("lanza ApiValidationError si muscleGroupId es inválido", async () => {
      await expect(
        ExerciseService.update(1, { muscleGroupId: 999 })
      ).rejects.toMatchObject({
        constructor: ApiValidationError,
        message: "muscleGroupId invalid",
        statusCode: 400,
      });
    });
    test("mapea P2025 a 404 Exercise not found", async () => {
      const prisma = (ExerciseService as any).prisma;
      (prisma.exercise.update as jest.Mock).mockClear();
      (prisma.exercise.update as jest.Mock).mockRejectedValueOnce({
        code: "P2025",
      });
      await expect(
        ExerciseService.update(999, { name: "x" })
      ).rejects.toMatchObject({
        constructor: ApiValidationError,
        message: "Exercise not found",
        statusCode: 404,
      });
      expect(prisma.exercise.update).toHaveBeenCalledTimes(1);
      expect(prisma.exercise.update).toHaveBeenCalledWith({
        where: { id: 999 },
        data: { name: "x" },
      });
    });
  });
  describe("getExerciseUsage", () => {
    test("retorna rutinas que usan el ejercicio (stub prisma.routine.findMany)", async () => {
      const prisma = (ExerciseService as any).prisma;
      const spy = jest.spyOn(prisma.routine, "findMany").mockResolvedValue([
        { id: 10, name: "Full Body" },
        { id: 11, name: "Espalda y bíceps" },
      ]);
      const routines = await ExerciseService.getExerciseUsage(2);
      expect(spy).toHaveBeenCalledWith({
        where: { exercises: { some: { exerciseId: 2 } } },
        select: { id: true, name: true },
      });
      expect(routines).toEqual([
        { id: 10, name: "Full Body" },
        { id: 11, name: "Espalda y bíceps" },
      ]);
    });
  });
  describe("remove", () => {
    test("elimina si existe y no tiene uso en rutinas", async () => {
      const prisma = (ExerciseService as any).prisma;
      jest
        .spyOn(prisma.exercise, "findUnique")
        .mockResolvedValue({
          id: 1,
          name: "Press banca",
          muscleGroupId: 1,
          muscleGroup: { id: 1, name: "Pecho" },
        });
      const usageSpy = jest
        .spyOn(ExerciseService as any, "getExerciseUsage")
        .mockResolvedValue([]);
      const deleteSpy = jest.spyOn(prisma.exercise, "delete");
      await expect(ExerciseService.remove(1)).resolves.toBeUndefined();
      expect(usageSpy).toHaveBeenCalledWith(1);
      expect(deleteSpy).toHaveBeenCalledWith({ where: { id: 1 } });
    });
    test("lanza 404 si el ejercicio no existe", async () => {
      const prisma = (ExerciseService as any).prisma;
      jest.spyOn(prisma.exercise, "findUnique").mockResolvedValue(null);
      await expect(ExerciseService.remove(999)).rejects.toMatchObject({
        constructor: ApiValidationError,
        message: "Exercise not found",
        statusCode: 404,
      });
    });
    test("lanza 409 si el ejercicio está en rutinas", async () => {
      const prisma = (ExerciseService as any).prisma;
      jest
        .spyOn(prisma.exercise, "findUnique")
        .mockResolvedValue({
          id: 2,
          name: "Jalón al pecho",
          muscleGroupId: 2,
          muscleGroup: { id: 2, name: "Espalda" },
        });
      jest.spyOn(ExerciseService as any, "getExerciseUsage").mockResolvedValue([
        { id: 10, name: "Espalda Pro" },
        { id: 11, name: "Full Body" },
      ]);
      await expect(ExerciseService.remove(2)).rejects.toMatchObject({
        constructor: ApiValidationError,
        statusCode: 409,
      });
      await ExerciseService.remove(2).catch((e: any) => {
        expect(e.message).toMatch(
          /Cannot delete exercise "Jalón al pecho": It is currently used in the following routines: Espalda Pro, Full Body/
        );
      });
    });
    test("lanza 500 si falla el delete (error genérico)", async () => {
      const prisma = (ExerciseService as any).prisma;
      jest
        .spyOn(prisma.exercise, "findUnique")
        .mockResolvedValue({
          id: 1,
          name: "Press banca",
          muscleGroupId: 1,
          muscleGroup: { id: 1, name: "Pecho" },
        });
      jest
        .spyOn(ExerciseService as any, "getExerciseUsage")
        .mockResolvedValue([]);
      jest
        .spyOn(prisma.exercise, "delete")
        .mockRejectedValue(new Error("DB down"));
      await expect(ExerciseService.remove(1)).rejects.toMatchObject({
        constructor: ApiValidationError,
        statusCode: 500,
        message: "Failed to delete exercise",
      });
    });
  });
});
