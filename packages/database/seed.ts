import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Example: Create a test user
  const testUser = await prisma.user.create({
    data: {
      clerkId: 'test_clerk_id_123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
    },
  });

  console.log('Seeded user:', testUser);
  console.log('Database seeded successfully! ✨');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
