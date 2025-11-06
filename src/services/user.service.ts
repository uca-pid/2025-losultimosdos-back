import { clerkClient, User } from "@clerk/express";
import { ApiValidationError } from "./api-validation-error";
import { PrismaClient } from "@prisma/client";

class UserService {
  private readonly prisma: PrismaClient;
  constructor() {
    this.prisma = new PrismaClient();
  }
  async getUsers() {
    return await clerkClient.users.getUserList({
      limit: 100,
    });
  }

  async getUserById(userId: string) {
    try {
      const user = await clerkClient.users.getUser(userId);

      return this.sanitizeUser(user);
    } catch (error: any) {
      if (error?.message === "Not Found") {
        throw new ApiValidationError(`User with ID ${userId} not found`, 404);
      }
      throw error;
    }
  }

  async getUsersBySedeId(sedeId: number) {
    const users = await clerkClient.users.getUserList({ limit: 100 });
    const filteredUsers = users.data.filter(
      (user) => user.publicMetadata.sede === sedeId
    );
    return filteredUsers;
  }
  async updateUserRole(userId: string, role: string) {
    if (role !== "admin" && role !== "user") {
      throw new ApiValidationError("Invalid role", 400);
    }
    const user = await clerkClient.users.getUser(userId);
    return await clerkClient.users.updateUser(userId, {
      publicMetadata: {
        ...user.publicMetadata,
        role,
      },
    });
  }

  async updateUserPlan(userId: string, plan: string) {
    if (plan !== "basic" && plan !== "premium") {
      throw new ApiValidationError(
        "Invalid plan. Must be either 'basic' or 'premium'",
        400
      );
    }
    const user = await clerkClient.users.getUser(userId);
    return await clerkClient.users.updateUser(userId, {
      publicMetadata: {
        ...user.publicMetadata,
        plan,
      },
    });
  }

  async getDailyUserCount(sedeId: number) {
    const dailyUserCount = await this.prisma.dailyUserCount.findMany({
      orderBy: {
        date: "desc",
      },
      where: {
        date: {
          lt: new Date(new Date().setHours(0, 0, 0, 0)),
        },
        sedeId,
      },
      take: 90,
    });

    const users = await this.getUsers();
    const basic = users.data.filter(
      (user) =>
        user.publicMetadata.plan === "basic" &&
        user.publicMetadata.sede === sedeId
    ).length;
    const premium = users.data.filter(
      (user) =>
        user.publicMetadata.plan === "premium" &&
        user.publicMetadata.sede === sedeId
    ).length;

    return [
      ...dailyUserCount,
      {
        date: new Date(),
        basic,
        premium,
      },
    ];
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
      plan: user.publicMetadata.plan as string,
      sedeId: user.publicMetadata.sede as number,
    };
  }
}

export default new UserService();
