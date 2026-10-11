-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_location_hint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "imageUrl" TEXT,
    "imageBlobName" TEXT,
    "imageMimeType" TEXT,
    "imageSizeBytes" INTEGER,
    "teamId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "location_hint_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_location_hint" ("active", "createdAt", "description", "id", "imageBlobName", "imageMimeType", "imageSizeBytes", "imageUrl", "sortOrder", "title", "updatedAt") SELECT "active", "createdAt", "description", "id", "imageBlobName", "imageMimeType", "imageSizeBytes", "imageUrl", "sortOrder", "title", "updatedAt" FROM "location_hint";
DROP TABLE "location_hint";
ALTER TABLE "new_location_hint" RENAME TO "location_hint";
CREATE INDEX "location_hint_active_idx" ON "location_hint"("active");
CREATE INDEX "location_hint_sortOrder_idx" ON "location_hint"("sortOrder");
CREATE INDEX "location_hint_teamId_idx" ON "location_hint"("teamId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
