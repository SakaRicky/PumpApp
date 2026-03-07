-- Add workerId to users as nullable first so we can backfill existing rows.
ALTER TABLE "users" ADD COLUMN "workerId" INTEGER;

-- Backfill: for each existing user, create a worker with the same name and link.
DO $$
DECLARE
  r RECORD;
  wid INTEGER;
BEGIN
  FOR r IN SELECT id, name, "createdAt", "updatedAt" FROM "users"
  LOOP
    INSERT INTO "workers" (name, "createdAt", "updatedAt")
    VALUES (r.name, r."createdAt", r."updatedAt")
    RETURNING id INTO wid;
    UPDATE "users" SET "workerId" = wid WHERE id = r.id;
  END LOOP;
END $$;

-- Make workerId required.
ALTER TABLE "users" ALTER COLUMN "workerId" SET NOT NULL;

-- Add unique constraint (one worker has at most one user).
CREATE UNIQUE INDEX "users_workerId_key" ON "users"("workerId");

-- Add foreign key.
ALTER TABLE "users" ADD CONSTRAINT "users_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "workers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
