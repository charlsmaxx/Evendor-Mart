-- Evendor official vendor list (25 categories) — run in Supabase SQL editor
-- Safe to re-run: uses IF NOT EXISTS / ON CONFLICT

ALTER TYPE "VendorCategory" ADD VALUE IF NOT EXISTS 'BAKER';
ALTER TYPE "VendorCategory" ADD VALUE IF NOT EXISTS 'VIDEOGRAPHER';
ALTER TYPE "VendorCategory" ADD VALUE IF NOT EXISTS 'GELE_BRIDAL_ARTIST';
ALTER TYPE "VendorCategory" ADD VALUE IF NOT EXISTS 'FASHION_DESIGNER';
ALTER TYPE "VendorCategory" ADD VALUE IF NOT EXISTS 'FLORIST';
ALTER TYPE "VendorCategory" ADD VALUE IF NOT EXISTS 'LIGHTING_SOUND';
ALTER TYPE "VendorCategory" ADD VALUE IF NOT EXISTS 'BRIDAL_RENTAL';
ALTER TYPE "VendorCategory" ADD VALUE IF NOT EXISTS 'TRANSPORTATION';
ALTER TYPE "VendorCategory" ADD VALUE IF NOT EXISTS 'SECURITY';
ALTER TYPE "VendorCategory" ADD VALUE IF NOT EXISTS 'BAR_COCKTAIL';
ALTER TYPE "VendorCategory" ADD VALUE IF NOT EXISTS 'WAITERS_USHERS';
ALTER TYPE "VendorCategory" ADD VALUE IF NOT EXISTS 'EVENT_RENTAL';
ALTER TYPE "VendorCategory" ADD VALUE IF NOT EXISTS 'PRINTING_BRANDING';
ALTER TYPE "VendorCategory" ADD VALUE IF NOT EXISTS 'GIFT_SOUVENIR';
ALTER TYPE "VendorCategory" ADD VALUE IF NOT EXISTS 'SMALL_CHOPS_CATERING';
ALTER TYPE "VendorCategory" ADD VALUE IF NOT EXISTS 'BALLOON_BACKDROP';

INSERT INTO "Category" (id, name, slug, icon, "sortOrder", "createdAt")
VALUES
  (gen_random_uuid(), 'Event Planners', 'event-planners', 'sparkles', 1, NOW()),
  (gen_random_uuid(), 'Venue', 'venues', 'building', 2, NOW()),
  (gen_random_uuid(), 'Caterers', 'caterers', 'utensils', 3, NOW()),
  (gen_random_uuid(), 'Decorators & Stylists', 'decorators', 'sparkles', 4, NOW()),
  (gen_random_uuid(), 'Bakers & Cake Designers', 'bakers', 'sparkles', 5, NOW()),
  (gen_random_uuid(), 'Photographers', 'photographers', 'camera', 6, NOW()),
  (gen_random_uuid(), 'Videographers', 'videographers', 'camera', 7, NOW()),
  (gen_random_uuid(), 'Makeup Artists', 'makeup-artists', 'palette', 8, NOW()),
  (gen_random_uuid(), 'Gele & Bridal Artists', 'gele-bridal-artists', 'palette', 9, NOW()),
  (gen_random_uuid(), 'Fashion Designers', 'fashion-designers', 'sparkles', 10, NOW()),
  (gen_random_uuid(), 'MCs / Hosts', 'mcs', 'mic', 11, NOW()),
  (gen_random_uuid(), 'DJ / Musicians', 'djs', 'music', 12, NOW()),
  (gen_random_uuid(), 'Florists', 'florists', 'sparkles', 13, NOW()),
  (gen_random_uuid(), 'Lighting & Sound Providers', 'lighting-sound', 'sparkles', 14, NOW()),
  (gen_random_uuid(), 'Rental Equipment Providers', 'equipment-rentals', 'sparkles', 15, NOW()),
  (gen_random_uuid(), 'Bridals', 'bridal-rentals', 'sparkles', 16, NOW()),
  (gen_random_uuid(), 'Transportation Providers', 'transportation', 'sparkles', 17, NOW()),
  (gen_random_uuid(), 'Security Services', 'security', 'sparkles', 18, NOW()),
  (gen_random_uuid(), 'Bar & Cocktail Services', 'bar-cocktail', 'sparkles', 19, NOW()),
  (gen_random_uuid(), 'Waiters / Ushers', 'waiters-ushers', 'sparkles', 20, NOW()),
  (gen_random_uuid(), 'Event Rentals (Chairs, Tables, Tents)', 'event-rentals', 'sparkles', 21, NOW()),
  (gen_random_uuid(), 'Printing & Branding Services', 'printing-branding', 'sparkles', 22, NOW()),
  (gen_random_uuid(), 'Gift & Souvenir Vendors', 'gift-souvenir', 'sparkles', 23, NOW()),
  (gen_random_uuid(), 'Catering (Small Chops, Snacks)', 'small-chops-catering', 'sparkles', 24, NOW()),
  (gen_random_uuid(), 'Balloons & Backdrop Designers', 'balloon-backdrop', 'sparkles', 25, NOW())
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  "sortOrder" = EXCLUDED."sortOrder";

-- Rename legacy slugs if old seed data exists
UPDATE "Category" SET name = 'Event Planners', slug = 'event-planners', "sortOrder" = 1
WHERE slug = 'wedding-planners' AND NOT EXISTS (SELECT 1 FROM "Category" WHERE slug = 'event-planners');
