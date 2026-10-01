-- Bring the migration history in sync with the models already used by the API.

-- AlterTable
ALTER TABLE "Character" ADD COLUMN "subclass" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Henchman" ADD COLUMN "subclass" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Domain" ADD COLUMN "peasantFamilies" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "revenuePerFamily" DOUBLE PRECISION NOT NULL DEFAULT 3.0,
ADD COLUMN "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 20.0;

-- CreateTable
CREATE TABLE "MagicItemResearch" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "spellLevel" INTEGER NOT NULL DEFAULT 1,
    "totalCostGp" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "weeksRequired" INTEGER NOT NULL DEFAULT 1,
    "isPermanent" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MagicItemResearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MercantileVenture" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "cargoName" TEXT NOT NULL DEFAULT 'Cargo',
    "baseValueGp" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "originMarketClass" INTEGER NOT NULL DEFAULT 3,
    "destMarketClass" INTEGER NOT NULL DEFAULT 3,
    "distanceHexes" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'IN_TRANSIT',
    "profitGp" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MercantileVenture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterActivity" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'downtime',
    "title" TEXT NOT NULL,
    "details" TEXT NOT NULL DEFAULT '',
    "costGp" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "durationWeeks" INTEGER NOT NULL DEFAULT 1,
    "remainingWeeks" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CharacterActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArmyUnit" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "troopType" TEXT NOT NULL DEFAULT 'Light Infantry',
    "ac" INTEGER NOT NULL DEFAULT 0,
    "damage" TEXT NOT NULL DEFAULT '1d6',
    "movement" INTEGER NOT NULL DEFAULT 120,
    "morale" INTEGER NOT NULL DEFAULT 0,
    "hp" INTEGER NOT NULL DEFAULT 1,
    "monthlyCostGp" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "equipment" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArmyUnit_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MagicItemResearch" ADD CONSTRAINT "MagicItemResearch_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MercantileVenture" ADD CONSTRAINT "MercantileVenture_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterActivity" ADD CONSTRAINT "CharacterActivity_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArmyUnit" ADD CONSTRAINT "ArmyUnit_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
