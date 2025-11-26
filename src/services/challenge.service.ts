// src/services/challenge.service.ts
import {
  PrismaClient,
  Prisma,
  ChallengeFrequency,
  PointEventType,
} from "@prisma/client";
import PointsService from "./points.service";
import { getLevelForPoints } from "../lib/levels";

const prisma = new PrismaClient();

/* ---------- helpers random determinista ---------- */
function xmur3(str: string) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(array: T[], seed: string): T[] {
  const seedFn = xmur3(seed);
  const rand = mulberry32(seedFn());
  const arr = [...array];

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* ---------- helpers de periodo ---------- */

function getPeriodKey(frequency: ChallengeFrequency, now: Date): string {
  if (frequency === "DAILY") {
    return now.toISOString().slice(0, 10); // YYYY-MM-DD
  }

  const year = now.getFullYear();
  const firstDayOfYear = new Date(year, 0, 1);
  const pastDaysOfYear =
    (Number(now) - Number(firstDayOfYear)) / (1000 * 60 * 60 * 24);
  const week = Math.floor(pastDaysOfYear / 7) + 1;

  return `${year}-W${String(week).padStart(2, "0")}`;
}

function getDayRange(now: Date) {
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

function getWeekRange(now: Date) {
  const d = new Date(now);
  const day = d.getDay(); // 0 domingo, 1 lunes...
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { from: monday, to: sunday };
}

function formatDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDateKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/* ---------- service ---------- */

class ChallengeService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  private async getUserTotalPoints(userId: string, sedeId?: number) {
    const where: Prisma.PointEventWhereInput = { userId };
    if (sedeId) where.sedeId = sedeId;

    const agg = await this.prisma.pointEvent.aggregate({
      where,
      _sum: { points: true },
    });

    return agg._sum.points ?? 0;
  }

  /**
   * Devuelve los desafíos asignados al usuario para el periodo actual,
   * ya filtrados por nivel y sede, con selección aleatoria determinista.
   */
  async listForUser(args: {
    userId: string;
    sedeId?: number;
    frequency: ChallengeFrequency;
  }) {
    const { userId, sedeId, frequency } = args;
    const now = new Date();

    const totalPoints = await this.getUserTotalPoints(userId, sedeId);
    const { level } = getLevelForPoints(totalPoints);
    const userLevel = level.level; // 1..5

    if (userLevel < 3) {
      return [];
    }

    const where: Prisma.ChallengeWhereInput = {
      isActive: true,
      frequency,
      minLevel: { lte: userLevel },
    };

    if (sedeId) {
      where.OR = [{ sedeId }, { sedeId: null }];
    }

    const allChallenges = await this.prisma.challenge.findMany({
      where,
      orderBy: { id: "asc" },
    });

    if (allChallenges.length === 0) {
      return [];
    }

    const periodKey = getPeriodKey(frequency, now);
    const seed = `${userId}|${periodKey}|${frequency}`;
    const shuffled = seededShuffle(allChallenges, seed);

    let desiredCount: number;
    if (frequency === "DAILY") {
      const rand = mulberry32(xmur3(seed)());
      const r = rand();
      desiredCount = r < 0.5 ? 2 : 3;
    } else {
      desiredCount = 3;
    }

    const selected = shuffled.slice(0, Math.min(desiredCount, shuffled.length));

    // marcar si ya está completado este período
    const challengeIds = selected.map((c) => c.id);

    const completedRows = await this.prisma.userChallenge.findMany({
      where: {
        userId,
        challengeId: { in: challengeIds },
        periodKey,
      },
    });

    const completedSet = new Set(
      completedRows.map((uc) => `${uc.challengeId}:${uc.periodKey}`)
    );

    return selected.map((ch) => {
      const key = `${ch.id}:${periodKey}`;
      const isCompleted = completedSet.has(key);

      return {
        id: ch.id,
        title: ch.title,
        description: ch.description,
        frequency: ch.frequency,
        pointsReward: ch.pointsReward,
        minLevel: ch.minLevel,
        sedeId: ch.sedeId,
        isActive: ch.isActive,
        createdAt: ch.createdAt,
        updatedAt: ch.updatedAt,
        currentLevel: userLevel,
        isCompleted,
      };
    });
  }

  /**
   * Evalúa SI un desafío está cumplido para el usuario en el período actual.
   * Usa el título para mapear a la lógica (rápido para demo).
   */
  private async isChallengeCompletedForCurrentPeriod(opts: {
    challenge: { id: number; title: string; frequency: ChallengeFrequency };
    userId: string;
    sedeId?: number;
    now: Date;
  }): Promise<boolean> {
    const { challenge, userId, now } = opts;

    // Normalizamos por si algún día cambiás texto
    const title = challenge.title.toLowerCase();

    if (challenge.frequency === "DAILY") {
      const { from, to } = getDayRange(now);

      // datos base del día
      if (title.includes("check-in activo")) {
        const count = await this.prisma.exercisePerformance.count({
          where: {
            userId,
            createdAt: { gte: from, lte: to },
          },
        });
        return count >= 1;
      }

      if (title.includes("media hora asegurada")) {
        const perfs = await this.prisma.exercisePerformance.findMany({
          where: {
            userId,
            createdAt: { gte: from, lte: to },
          },
          select: {
            routine: {
              select: { id: true, duration: true },
            },
          },
        });

        const seen = new Set<number>();
        let totalDuration = 0;

        for (const p of perfs) {
          const r = p.routine;
          if (!r || r.id == null) continue;
          if (seen.has(r.id)) continue;
          seen.add(r.id);
          totalDuration += r.duration ?? 30; // default razonable
        }

        return totalDuration >= 30;
      }

      if (title.includes("día principiante")) {
        const perf = await this.prisma.exercisePerformance.findFirst({
          where: {
            userId,
            createdAt: { gte: from, lte: to },
            routine: {
              level: "Beginner",
            },
          },
        });
        return !!perf;
      }

      if (title.includes("día intermedio")) {
        const perf = await this.prisma.exercisePerformance.findFirst({
          where: {
            userId,
            createdAt: { gte: from, lte: to },
            routine: {
              level: "Intermediate",
            },
          },
        });
        return !!perf;
      }

      if (title.includes("día avanzado")) {
        const perf = await this.prisma.exercisePerformance.findFirst({
          where: {
            userId,
            createdAt: { gte: from, lte: to },
            routine: {
              level: "Advanced",
            },
          },
        });
        return !!perf;
      }

      if (title.includes("día de piernas")) {
        const perf = await this.prisma.exercisePerformance.findFirst({
          where: {
            userId,
            createdAt: { gte: from, lte: to },
            exercise: {
              muscleGroup: {
                name: "Piernas",
              },
            },
          },
        });
        return !!perf;
      }

      if (title.includes("día de pecho")) {
        const perf = await this.prisma.exercisePerformance.findFirst({
          where: {
            userId,
            createdAt: { gte: from, lte: to },
            exercise: {
              muscleGroup: {
                name: "Pecho",
              },
            },
          },
        });
        return !!perf;
      }

      if (title.includes("día de espalda")) {
        const perf = await this.prisma.exercisePerformance.findFirst({
          where: {
            userId,
            createdAt: { gte: from, lte: to },
            exercise: {
              muscleGroup: {
                name: "Espalda",
              },
            },
          },
        });
        return !!perf;
      }

      if (title.includes("día de core")) {
        const perf = await this.prisma.exercisePerformance.findFirst({
          where: {
            userId,
            createdAt: { gte: from, lte: to },
            exercise: {
              muscleGroup: {
                name: "Abdominales",
              },
            },
          },
        });
        return !!perf;
      }

      if (title.includes("día de cardio")) {
        const perf = await this.prisma.exercisePerformance.findFirst({
          where: {
            userId,
            createdAt: { gte: from, lte: to },
            exercise: {
              muscleGroup: {
                name: "Cardio",
              },
            },
          },
        });
        return !!perf;
      }

      if (title.includes("rutina larga")) {
        const perf = await this.prisma.exercisePerformance.findFirst({
          where: {
            userId,
            createdAt: { gte: from, lte: to },
            routine: {
              duration: {
                gte: 60,
              },
            },
          },
        });
        return !!perf;
      }

      if (title.includes("día de brazos")) {
        const perf = await this.prisma.exercisePerformance.findFirst({
          where: {
            userId,
            createdAt: { gte: from, lte: to },
            exercise: {
              muscleGroup: {
                name: { in: ["Bíceps", "Tríceps"] },
              },
            },
          },
        });
        return !!perf;
      }

      // si no matchea ningún patrón conocido, por ahora lo dejamos como no cumplido
      return false;
    }

    // WEEKLY
    const { from, to } = getWeekRange(now);

    if (title.includes("semana 3 de 7")) {
      const perfs = await this.prisma.exercisePerformance.findMany({
        where: {
          userId,
          createdAt: { gte: from, lte: to },
        },
        select: { createdAt: true },
      });

      const days = new Set<string>();
      for (const p of perfs) {
        days.add(formatDateKey(p.createdAt));
      }

      return days.size >= 3;
    }

    if (title.includes("semana 5 de 7")) {
      const perfs = await this.prisma.exercisePerformance.findMany({
        where: {
          userId,
          createdAt: { gte: from, lte: to },
        },
        select: { createdAt: true },
      });

      const days = new Set<string>();
      for (const p of perfs) {
        days.add(formatDateKey(p.createdAt));
      }

      return days.size >= 5;
    }

    if (title.includes("principiante constante")) {
      const perfs = await this.prisma.exercisePerformance.findMany({
        where: {
          userId,
          createdAt: { gte: from, lte: to },
          routine: {
            level: "Beginner",
          },
        },
        select: {
          routineId: true,
        },
      });

      const routines = new Set<number>();
      for (const p of perfs) {
        if (p.routineId != null) routines.add(p.routineId);
      }

      return routines.size >= 2;
    }

    if (title.includes("intermedio en subida")) {
      const perfs = await this.prisma.exercisePerformance.findMany({
        where: {
          userId,
          createdAt: { gte: from, lte: to },
          routine: {
            level: "Intermediate",
          },
        },
        select: {
          routineId: true,
        },
      });

      const routines = new Set<number>();
      for (const p of perfs) {
        if (p.routineId != null) routines.add(p.routineId);
      }

      return routines.size >= 2;
    }

    if (title.includes("avanzado total")) {
      const perf = await this.prisma.exercisePerformance.findFirst({
        where: {
          userId,
          createdAt: { gte: from, lte: to },
          routine: {
            level: "Advanced",
          },
        },
      });

      return !!perf;
    }

    if (title.includes("largo aliento")) {
      const perfs = await this.prisma.exercisePerformance.findMany({
        where: {
          userId,
          createdAt: { gte: from, lte: to },
          routine: {
            duration: { gte: 60 },
          },
        },
        select: {
          routineId: true,
        },
      });

      const routines = new Set<number>();
      for (const p of perfs) {
        if (p.routineId != null) routines.add(p.routineId);
      }

      return routines.size >= 2;
    }

    if (title.includes("semana de piernas")) {
      const perfs = await this.prisma.exercisePerformance.findMany({
        where: {
          userId,
          createdAt: { gte: from, lte: to },
          exercise: {
            muscleGroup: { name: "Piernas" },
          },
        },
        select: { createdAt: true },
      });

      const days = new Set<string>();
      for (const p of perfs) {
        days.add(formatDateKey(p.createdAt));
      }

      return days.size >= 2;
    }

    if (title.includes("semana de core")) {
      const perfs = await this.prisma.exercisePerformance.findMany({
        where: {
          userId,
          createdAt: { gte: from, lte: to },
          exercise: {
            muscleGroup: { name: "Abdominales" },
          },
        },
        select: { createdAt: true },
      });

      const days = new Set<string>();
      for (const p of perfs) {
        days.add(formatDateKey(p.createdAt));
      }

      return days.size >= 2;
    }

    if (title.includes("semana de cardio")) {
      const perfs = await this.prisma.exercisePerformance.findMany({
        where: {
          userId,
          createdAt: { gte: from, lte: to },
          exercise: {
            muscleGroup: { name: "Cardio" },
          },
        },
        select: { createdAt: true },
      });

      const days = new Set<string>();
      for (const p of perfs) {
        days.add(formatDateKey(p.createdAt));
      }

      return days.size >= 2;
    }

    if (title.includes("semana equilibrada")) {
      const perfs = await this.prisma.exercisePerformance.findMany({
        where: {
          userId,
          createdAt: { gte: from, lte: to },
        },
        select: {
          createdAt: true,
          routine: {
            select: { level: true },
          },
        },
      });

      const days = new Set<string>();
      const levels = new Set<string>();

      for (const p of perfs) {
        days.add(formatDateKey(p.createdAt));
        if (p.routine?.level) levels.add(p.routine.level);
      }

      return days.size >= 3 && levels.size >= 2;
    }

    return false;
  }

  /**
   * Evalúa desafíos (diarios + semanales) para el usuario en la sede,
   * crea UserChallenge + PointEvent.CHALLENGE_COMPLETE para los recién cumplidos
   * y devuelve la lista de los nuevos.
   */
  async evaluateAndReturnNew(userId: string, sedeId: number) {
    const now = new Date();
    const result: {
      challengeId: number;
      title: string;
      frequency: ChallengeFrequency;
      pointsAwarded: number;
    }[] = [];

    for (const frequency of ["DAILY", "WEEKLY"] as ChallengeFrequency[]) {
      const assigned = await this.listForUser({ userId, sedeId, frequency });
      if (assigned.length === 0) continue;

      const periodKey = getPeriodKey(frequency, now);

      const existing = await this.prisma.userChallenge.findMany({
        where: {
          userId,
          periodKey,
          challengeId: { in: assigned.map((c) => c.id) },
        },
      });

      const existingSet = new Set(
        existing.map((uc) => `${uc.challengeId}:${uc.periodKey}`)
      );

      for (const ch of assigned) {
        const key = `${ch.id}:${periodKey}`;
        if (existingSet.has(key)) continue;

        const completed = await this.isChallengeCompletedForCurrentPeriod({
          challenge: { id: ch.id, title: ch.title, frequency },
          userId,
          sedeId,
          now,
        });

        if (!completed) continue;

        // registrar UserChallenge
        const uc = await this.prisma.userChallenge.create({
          data: {
            userId,
            challengeId: ch.id,
            periodKey,
          },
        });

        // registrar puntos
        if (ch.pointsReward > 0) {
          await PointsService.registerEvent({
            userId,
            sedeId,
            type: PointEventType.CHALLENGE_COMPLETE,
            customPoints: ch.pointsReward,
          });
        }

        result.push({
          challengeId: ch.id,
          title: ch.title,
          frequency,
          pointsAwarded: ch.pointsReward,
        });
      }
    }

    return result;
  }
}

export default new ChallengeService();
