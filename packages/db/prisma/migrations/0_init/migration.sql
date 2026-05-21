-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "firstName" TEXT NOT NULL DEFAULT '',
    "lastName" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "username" TEXT,
    "displayUsername" TEXT,
    "role" TEXT NOT NULL DEFAULT 'PLAYER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "expiresAt" DATETIME NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" DATETIME,
    "refreshTokenExpiresAt" DATETIME,
    "scope" TEXT,
    "password" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "activity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SETUP',
    "startedAt" DATETIME,
    "endedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "player" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "authUserId" TEXT,
    "teamId" TEXT,
    "isCheckedIn" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "player_authUserId_fkey" FOREIGN KEY ("authUserId") REFERENCES "user" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "player_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "team" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "joinCode" TEXT NOT NULL,
    "color" TEXT,
    "icon" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "astronaut" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "hint" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "team_astronaut_assignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "astronautId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "team_astronaut_assignment_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "team_astronaut_assignment_astronautId_fkey" FOREIGN KEY ("astronautId") REFERENCES "astronaut" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "claim_attempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "astronautId" TEXT NOT NULL,
    "scannedByPlayerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_PHOTO',
    "taskPrompt" TEXT NOT NULL,
    "imageUrl" TEXT,
    "imageBlobName" TEXT,
    "imageMimeType" TEXT,
    "imageSizeBytes" INTEGER,
    "aiPassed" BOOLEAN,
    "aiConfidence" REAL,
    "aiFeedback" TEXT,
    "aiRawResponse" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" DATETIME,
    "reviewedAt" DATETIME,
    "expiresAt" DATETIME,
    CONSTRAINT "claim_attempt_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "claim_attempt_astronautId_fkey" FOREIGN KEY ("astronautId") REFERENCES "astronaut" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "claim_attempt_scannedByPlayerId_fkey" FOREIGN KEY ("scannedByPlayerId") REFERENCES "player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "team_claim" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "astronautId" TEXT NOT NULL,
    "claimAttemptId" TEXT NOT NULL,
    "claimedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "team_claim_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "team_claim_astronautId_fkey" FOREIGN KEY ("astronautId") REFERENCES "astronaut" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "team_claim_claimAttemptId_fkey" FOREIGN KEY ("claimAttemptId") REFERENCES "claim_attempt" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "user_username_key" ON "user"("username");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "player_authUserId_key" ON "player"("authUserId");

-- CreateIndex
CREATE INDEX "player_teamId_idx" ON "player"("teamId");

-- CreateIndex
CREATE INDEX "player_authUserId_idx" ON "player"("authUserId");

-- CreateIndex
CREATE UNIQUE INDEX "team_name_key" ON "team"("name");

-- CreateIndex
CREATE UNIQUE INDEX "team_joinCode_key" ON "team"("joinCode");

-- CreateIndex
CREATE UNIQUE INDEX "astronaut_code_key" ON "astronaut"("code");

-- CreateIndex
CREATE INDEX "astronaut_code_idx" ON "astronaut"("code");

-- CreateIndex
CREATE INDEX "astronaut_active_idx" ON "astronaut"("active");

-- CreateIndex
CREATE INDEX "team_astronaut_assignment_teamId_idx" ON "team_astronaut_assignment"("teamId");

-- CreateIndex
CREATE INDEX "team_astronaut_assignment_astronautId_idx" ON "team_astronaut_assignment"("astronautId");

-- CreateIndex
CREATE UNIQUE INDEX "team_astronaut_assignment_teamId_astronautId_key" ON "team_astronaut_assignment"("teamId", "astronautId");

-- CreateIndex
CREATE INDEX "claim_attempt_teamId_idx" ON "claim_attempt"("teamId");

-- CreateIndex
CREATE INDEX "claim_attempt_astronautId_idx" ON "claim_attempt"("astronautId");

-- CreateIndex
CREATE INDEX "claim_attempt_scannedByPlayerId_idx" ON "claim_attempt"("scannedByPlayerId");

-- CreateIndex
CREATE INDEX "claim_attempt_status_idx" ON "claim_attempt"("status");

-- CreateIndex
CREATE INDEX "claim_attempt_expiresAt_idx" ON "claim_attempt"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "team_claim_claimAttemptId_key" ON "team_claim"("claimAttemptId");

-- CreateIndex
CREATE INDEX "team_claim_teamId_idx" ON "team_claim"("teamId");

-- CreateIndex
CREATE INDEX "team_claim_astronautId_idx" ON "team_claim"("astronautId");

-- CreateIndex
CREATE UNIQUE INDEX "team_claim_teamId_astronautId_key" ON "team_claim"("teamId", "astronautId");
