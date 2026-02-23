import { PrismaClient } from "@prisma/client";
import { clerkClient } from "@clerk/express";

const prisma = new PrismaClient();

const resetUsersLastAcknowledgedLevel = async (): Promise<void> => {
  try {
    console.log("Resetting Clerk lastAcknowledgedLevel to 0...");
    const batchSize = 100;
    let offset = 0;
    let totalUpdated = 0;

    while (true) {
      const users = await clerkClient.users.getUserList({
        limit: batchSize,
        offset,
      });

      if (users.data.length === 0) {
        break;
      }

      for (const user of users.data) {
        await clerkClient.users.updateUser(user.id, {
          publicMetadata: {
            ...user.publicMetadata,
            lastAcknowledgedLevel: 0,
          },
        });
        totalUpdated++;
      }

      if (users.data.length < batchSize) {
        break;
      }

      offset += batchSize;
    }

    console.log(
      `Reset lastAcknowledgedLevel for ${totalUpdated} Clerk user(s)`,
    );
  } catch (error) {
    console.warn(
      "Could not reset Clerk lastAcknowledgedLevel for users:",
      error,
    );
  }
};

async function main() {
  console.log("Starting deletion of all user points data...\n");

  const deletedUserBadges = await prisma.userBadge.deleteMany({});
  console.log(`Deleted ${deletedUserBadges.count} user badges`);

  const deletedUserChallenges = await prisma.userChallenge.deleteMany({});
  console.log(`Deleted ${deletedUserChallenges.count} user challenges`);

  const deletedPointEvents = await prisma.pointEvent.deleteMany({});
  console.log(`Deleted ${deletedPointEvents.count} point events`);

  await resetUsersLastAcknowledgedLevel();

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
