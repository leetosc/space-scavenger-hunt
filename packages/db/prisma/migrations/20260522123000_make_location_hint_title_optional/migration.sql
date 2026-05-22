PRAGMA foreign_keys=OFF;

-- RedefineTables
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "new_location_hint" (
    "id",
    "title",
    "description",
    "active",
    "sortOrder",
    "imageUrl",
    "imageBlobName",
    "imageMimeType",
    "imageSizeBytes",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    "title",
    "description",
    "active",
    "sortOrder",
    "imageUrl",
    "imageBlobName",
    "imageMimeType",
    "imageSizeBytes",
    "createdAt",
    "updatedAt"
FROM "location_hint";

DROP TABLE "location_hint";
ALTER TABLE "new_location_hint" RENAME TO "location_hint";

CREATE INDEX "location_hint_active_idx" ON "location_hint"("active");
CREATE INDEX "location_hint_sortOrder_idx" ON "location_hint"("sortOrder");

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
