import { Request, Response, NextFunction } from "express";
import { clerkClient, getAuth } from "@clerk/express";

const checkAdminRole = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.log("Checking admin role");
  console.log(req.baseUrl + req.path);
  console.log(req.headers);

  const { userId } = getAuth(req);

  try {
    if (!userId) {
      console.log("No userId");
      console.log(getAuth(req));
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (process.env.NODE_ENV === "test") {
      const role = (req as any).auth?.userRole as string | undefined;
      if (role !== "admin") {
        return res
          .status(403)
          .json({ error: "Access denied", message: "Admin only" });
      }
      return next();
    }

    const user = await clerkClient.users.getUser(userId);
    console.log("User");
    console.log(user);
    const userRole = user.publicMetadata.role as string | undefined;

    if (userRole !== "admin") {
      console.log("User role is not admin");
      return res
        .status(403)
        .json({ error: "Access denied", message: "Admin only" });
    }

    console.log("User role is admin");
    next();
  } catch (error) {
    console.error("Error checking admin role:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export default checkAdminRole;
