-- CreateTable
CREATE TABLE "Aircraft" (
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
    "current_airport_id" INTEGER,
    "rental_rate" REAL,
    "next_inspection_date" DATETIME,
    "date_created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_updated" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Aircraft_tail_number_key" ON "Aircraft"("tail_number");

-- CreateIndex
CREATE UNIQUE INDEX "Aircraft_serial_number_key" ON "Aircraft"("serial_number");
