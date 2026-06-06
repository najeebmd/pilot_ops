-- Rename InstructorRate to Instructor and add status column
-- Since SQLite doesn't support ALTER TABLE RENAME in migrations,
-- we create the new table, copy data, then drop the old one.

CREATE TABLE "Instructor" (
    "id"            INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "instructor_id" INTEGER NOT NULL,
    "regular_rate"  REAL    NOT NULL,
    "status"        TEXT    NOT NULL DEFAULT 'ACTIVE',
    "date_created"  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_updated"  DATETIME NOT NULL,
    CONSTRAINT "Instructor_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Copy existing data
INSERT INTO "Instructor" ("instructor_id", "regular_rate", "date_created", "date_updated")
SELECT "instructor_id", "regular_rate", "date_created", "date_updated"
FROM "InstructorRate";

-- Unique index
CREATE UNIQUE INDEX "Instructor_instructor_id_key" ON "Instructor"("instructor_id");

-- Drop old table
DROP TABLE "InstructorRate";
