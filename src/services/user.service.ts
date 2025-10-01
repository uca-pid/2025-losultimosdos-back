import { clerkClient, User } from "@clerk/express";
import { ApiValidationError } from "./api-validation-error";

class UserService {
  constructor() {}
  async getUsers() {
    return await clerkClient.users.getUserList({
      limit: 100,
    });
  }

  async getUserById(userId: string) {
    const user = await clerkClient.users.getUser(userId);
    return this.sanitizeUser(user);
  }

  async updateUserRole(userId: string, role: string) {
    if (role !== "admin" && role !== "user") {
      throw new ApiValidationError("Invalid role", 400);
    }
    return await clerkClient.users.updateUser(userId, {
      publicMetadata: { role },
    });
  }

  sanitizeUser(user: User) {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.emailAddresses[0]?.emailAddress,
      imageUrl: user.imageUrl,
      createdAt: user.createdAt,
      role: user.publicMetadata.role as string,
    };
  }
}

export default new UserService();
