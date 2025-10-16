import { PrismaClient } from "@prisma/client";
import { subDays } from "date-fns";

const prisma = new PrismaClient();

async function main() {
  const totalDays = 90;
  const today = new Date();

  // Start with some initial users
  let basic = 1; // Start with 1 basic user
  let premium = 1; // Start with 1 premium user

  // Target numbers for today
  const finalBasic = 2;
  const finalPremium = 2;

  // Add some randomization to make it more realistic
  const maxDailyChange = 2; // Can change by up to 2 users per day
  const chanceOfChange = 0.3; // 30% chance of change each day

  type DailyCount = {
    date: Date;
    basic: number;
    premium: number;
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
    });
  }

  await prisma.dailyUserCount.deleteMany(); // clear table first
  await prisma.dailyUserCount.createMany({ data });
  console.log(`✅ Seeded ${totalDays} days of realistic data`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
