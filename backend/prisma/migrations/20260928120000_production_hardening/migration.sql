-- Keep this migration restartable: older installations may have received part of
-- these changes through `prisma db push`, or a previous deploy may have stopped
-- after one of PostgreSQL's transactional DDL statements was committed.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "sessionVersion" INTEGER NOT NULL DEFAULT 0;
-- Some existing installations already have this optimistic-lock column.
-- Preserve their version values when applying the remaining hardening changes.
ALTER TABLE "Character" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 0;
-- Every writer invalidates stale full-sheet snapshots, including purchases/XP.
CREATE OR REPLACE FUNCTION bump_character_version() RETURNS trigger AS $$
BEGIN
  NEW."version" := OLD."version" + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS character_version ON "Character";
CREATE TRIGGER character_version BEFORE UPDATE ON "Character"
FOR EACH ROW EXECUTE FUNCTION bump_character_version();
CREATE TABLE IF NOT EXISTS "PasswordReset" (
  "tokenHash" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "expiresAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX IF NOT EXISTS "PasswordReset_expiresAt_idx" ON "PasswordReset"("expiresAt");
CREATE INDEX IF NOT EXISTS "PasswordReset_userId_idx" ON "PasswordReset"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "PasswordReset_userId_key" ON "PasswordReset"("userId");
CREATE TABLE IF NOT EXISTS "RateLimitBucket" (
  "key" TEXT PRIMARY KEY, "count" INTEGER NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX IF NOT EXISTS "RateLimitBucket_expiresAt_idx" ON "RateLimitBucket"("expiresAt");
