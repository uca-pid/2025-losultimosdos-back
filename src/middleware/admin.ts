import { Request, Response, NextFunction } from "express";
import { clerkClient } from "@clerk/express";

const checkAdminRole = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  if (!req.auth?.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const user = await clerkClient.users.getUser(req.auth.userId);
    const userRole = user.publicMetadata.role as string;

    if (userRole !== "admin") {
      return res.status(403).json({
        error: "Access denied",
        message: "This route requires admin privileges",
      });
    }

    next();
  } catch (error) {
    console.error("Error checking admin role:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export default checkAdminRole;
