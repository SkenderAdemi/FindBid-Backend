-- Add email column to requests (user who created the request). Not unique.
-- Run in your MySQL/TiDB client if prisma db push is not used.

ALTER TABLE `requests` ADD COLUMN `email` VARCHAR(191) NOT NULL DEFAULT '';
