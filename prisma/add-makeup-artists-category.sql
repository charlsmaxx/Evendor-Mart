INSERT INTO "Category" (id, name, slug, icon, "sortOrder", "createdAt")
VALUES (gen_random_uuid(), 'Makeup Artists', 'makeup-artists', 'palette', 7, NOW())
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  "sortOrder" = EXCLUDED."sortOrder";

UPDATE "Category" SET "sortOrder" = 8 WHERE slug = 'wedding-planners';
