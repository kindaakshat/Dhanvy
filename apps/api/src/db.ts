import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

function resolveDatabaseUrl(): string {
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== '') {
    return process.env.DATABASE_URL;
  }

  const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION);

  // Candidate locations: prioritize active local dev.db first, fallback to seed.sqlite
  const candidates = isServerless
    ? [
        path.resolve(__dirname, '../prisma/seed.sqlite'),
        path.resolve(process.cwd(), 'prisma/seed.sqlite'),
        path.resolve(process.cwd(), 'apps/api/prisma/seed.sqlite'),
        path.resolve(__dirname, '../../prisma/seed.sqlite'),
        path.resolve(__dirname, '../../../prisma/seed.sqlite'),
        path.resolve(__dirname, 'prisma/seed.sqlite'),
        path.resolve(__dirname, '../seed.sqlite'),
        path.resolve(__dirname, './seed.sqlite'),
        path.resolve(__dirname, '../prisma/dev.db'),
        path.resolve(process.cwd(), 'prisma/dev.db'),
      ]
    : [
        path.resolve(__dirname, '../prisma/dev.db'),
        path.resolve(process.cwd(), 'prisma/dev.db'),
        path.resolve(process.cwd(), 'apps/api/prisma/dev.db'),
        path.resolve(__dirname, '../../prisma/dev.db'),
        path.resolve(__dirname, '../prisma/seed.sqlite'),
        path.resolve(process.cwd(), 'prisma/seed.sqlite'),
        path.resolve(process.cwd(), 'apps/api/prisma/seed.sqlite'),
        path.resolve(__dirname, '../../prisma/seed.sqlite'),
      ];

  let foundFile: string | null = null;
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      foundFile = c;
      break;
    }
  }

  if (foundFile) {
    console.log(`[TrustLayer DB] Connected to SQLite database: ${foundFile} (size: ${fs.statSync(foundFile).size} bytes)`);
  } else {
    console.warn(`[TrustLayer DB] WARNING: No database seed file found in candidate locations!`);
  }

  if (isServerless) {
    const tmpDbPath = '/tmp/trustlayer.db';
    if (foundFile) {
      try {
        const sourceSize = fs.statSync(foundFile).size;
        const targetSize = fs.existsSync(tmpDbPath) ? fs.statSync(tmpDbPath).size : 0;
        if (targetSize !== sourceSize) {
          fs.copyFileSync(foundFile, tmpDbPath);
          console.log(`[TrustLayer DB] Copied SQLite seed (${sourceSize} bytes) from ${foundFile} to ${tmpDbPath} (was ${targetSize} bytes)`);
        }
      } catch (err) {
        console.warn('[TrustLayer DB] Could not copy seed to /tmp:', err);
      }
    }
    const url = `file:${tmpDbPath}`;
    process.env.DATABASE_URL = url;
    return url;
  }

  const url = foundFile ? `file:${foundFile.replace(/\\/g, '/')}` : 'file:./seed.sqlite';
  process.env.DATABASE_URL = url;
  return url;
}

const activeUrl = resolveDatabaseUrl();

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: activeUrl,
    },
  },
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});
