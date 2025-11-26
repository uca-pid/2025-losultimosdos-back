import { PrismaClient, BadgeMetric, PointEventType } from "@prisma/client";

const prisma = new PrismaClient();

type UserStats = {
  totalPoints: number;
  classEnrollCount: number;
  routineCompleteCount: number;
};

class BadgeService {
  private async getUserStats(
    userId: string,
    sedeId?: number
  ): Promise<UserStats> {
    const baseWhere: any = { userId };
    if (sedeId) baseWhere.sedeId = sedeId;

    const [pointsAgg, classEnrollCount, routineCompleteCount] =
      await Promise.all([
        prisma.pointEvent.aggregate({
          where: baseWhere,
          _sum: { points: true },
        }),
        prisma.pointEvent.count({
          where: { ...baseWhere, type: PointEventType.CLASS_ENROLL },
        }),
        prisma.pointEvent.count({
          where: { ...baseWhere, type: PointEventType.ROUTINE_COMPLETE },
        }),
      ]);

    return {
      totalPoints: pointsAgg._sum.points ?? 0,
      classEnrollCount,
      routineCompleteCount,
    };
  }

  async evaluateForUser(userId: string, sedeId?: number) {
    const [badges, userBadges, stats] = await Promise.all([
      prisma.badge.findMany(),
      prisma.userBadge.findMany({
        where: { userId },
        include: { badge: true },
      }),
      this.getUserStats(userId, sedeId),
    ]);

    const alreadyEarned = new Set(userBadges.map((ub) => ub.badgeId));
    const newlyEarned: number[] = [];

    for (const badge of badges) {
      if (alreadyEarned.has(badge.id)) continue;

      let currentValue = 0;
      switch (badge.metric) {
        case BadgeMetric.TOTAL_POINTS:
          currentValue = stats.totalPoints;
          break;
        case BadgeMetric.CLASS_ENROLL_COUNT:
          currentValue = stats.classEnrollCount;
          break;
        case BadgeMetric.ROUTINE_COMPLETE_COUNT:
          currentValue = stats.routineCompleteCount;
          break;
      }

      if (currentValue >= badge.threshold) {
        const ub = await prisma.userBadge.create({
          data: {
            userId,
            badgeId: badge.id,
          },
        });
        newlyEarned.push(ub.badgeId);
      }
    }

    return newlyEarned;
  }

  async evaluateAndReturnNew(userId: string, sedeId?: number) {
    const newlyEarnedIds = await this.evaluateForUser(userId, sedeId);
    if (!newlyEarnedIds.length) return [];

    const allStatuses = await this.getUserBadges(userId, sedeId);

    return allStatuses.filter((b) => newlyEarnedIds.includes(b.badgeId));
  }

  async getUserBadges(userId: string, sedeId?: number) {
    const [badges, userBadges, stats] = await Promise.all([
      prisma.badge.findMany(),
      prisma.userBadge.findMany({
        where: { userId },
      }),
      this.getUserStats(userId, sedeId),
    ]);

    const earnedMap = new Map<number, Date>();
    userBadges.forEach((ub) => earnedMap.set(ub.badgeId, ub.earnedAt));

    return badges.map((badge) => {
      let currentValue = 0;
      switch (badge.metric) {
        case BadgeMetric.TOTAL_POINTS:
          currentValue = stats.totalPoints;
          break;
        case BadgeMetric.CLASS_ENROLL_COUNT:
          currentValue = stats.classEnrollCount;
          break;
        case BadgeMetric.ROUTINE_COMPLETE_COUNT:
          currentValue = stats.routineCompleteCount;
          break;
      }

      const threshold = badge.threshold;
      const progress = Math.min(
        1,
        threshold > 0 ? currentValue / threshold : 0
      );
      const earnedAt = earnedMap.get(badge.id) ?? null;

      return {
        badgeId: badge.id,
        code: badge.code,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        metric: badge.metric,
        threshold,
        currentValue,
        progress,
        earned: !!earnedAt,
        earnedAt,
      };
    });
  }
}

export default new BadgeService();
