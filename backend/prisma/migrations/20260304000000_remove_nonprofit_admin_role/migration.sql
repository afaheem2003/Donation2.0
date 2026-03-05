-- Migration: remove NONPROFIT_ADMIN from UserRole enum
--
-- Any user currently holding NONPROFIT_ADMIN is a donor who manages
-- one or more nonprofits. Their management relationship is correctly
-- stored in the NonprofitAdmin join table. We demote them to DONOR
-- here; portal access is now derived from NonprofitAdmin records at
-- session build time (hasNonprofitAccess).

-- Step 1: downgrade all NONPROFIT_ADMIN users to DONOR before the
--         enum value is removed.
UPDATE "User"
SET role = 'DONOR'
WHERE role = 'NONPROFIT_ADMIN';

-- Step 2: drop the column default — PostgreSQL requires this before
--         changing the column type to a new enum.
ALTER TABLE "User" ALTER COLUMN role DROP DEFAULT;

-- Step 3: drop the old enum and recreate it without NONPROFIT_ADMIN.
--         PostgreSQL does not support removing a value from an enum
--         directly, so we rename the old type, create the new one,
--         migrate the column, then drop the old type.
ALTER TYPE "UserRole" RENAME TO "UserRole_old";

CREATE TYPE "UserRole" AS ENUM ('DONOR', 'PLATFORM_ADMIN');

ALTER TABLE "User"
  ALTER COLUMN role TYPE "UserRole"
  USING role::text::"UserRole";

-- Step 4: restore the default now that the column type is updated.
ALTER TABLE "User"
  ALTER COLUMN role SET DEFAULT 'DONOR'::"UserRole";

DROP TYPE "UserRole_old";
