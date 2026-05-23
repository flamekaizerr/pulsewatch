import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const demoEmail = 'admin@pulsewatch.com';
  console.log(`[SEED] Seeding database schema. Checking demo user "${demoEmail}"...`);

  let user = await prisma.user.findUnique({
    where: { email: demoEmail },
  });

  if (!user) {
    const passwordHash = await bcrypt.hash('demo1234', 10);
    user = await prisma.user.create({
      data: {
        email: demoEmail,
        passwordHash,
      },
    });
    console.log(`[SEED] Created demo user: ${demoEmail} / password: demo1234`);
  } else {
    console.log(`[SEED] Demo user already exists`);
  }

  // Create default monitors
  const defaultMonitors = [
    {
      name: 'Google Homepage',
      url: 'https://google.com',
      intervalMinutes: 15,
      timeoutMs: 5000,
      discordAlerts: false,
    },
    {
      name: 'GitHub Status',
      url: 'https://github.com',
      intervalMinutes: 15,
      timeoutMs: 5000,
      discordAlerts: false,
    },
    {
      name: 'Backend Health Check',
      url: 'http://localhost:4000/health',
      intervalMinutes: 15,
      timeoutMs: 5000,
      discordAlerts: false,
    },
  ];

  for (const item of defaultMonitors) {
    const existing = await prisma.monitor.findFirst({
      where: {
        userId: user.id,
        url: item.url,
      },
    });

    if (!existing) {
      await prisma.monitor.create({
        data: {
          ...item,
          userId: user.id,
        },
      });
      console.log(`[SEED] Created monitor: ${item.name} (${item.url})`);
    } else {
      console.log(`[SEED] Monitor already exists: ${item.name}`);
    }
  }

  console.log('[SEED] Database seeding complete!');
}

main()
  .catch((e) => {
    console.error('[SEED] Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
