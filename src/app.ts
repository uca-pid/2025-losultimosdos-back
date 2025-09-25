import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { clerkClient, clerkMiddleware } from "@clerk/express";
import { verifyWebhook } from "@clerk/express/webhooks";
import { PrismaClient } from "@prisma/client";
import { WebhookEvent } from "@clerk/backend";

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

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(clerkMiddleware());

import adminRoutes from "./routes/admin/index";
import userRoutes from "./routes/user/index";
import ClassService from "./services/class.service";
import { ApiValidationError } from "./services/api-validation-error";

app.use("/admin", adminRoutes);
app.use("/user", userRoutes);

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/classes", async (_req: Request, res: Response) => {
  const classes = await ClassService.getAllClasses();
  res.json({ classes });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);

  if (err instanceof ApiValidationError) {
    res.status(err.statusCode).json({ error: err.message });
  } else {
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
