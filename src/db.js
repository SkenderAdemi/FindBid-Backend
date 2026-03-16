/**
 * Prisma client singleton. Ensure DATABASE_URL is set in .env before starting.
 */
import pkg from '@prisma/client';
const { PrismaClient } = pkg;

const prisma = new PrismaClient();

export default prisma;
