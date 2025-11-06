import { PrismaClient, Sede } from "@prisma/client";
import { subDays } from "date-fns";
import { clerkClient } from "@clerk/express";

const prisma = new PrismaClient();

type DailyCount = {
  date: Date;
  basic: number;
  premium: number;
  sedeId: number;
};

const generateDataForSede = async (sede: Sede): Promise<DailyCount[]> => {
  const totalDays = 90;
  const today = new Date();

  console.log(`\n📊 Processing Sede: ${sede.name} (ID: ${sede.id})`);

  // Get current user counts for this sede
  let finalBasic = 0;
  let finalPremium = 0;

  try {
    const users = await clerkClient.users.getUserList({ limit: 500 });
    finalBasic = users.data.filter(
      (user) =>
        user.publicMetadata.plan === "basic" &&
        user.publicMetadata.sede === sede.id
    ).length;
    finalPremium = users.data.filter(
      (user) =>
        user.publicMetadata.plan === "premium" &&
        user.publicMetadata.sede === sede.id
    ).length;

    console.log(
      `  📈 Current counts - Basic: ${finalBasic}, Premium: ${finalPremium}`
    );
  } catch (error) {
    console.warn(
      "  ⚠️ Could not fetch current user counts from Clerk, using defaults (0, 0)"
    );
  }

  // Start with some initial users (use current counts if available, otherwise start from 1)
  let basic = finalBasic > 0 ? Math.max(1, Math.floor(finalBasic * 0.2)) : 1;
  let premium =
    finalPremium > 0 ? Math.max(1, Math.floor(finalPremium * 0.2)) : 1;

  // Add some randomization to make it more realistic
  const maxDailyChange = 2; // Can change by up to 2 users per day
  const chanceOfChange = 0.3; // 30% chance of change each day

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
      sedeId: sede.id,
    });
  }

  return data;
};

async function main() {
  console.log("🌱 Starting daily user count seeding for all sedes...\n");

  // Get all sedes
  const sedes = await prisma.sede.findMany({
    orderBy: { id: "asc" },
  });

  if (sedes.length === 0) {
    console.error("❌ No sedes found in database. Please create sedes first.");
    process.exit(1);
  }

  console.log(`📍 Found ${sedes.length} sede(s) to process`);

  const allData: DailyCount[] = [];

  // Generate data for each sede
  for (const sede of sedes) {
    const sedeData = await generateDataForSede(sede);
    allData.push(...sedeData);
    console.log(
      `  ✅ Generated ${sedeData.length} days of data for ${sede.name}`
    );
  }

  // Clear all existing records
  console.log("\n🧹 Clearing existing daily user count data...");
  await prisma.dailyUserCount.deleteMany({});

  // Create all data at once
  console.log("💾 Saving data to database...");
  await prisma.dailyUserCount.createMany({ data: allData });

  console.log(
    `\n✅ Successfully seeded ${allData.length} daily user count records for ${sedes.length} sede(s)!`
  );
  console.log("\n📊 Summary:");
  for (const sede of sedes) {
    const sedeRecords = allData.filter((d) => d.sedeId === sede.id);
    console.log(`  - ${sede.name}: ${sedeRecords.length} records`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
