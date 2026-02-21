import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting deletion of all user points data...\n");

  const deletedUserBadges = await prisma.userBadge.deleteMany({});
  console.log(`Deleted ${deletedUserBadges.count} user badges`);

  const deletedUserChallenges = await prisma.userChallenge.deleteMany({});
  console.log(`Deleted ${deletedUserChallenges.count} user challenges`);

  const deletedPointEvents = await prisma.pointEvent.deleteMany({});
  console.log(`Deleted ${deletedPointEvents.count} point events`);

  console.log("All user points data has been deleted successfully!");
  console.log("Summary:");
  console.log(`  - User Badges: ${deletedUserBadges.count}`);
  console.log(`  - User Challenges: ${deletedUserChallenges.count}`);
  console.log(`  - Point Events: ${deletedPointEvents.count}`);
}

main()
  .catch((e) => {
    console.error("Error deleting points data:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
