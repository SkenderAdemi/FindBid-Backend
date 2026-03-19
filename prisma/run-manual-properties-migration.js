/**
 * Run the manual providers-table migration: add userId and description (no mysql CLI needed).
 * Uses DATABASE_URL from .env. Run from repo root: node prisma/run-manual-properties-migration.js
 */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const __dirname = dirname(fileURLToPath(import.meta.url));

const raw = readFileSync(join(__dirname, "manual_add_properties.sql"), "utf8");
const statements = raw
  .split("\n")
  .filter((line) => !line.trim().startsWith("--"))
  .join("\n")
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean);

if (!statements.length) {
  console.error("No SQL statements found in manual_add_properties.sql");
  process.exit(1);
}

const prisma = new PrismaClient();

try {
  for (const sql of statements) {
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log("OK:", sql.slice(0, 60) + "...");
    } catch (err) {
      if (err.message && (err.message.includes("Duplicate") || err.message.includes("already exists"))) {
        console.warn("Skip (already applied):", err.message);
      } else {
        throw err;
      }
    }
  }
  console.log("Providers migration done (userId + description).");
} catch (err) {
  console.error("Migration failed:", err.message);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
