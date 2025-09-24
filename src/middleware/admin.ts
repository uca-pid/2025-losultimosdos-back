import { Request, Response, NextFunction } from "express";
import { clerkClient } from "@clerk/express";

const checkAdminRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.auth?.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (process.env.NODE_ENV === "test") {
      const role = (req as any).auth?.userRole as string | undefined;
      if (role !== "admin") {
        return res.status(403).json({ error: "Access denied", message: "Admin only" });
      }
      return next();
    }

    const user = await clerkClient.users.getUser(req.auth.userId);
    const userRole = user.publicMetadata.role as string | undefined;

    if (userRole !== "admin") {
      return res.status(403).json({ error: "Access denied", message: "Admin only" });
    }

    next();
  } catch (error) {
    console.error("Error checking admin role:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export default checkAdminRole;
