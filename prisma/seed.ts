import { PrismaClient } from "@prisma/client";
import { subDays } from "date-fns";
import { clerkClient } from "@clerk/express";

const prisma = new PrismaClient();

const parseSedeId = (): number => {
  const args = process.argv.slice(2);
  const sedeArg = args.find((arg) => arg.startsWith("--sede="));
  if (sedeArg) {
    const sedeId = parseInt(sedeArg.split("=")[1], 10);
    if (isNaN(sedeId)) {
      console.error("❌ Invalid sede ID. Must be a number.");
      process.exit(1);
    }
    return sedeId;
  }
  // Default to 1 if no argument provided
  return 1;
};

async function main() {
  const sedeId = parseSedeId();
  const totalDays = 90;
  const today = new Date();

  // Verify that the sede exists
  const sede = await prisma.sede.findUnique({
    where: { id: sedeId },
  });

  if (!sede) {
    console.error(`❌ Sede with ID ${sedeId} does not exist.`);
    process.exit(1);
  }

  console.log(`📊 Seeding data for Sede: ${sede.name} (ID: ${sedeId})`);

  // Get current user counts for this sede
  let finalBasic = 0;
  let finalPremium = 0;

  try {
    const users = await clerkClient.users.getUserList({ limit: 100 });
    finalBasic = users.data.filter(
      (user) =>
        user.publicMetadata.plan === "basic" &&
        user.publicMetadata.sede === sedeId
    ).length;
    finalPremium = users.data.filter(
      (user) =>
        user.publicMetadata.plan === "premium" &&
        user.publicMetadata.sede === sedeId
    ).length;

    console.log(
      `📈 Current counts - Basic: ${finalBasic}, Premium: ${finalPremium}`
    );
  } catch (error) {
    console.warn(
      "⚠️ Could not fetch current user counts from Clerk, using defaults (0, 0)"
    );
  }

  // Start with some initial users (use current counts if available, otherwise start from 1)
  let basic = finalBasic > 0 ? Math.max(1, Math.floor(finalBasic * 0.2)) : 1;
  let premium =
    finalPremium > 0 ? Math.max(1, Math.floor(finalPremium * 0.2)) : 1;

  // Add some randomization to make it more realistic
  const maxDailyChange = 2; // Can change by up to 2 users per day
  const chanceOfChange = 0.3; // 30% chance of change each day

  type DailyCount = {
    date: Date;
    basic: number;
    premium: number;
    sedeId: number;
  };

  const data: DailyCount[] = [];

  for (let i = 0; i < totalDays; i++) {
    const daysLeft = totalDays - i - 1;

    // Only make changes some days to simulate realistic user behavior
    if (Math.random() < chanceOfChange) {
      // For basic users
      if (Math.random() < 0.5 && daysLeft > 5) {
        // Less changes near the end
        const change =
          Math.floor(Math.random() * maxDailyChange) *
          (Math.random() < 0.6 ? 1 : -1);
        const newBasic = Math.max(0, basic + change);
        // Don't allow too many users until near the end
        if (newBasic <= Math.max(5, finalBasic + 2)) {
          basic = newBasic;
        }
      }

      // For premium users
      if (Math.random() < 0.5 && daysLeft > 5) {
        // Less changes near the end
        const change =
          Math.floor(Math.random() * maxDailyChange) *
          (Math.random() < 0.6 ? 1 : -1);
        const newPremium = Math.max(0, premium + change);
        // Don't allow too many users until near the end
        if (newPremium <= Math.max(5, finalPremium + 2)) {
          premium = newPremium;
        }
      }
    }

    // In the last 5 days, gradually adjust towards final numbers
    if (daysLeft <= 5) {
      if (basic > finalBasic) basic--;
      if (basic < finalBasic) basic++;
      if (premium > finalPremium) premium--;
      if (premium < finalPremium) premium++;
    }

    // Make sure on the last day we hit exactly the target
    if (i === totalDays - 1) {
      basic = finalBasic;
      premium = finalPremium;
    }

    data.push({
      date: subDays(today, totalDays - i - 1),
      basic,
      premium,
      sedeId,
    });
  }

  // Clear only records for this sede
  await prisma.dailyUserCount.deleteMany({
    where: { sedeId },
  });
  await prisma.dailyUserCount.createMany({ data });
  console.log(
    `✅ Seeded ${totalDays} days of realistic data for Sede: ${sede.name} (ID: ${sedeId})`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
