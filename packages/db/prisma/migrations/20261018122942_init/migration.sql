-- CreateEnum
CREATE TYPE "PlaceCategory" AS ENUM ('HOME', 'WORK', 'RESTAURANT', 'CAFE', 'FAST_FOOD', 'BAR', 'BEACH', 'LANDMARK', 'PARK', 'MARKET', 'MALL', 'GAS_STATION', 'CAR_DEALER', 'MECHANIC', 'GYM');

-- CreateEnum
CREATE TYPE "TxCategory" AS ENUM ('SALARY', 'BONUS', 'FOOD', 'GROCERY', 'FUEL', 'LEISURE', 'CAR_PURCHASE', 'CAR_SALE', 'REPAIR', 'RENT', 'GIFT');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'DONE', 'ABANDONED');

-- CreateTable
CREATE TABLE "Place" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "PlaceCategory" NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT 'Gazimağusa',
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "priceLevel" INTEGER NOT NULL DEFAULT 2,
    "quality" DOUBLE PRECISION NOT NULL DEFAULT 0.6,
    "openHour" INTEGER NOT NULL DEFAULT 8,
    "closeHour" INTEGER NOT NULL DEFAULT 23,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Place_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarModel" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "fuelPer100Km" DOUBLE PRECISION NOT NULL,
    "tankLiters" DOUBLE PRECISION NOT NULL,
    "comfort" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "cruiseKmh" INTEGER NOT NULL DEFAULT 60,
    "color" TEXT NOT NULL DEFAULT '#e4572e',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "hourlyWage" INTEGER NOT NULL,
    "shiftStart" INTEGER NOT NULL,
    "shiftEnd" INTEGER NOT NULL,
    "workDays" INTEGER[],
    "minLevel" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bio" TEXT NOT NULL DEFAULT '',
    "jobId" TEXT,
    "state" JSONB NOT NULL,
    "simTime" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnedCar" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "carModelId" TEXT NOT NULL,
    "purchasePrice" INTEGER NOT NULL,
    "salePrice" INTEGER,
    "odometerKm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "purchasedAt" TIMESTAMP(3) NOT NULL,
    "soldAt" TIMESTAMP(3),

    CONSTRAINT "OwnedCar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "spent" INTEGER NOT NULL DEFAULT 0,
    "simTime" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "placeId" TEXT,
    "amount" INTEGER NOT NULL,
    "category" "TxCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "balance" INTEGER NOT NULL,
    "simTime" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "placeId" TEXT,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "simTime" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "targetAmount" INTEGER,
    "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailySnapshot" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "day" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "money" INTEGER NOT NULL,
    "earned" INTEGER NOT NULL,
    "spent" INTEGER NOT NULL,
    "distanceKm" DOUBLE PRECISION NOT NULL,
    "mood" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "DailySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Route" (
    "id" TEXT NOT NULL,
    "fromPlaceId" TEXT NOT NULL,
    "toPlaceId" TEXT NOT NULL,
    "geometry" JSONB NOT NULL,
    "distanceM" DOUBLE PRECISION NOT NULL,
    "durationS" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'osrm',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Route_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "paused" BOOLEAN NOT NULL DEFAULT false,
    "driveRate" DOUBLE PRECISION NOT NULL DEFAULT 0.35,
    "activityRate" DOUBLE PRECISION NOT NULL DEFAULT 8,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SimSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Place_slug_key" ON "Place"("slug");

-- CreateIndex
CREATE INDEX "Place_category_idx" ON "Place"("category");

-- CreateIndex
CREATE UNIQUE INDEX "CarModel_slug_key" ON "CarModel"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Job_slug_key" ON "Job"("slug");

-- CreateIndex
CREATE INDEX "OwnedCar_agentId_idx" ON "OwnedCar"("agentId");

-- CreateIndex
CREATE INDEX "Review_placeId_simTime_idx" ON "Review"("placeId", "simTime");

-- CreateIndex
CREATE INDEX "Review_agentId_simTime_idx" ON "Review"("agentId", "simTime");

-- CreateIndex
CREATE INDEX "Transaction_agentId_simTime_idx" ON "Transaction"("agentId", "simTime");

-- CreateIndex
CREATE INDEX "Event_agentId_simTime_idx" ON "Event"("agentId", "simTime");

-- CreateIndex
CREATE INDEX "Event_type_idx" ON "Event"("type");

-- CreateIndex
CREATE INDEX "Goal_agentId_status_idx" ON "Goal"("agentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "DailySnapshot_agentId_day_key" ON "DailySnapshot"("agentId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "Route_fromPlaceId_toPlaceId_key" ON "Route"("fromPlaceId", "toPlaceId");

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnedCar" ADD CONSTRAINT "OwnedCar_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnedCar" ADD CONSTRAINT "OwnedCar_carModelId_fkey" FOREIGN KEY ("carModelId") REFERENCES "CarModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailySnapshot" ADD CONSTRAINT "DailySnapshot_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Route" ADD CONSTRAINT "Route_fromPlaceId_fkey" FOREIGN KEY ("fromPlaceId") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Route" ADD CONSTRAINT "Route_toPlaceId_fkey" FOREIGN KEY ("toPlaceId") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;
