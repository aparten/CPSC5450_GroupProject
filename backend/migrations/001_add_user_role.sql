-- Migration 001: Replace is_superuser with integer role column
-- Roles: viewer=1, analyst=2, superuser=3
--
-- Run this against the database before deploying the updated application code.

BEGIN;

ALTER TABLE "user"
    ADD COLUMN IF NOT EXISTS role INTEGER NOT NULL DEFAULT 1;

-- Promote existing superusers
UPDATE "user" SET role = 3 WHERE is_superuser = TRUE;

ALTER TABLE "user"
    DROP COLUMN IF EXISTS is_superuser;

COMMIT;
