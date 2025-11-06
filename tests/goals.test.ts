import request from "supertest";
import app from "../src/app";

declare const __setRole__: (role: "user" | "admin") => void;
declare const __setUserId__: (id: string) => void;
declare const __seedSedes__: (rows: any[]) => void;
declare const __resetSedes__: () => void;
declare const __seedGoals__: (rows: any[]) => void;
declare const __resetGoals__: () => void;
declare const __seedClasses__: (rows: any[]) => void;
declare const __resetClasses__: () => void;
declare const __seedRoutines__: (rows: any[]) => void;
declare const __resetRoutines__: () => void;

const ADMIN_BASE = "/admin/goals";

describe("Goals Management System", () => {
  beforeEach(() => {
    __resetGoals__();
    __resetSedes__();
    __resetClasses__();
    __resetRoutines__();

    __setRole__("admin");
    __setUserId__("admin_test_id");

    // Seed test data
    __seedSedes__([
      {
        id: 1,
        name: "Sede Centro",
        address: "Calle Principal 123",
        latitude: 10.5,
        longitude: -66.9,
        users: ["user1", "user2", "user3"],
      },
      {
        id: 2,
        name: "Sede Norte",
        address: "Avenida Norte 456",
        latitude: 10.6,
        longitude: -66.8,
        users: ["user4"],
      },
    ]);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    __seedClasses__([
      {
        id: 1,
        name: "Yoga Morning",
        description: "Morning yoga class",
        date: tomorrow,
        time: "08:00",
        capacity: 20,
        enrolled: 5,
        createdById: "admin_test_id",
        users: ["user1", "user2"],
        sedeId: 1,
      },
      {
        id: 2,
        name: "CrossFit Evening",
        description: "Evening crossfit",
        date: tomorrow,
        time: "18:00",
        capacity: 15,
        enrolled: 10,
        createdById: "admin_test_id",
        users: ["user3", "user4"],
        sedeId: 1,
      },
    ]);

    __seedRoutines__([
      {
        id: 1,
        name: "Beginner Routine",
        description: "For beginners",
        level: "Beginner",
        duration: 30,
        icon: "🔥",
        users: ["user1", "user2", "user3"],
        sedeId: 1,
      },
      {
        id: 2,
        name: "Advanced Routine",
        description: "For advanced",
        level: "Advanced",
        duration: 60,
        icon: "💪",
        users: ["user4"],
        sedeId: 2,
      },
    ]);
  });

  describe(`POST ${ADMIN_BASE}`, () => {
    test("should create a goal for user registrations", async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const res = await request(app).post(ADMIN_BASE).send({
        title: "Reach 100 users",
        description: "Goal to reach 100 registered users",
        category: "USER_REGISTRATIONS",
        targetValue: 100,
        endDate: tomorrow.toISOString(),
        sedeId: 1,
      });

      expect(res.status).toBe(201);
      expect(res.body).toEqual(
        expect.objectContaining({
          message: "Goal created successfully",
          goal: expect.objectContaining({
            id: expect.any(Number),
            title: "Reach 100 users",
            category: "USER_REGISTRATIONS",
            targetValue: 100,
            sedeId: 1,
            currentValue: expect.any(Number),
          }),
        })
      );
    });

    test("should create a goal for class enrollments with targetClassId", async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const res = await request(app).post(ADMIN_BASE).send({
        title: "Fill Yoga class",
        description: "Goal to fill yoga morning class",
        category: "CLASS_ENROLLMENTS",
        targetValue: 20,
        endDate: tomorrow.toISOString(),
        sedeId: 1,
        targetClassId: 1,
      });

      expect(res.status).toBe(201);
      expect(res.body.goal).toEqual(
        expect.objectContaining({
          title: "Fill Yoga class",
          category: "CLASS_ENROLLMENTS",
          targetClassId: 1,
          targetClass: expect.objectContaining({
            id: 1,
            name: "Yoga Morning",
          }),
        })
      );
    });

    test("should create a goal for routine assignments with targetRoutineId", async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const res = await request(app).post(ADMIN_BASE).send({
        title: "50 users on beginner routine",
        category: "ROUTINE_ASSIGNMENTS",
        targetValue: 50,
        endDate: tomorrow.toISOString(),
        sedeId: 1,
        targetRoutineId: 1,
      });

      expect(res.status).toBe(201);
      expect(res.body.goal).toEqual(
        expect.objectContaining({
          title: "50 users on beginner routine",
          category: "ROUTINE_ASSIGNMENTS",
          targetRoutineId: 1,
          targetRoutine: expect.objectContaining({
            id: 1,
            name: "Beginner Routine",
          }),
        })
      );
    });

    test("should fail validation when title is too short", async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const res = await request(app).post(ADMIN_BASE).send({
        title: "Hi",
        category: "USER_REGISTRATIONS",
        targetValue: 100,
        endDate: tomorrow.toISOString(),
        sedeId: 1,
      });

      expect(res.status).toBe(400);
      expect(res.body).toEqual(
        expect.objectContaining({
          error: expect.any(String),
        })
      );
    });

    test("should fail when targetClassId is missing for CLASS_ENROLLMENTS", async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const res = await request(app).post(ADMIN_BASE).send({
        title: "Fill class",
        category: "CLASS_ENROLLMENTS",
        targetValue: 20,
        endDate: tomorrow.toISOString(),
        sedeId: 1,
      });

      expect(res.status).toBe(400);
    });

    test("should fail when targetRoutineId is missing for ROUTINE_ASSIGNMENTS", async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const res = await request(app).post(ADMIN_BASE).send({
        title: "Assign routine",
        category: "ROUTINE_ASSIGNMENTS",
        targetValue: 50,
        endDate: tomorrow.toISOString(),
        sedeId: 1,
      });

      expect(res.status).toBe(400);
    });

    test("should fail when endDate is in the past", async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const res = await request(app).post(ADMIN_BASE).send({
        title: "Past goal",
        category: "USER_REGISTRATIONS",
        targetValue: 100,
        endDate: yesterday.toISOString(),
        sedeId: 1,
      });

      expect(res.status).toBe(400);
    });

    test("should fail when targetClassId does not belong to sedeId", async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const res = await request(app).post(ADMIN_BASE).send({
        title: "Wrong sede class",
        category: "CLASS_ENROLLMENTS",
        targetValue: 20,
        endDate: tomorrow.toISOString(),
        sedeId: 2,
        targetClassId: 1, // Class 1 belongs to sede 1, not 2
      });

      expect(res.status).toBe(400);
      expect(res.body).toEqual(
        expect.objectContaining({
          error: expect.stringContaining("does not belong"),
        })
      );
    });

    test("should fail when targetRoutineId does not belong to sedeId", async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const res = await request(app).post(ADMIN_BASE).send({
        title: "Wrong sede routine",
        category: "ROUTINE_ASSIGNMENTS",
        targetValue: 50,
        endDate: tomorrow.toISOString(),
        sedeId: 1,
        targetRoutineId: 2, // Routine 2 belongs to sede 2, not 1
      });

      expect(res.status).toBe(400);
      expect(res.body).toEqual(
        expect.objectContaining({
          error: expect.stringContaining("does not belong"),
        })
      );
    });
  });

  describe(`GET ${ADMIN_BASE}?sedeId={sedeId}`, () => {
    beforeEach(() => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      __seedGoals__([
        {
          id: 1,
          title: "Goal 1 for Sede 1",
          description: "Description 1",
          category: "USER_REGISTRATIONS",
          targetValue: 100,
          currentValue: 3,
          startDate: new Date(),
          endDate: futureDate,
          sedeId: 1,
          targetClassId: null,
          targetRoutineId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          title: "Goal 2 for Sede 1",
          description: "Description 2",
          category: "CLASS_ENROLLMENTS",
          targetValue: 20,
          currentValue: 5,
          startDate: new Date(),
          endDate: futureDate,
          sedeId: 1,
          targetClassId: 1,
          targetRoutineId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 3,
          title: "Goal for Sede 2",
          description: "Description 3",
          category: "USER_REGISTRATIONS",
          targetValue: 50,
          currentValue: 1,
          startDate: new Date(),
          endDate: futureDate,
          sedeId: 2,
          targetClassId: null,
          targetRoutineId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
    });

    test("should get all goals for a specific sede", async () => {
      const res = await request(app).get(`${ADMIN_BASE}?sedeId=1`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          goals: expect.any(Array),
          total: 2,
        })
      );
      expect(res.body.goals).toHaveLength(2);
      expect(res.body.goals.every((g: any) => g.sedeId === 1)).toBe(true);
    });

    test("should return empty array when sede has no goals", async () => {
      __resetGoals__();
      const res = await request(app).get(`${ADMIN_BASE}?sedeId=1`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        goals: [],
        total: 0,
      });
    });

    test("should fail validation when sedeId is missing", async () => {
      const res = await request(app).get(ADMIN_BASE);

      expect(res.status).toBe(400);
    });
  });

  describe(`GET ${ADMIN_BASE}/:id`, () => {
    beforeEach(() => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      __seedGoals__([
        {
          id: 1,
          title: "Specific Goal",
          description: "A specific goal",
          category: "ROUTINE_ASSIGNMENTS",
          targetValue: 50,
          currentValue: 3,
          startDate: new Date(),
          endDate: futureDate,
          sedeId: 1,
          targetClassId: null,
          targetRoutineId: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
    });

    test("should get a specific goal by ID", async () => {
      const res = await request(app).get(`${ADMIN_BASE}/1`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          goal: expect.objectContaining({
            id: 1,
            title: "Specific Goal",
            category: "ROUTINE_ASSIGNMENTS",
            currentValue: expect.any(Number),
          }),
        })
      );
    });

    test("should return 404 when goal does not exist", async () => {
      const res = await request(app).get(`${ADMIN_BASE}/999`);

      expect(res.status).toBe(404);
      expect(res.body).toEqual(
        expect.objectContaining({
          error: "Goal not found",
        })
      );
    });
  });

  describe(`PUT ${ADMIN_BASE}/:id`, () => {
    beforeEach(() => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      __seedGoals__([
        {
          id: 1,
          title: "Original Title",
          description: "Original description",
          category: "USER_REGISTRATIONS",
          targetValue: 100,
          currentValue: 0,
          startDate: new Date(),
          endDate: futureDate,
          sedeId: 1,
          targetClassId: null,
          targetRoutineId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
    });

    test("should update a goal", async () => {
      const newEndDate = new Date();
      newEndDate.setDate(newEndDate.getDate() + 60);

      const res = await request(app).put(`${ADMIN_BASE}/1`).send({
        title: "Updated Title",
        targetValue: 150,
        endDate: newEndDate.toISOString(),
      });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          message: "Goal updated successfully",
          goal: expect.objectContaining({
            id: 1,
            title: "Updated Title",
            targetValue: 150,
          }),
        })
      );
    });

    test("should fail when goal does not exist", async () => {
      const res = await request(app).put(`${ADMIN_BASE}/999`).send({
        title: "Updated Title",
      });

      expect(res.status).toBe(404);
    });

    test("should fail validation with invalid data", async () => {
      const res = await request(app).put(`${ADMIN_BASE}/1`).send({
        title: "AB", // Too short
      });

      expect(res.status).toBe(400);
    });
  });

  describe(`DELETE ${ADMIN_BASE}/:id`, () => {
    beforeEach(() => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      __seedGoals__([
        {
          id: 1,
          title: "Goal to delete",
          description: null,
          category: "USER_REGISTRATIONS",
          targetValue: 100,
          currentValue: 0,
          startDate: new Date(),
          endDate: futureDate,
          sedeId: 1,
          targetClassId: null,
          targetRoutineId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
    });

    test("should delete a goal", async () => {
      const res = await request(app).delete(`${ADMIN_BASE}/1`);

      expect(res.status).toBe(204);
    });

    test("should fail when goal does not exist", async () => {
      const res = await request(app).delete(`${ADMIN_BASE}/999`);

      expect(res.status).toBe(404);
    });
  });

  describe("Current Value Calculation", () => {
    test("should calculate currentValue for USER_REGISTRATIONS", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      __seedGoals__([
        {
          id: 1,
          title: "User Registration Goal",
          description: null,
          category: "USER_REGISTRATIONS",
          targetValue: 100,
          currentValue: 0,
          startDate: new Date(),
          endDate: futureDate,
          sedeId: 1,
          targetClassId: null,
          targetRoutineId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const res = await request(app).get(`${ADMIN_BASE}/1`);

      expect(res.status).toBe(200);
      // Sede 1 has 3 users
      expect(res.body.goal.currentValue).toBe(3);
    });

    test("should calculate currentValue for CLASS_ENROLLMENTS", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      __seedGoals__([
        {
          id: 1,
          title: "Class Enrollment Goal",
          description: null,
          category: "CLASS_ENROLLMENTS",
          targetValue: 20,
          currentValue: 0,
          startDate: new Date(),
          endDate: futureDate,
          sedeId: 1,
          targetClassId: 1,
          targetRoutineId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const res = await request(app).get(`${ADMIN_BASE}/1`);

      expect(res.status).toBe(200);
      // Class 1 has enrolled = 5
      expect(res.body.goal.currentValue).toBe(5);
    });

    test("should calculate currentValue for ROUTINE_ASSIGNMENTS", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      __seedGoals__([
        {
          id: 1,
          title: "Routine Assignment Goal",
          description: null,
          category: "ROUTINE_ASSIGNMENTS",
          targetValue: 50,
          currentValue: 0,
          startDate: new Date(),
          endDate: futureDate,
          sedeId: 1,
          targetRoutineId: 1,
          targetClassId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const res = await request(app).get(`${ADMIN_BASE}/1`);

      expect(res.status).toBe(200);
      // Routine 1 has 3 users
      expect(res.body.goal.currentValue).toBe(3);
    });
  });
});
