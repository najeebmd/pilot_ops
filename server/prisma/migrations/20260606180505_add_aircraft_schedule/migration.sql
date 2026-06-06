-- CreateTable
CREATE TABLE "AircraftSchedule" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "aircraft_id" INTEGER NOT NULL,
    "date_start" DATETIME NOT NULL,
    "date_end" DATETIME NOT NULL,
    "activity_type" TEXT NOT NULL,
    "reservation_id" INTEGER,
    "date_created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_updated" DATETIME NOT NULL,
    CONSTRAINT "AircraftSchedule_aircraft_id_fkey" FOREIGN KEY ("aircraft_id") REFERENCES "Aircraft" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AircraftSchedule_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "Reservation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "AircraftSchedule_reservation_id_key" ON "AircraftSchedule"("reservation_id");
