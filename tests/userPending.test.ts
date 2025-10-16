import request from "supertest";
import app from "../src/app";
import RoutineService from "../src/services/routine.service";


jest.mock("../src/services/user.service", () => ({
  __esModule: true,
  default: {
    getUserById: jest.fn(),
  },
}));

declare const __setUserId__: (id: string) => void;
declare const __setRole__: (role: "user" | "admin") => void;

describe("User endpoints extra coverage (/user)", () => {
  beforeEach(() => {
    __setUserId__("user_test_id");
    __setRole__("user");
    jest.restoreAllMocks();
  });

  describe("GET /user/routines", () => {
    test("devuelve las rutinas del usuario autenticado", async () => {
      const mockRoutines = [
        {
          id: 101,
          name: "Full Body Beginner",
          description: "Rutina básica",
          level: "Beginner",
          duration: 45,
          icon: "💪",
          users: ["user_test_id"],
        },
        {
          id: 102,
          name: "Push Day",
          description: "Pecho/Hombro/Tríceps",
          level: "Intermediate",
          duration: 60,
          icon: "🏋️",
          users: ["user_test_id"],
        },
      ];

      const spy = jest
        .spyOn(RoutineService, "getByUserId")
        .mockResolvedValue(mockRoutines as any);

      const res = await request(app).get("/user/routines");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.routines)).toBe(true);
      expect(res.body.routines).toHaveLength(2);
      expect(res.body.routines[0].id).toBe(101);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith("user_test_id");
    });



  });

  describe("GET /user/:userId", () => {
    test("devuelve el usuario por id (vía UserService/Clerk)", async () => {
      const userService = (await import("../src/services/user.service")).default as unknown as {
        getUserById: jest.Mock;
      };

      const mockUser = {
        id: "user_abc",
        firstName: "Jane",
        lastName: "Doe",
        email: "jane@example.com",
        imageUrl: "https://example.com/jane.jpg",
        createdAt: new Date("2025-09-30").toISOString(),
        publicMetadata: { role: "user" },
      };

      userService.getUserById.mockResolvedValue(mockUser);

      const res = await request(app).get("/user/user_abc");

      expect(res.status).toBe(200);
      expect(res.body).toEqual(expect.objectContaining({ id: "user_abc" }));
      expect(userService.getUserById).toHaveBeenCalledTimes(1);
      expect(userService.getUserById).toHaveBeenCalledWith("user_abc");
    });
  });
});
