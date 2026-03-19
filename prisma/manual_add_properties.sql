-- Manual migration: users table + userId/description on providers (Admin uses providers table, one per user).
-- Run in your MySQL/TiDB client or: mysql -u USER -p DATABASE < prisma/manual_add_properties.sql
-- If a column/table already exists, skip that statement or you'll get a duplicate error.

-- 1) Users table (referenced by providers.userId)
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `users_email_key` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2) Optional: if providers already has rows with userId, insert those ids into users first:
-- INSERT IGNORE INTO `users` (`id`, `email`, `createdAt`) SELECT DISTINCT `userId`, `email`, NOW(3) FROM `providers` WHERE `userId` IS NOT NULL;

-- 3) Add columns to providers if not present
ALTER TABLE `providers` ADD COLUMN `userId` VARCHAR(191) NULL;
ALTER TABLE `providers` ADD COLUMN `description` TEXT NULL;
ALTER TABLE `providers` ADD UNIQUE INDEX `providers_userId_key` (`userId`);
ALTER TABLE `providers` ADD UNIQUE INDEX `providers_email_key` (`email`);

-- 4) Foreign key: providers.userId -> users.id
ALTER TABLE `providers` ADD CONSTRAINT `providers_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
