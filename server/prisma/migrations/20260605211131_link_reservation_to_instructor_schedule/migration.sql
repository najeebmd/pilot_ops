-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_InstructorSchedule" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "instructor_id" INTEGER NOT NULL,
    "date_start" DATETIME NOT NULL,
    "date_end" DATETIME NOT NULL,
    "activity_type" TEXT NOT NULL,
    "reservation_id" INTEGER,
    "date_created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_updated" DATETIME NOT NULL,
    CONSTRAINT "InstructorSchedule_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InstructorSchedule_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "Reservation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_InstructorSchedule" ("activity_type", "date_created", "date_end", "date_start", "date_updated", "id", "instructor_id") SELECT "activity_type", "date_created", "date_end", "date_start", "date_updated", "id", "instructor_id" FROM "InstructorSchedule";
DROP TABLE "InstructorSchedule";
ALTER TABLE "new_InstructorSchedule" RENAME TO "InstructorSchedule";
CREATE UNIQUE INDEX "InstructorSchedule_reservation_id_key" ON "InstructorSchedule"("reservation_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
