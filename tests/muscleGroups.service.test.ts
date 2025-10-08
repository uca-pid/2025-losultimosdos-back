import { PrismaClient } from "@prisma/client";
import { ApiValidationError } from "../src/services/api-validation-error";
import MuscleGroupService from "../src/services/muscle-group.service";

declare const __seedMuscleGroups__: (rows: any[]) => void;
declare const __resetMuscleGroups__: () => void;
declare const __seedExercises__: (rows: any[]) => void;
declare const __resetExercises__: () => void;

describe("MuscleGroupService (con mock global de setup.ts)", () => {
  const prisma = new PrismaClient();

  beforeEach(() => {
    __resetMuscleGroups__();
    __resetExercises__();
    __seedMuscleGroups__([
      { id: 1, name: "Pecho" },
      { id: 2, name: "Espalda" },
    ]);
    __seedExercises__([
      { id: 1, name: "Press banca", muscleGroupId: 1 },
      { id: 2, name: "Jalón al pecho", muscleGroupId: 2 },
    ]);
    jest.restoreAllMocks();
  });

  describe("list", () => {
    test("devuelve todos los grupos", async () => {
      const items = await MuscleGroupService.list();
      expect(items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 1, name: "Pecho" }),
          expect.objectContaining({ id: 2, name: "Espalda" }),
        ])
      );
    });
  });

  describe("create", () => {
    test("lanza ApiValidationError si name ya existe (case-insensitive)", async () => {
      await expect(MuscleGroupService.create("pecho")).rejects.toBeInstanceOf(
        ApiValidationError
      );
      await expect(MuscleGroupService.create("pecho")).rejects.toHaveProperty(
        "message",
        "Muscle group already exists"
      );
      await expect(MuscleGroupService.create("pecho")).rejects.toHaveProperty(
        "statusCode",
        400
      );
    });

    test("crea capitalizando el name", async () => {
      const mg = await MuscleGroupService.create("hombros");
      expect(mg).toEqual(
        expect.objectContaining({ id: expect.any(Number), name: "Hombros" })
      );
    });

    test("lanza 400 si falta name", async () => {
      await expect(MuscleGroupService.create("" as any)).rejects.toBeInstanceOf(
        ApiValidationError
      );
      await expect(MuscleGroupService.create("" as any)).rejects.toHaveProperty(
        "message",
        "Name is required"
      );
    });
  });

  describe("update", () => {
    test("lanza ApiValidationError si el name ya existe en otro id (case-insensitive)", async () => {
      await expect(MuscleGroupService.update(1, "ESPALDA")).rejects.toBeInstanceOf(
        ApiValidationError
      );
      await expect(MuscleGroupService.update(1, "ESPALDA")).rejects.toHaveProperty(
        "message",
        "Muscle group already exists"
      );
    });

    test("actualiza el nombre", async () => {
      const mg = await MuscleGroupService.update(1, "Pectorales");
      expect(mg).toEqual({ id: 1, name: "Pectorales" });
    });

    test("lanza 400 si falta name", async () => {
      await expect(MuscleGroupService.update(1, "" as any)).rejects.toBeInstanceOf(
        ApiValidationError
      );
      await expect(MuscleGroupService.update(1, "" as any)).rejects.toHaveProperty(
        "message",
        "Name is required"
      );
    });
  });

  describe("remove", () => {
    test("lanza 404 si el grupo no existe", async () => {
      await expect(MuscleGroupService.remove(999)).rejects.toBeInstanceOf(ApiValidationError);
      await expect(MuscleGroupService.remove(999)).rejects.toHaveProperty(
        "message",
        "Muscle group not found"
      );
    });

    test("lanza 400 si el grupo es 'Generico' (case-insensitive)", async () => {
      const gen = await MuscleGroupService.create("generico");
      await expect(MuscleGroupService.remove(gen.id)).rejects.toBeInstanceOf(ApiValidationError);
      await expect(MuscleGroupService.remove(gen.id)).rejects.toHaveProperty(
        "message",
        "Cannot delete the Generico group"
      );
    });

    test("si no existe 'Generico', lo crea y elimina el grupo", async () => {
      const pre = await prisma.muscleGroup.findFirst({
        where: { name: { equals: "Generico", mode: "insensitive" } },
      });
      expect(pre).toBeNull();

      const mg = await prisma.muscleGroup.create({ data: { name: "Piernas" } });
      await prisma.exercise.create({
        data: { name: "Sentadilla", muscleGroupId: mg.id },
      });

      await MuscleGroupService.remove(mg.id);

      const gen = await prisma.muscleGroup.findFirst({
        where: { name: { equals: "Generico", mode: "insensitive" } },
      });
      expect(gen).toBeTruthy();

      const still = await prisma.muscleGroup.findUnique({ where: { id: mg.id } });
      expect(still).toBeNull();
    });

    test("si ya existe 'Generico', lo reutiliza y elimina el grupo", async () => {
      const generic = await prisma.muscleGroup.create({ data: { name: "Generico" } });
      const mg = await prisma.muscleGroup.create({ data: { name: "Antebrazos" } });
      await prisma.exercise.create({ data: { name: "Curl inverso", muscleGroupId: mg.id } });

      await MuscleGroupService.remove(mg.id);

      const gen = await prisma.muscleGroup.findUnique({ where: { id: generic.id } });
      expect(gen).toBeTruthy();

      const removed = await prisma.muscleGroup.findUnique({ where: { id: mg.id } });
      expect(removed).toBeNull();
    });
  });
});
