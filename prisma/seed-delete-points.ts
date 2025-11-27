import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🗑️  Starting deletion of all user points data...\n");

  // Delete UserBadges (earned badges based on points)
  const deletedUserBadges = await prisma.userBadge.deleteMany({});
  console.log(`  ✅ Deleted ${deletedUserBadges.count} user badges`);

  // Delete UserChallenges (completed challenges that gave points)
  const deletedUserChallenges = await prisma.userChallenge.deleteMany({});
  console.log(`  ✅ Deleted ${deletedUserChallenges.count} user challenges`);

  // Delete all PointEvents (main points records)
  const deletedPointEvents = await prisma.pointEvent.deleteMany({});
  console.log(`  ✅ Deleted ${deletedPointEvents.count} point events`);

  console.log("\n🎉 All user points data has been deleted successfully!");
  console.log("\n📊 Summary:");
  console.log(`  - User Badges: ${deletedUserBadges.count}`);
  console.log(`  - User Challenges: ${deletedUserChallenges.count}`);
  console.log(`  - Point Events: ${deletedPointEvents.count}`);
}

main()
  .catch((e) => {
    console.error("❌ Error deleting points data:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

