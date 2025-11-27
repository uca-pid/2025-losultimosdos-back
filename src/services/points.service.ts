// points.service.ts
import { PrismaClient, PointEventType, Prisma } from "@prisma/client";
import UserService from "./user.service";
import BadgeService from "./badge.service";
import {
  getLevelForPoints,
  getPointsMultiplier,
  PointsContext,
} from "../lib/levels"; // ajustá el path

type Period = "all" | "30d" | "7d";

class PointsService {
  private readonly prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  private readonly POINTS_BY_TYPE: Record<PointEventType, number> = {
    CLASS_ENROLL: 10,
    ROUTINE_ASSIGN: 15,
    ROUTINE_COMPLETE: 25,
    CHALLENGE_COMPLETE: 50,
  };

  getBasePoints(type: PointEventType): number {
    return this.POINTS_BY_TYPE[type];
  }

  async getUserTotalPoints(userId: string, sedeId: number) {
    const agg = await this.prisma.pointEvent.aggregate({
      where: { userId, sedeId },
      _sum: { points: true },
    });

    return agg._sum.points ?? 0;
  }

  async registerEvent(options: {
    userId: string;
    sedeId: number;
    type: PointEventType;
    classId?: number;
    routineId?: number;
    customPoints?: number;
  }) {
    const { userId, sedeId, type, classId, routineId, customPoints } = options;

    const basePoints =
      typeof customPoints === "number"
        ? customPoints
        : this.POINTS_BY_TYPE[type];

    if (typeof basePoints !== "number") {
      throw new Error(`No points configured for event type: ${type}`);
    }

    const currentTotalPoints = await this.getUserTotalPoints(userId, sedeId);
    const { level } = getLevelForPoints(currentTotalPoints);

    let ctx: PointsContext = { type: "generic" };

    if (type === "CLASS_ENROLL") {
      let isBoostedClass = false;

      if (typeof classId === "number") {
        const cls = await this.prisma.class.findUnique({
          where: { id: classId },
          select: { isBoostedForPoints: true },
        });

        isBoostedClass = cls?.isBoostedForPoints ?? false;
      }

      ctx = { type: "class", isBoostedClass };
    } else if (type === "ROUTINE_COMPLETE") {
      ctx = { type: "routine" };
    } else {
      ctx = { type: "generic" };
    }

    const multiplier = getPointsMultiplier(level, ctx);

    const finalPoints = Math.round(basePoints * multiplier);

    console.log("points for event", {
      type,
      basePoints,
      multiplier,
      finalPoints,
      level: level.level,
      ctx,
    });

    const event = await this.prisma.pointEvent.create({
      data: {
        userId,
        sedeId,
        type,
        points: finalPoints,
        classId,
        routineId,
      },
    });

    console.log("points", event.points);
    await BadgeService.evaluateForUser(userId, sedeId);

    return event;
  }

  private buildWhere(
    period: Period,
    sedeId?: number
  ): Prisma.PointEventWhereInput {
    const where: Prisma.PointEventWhereInput = {};

    if (period !== "all") {
      const days = period === "7d" ? 7 : 30;
      const from = new Date();
      from.setDate(from.getDate() - days);
      where.createdAt = { gte: from };
    }

    if (sedeId) {
      where.sedeId = sedeId;
    }

    return where;
  }

  async userLeaderboard(options?: {
    period?: Period;
    sedeId?: number;
    limit?: number;
  }) {
    const period = options?.period ?? "all";
    const sedeId = options?.sedeId;
    const limit = options?.limit ?? 50;

    const where = this.buildWhere(period, sedeId);
    console.log("where", where);
    const events = await this.prisma.pointEvent.findMany({
      where,
      select: {
        userId: true,
        points: true,
      },
    });
    const totals = new Map<string, number>();
    for (const ev of events) {
      const prev = totals.get(ev.userId) ?? 0;
      totals.set(ev.userId, prev + ev.points);
    }

    const sorted = Array.from(totals.entries())
      .map(([userId, totalPoints]) => ({ userId, totalPoints }))
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, limit);

    const userIds = sorted.map((item) => item.userId);

    const users = await Promise.all(
      userIds.map(async (id) => {
        try {
          const u = await UserService.getUserById(id);
          return u;
        } catch {
          return null;
        }
      })
    );

    const userById = new Map(
      users
        .filter((u): u is NonNullable<typeof u> => u !== null)
        .map((u) => [u.id, u])
    );

    return sorted.map((item, index) => {
      const u = userById.get(item.userId);

      const fullName =
        [u?.firstName, u?.lastName].filter(Boolean).join(" ") ||
        u?.email ||
        item.userId;

      return {
        rank: index + 1,
        userId: item.userId,
        totalPoints: item.totalPoints,
        user: u
          ? {
              id: u.id,
              firstName: u.firstName,
              lastName: u.lastName,
              fullName,
            }
          : {
              id: item.userId,
              firstName: null,
              lastName: null,
              fullName,
            },
      };
    });
  }

  async removeClassEnrollEvent(userId: string, classId: number) {
    return this.prisma.pointEvent.deleteMany({
      where: {
        userId,
        classId,
        type: "CLASS_ENROLL",
      },
    });
  }

  async removeRoutineAssignEvent(userId: string, routineId: number) {
    return this.prisma.pointEvent.deleteMany({
      where: {
        userId,
        routineId,
        type: "ROUTINE_ASSIGN",
      },
    });
  }

  async sedeLeaderboard(options?: { period?: Period; limit?: number }) {
    const period = options?.period ?? "all";
    const limit = options?.limit ?? 50;

    const where = this.buildWhere(period);

    const events = await this.prisma.pointEvent.findMany({
      where,
      select: {
        sedeId: true,
        points: true,
      },
    });

    const totals = new Map<number, number>();
    for (const ev of events) {
      const prev = totals.get(ev.sedeId) ?? 0;
      totals.set(ev.sedeId, prev + ev.points);
    }

    const sorted = Array.from(totals.entries())
      .map(([sedeId, totalPoints]) => ({ sedeId, totalPoints }))
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, limit);

    const sedeIds = sorted.map((s) => s.sedeId);

    const sedes = await this.prisma.sede.findMany({
      where: { id: { in: sedeIds } },
      select: { id: true, name: true },
    });

    const sedeById = new Map(sedes.map((s) => [s.id, s.name]));

    return sorted.map((item, index) => ({
      rank: index + 1,
      sedeId: item.sedeId,
      sedeName: sedeById.get(item.sedeId) ?? "Sede sin nombre",
      totalPoints: item.totalPoints,
    }));
  }
}

export default new PointsService();
