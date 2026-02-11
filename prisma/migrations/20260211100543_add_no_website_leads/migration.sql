-- AlterEnum
ALTER TYPE "LeadStatus" ADD VALUE 'NO_WEBSITE';

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "googleMapsUrl" TEXT,
ADD COLUMN     "phone" TEXT,
ALTER COLUMN "websiteUrl" DROP NOT NULL;
