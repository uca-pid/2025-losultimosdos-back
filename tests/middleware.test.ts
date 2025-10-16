import { Request, Response } from "express";
import { User } from "@clerk/express";
import { clerkClient } from "@clerk/express";
import checkAdminRole from "../src/middleware/admin";
import checkUserRole from "../src/middleware/user";

jest.mock("@clerk/express", () => {
  return {
    clerkClient: {
      users: {
        getUser: jest.fn(),
      },
    },
    getAuth: (req: any) => ({
      userId: req?.auth?.userId ?? null,
    }),
    requireAuth: () => (_req: any, _res: any, next: any) => next(),
  };
});

describe("Middleware", () => {
  let mockReq: Partial<Request & { auth: Partial<User> & { userId: string } }>;
  let mockRes: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    mockReq = {
      auth: {
        userId: "test_user_id",
        id: "test_user_id",
        passwordEnabled: true,
        totpEnabled: false,
        backupCodeEnabled: false,
        twoFactorEnabled: false,
        banned: false,
        createdAt: 123456789,
        updatedAt: 123456789,
        username: "testuser",
        firstName: "Test",
        lastName: "User",
        emailAddresses: [],
        primaryEmailAddressId: null,
        primaryPhoneNumberId: null,
        primaryWeb3WalletId: null,
        lastSignInAt: null,
        externalId: null,
        publicMetadata: {},
        privateMetadata: {},
        unsafeMetadata: {},
        profileImageUrl: "",
        imageUrl: "",
        gender: "",
        birthday: "",
      } as any,
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFunction = jest.fn();
    jest.clearAllMocks();
  });

  describe("Admin Middleware", () => {
    test("allows admin access in test environment", async () => {
      process.env.NODE_ENV = "test";
      (mockReq as any).auth.userRole = "admin";

      await checkAdminRole(
        mockReq as Request,
        mockRes as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test("blocks non-admin access in test environment", async () => {
      process.env.NODE_ENV = "test";
      (mockReq as any).auth.userRole = "user";

      await checkAdminRole(
        mockReq as Request,
        mockRes as Response,
        nextFunction
      );

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Access denied",
        message: "Admin only",
      });
    });

    test("allows admin access in production", async () => {
      process.env.NODE_ENV = "production";
      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        publicMetadata: { role: "admin" },
      });

      await checkAdminRole(
        mockReq as Request,
        mockRes as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
    });

    test("blocks non-admin access in production", async () => {
      process.env.NODE_ENV = "production";
      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        publicMetadata: { role: "user" },
      });

      await checkAdminRole(
        mockReq as Request,
        mockRes as Response,
        nextFunction
      );

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Access denied",
        message: "Admin only",
      });
    });

    test("handles unauthorized access", async () => {
      mockReq.auth = undefined;

      await checkAdminRole(
        mockReq as Request,
        mockRes as Response,
        nextFunction
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    });

    test("handles Clerk API errors", async () => {
      process.env.NODE_ENV = "production";
      (clerkClient.users.getUser as jest.Mock).mockRejectedValue(
        new Error("API Error")
      );

      await checkAdminRole(
        mockReq as Request,
        mockRes as Response,
        nextFunction
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Internal server error",
      });
    });
  });

  describe("User Middleware", () => {
    test("allows user access in test environment", async () => {
      process.env.NODE_ENV = "test";
      (mockReq as any).auth = { userId: "user_test_id", userRole: "user" };

      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        publicMetadata: { role: "user" },
      });

      await checkUserRole(
        mockReq as Request,
        mockRes as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect((mockReq as any).auth.userId).toBe("user_test_id");
    });

    test("allows user access in production", async () => {
      process.env.NODE_ENV = "production";
      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        publicMetadata: { role: "user" },
      });

      await checkUserRole(
        mockReq as Request,
        mockRes as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
    });

    test("allows admin access to user routes", async () => {
      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        publicMetadata: { role: "admin" },
      });

      await checkUserRole(
        mockReq as Request,
        mockRes as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
    });

    test("blocks unauthorized access", async () => {
      process.env.NODE_ENV = "production";
      mockReq.auth = undefined;

      await checkUserRole(
        mockReq as Request,
        mockRes as Response,
        nextFunction
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    });

    test("blocks invalid role access", async () => {
      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        publicMetadata: { role: "invalid" },
      });

      await checkUserRole(
        mockReq as Request,
        mockRes as Response,
        nextFunction
      );

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Access denied",
        message: "This route requires user privileges",
      });
    });

    test("handles Clerk API errors", async () => {
      (clerkClient.users.getUser as jest.Mock).mockRejectedValue(
        new Error("API Error")
      );

      await checkUserRole(
        mockReq as Request,
        mockRes as Response,
        nextFunction
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Internal server error",
      });
    });
  });
});
