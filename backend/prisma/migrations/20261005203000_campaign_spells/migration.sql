CREATE TABLE "CampaignSpell" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 0,
  "name" TEXT NOT NULL,
  "nameKey" TEXT NOT NULL,
  "level" INTEGER NOT NULL,
  "tradition" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "range" TEXT NOT NULL DEFAULT '',
  "duration" TEXT NOT NULL DEFAULT '',
  "visibility" TEXT NOT NULL DEFAULT 'SECRET',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampaignSpell_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CampaignSpell_level_check" CHECK ("level" BETWEEN 1 AND 6),
  CONSTRAINT "CampaignSpell_tradition_check" CHECK ("tradition" IN ('arcane', 'divine')),
  CONSTRAINT "CampaignSpell_visibility_check" CHECK ("visibility" IN ('SECRET', 'CAMPAIGN', 'CHARACTERS'))
);
CREATE TABLE "CampaignSpellReveal" (
  "spellId" TEXT NOT NULL,
  "characterId" TEXT NOT NULL,
  CONSTRAINT "CampaignSpellReveal_pkey" PRIMARY KEY ("spellId", "characterId")
);
CREATE UNIQUE INDEX "CampaignSpell_campaignId_tradition_nameKey_key" ON "CampaignSpell"("campaignId", "tradition", "nameKey");
CREATE INDEX "CampaignSpell_campaignId_visibility_idx" ON "CampaignSpell"("campaignId", "visibility");
CREATE INDEX "CampaignSpellReveal_characterId_idx" ON "CampaignSpellReveal"("characterId");
ALTER TABLE "CampaignSpell" ADD CONSTRAINT "CampaignSpell_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignSpellReveal" ADD CONSTRAINT "CampaignSpellReveal_spellId_fkey" FOREIGN KEY ("spellId") REFERENCES "CampaignSpell"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignSpellReveal" ADD CONSTRAINT "CampaignSpellReveal_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
