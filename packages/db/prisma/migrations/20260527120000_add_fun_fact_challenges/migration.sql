-- AlterTable
ALTER TABLE "activity" ADD COLUMN "funFactGuessAttempts" INTEGER NOT NULL DEFAULT 2;

-- CreateTable
CREATE TABLE "player_fun_fact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "factOrder" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "player_fun_fact_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "team_fun_fact_challenge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "playerFunFactId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "attemptsUsed" INTEGER NOT NULL DEFAULT 0,
    "lastGuessedPlayerId" TEXT,
    "lastAttemptAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "team_fun_fact_challenge_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "team_fun_fact_challenge_playerFunFactId_fkey" FOREIGN KEY ("playerFunFactId") REFERENCES "player_fun_fact" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "team_fun_fact_challenge_lastGuessedPlayerId_fkey" FOREIGN KEY ("lastGuessedPlayerId") REFERENCES "player" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "team_fun_fact_challenge_state" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "currentFunFactId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "team_fun_fact_challenge_state_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "team_fun_fact_challenge_state_currentFunFactId_fkey" FOREIGN KEY ("currentFunFactId") REFERENCES "player_fun_fact" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "player_fun_fact_playerId_factOrder_key" ON "player_fun_fact"("playerId", "factOrder");

-- CreateIndex
CREATE INDEX "player_fun_fact_playerId_idx" ON "player_fun_fact"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "team_fun_fact_challenge_teamId_playerFunFactId_key" ON "team_fun_fact_challenge"("teamId", "playerFunFactId");

-- CreateIndex
CREATE INDEX "team_fun_fact_challenge_teamId_idx" ON "team_fun_fact_challenge"("teamId");

-- CreateIndex
CREATE INDEX "team_fun_fact_challenge_playerFunFactId_idx" ON "team_fun_fact_challenge"("playerFunFactId");

-- CreateIndex
CREATE INDEX "team_fun_fact_challenge_status_idx" ON "team_fun_fact_challenge"("status");

-- CreateIndex
CREATE INDEX "team_fun_fact_challenge_lastGuessedPlayerId_idx" ON "team_fun_fact_challenge"("lastGuessedPlayerId");

-- CreateIndex
CREATE UNIQUE INDEX "team_fun_fact_challenge_state_teamId_key" ON "team_fun_fact_challenge_state"("teamId");

-- CreateIndex
CREATE INDEX "team_fun_fact_challenge_state_currentFunFactId_idx" ON "team_fun_fact_challenge_state"("currentFunFactId");
