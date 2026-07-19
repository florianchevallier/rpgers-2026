-- CreateTable
CREATE TABLE "SlackGameResearch" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "systemName" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "sources" TEXT NOT NULL,
    "researchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
