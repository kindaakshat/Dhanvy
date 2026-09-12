import { PrismaClient } from '@prisma/client';

export async function ensureDatabaseSchema(prisma: PrismaClient): Promise<void> {
  try {
    const tables = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
      "SELECT name FROM sqlite_master WHERE type='table'"
    );
    const tableNames = new Set(tables.map((t) => t.name));

    // 1. Ensure User table exists
    if (!tableNames.has('User')) {
      console.log('[SchemaHealer] Table User missing. Creating User table...');
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "User" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "email" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "passwordHash" TEXT,
          "role" TEXT NOT NULL DEFAULT 'USER',
          "resetToken" TEXT,
          "resetTokenExpiry" DATETIME,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");`);
    } else {
      // Check if passwordHash, resetToken, resetTokenExpiry columns exist in User table
      const userCols = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
        "PRAGMA table_info(User)"
      );
      const colNames = new Set(userCols.map((c) => c.name));
      if (!colNames.has('passwordHash')) {
        console.log('[SchemaHealer] Adding missing passwordHash column to User table...');
        await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;`);
      }
      if (!colNames.has('resetToken')) {
        console.log('[SchemaHealer] Adding missing resetToken column to User table...');
        await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN "resetToken" TEXT;`);
      }
      if (!colNames.has('resetTokenExpiry')) {
        console.log('[SchemaHealer] Adding missing resetTokenExpiry column to User table...');
        await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN "resetTokenExpiry" DATETIME;`);
      }
    }

    // 2. Ensure Session table exists
    if (!tableNames.has('Session')) {
      console.log('[SchemaHealer] Table Session missing. Creating Session table...');
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Session" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "token" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "expiresAt" DATETIME NOT NULL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
      `);
      await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Session_token_key" ON "Session"("token");`);
    }

    // 3. Ensure demo user exists with hashed password
    const demoUser = await prisma.user.findUnique({ where: { email: 'demo@trustlayer.dev' } }).catch(() => null);
    if (!demoUser) {
      console.log('[SchemaHealer] Demo user missing. Inserting demo user...');
      await prisma.$executeRawUnsafe(`
        INSERT OR REPLACE INTO "User" ("id", "email", "name", "passwordHash", "role", "createdAt", "updatedAt")
        VALUES ('usr_demo_01', 'demo@trustlayer.dev', 'Demo User (SecOps)', '$2b$10$QDl4/kphFqZux3axh5f5t.IAek.anO5O7KsdQIY.mIDSLB3yA.el.', 'ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
      `);
    } else if (!demoUser.passwordHash) {
      console.log('[SchemaHealer] Updating demo user with password hash...');
      await prisma.$executeRawUnsafe(`
        UPDATE "User" SET "passwordHash" = '$2b$10$QDl4/kphFqZux3axh5f5t.IAek.anO5O7KsdQIY.mIDSLB3yA.el.'
        WHERE "id" = 'usr_demo_01' OR "email" = 'demo@trustlayer.dev';
      `);
    }
    console.log('[SchemaHealer] Database schema verified & self-healed successfully.');
  } catch (err) {
    console.error('[SchemaHealer] Error verifying schema:', err);
  }
}
