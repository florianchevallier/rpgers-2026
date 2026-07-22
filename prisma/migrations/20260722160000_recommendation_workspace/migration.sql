CREATE TABLE "RecommendationWorkspace" (
    "userId" INTEGER NOT NULL PRIMARY KEY,
    "planJson" TEXT,
    "searchJson" TEXT,
    "updatedAt" DATETIME NOT NULL
);
