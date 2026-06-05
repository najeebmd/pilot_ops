-- CreateTable
CREATE TABLE "InstructorSchedule" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "instructor_id" INTEGER NOT NULL,
    "date_start" DATETIME NOT NULL,
    "date_end" DATETIME NOT NULL,
    "activity_type" TEXT NOT NULL,
    "date_created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_updated" DATETIME NOT NULL,
    CONSTRAINT "InstructorSchedule_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
