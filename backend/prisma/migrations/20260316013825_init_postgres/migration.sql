-- CreateEnum
CREATE TYPE "Role" AS ENUM ('MASTER', 'PLAYER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'PLAYER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "joinCode" TEXT NOT NULL,
    "masterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignMember" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomClass" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hitDie" TEXT NOT NULL DEFAULT '1d8',
    "conBonus" BOOLEAN NOT NULL DEFAULT true,
    "xpPerLevel" TEXT NOT NULL DEFAULT '[]',
    "titles" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Character" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "campaignId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "chroniclesOf" TEXT NOT NULL DEFAULT '',
    "characterName" TEXT NOT NULL DEFAULT '',
    "birthplace" TEXT NOT NULL DEFAULT '',
    "className" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL DEFAULT '',
    "alignment" TEXT NOT NULL DEFAULT '',
    "age" INTEGER NOT NULL DEFAULT 0,
    "size" TEXT NOT NULL DEFAULT 'Medium',
    "gender" TEXT NOT NULL DEFAULT '',
    "level" INTEGER NOT NULL DEFAULT 1,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "xpNext" INTEGER NOT NULL DEFAULT 0,
    "hpMax" INTEGER NOT NULL DEFAULT 0,
    "hpCurr" INTEGER NOT NULL DEFAULT 0,
    "hitDice" TEXT NOT NULL DEFAULT '',
    "str" INTEGER NOT NULL DEFAULT 10,
    "int" INTEGER NOT NULL DEFAULT 10,
    "dex" INTEGER NOT NULL DEFAULT 10,
    "wil" INTEGER NOT NULL DEFAULT 10,
    "con" INTEGER NOT NULL DEFAULT 10,
    "cha" INTEGER NOT NULL DEFAULT 10,
    "acNoArmor" INTEGER NOT NULL DEFAULT 0,
    "acNoShield" INTEGER NOT NULL DEFAULT 0,
    "acWithShield" INTEGER NOT NULL DEFAULT 0,
    "armorName" TEXT NOT NULL DEFAULT '',
    "armorAcBonus" INTEGER NOT NULL DEFAULT 0,
    "armorWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "saveDeath" INTEGER NOT NULL DEFAULT 14,
    "saveImplements" INTEGER NOT NULL DEFAULT 14,
    "saveParalysis" INTEGER NOT NULL DEFAULT 14,
    "saveBlast" INTEGER NOT NULL DEFAULT 14,
    "saveSpells" INTEGER NOT NULL DEFAULT 14,
    "moveExploration" INTEGER NOT NULL DEFAULT 120,
    "moveCombat" INTEGER NOT NULL DEFAULT 40,
    "moveCharge" INTEGER NOT NULL DEFAULT 120,
    "moveExpedition" INTEGER NOT NULL DEFAULT 24,
    "moveStealth" INTEGER NOT NULL DEFAULT 40,
    "initiative" INTEGER NOT NULL DEFAULT 0,
    "surprise" INTEGER NOT NULL DEFAULT 0,
    "surpriseOthers" INTEGER,
    "avoidSurprise" INTEGER,
    "healingRate" INTEGER NOT NULL DEFAULT 0,
    "mortalWounds" INTEGER NOT NULL DEFAULT 0,
    "cleaves" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT NOT NULL DEFAULT '',
    "classFeatures" TEXT NOT NULL DEFAULT '',
    "languagesKnown" TEXT NOT NULL DEFAULT '',
    "coinPP" INTEGER NOT NULL DEFAULT 0,
    "coinEP" INTEGER NOT NULL DEFAULT 0,
    "coinGP" INTEGER NOT NULL DEFAULT 0,
    "coinSP" INTEGER NOT NULL DEFAULT 0,
    "coinCP" INTEGER NOT NULL DEFAULT 0,
    "gemsJewelry" TEXT NOT NULL DEFAULT '',
    "isSpellcaster" BOOLEAN NOT NULL DEFAULT false,
    "spellSlotsLevel1" INTEGER NOT NULL DEFAULT 0,
    "spellSlotsLevel2" INTEGER NOT NULL DEFAULT 0,
    "spellSlotsLevel3" INTEGER NOT NULL DEFAULT 0,
    "spellSlotsLevel4" INTEGER NOT NULL DEFAULT 0,
    "spellSlotsLevel5" INTEGER NOT NULL DEFAULT 0,
    "spellSlotsLevel6" INTEGER NOT NULL DEFAULT 0,
    "libraryValue" INTEGER,
    "workshopValue" INTEGER,
    "congregants" INTEGER,
    "magicResearch" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Weapon" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "style" TEXT NOT NULL DEFAULT '',
    "initBonus" INTEGER NOT NULL DEFAULT 0,
    "attackThrow" INTEGER NOT NULL DEFAULT 10,
    "attackBonus" INTEGER NOT NULL DEFAULT 0,
    "damage" TEXT NOT NULL DEFAULT '1d6',
    "rangeShort" INTEGER NOT NULL DEFAULT 0,
    "rangeMed" INTEGER NOT NULL DEFAULT 0,
    "rangeLong" INTEGER NOT NULL DEFAULT 0,
    "encumbrance" DOUBLE PRECISION NOT NULL DEFAULT 0.0,

    CONSTRAINT "Weapon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proficiency" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "throwTarget" INTEGER NOT NULL DEFAULT 11,
    "category" TEXT NOT NULL DEFAULT 'general',

    CONSTRAINT "Proficiency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "slot" TEXT NOT NULL DEFAULT 'backpack',
    "notes" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Spell" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Spell_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ritual" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Ritual_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MagicFormula" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "MagicFormula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Henchman" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "className" TEXT NOT NULL DEFAULT 'Mercenary',
    "level" INTEGER NOT NULL DEFAULT 1,
    "morale" INTEGER NOT NULL DEFAULT 0,
    "loyalty" INTEGER NOT NULL DEFAULT 0,
    "wage" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "treasureShare" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "notes" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Henchman_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Domain" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "strongholdName" TEXT NOT NULL DEFAULT '',
    "landRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "garrisonCost" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "peasantMorale" INTEGER NOT NULL DEFAULT 0,
    "mercantileVentures" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Domain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scar" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "daysToRest" INTEGER NOT NULL DEFAULT 0,
    "debuff" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Scar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "characterId" TEXT,
    "campaignId" TEXT,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "details" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_joinCode_key" ON "Campaign"("joinCode");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignMember_campaignId_userId_key" ON "CampaignMember"("campaignId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Domain_characterId_key" ON "Domain"("characterId");

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignMember" ADD CONSTRAINT "CampaignMember_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignMember" ADD CONSTRAINT "CampaignMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomClass" ADD CONSTRAINT "CustomClass_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Weapon" ADD CONSTRAINT "Weapon_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proficiency" ADD CONSTRAINT "Proficiency_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Spell" ADD CONSTRAINT "Spell_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ritual" ADD CONSTRAINT "Ritual_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MagicFormula" ADD CONSTRAINT "MagicFormula_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Henchman" ADD CONSTRAINT "Henchman_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Domain" ADD CONSTRAINT "Domain_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scar" ADD CONSTRAINT "Scar_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
