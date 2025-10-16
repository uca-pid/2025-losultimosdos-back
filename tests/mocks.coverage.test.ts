import { clerkMiddleware, clerkClient, getAuth, requireAuth } from "./mocks/clerk";
import { verifyWebhook } from "./mocks/clerk-webhooks";
import { PrismaClient } from "./mocks/prisma";

describe("Mocks coverage smoke", () => {
  test("clerk middleware & helpers", async () => {
    const req: any = {};
    const res: any = {};
    const next = jest.fn();

    const mw = clerkMiddleware();
    mw(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.auth).toEqual(
      expect.objectContaining({ userId: expect.any(String), userRole: expect.any(String) })
    );

    expect(getAuth(req)).toEqual(expect.objectContaining({ userId: expect.any(String) }));
    expect(getAuth({} as any)).toEqual(expect.objectContaining({ userId: expect.any(String) }));

    const ra = requireAuth();
    const next2 = jest.fn();
    ra({} as any, {} as any, next2);
    expect(next2).toHaveBeenCalled();

    const u1 = await clerkClient.users.getUser("user_1");
    expect(u1).toEqual(expect.objectContaining({ id: "user_1" }));

    const upd = await clerkClient.users.updateUser();
    expect(upd).toEqual(expect.any(Object));

    const list = await clerkClient.users.getUserList();
    expect(Array.isArray((list as any).data)).toBe(true);
  });

  test("clerk webhooks mock", async () => {
    const payload = await verifyWebhook({} as any);
    expect(payload).toEqual(
      expect.objectContaining({
        type: "user.created",
        data: expect.objectContaining({ id: "u_123" }),
      })
    );
  });

  test("prisma mock – classes CRUD & counters & users array ops", async () => {
    const prisma = new PrismaClient() as any;

    const c = await prisma.class.create({
      data: {
        name: "Funcional",
        description: "desc",
        date: new Date("2025-10-01T10:00:00Z"),
        time: "10:00",
        capacity: 10,
        enrolled: 0,
        createdById: "admin_test_id",
        users: [],
      },
    });
    expect(c.id).toEqual(expect.any(Number));

    const c2 = await prisma.class.update({
      where: { id: c.id },
      data: {
        enrolled: { increment: 2 },
        users: { push: "user_1" } as any,
      },
    });
    expect(c2.enrolled).toBe(2);
    expect(c2.users).toContain("user_1");

    const c3 = await prisma.class.update({
      where: { id: c.id },
      data: {
        enrolled: { decrement: 1 },
        users: { set: ["user_1", "user_2"] } as any,
      },
    });
    expect(c3.enrolled).toBe(1);
    expect(c3.users).toEqual(["user_1", "user_2"]);

    const my = await prisma.class.findMany({ where: { users: { has: "user_2" } } as any });
    expect(my.some((x: any) => x.id === c.id)).toBe(true);

    const del = await prisma.class.delete({ where: { id: c.id } });
    expect(del.id).toBe(c.id);
  });

  test("prisma mock – muscleGroup + exercises + counts + updateMany", async () => {
    const prisma = new PrismaClient() as any;

    const pecho = await prisma.muscleGroup.create({ data: { name: "Pecho" } });
    const espalda = await prisma.muscleGroup.create({ data: { name: "Espalda" } });
    expect(pecho.id).toEqual(expect.any(Number));
    expect(espalda.id).toEqual(expect.any(Number));

    const e1 = await prisma.exercise.create({ data: { name: "Press banca", muscleGroupId: pecho.id } });
    const e2 = await prisma.exercise.create({ data: { name: "Aperturas", muscleGroupId: pecho.id } });
    const e3 = await prisma.exercise.create({ data: { name: "Jalón pecho", muscleGroupId: espalda.id } });
    expect(e1.id && e2.id && e3.id).toBeTruthy();

 
    const mgWithEx: any[] = await prisma.muscleGroup.findMany({
      include: { exercises: true } as any,
    });
    const pechoWithEx: any = mgWithEx.find((m: any) => m.id === pecho.id)!;
    expect(pechoWithEx.exercises).toHaveLength(2);

    const mgWithCount: any[] = await prisma.muscleGroup.findMany({
      include: { _count: true } as any,
    });
    const pechoWithCount: any = mgWithCount.find((m: any) => m.id === pecho.id)!;
    expect(pechoWithCount._count.exercises).toBe(2);

    const pechoWith: any = await prisma.muscleGroup.findUnique({
      where: { id: pecho.id },
      include: { exercises: true, _count: true } as any,
    });
    expect(pechoWith?._count.exercises).toBe(2);

    const moved = await prisma.exercise.updateMany({
      where: { muscleGroupId: pecho.id } as any,
      data: { muscleGroupId: { set: espalda.id } as any },
    });
    expect(moved.count).toBeGreaterThanOrEqual(1);

    const espaldaCount: any = await prisma.muscleGroup.findUnique({
      where: { id: espalda.id },
      include: { _count: true } as any,
    });
    expect(espaldaCount?._count.exercises).toBeGreaterThanOrEqual(2);

    const deleted = await prisma.muscleGroup.delete({ where: { id: pecho.id } });
    expect(deleted.id).toBe(pecho.id);
  });

  test("prisma mock – routines tree + routineExercises ops & composite delete", async () => {
    const prisma = new PrismaClient() as any;

    const mg = await prisma.muscleGroup.create({ data: { name: "Hombros" } });
    const exA = await prisma.exercise.create({ data: { name: "Press militar", muscleGroupId: mg.id } });
    const exB = await prisma.exercise.create({ data: { name: "Elevaciones laterales", muscleGroupId: mg.id } });

    const r = await prisma.routine.create({
      data: { name: "Shoulders Day", description: "desc", level: "Beginner", duration: 30, icon: "🔥", users: [] },
    });

    const cm = await prisma.routineExercise.createMany({
      data: [
        { routineId: r.id, exerciseId: exA.id, sets: 3, reps: 10, restTime: 60 },
        { routineId: r.id, exerciseId: exB.id, sets: 3, reps: 12, restTime: 60 },
      ],
    });
    expect(cm.count).toBe(2);

    const list: any[] = await prisma.routine.findMany({
      include: {
        exercises: { include: { exercise: { include: { muscleGroup: true } } } } as any,
        _count: true,
      } as any,
    });
    const found: any = list.find((x: any) => x.id === r.id)!;
    expect(found._count.exercises).toBeGreaterThanOrEqual(2);
    expect(found.exercises[0].exercise.muscleGroup.name).toBe("Hombros");

    const up1 = await prisma.routine.update({ where: { id: r.id }, data: { users: { push: "user_1" } } as any });
    expect(up1.users).toContain("user_1");
    const up2 = await prisma.routine.update({ where: { id: r.id }, data: { users: { set: ["user_2"] } } as any });
    expect(up2.users).toEqual(["user_2"]);

    const pivots: any[] = await prisma.routineExercise.findMany({ where: { routineId: r.id }, include: { exercise: true } as any });
    expect(pivots).toHaveLength(2);

    const one: any = await prisma.routineExercise.findUnique({ where: { id: pivots[0].id }, include: { routine: true } as any });
    expect(one?.routine?.id).toBe(r.id);

    const first: any = await prisma.routineExercise.findFirst({ where: { routineId: r.id } });
    expect(first?.id).toEqual(expect.any(Number));

    const updated: any = await prisma.routineExercise.update({
      where: { id: pivots[0].id },
      data: { sets: 5, reps: 5, restTime: 120 },
      include: { exercise: true, routine: true } as any,
    });
    expect(updated.sets).toBe(5);
    expect(updated.exercise?.id).toBeDefined();

    const del: any = await prisma.routineExercise.delete({
      where: { routineId_exerciseId: { routineId: r.id, exerciseId: exB.id } } as any,
    });
    expect(del.exerciseId).toBe(exB.id);

    const delMany = await prisma.routineExercise.deleteMany({ where: { routineId: r.id } });
    expect(delMany.count).toBeGreaterThanOrEqual(1);

    const rdel = await prisma.routine.delete({ where: { id: r.id } });
    expect(rdel.id).toBe(r.id);
  });
});
