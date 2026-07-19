-- CreateTable
CREATE TABLE "SlackSyncState" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "initializedAt" DATETIME,
    "runningSince" DATETIME,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SlackAnnouncement" (
    "tableId" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "messageTs" TEXT,
    "announcedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
