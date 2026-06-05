/*
  Warnings:

  - You are about to drop the column `current_airport_id` on the `Aircraft` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Aircraft" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tail_number" TEXT NOT NULL,
    "serial_number" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year_built" INTEGER NOT NULL,
    "flight_hours" REAL NOT NULL DEFAULT 0,
    "fuel_capacity" REAL,
    "weight" REAL,
    "status" TEXT NOT NULL DEFAULT 'READY',
    "rental_rate" REAL,
    "next_inspection_date" DATETIME,
    "date_created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_updated" DATETIME NOT NULL
);
INSERT INTO "new_Aircraft" ("date_created", "date_updated", "flight_hours", "fuel_capacity", "id", "make", "model", "next_inspection_date", "rental_rate", "serial_number", "status", "tail_number", "weight", "year_built") SELECT "date_created", "date_updated", "flight_hours", "fuel_capacity", "id", "make", "model", "next_inspection_date", "rental_rate", "serial_number", "status", "tail_number", "weight", "year_built" FROM "Aircraft";
DROP TABLE "Aircraft";
ALTER TABLE "new_Aircraft" RENAME TO "Aircraft";
CREATE UNIQUE INDEX "Aircraft_tail_number_key" ON "Aircraft"("tail_number");
CREATE UNIQUE INDEX "Aircraft_serial_number_key" ON "Aircraft"("serial_number");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
