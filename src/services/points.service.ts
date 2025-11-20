import { PrismaClient, PointEventType, Prisma } from "@prisma/client";

type Period = "all" | "30d" | "7d";

class PointsService {
  private readonly prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  // Config centralizada de puntos por tipo de evento
  private readonly POINTS_BY_TYPE: Record<PointEventType, number> = {
    CLASS_ENROLL: 10,
    ROUTINE_ASSIGN: 15,
    ROUTINE_COMPLETE: 25,
  };

  async registerEvent(options: {
    userId: string;
    sedeId: number;
    type: PointEventType;
    classId?: number;
    routineId?: number;
  }) {
    const { userId, sedeId, type, classId, routineId } = options;

    const points = this.POINTS_BY_TYPE[type];
    if (!points) {
      throw new Error(`No points configured for event type: ${type}`);
    }

    // Podrías validar que la sede exista, pero como ya viene de Class/Routine es seguro
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

  // 🧍🏻 Leaderboard por usuario (opcionalmente filtrado por sede)
  async userLeaderboard(options?: {
    period?: Period;
    sedeId?: number;
    limit?: number;
  }) {
    const period = options?.period ?? "all";
    const sedeId = options?.sedeId;
    const limit = options?.limit ?? 50;

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

    const rows = await this.prisma.pointEvent.groupBy({
      by: ["userId"],
      where,
      _sum: { points: true },
      orderBy: {
        _sum: { points: "desc" },
      },
      take: limit,
    });

    // El front después puede enriquecer estos userId con Clerk
    return rows.map((r, index) => ({
      rank: index + 1,
      userId: r.userId,
      totalPoints: r._sum.points ?? 0,
    }));
  }

  // 🏢 Leaderboard por sede
  async sedeLeaderboard(options?: { period?: Period; limit?: number }) {
    const period = options?.period ?? "all";
    const limit = options?.limit ?? 50;

    const where: Prisma.PointEventWhereInput = {};

    if (period !== "all") {
      const days = period === "7d" ? 7 : 30;
      const from = new Date();
      from.setDate(from.getDate() - days);
      where.createdAt = { gte: from };
    }

    const rows = await this.prisma.pointEvent.groupBy({
      by: ["sedeId"],
      where,
      _sum: { points: true },
      orderBy: {
        _sum: { points: "desc" },
      },
      take: limit,
    });

    const sedeIds = rows.map((r) => r.sedeId);
    const sedes = await this.prisma.sede.findMany({
      where: { id: { in: sedeIds } },
      select: { id: true, name: true },
    });
    const sedeById = new Map(sedes.map((s) => [s.id, s.name]));

    return rows.map((r, index) => ({
      rank: index + 1,
      sedeId: r.sedeId,
      sedeName: sedeById.get(r.sedeId) ?? "Unknown",
      totalPoints: r._sum.points ?? 0,
    }));
  }
}

export default new PointsService();
