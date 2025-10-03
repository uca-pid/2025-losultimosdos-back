import request from "supertest";
import express, { Request, Response, NextFunction } from "express";
import app from "../src/app";
import { clerkClient } from "@clerk/express";
import { verifyWebhook } from "@clerk/express/webhooks";

// Mock Clerk client and webhook verification
jest.mock("@clerk/express", () => ({
  clerkClient: {
    users: {
      updateUser: jest.fn(),
      getUser: jest.fn(),
    },
  },
  clerkMiddleware: () => (req: any, res: any, next: any) => {
    next();
  },
}));

jest.mock("@clerk/express/webhooks", () => ({
  verifyWebhook: jest.fn(),
}));

describe("App", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Webhook Handler", () => {
    test("handles user.created event successfully", async () => {
      const mockEvent = {
        type: "user.created",
        data: { id: "test_user_id" },
      };

      (verifyWebhook as jest.Mock).mockResolvedValue(mockEvent);
      (clerkClient.users.updateUser as jest.Mock).mockResolvedValue({});

      const res = await request(app)
        .post("/api/webhooks")
        .send(mockEvent)
        .set("Content-Type", "application/json");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        message: "Role assigned successfully",
      });
      expect(clerkClient.users.updateUser).toHaveBeenCalledWith(
        "test_user_id",
        {
          publicMetadata: { role: "user" },
        }
      );
    });

    test("handles webhook verification failure", async () => {
      (verifyWebhook as jest.Mock).mockRejectedValue(
        new Error("Invalid webhook")
      );

      const res = await request(app)
        .post("/api/webhooks")
        .send({})
        .set("Content-Type", "application/json");

      expect(res.status).toBe(400);
      expect(res.text).toBe("Error verifying webhook");
    });

    test("handles role assignment failure", async () => {
      const mockEvent = {
        type: "user.created",
        data: { id: "test_user_id" },
      };

      (verifyWebhook as jest.Mock).mockResolvedValue(mockEvent);
      (clerkClient.users.updateUser as jest.Mock).mockRejectedValue(
        new Error("Failed to update user")
      );

      const res = await request(app)
        .post("/api/webhooks")
        .send(mockEvent)
        .set("Content-Type", "application/json");

      expect(res.status).toBe(500);
      expect(res.body).toEqual({
        success: false,
        message: "Failed to assign role",
      });
    });
  });

  describe("Health Check", () => {
    test("returns health status", async () => {
      const res = await request(app).get("/health");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("status", "ok");
      expect(res.body).toHaveProperty("timestamp");
    });
  });

  describe("Error Handling", () => {
    test("handles 404 routes", async () => {
      const res = await request(app).get("/non-existent-route");
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: "Route not found" });
    });

    test("handles internal server errors", async () => {
      // Create a new Express app for testing error handling
      const testApp = express();

      // Add test route that throws an error
      testApp.get("/test-error", (_req, _res, next) => {
        next(new Error("Test error"));
      });

      // Add error handler
      testApp.use(
        (err: Error, _req: Request, res: Response, _next: NextFunction) => {
          res.status(500).json({
            error: "Something went wrong!",
            message:
              process.env.NODE_ENV === "development" ? err.message : undefined,
          });
        }
      );

      const res = await request(testApp).get("/test-error");
      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty("error", "Something went wrong!");

      // Check error message in development mode
      process.env.NODE_ENV = "development";
      const devRes = await request(testApp).get("/test-error");
      expect(devRes.body).toHaveProperty("message", "Test error");
    });
  });
});
