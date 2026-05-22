-- AlterTable
ALTER TABLE "team" ADD COLUMN "signalBoostBalance" INTEGER NOT NULL DEFAULT 2;

-- CreateTable
CREATE TABLE "location_hint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "imageUrl" TEXT,
    "imageBlobName" TEXT,
    "imageMimeType" TEXT,
    "imageSizeBytes" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "team_location_hint_reveal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "locationHintId" TEXT NOT NULL,
    "revealLevel" INTEGER NOT NULL DEFAULT 0,
    "lastSpentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "team_location_hint_reveal_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "team_location_hint_reveal_locationHintId_fkey" FOREIGN KEY ("locationHintId") REFERENCES "location_hint" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "signal_boost_ledger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "locationHintId" TEXT,
    "claimId" TEXT,
    "type" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "signal_boost_ledger_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "signal_boost_ledger_locationHintId_fkey" FOREIGN KEY ("locationHintId") REFERENCES "location_hint" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Seed initial Signal Boost ledger entries for existing teams.
INSERT INTO "signal_boost_ledger" ("id", "teamId", "type", "delta", "balanceAfter", "note", "createdAt")
SELECT 'init_' || "id", "id", 'INITIAL_GRANT', 2, 2, 'Starting Signal Boosts', CURRENT_TIMESTAMP
FROM "team";

-- CreateIndex
CREATE INDEX "location_hint_active_idx" ON "location_hint"("active");

-- CreateIndex
CREATE INDEX "location_hint_sortOrder_idx" ON "location_hint"("sortOrder");

-- CreateIndex
CREATE INDEX "team_location_hint_reveal_teamId_idx" ON "team_location_hint_reveal"("teamId");

-- CreateIndex
CREATE INDEX "team_location_hint_reveal_locationHintId_idx" ON "team_location_hint_reveal"("locationHintId");

-- CreateIndex
CREATE UNIQUE INDEX "team_location_hint_reveal_teamId_locationHintId_key" ON "team_location_hint_reveal"("teamId", "locationHintId");

-- CreateIndex
CREATE INDEX "signal_boost_ledger_teamId_idx" ON "signal_boost_ledger"("teamId");

-- CreateIndex
CREATE INDEX "signal_boost_ledger_locationHintId_idx" ON "signal_boost_ledger"("locationHintId");

-- CreateIndex
CREATE INDEX "signal_boost_ledger_type_idx" ON "signal_boost_ledger"("type");

-- CreateIndex
CREATE INDEX "signal_boost_ledger_createdAt_idx" ON "signal_boost_ledger"("createdAt");
