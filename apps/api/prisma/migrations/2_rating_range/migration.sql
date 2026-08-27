-- Prisma's schema language has no check constraint, but a 1-to-5 rating is an
-- invariant of the data, not of the application. Zod rejects a bad rating at
-- the API boundary; this makes it impossible to store one by any route.
ALTER TABLE "CollectionItem"
  ADD CONSTRAINT "CollectionItem_rating_range"
  CHECK ("rating" IS NULL OR ("rating" >= 1 AND "rating" <= 5));
