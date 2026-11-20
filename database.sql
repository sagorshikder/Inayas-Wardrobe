-- Inaya's Wardrobe - MySQL / MariaDB Schema for cPanel phpMyAdmin
-- Instructions:
--   1. In cPanel -> MySQL Databases, create a database & user (e.g. cpaneluser_inayas_wardrobe)
--      Note: cPanel does not allow spaces or apostrophes (') in DB/User names.
--   2. Assign the user to the database with ALL PRIVILEGES.
--   3. In phpMyAdmin, click your database on the left sidebar, open the Import tab,
--      and upload this file (database.sql). No CREATE DATABASE statement is included,
--      so it imports cleanly on shared cPanel hosting.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET NAMES utf8mb4;
SET time_zone = '+06:00';

CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(64) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `name` VARCHAR(120) NOT NULL DEFAULT '',
  `role` ENUM('admin', 'customer') NOT NULL DEFAULT 'customer',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `products` (
  `id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(180) NOT NULL,
  `cat` VARCHAR(80) NOT NULL DEFAULT 'Wardrobe',
  `price` INT UNSIGNED NOT NULL DEFAULT 0,
  `old_price` INT UNSIGNED NOT NULL DEFAULT 0,
  `description` TEXT NOT NULL,
  `tag` VARCHAR(60) DEFAULT NULL,
  `rating` DECIMAL(3,1) NOT NULL DEFAULT 4.8,
  `reviews_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `image` LONGTEXT NOT NULL,
  `thumb` LONGTEXT DEFAULT NULL,
  `images_json` LONGTEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_products_cat` (`cat`),
  KEY `idx_products_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `orders` (
  `id` VARCHAR(64) NOT NULL,
  `customer_name` VARCHAR(120) NOT NULL,
  `phone` VARCHAR(32) NOT NULL,
  `address` VARCHAR(320) NOT NULL,
  `note` VARCHAR(500) DEFAULT NULL,
  `payment_method` ENUM('COD', 'bKash', 'Nagad', 'Rocket', 'IBBL') NOT NULL DEFAULT 'COD',
  `total` INT UNSIGNED NOT NULL DEFAULT 0,
  `status` ENUM('New', 'Confirmed', 'Delivered', 'Cancelled') NOT NULL DEFAULT 'New',
  `items_json` LONGTEXT NOT NULL,
  `user_id` VARCHAR(64) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_orders_status` (`status`),
  KEY `idx_orders_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `inquiries` (
  `id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `phone` VARCHAR(32) NOT NULL,
  `interest` VARCHAR(120) NOT NULL,
  `message` TEXT DEFAULT NULL,
  `status` ENUM('New', 'Contacted', 'Closed') NOT NULL DEFAULT 'New',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_inquiries_status` (`status`),
  KEY `idx_inquiries_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `gallery` (
  `id` VARCHAR(64) NOT NULL,
  `cat` VARCHAR(80) NOT NULL DEFAULT 'Wardrobe',
  `title` VARCHAR(180) NOT NULL,
  `image` LONGTEXT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_gallery_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `reviews` (
  `id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(140) NOT NULL,
  `stars` TINYINT UNSIGNED NOT NULL DEFAULT 5,
  `text` TEXT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_reviews_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `site_settings` (
  `setting_key` VARCHAR(64) NOT NULL,
  `setting_value_json` LONGTEXT NOT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default customer reviews
INSERT IGNORE INTO `reviews` (`id`, `name`, `stars`, `text`) VALUES
('r1', 'Farhana Rahman · Dhaka', 5, 'Ordered an 8-foot sliding wardrobe customized in Walnut Brown. The measuring visit was punctual and the soft-close channels feel rock solid.'),
('r2', 'Tanvir Ahmed · Rajbari', 5, 'The Royal Queen Size Bed and Dressing Table arrived right on schedule. Solid finish, zero wobbling, and transparent pricing.'),
('r3', 'Nusrat Jahan · Uttara', 5, 'Used the 3D Wardrobe studio to pick Natural Oak before ordering on WhatsApp—the delivered wardrobe matched our preview down to the brass pulls.');
