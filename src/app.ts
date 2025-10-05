import express, { Request, Response, NextFunction } from "express";
import { asyncHandler } from "./middleware/asyncHandler";
import cors from "cors";
import dotenv from "dotenv";
import { clerkClient, clerkMiddleware } from "@clerk/express";
import { verifyWebhook } from "@clerk/express/webhooks";
import { PrismaClient } from "@prisma/client";
import { WebhookEvent } from "@clerk/backend";
import adminRoutes from "./routes/admin/index";
import userRoutes from "./routes/user/index";
import ClassService from "./services/class.service";
import { ApiValidationError } from "./services/api-validation-error";
import ExerciseService from "./services/excersice.service";
import RoutineService from "./services/routine.service";
import { validateParams } from "./middleware/validation";
import { routineIdParamSchema } from "./schemas/routine.schema";
dotenv.config();

const prisma = new PrismaClient();
const app = express();

app.post(
  "/api/webhooks",
  express.raw({ type: "application/json" }),
  async (req: Request, res: Response) => {
    try {
      const evt = (await verifyWebhook(req)) as WebhookEvent;
      const eventType = evt.type;

      if (eventType === "user.created") {
        const { id } = evt.data;

        try {
          await clerkClient.users.updateUser(id, {
            publicMetadata: { role: "user" },
          });
          console.log(`User ${id} assigned role: user`);
          res
            .status(200)
            .json({ success: true, message: "Role assigned successfully" });
        } catch (error) {
          console.error(`Error assigning role to user ${id}:`, error);
          res
            .status(500)
            .json({ success: false, message: "Failed to assign role" });
        }
      }
    } catch (err) {
      console.error("Error verifying webhook:", err);
      return res.status(400).send("Error verifying webhook");
    }
  }
);

// Log all incoming requests
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`, {
    headers: req.headers,
    query: req.query,
    body: req.body,
  });
  next();
});

app.use(cors());
console.log("CORS middleware initialized");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
console.log("Body parser middleware initialized");

app.use(clerkMiddleware());
console.log("Clerk middleware initialized");

app.use("/admin", adminRoutes);
app.use("/user", userRoutes);

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get(
  "/classes",
  asyncHandler(async (req: Request, res: Response) => {
    console.log("[Classes] Handler reached", {
      method: req.method,
      path: req.path,
      headers: req.headers,
    });

    try {
      console.log("[Classes] Fetching classes from service...");
      const classes = await ClassService.getAllClasses();
      console.log("[Classes] Successfully retrieved classes:", {
        count: classes.length,
        classes: classes,
      });
      res.json({ classes });
    } catch (error) {
      console.error("[Classes] Error fetching classes:", error);
      throw error;
    }
  })
);

app.get(
  "/exercises",
  asyncHandler(async (req, res) => {
    const { q, muscleGroupId } = req.query as any;
    const items = await ExerciseService.list({
      q: q as string | undefined,
      muscleGroupId: muscleGroupId ? Number(muscleGroupId) : undefined,
    });
    res.json({ total: items.length, items });
  })
);

app.get(
  "/routines",
  asyncHandler(async (req, res) => {
    const items = await RoutineService.list();
    res.json({ total: items.length, items });
  })
);
app.get(
  "/routines/:id",
  validateParams(routineIdParamSchema),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const r = await RoutineService.getById(id);
    if (!r) throw new ApiValidationError("Routine not found", 404);
    res.json(r);
  })
);

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("[Error Handler]", {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    headers: req.headers,
    query: req.query,
    body: req.body,
  });

  if (err instanceof ApiValidationError) {
    console.log("[Error Handler] ApiValidationError:", {
      statusCode: err.statusCode,
      message: err.message,
    });
    res.status(err.statusCode).json({ error: err.message });
  } else {
    console.error("[Error Handler] Unexpected error:", err);
    res.status(500).json({
      error: "Something went wrong!",
      message: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Route not found" });
});

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => console.log(`Server on ${PORT}`));
}

export default app;
