-- Rename category display labels used by marketplace / listings
UPDATE "Category" SET "name" = 'Venue' WHERE "slug" = 'venues';
UPDATE "Category" SET "name" = 'Bridals' WHERE "slug" = 'bridal-rentals';
