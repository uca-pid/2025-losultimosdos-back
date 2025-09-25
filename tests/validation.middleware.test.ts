import { Request, Response } from "express";
import { z } from "zod";
import {
  validateBody,
  validateParams,
  validateSchema,
} from "../src/middleware/validation";

describe("Validation Middleware", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    mockReq = {
      body: {},
      query: {},
      params: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFunction = jest.fn();
  });

  describe("validateBody", () => {
    const testSchema = z.object({
      name: z.string().min(1),
      age: z.number().positive(),
    });

    test("passes valid body data", async () => {
      mockReq.body = {
        name: "Test User",
        age: 25,
      };

      await validateBody(testSchema)(
        mockReq as Request,
        mockRes as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test("rejects invalid body data", async () => {
      mockReq.body = {
        name: "",
        age: -1,
      };

      await validateBody(testSchema)(
        mockReq as Request,
        mockRes as Response,
        nextFunction
      );

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Validation failed",
        details: expect.arrayContaining([
          expect.objectContaining({
            message: expect.any(String),
          }),
        ]),
      });
    });
  });

  describe("validateParams", () => {
    const testSchema = z.object({
      id: z.string().refine((val) => !isNaN(parseInt(val)), {
        message: "Invalid ID format",
      }),
    });

    test("passes valid params", async () => {
      mockReq.params = {
        id: "123",
      };

      await validateParams(testSchema)(
        mockReq as Request,
        mockRes as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test("rejects invalid params", async () => {
      mockReq.params = {
        id: "invalid",
      };

      await validateParams(testSchema)(
        mockReq as Request,
        mockRes as Response,
        nextFunction
      );

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Validation failed",
        details: expect.arrayContaining([
          expect.objectContaining({
            message: "Invalid ID format",
          }),
        ]),
      });
    });
  });

  describe("validateSchema", () => {
    const testSchema = z.object({
      body: z.object({
        name: z.string().min(1),
      }),
      query: z.object({
        sort: z.string().optional(),
      }),
      params: z.object({
        id: z.string(),
      }),
    });

    test("passes valid request data", async () => {
      mockReq.body = { name: "Test" };
      mockReq.query = { sort: "asc" };
      mockReq.params = { id: "123" };

      await validateSchema(testSchema)(
        mockReq as Request,
        mockRes as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test("rejects invalid request data", async () => {
      mockReq.body = { name: "" };
      mockReq.query = { sort: "asc" };
      mockReq.params = { id: "123" };

      await validateSchema(testSchema)(
        mockReq as Request,
        mockRes as Response,
        nextFunction
      );

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Validation failed",
        details: expect.arrayContaining([
          expect.objectContaining({
            message: expect.any(String),
          }),
        ]),
      });
    });
  });

  describe("Error Handling", () => {
    test("handles non-Zod errors gracefully", async () => {
      const schema = {
        parseAsync: () => Promise.reject(new Error("Unknown error")),
      } as unknown as z.ZodType;

      await validateBody(schema)(
        mockReq as Request,
        mockRes as Response,
        nextFunction
      );

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Internal validation error",
      });
    });
  });
});
