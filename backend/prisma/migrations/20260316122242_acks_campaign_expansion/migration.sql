-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "currentMonth" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "currentWeek" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "currentYear" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "optionalRules" TEXT NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "learnedSpells" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN     "monthlyUpkeepGp" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "researchCostGp" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "researchQueue" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN     "researchTimeWeeks" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "spellbook" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN     "xpFromTreasure" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Domain" ADD COLUMN     "civilExpenses" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "consolidatedBalance" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "constructionCosts" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "eventModifier" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "loyalty" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "maintenanceCost" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "mercenaryPayroll" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "monthlyEvent" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "specialistPayroll" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "stability" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "treasury" DOUBLE PRECISION NOT NULL DEFAULT 0.0;

-- AlterTable
ALTER TABLE "Henchman" ADD COLUMN     "capacity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "domainImpact" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "explorationImpact" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "roleType" TEXT NOT NULL DEFAULT 'retainer',
ADD COLUMN     "warImpact" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "CampaignEconomy" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "grossRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "domainRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "mercantileRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "expensesTotal" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "garrisonExpenses" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "mercenaryExpenses" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "specialistExpenses" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "maintenanceExpenses" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "stability" INTEGER NOT NULL DEFAULT 0,
    "loyalty" INTEGER NOT NULL DEFAULT 0,
    "monthlyEvent" TEXT NOT NULL DEFAULT '',
    "consolidatedBalance" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignEconomy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignActivity" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'downtime',
    "title" TEXT NOT NULL,
    "details" TEXT NOT NULL DEFAULT '',
    "costGp" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "durationWeeks" INTEGER NOT NULL DEFAULT 1,
    "remainingWeeks" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "impactSummary" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CampaignEconomy_campaignId_key" ON "CampaignEconomy"("campaignId");

-- AddForeignKey
ALTER TABLE "CampaignEconomy" ADD CONSTRAINT "CampaignEconomy_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignActivity" ADD CONSTRAINT "CampaignActivity_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
