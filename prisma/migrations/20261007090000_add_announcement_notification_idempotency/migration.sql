-- Link announcement notifications to their source announcement and prevent duplicate delivery per user.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "announcementId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sentViaEmail" BOOLEAN NOT NULL DEFAULT false,
    "sentViaSms" BOOLEAN NOT NULL DEFAULT false,
    "emailSentAt" DATETIME,
    "smsSentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Notification_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_Notification" (
    "id",
    "userId",
    "announcementId",
    "type",
    "title",
    "message",
    "status",
    "sentViaEmail",
    "sentViaSms",
    "emailSentAt",
    "smsSentAt",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    "userId",
    NULL,
    "type",
    "title",
    "message",
    "status",
    "sentViaEmail",
    "sentViaSms",
    "emailSentAt",
    "smsSentAt",
    "createdAt",
    "updatedAt"
FROM "Notification";

DROP TABLE "Notification";
ALTER TABLE "new_Notification" RENAME TO "Notification";

CREATE UNIQUE INDEX "Notification_announcementId_userId_key"
ON "Notification"("announcementId", "userId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
