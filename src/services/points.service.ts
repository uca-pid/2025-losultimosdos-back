import { PrismaClient, PointEventType, Prisma } from "@prisma/client";
import UserService from "./user.service";
type Period = "all" | "30d" | "7d";

class PointsService {
  private readonly prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  // tabla de puntos base por tipo de evento
  private readonly POINTS_BY_TYPE: Record<PointEventType, number> = {
    CLASS_ENROLL: 10,
    ROUTINE_ASSIGN: 15,
    ROUTINE_COMPLETE: 25,
  };

  // 👈 ESTE ES EL MÉTODO QUE TE FALTABA
  getBasePoints(type: PointEventType): number {
    return this.POINTS_BY_TYPE[type];
  }

  // ahora registerEvent acepta customPoints para cosas como la rutina completa o penalizaciones
  async registerEvent(options: {
    userId: string;
    sedeId: number;
    type: PointEventType;
    classId?: number;
    routineId?: number;
    customPoints?: number;
  }) {
    const { userId, sedeId, type, classId, routineId, customPoints } = options;

    const points =
      typeof customPoints === "number"
        ? customPoints
        : this.POINTS_BY_TYPE[type];

    if (typeof points !== "number") {
      throw new Error(`No points configured for event type: ${type}`);
    }

    return this.prisma.pointEvent.create({
      data: {
        userId,
        sedeId,
        type,
        points,
        classId,
        routineId,
      },
    });
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

  // 🧍🏻 leaderboard por usuario
    // 🧍🏻 leaderboard por usuario
  async userLeaderboard(options?: {
    period?: Period;
    sedeId?: number;
    limit?: number;
  }) {
    const period = options?.period ?? "all";
    const sedeId = options?.sedeId;
    const limit = options?.limit ?? 50;

    const where = this.buildWhere(period, sedeId);

    const events = await this.prisma.pointEvent.findMany({
      where,
      select: {
        userId: true,
        points: true,
      },
    });

    // acumular puntos por userId
    const totals = new Map<string, number>();
    for (const ev of events) {
      const prev = totals.get(ev.userId) ?? 0;
      totals.set(ev.userId, prev + ev.points);
    }

    const sorted = Array.from(totals.entries())
      .map(([userId, totalPoints]) => ({ userId, totalPoints }))
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, limit);

    // 🔍 buscamos los datos de usuario en Clerk
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

    // armamos la respuesta enriquecida
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


  // 🏢 leaderboard por sede
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
