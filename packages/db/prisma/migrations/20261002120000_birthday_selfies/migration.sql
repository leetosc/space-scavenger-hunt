ALTER TABLE "activity" ADD COLUMN "assignmentBatchId" TEXT;
ALTER TABLE "team_location_hint_reveal" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "signal_boost_ledger" ADD COLUMN "archivedAt" DATETIME;

CREATE TABLE "birthday_selfie" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "requestId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "twin" TEXT NOT NULL,
  "activeKey" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PROCESSING',
  "imageBlobName" TEXT,
  "imageMimeType" TEXT,
  "aiPassed" BOOLEAN,
  "aiFeedback" TEXT,
  "aiConfidence" REAL,
  "reviewedBy" TEXT,
  "reviewedAt" DATETIME,
  "rejectionReason" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "birthday_selfie_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "birthday_selfie_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "birthday_selfie_requestId_key" ON "birthday_selfie"("requestId");
CREATE UNIQUE INDEX "birthday_selfie_activeKey_key" ON "birthday_selfie"("activeKey");
CREATE INDEX "birthday_selfie_playerId_twin_idx" ON "birthday_selfie"("playerId", "twin");
CREATE INDEX "birthday_selfie_status_createdAt_idx" ON "birthday_selfie"("status", "createdAt");

CREATE TABLE "selfie_review" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "selfieId" TEXT NOT NULL,
  "reviewerId" TEXT NOT NULL,
  "decision" TEXT NOT NULL,
  "reason" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "selfie_review_selfieId_fkey" FOREIGN KEY ("selfieId") REFERENCES "birthday_selfie" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "selfie_review_selfieId_idx" ON "selfie_review"("selfieId");

CREATE TABLE "signal_boost_credit" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "teamId" TEXT NOT NULL,
  "grantLedgerId" TEXT NOT NULL,
  "spendLedgerId" TEXT,
  "selfieId" TEXT,
  "locationHintId" TEXT,
  "revealVersion" INTEGER,
  "state" TEXT NOT NULL DEFAULT 'AVAILABLE',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" DATETIME,
  CONSTRAINT "signal_boost_credit_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "signal_boost_credit_grantLedgerId_fkey" FOREIGN KEY ("grantLedgerId") REFERENCES "signal_boost_ledger" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "signal_boost_credit_spendLedgerId_fkey" FOREIGN KEY ("spendLedgerId") REFERENCES "signal_boost_ledger" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "signal_boost_credit_selfieId_fkey" FOREIGN KEY ("selfieId") REFERENCES "birthday_selfie" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "signal_boost_credit_locationHintId_fkey" FOREIGN KEY ("locationHintId") REFERENCES "location_hint" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "signal_boost_credit_spendLedgerId_key" ON "signal_boost_credit"("spendLedgerId");
CREATE UNIQUE INDEX "signal_boost_credit_selfieId_key" ON "signal_boost_credit"("selfieId");
CREATE INDEX "signal_boost_credit_teamId_state_createdAt_idx" ON "signal_boost_credit"("teamId", "state", "createdAt");

-- Snapshot existing balances without changing them or double-counting ledger deltas.
INSERT INTO "signal_boost_ledger" ("id", "teamId", "type", "delta", "balanceAfter", "note")
SELECT 'opening_' || "id", "id", 'OPENING_CREDITS', 0, "signalBoostBalance", 'Existing balance migrated to individually traceable credits.' FROM "team";
WITH RECURSIVE credits(teamId, n, balance) AS (
  SELECT "id", 1, "signalBoostBalance" FROM "team" WHERE "signalBoostBalance" > 0
  UNION ALL SELECT teamId, n + 1, balance FROM credits WHERE n < balance
)
INSERT INTO "signal_boost_credit" ("id", "teamId", "grantLedgerId")
SELECT 'opening_credit_' || teamId || '_' || n, teamId, 'opening_' || teamId FROM credits;

-- Preserve historical spending in team statistics; pre-migration credits have no selfie source.
INSERT INTO "signal_boost_credit" ("id", "teamId", "grantLedgerId", "spendLedgerId", "locationHintId", "revealVersion", "state", "createdAt")
SELECT 'historical_' || "id", "teamId", 'opening_' || "teamId", "id", "locationHintId", 0, 'SPENT', "createdAt"
FROM "signal_boost_ledger" WHERE "type" = 'HINT_SPEND' AND "delta" = -1;
