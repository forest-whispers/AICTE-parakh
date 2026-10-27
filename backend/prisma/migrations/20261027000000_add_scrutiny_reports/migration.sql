-- CreateTable
CREATE TABLE IF NOT EXISTS "Application" (
    "id" TEXT NOT NULL,
    "institutionName" TEXT NOT NULL,
    "applicationNumber" TEXT NOT NULL,
    "programCategory" TEXT,
    "proposedIntake" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- AlterTable Application to ensure columns exist
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "programCategory" TEXT;
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "proposedIntake" INTEGER;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Document" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileHash" TEXT,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "documentType" TEXT NOT NULL,
    "extractionStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "extractedData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "fileHash" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "ScrutinyReport" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "evaluationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "overallStatus" TEXT NOT NULL,
    "totalRulesRun" INTEGER NOT NULL,
    "passedCount" INTEGER NOT NULL,
    "deficiencyCount" INTEGER NOT NULL,
    "reviewCount" INTEGER NOT NULL,
    "missingCount" INTEGER NOT NULL,
    "findings" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScrutinyReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Application_applicationNumber_key" ON "Application"("applicationNumber");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Document_applicationId_fkey'
    ) THEN
        ALTER TABLE "Document" ADD CONSTRAINT "Document_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ScrutinyReport_applicationId_fkey'
    ) THEN
        ALTER TABLE "ScrutinyReport" ADD CONSTRAINT "ScrutinyReport_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
