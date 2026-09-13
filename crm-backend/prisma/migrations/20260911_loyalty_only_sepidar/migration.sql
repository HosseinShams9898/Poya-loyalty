ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "accountingSystem" TEXT DEFAULT 'SEPIDAR';
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "accountingRef" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "accountingCode" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "customers_accountingRef_key" ON "customers"("accountingRef");
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "externalRef" TEXT;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "invoiceDate" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "invoices_externalRef_key" ON "invoices"("externalRef");


-- CRM cleanup: must live in migration.sql so Prisma executes it
-- Run only after backup. Removes legacy CRM/business tables after application migration.
DROP TABLE IF EXISTS "representative_registrations" CASCADE;
DROP TABLE IF EXISTS "representative_accounts" CASCADE;
DROP TABLE IF EXISTS "purchase_requests" CASCADE;
DROP TABLE IF EXISTS "product_catalog" CASCADE;
DROP TABLE IF EXISTS "shipments" CASCADE;
DROP TABLE IF EXISTS "sales_targets" CASCADE;
DROP TABLE IF EXISTS "price_rules" CASCADE;
DROP TABLE IF EXISTS "customer_merge_requests" CASCADE;
DROP TABLE IF EXISTS "interactions" CASCADE;
DROP TABLE IF EXISTS "leads" CASCADE;
DROP TABLE IF EXISTS "projects" CASCADE;
ALTER TABLE "csat_tokens" DROP COLUMN IF EXISTS "interactionId";
ALTER TABLE "csat_tokens" DROP COLUMN IF EXISTS "leadId";
ALTER TABLE "customer_feedback" DROP COLUMN IF EXISTS "leadId";


-- Sepidar can contain accounting customers without a mobile number.
ALTER TABLE "customers" ALTER COLUMN "mobile" DROP NOT NULL;
