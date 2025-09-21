import { User } from "@clerk/express";

declare global {
  namespace Express {
    interface Request {
      auth: User & { userId: string };
    }
  }
}
