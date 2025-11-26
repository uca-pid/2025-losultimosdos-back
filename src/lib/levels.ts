// src/gamification/levels.ts

export type LevelConfig = {
  level: number;
  minPoints: number;
  name: string;
  icon: string;
  colorClass: string;
  perks: string[];
};

export const LEVELS: LevelConfig[] = [
  {
    level: 1,
    minPoints: 0,
    name: "Calentando motores",
    icon: "🔥",
    colorClass: "bg-slate-700 text-white",
    perks: [
      "Acceso al sistema de puntos y experiencia",
      "Seguimiento básico del progreso",
      "Visualización del perfil gamificado",
    ],
  },
  {
    level: 2,
    minPoints: 20,
    name: "Entrenando en serio",
    icon: "💪",
    colorClass: "bg-emerald-600 text-white",
    perks: [
      "Multiplicador de puntos +5% en clases seleccionadas",
    ],
  },
  {
    level: 3,
    minPoints: 60,
    name: "Modo atleta",
    icon: "🏆",
    colorClass: "bg-yellow-500 text-black",
    perks: [
      "Acceso a desafíos especiales",
      "Multiplicador de puntos +10% en rutinas completas",
    ],
  },
  {
    level: 4,
    minPoints: 120,
    name: "Leyenda del Gym",
    icon: "⚡",
    colorClass: "bg-purple-600 text-white",
    perks: [
        "Acceso a desafíos especiales",
      "Multiplicador de puntos +20% en toda la actividad",
      "Perfil de progreso destacado",
      "Mascota de entrenamiento virtual",
    ],
  },
  {
    level: 5,
    minPoints: 200,
    name: "Élite GymCloud",
    icon: "👑",
    colorClass: "bg-rose-600 text-white",
    perks: [
      "Multiplicador de puntos +30%",
      "Icono global especial en el perfil",
      "Insignia permanente de élite",
      "Efectos visuales exclusivos en el panel",
      "Acceso a desafíos élite",
      "Invitación a eventos/giveaways internos",
    ],
  },
];

export function getLevelForPoints(points: number) {
  const current =
    [...LEVELS].reverse().find((l) => points >= l.minPoints) ?? LEVELS[0];

  const idx = LEVELS.findIndex((l) => l.level === current.level);
  const next = LEVELS[idx + 1];

  const nextLevelPoints = next?.minPoints ?? null;

  const progressToNext =
    nextLevelPoints == null
      ? 100
      : Math.min(
          100,
          Math.round(
            ((points - current.minPoints) /
              (nextLevelPoints - current.minPoints)) *
              100
          )
        );

  return {
    level: current,
    progressToNext,
    nextLevelPoints,
  };
}

export type PointsContext =
  | { type: "class"; isBoostedClass?: boolean }
  | { type: "routine" }
  | { type: "generic" };

// NO acumulamos perks: el nivel más alto define el bonus final
export function getPointsMultiplier(level: LevelConfig, ctx: PointsContext) {
  let multiplier = 1.0;

  if (level.level === 5) {
    multiplier += 0.30; // toda la actividad
  } else if (level.level === 4) {
    multiplier += 0.20; // toda la actividad
  } else if ((level.level === 3) && ctx.type === "routine") {
    multiplier += 0.10; // rutinas completas
  } else if ((level.level === 2) && ctx.type === "class" && ctx.isBoostedClass) {
    multiplier += 0.05; // clases destacadas
  }

  return multiplier;
}
