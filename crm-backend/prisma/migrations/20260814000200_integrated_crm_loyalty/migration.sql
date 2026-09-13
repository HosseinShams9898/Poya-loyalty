-- CRM + Loyalty integration: retention radar, representative network and voice of customer

ALTER TABLE "customers"
  ADD COLUMN "customerType" TEXT NOT NULL DEFAULT 'CONTRACTOR',
  ADD COLUMN "assignedToId" TEXT,
  ADD COLUMN "churnThresholdDays" INTEGER,
  ADD COLUMN "churnDetectedAt" TIMESTAMP(3),
  ADD COLUMN "reactivatedAt" TIMESTAMP(3),
  ADD COLUMN "csatAverage" DOUBLE PRECISION,
  ADD COLUMN "csatResponses" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "loyalty_tiers"
  ADD COLUMN "audienceType" TEXT NOT NULL DEFAULT 'CONTRACTOR';

CREATE TABLE "representative_accounts" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "grade" TEXT NOT NULL DEFAULT 'C',
  "discountRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "region" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "representative_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "representative_registrations" (
  "id" TEXT NOT NULL,
  "representativeId" TEXT NOT NULL,
  "endCustomerId" TEXT,
  "projectId" TEXT,
  "contractorName" TEXT NOT NULL,
  "contractorMobile" TEXT NOT NULL,
  "contractorCompany" TEXT,
  "city" TEXT,
  "estimatedVolume" BIGINT NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "discountPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "pointsAwarded" INTEGER NOT NULL DEFAULT 0,
  "reviewNote" TEXT,
  "approvedAt" TIMESTAMP(3),
  "approvedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "representative_registrations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "customer_feedback" (
  "id" TEXT NOT NULL,
  "customerId" TEXT,
  "leadId" TEXT,
  "type" TEXT NOT NULL,
  "channel" TEXT NOT NULL DEFAULT 'PHONE',
  "subject" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "score" INTEGER,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "priority" TEXT NOT NULL DEFAULT 'NORMAL',
  "assignedToId" TEXT,
  "resolution" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "sourceMessageId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "customer_feedback_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "communication_messages" (
  "id" TEXT NOT NULL,
  "externalId" TEXT,
  "customerId" TEXT,
  "direction" TEXT NOT NULL,
  "channel" TEXT NOT NULL DEFAULT 'HEPIKAL_SMS',
  "messageType" TEXT NOT NULL DEFAULT 'GENERAL',
  "mobile" TEXT,
  "body" TEXT NOT NULL,
  "deliveryStatus" TEXT NOT NULL DEFAULT 'RECEIVED',
  "rawPayload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "communication_messages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "representative_accounts_customerId_key" ON "representative_accounts"("customerId");
CREATE UNIQUE INDEX "representative_accounts_code_key" ON "representative_accounts"("code");
CREATE UNIQUE INDEX "customer_feedback_sourceMessageId_key" ON "customer_feedback"("sourceMessageId");
CREATE UNIQUE INDEX "communication_messages_externalId_key" ON "communication_messages"("externalId");
CREATE INDEX "customers_customerType_idx" ON "customers"("customerType");
CREATE INDEX "customers_assignedToId_idx" ON "customers"("assignedToId");
CREATE INDEX "loyalty_tiers_audienceType_isActive_minPoints_idx" ON "loyalty_tiers"("audienceType", "isActive", "minPoints");
CREATE INDEX "representative_accounts_grade_status_idx" ON "representative_accounts"("grade", "status");
CREATE INDEX "representative_registrations_representativeId_status_idx" ON "representative_registrations"("representativeId", "status");
CREATE INDEX "representative_registrations_contractorMobile_idx" ON "representative_registrations"("contractorMobile");
CREATE INDEX "representative_registrations_projectId_idx" ON "representative_registrations"("projectId");
CREATE INDEX "representative_registrations_endCustomerId_idx" ON "representative_registrations"("endCustomerId");
CREATE INDEX "customer_feedback_type_status_createdAt_idx" ON "customer_feedback"("type", "status", "createdAt");
CREATE INDEX "customer_feedback_customerId_createdAt_idx" ON "customer_feedback"("customerId", "createdAt");
CREATE INDEX "communication_messages_customerId_createdAt_idx" ON "communication_messages"("customerId", "createdAt");
CREATE INDEX "communication_messages_direction_channel_createdAt_idx" ON "communication_messages"("direction", "channel", "createdAt");

ALTER TABLE "customers" ADD CONSTRAINT "customers_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "representative_accounts" ADD CONSTRAINT "representative_accounts_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "representative_registrations" ADD CONSTRAINT "representative_registrations_representativeId_fkey" FOREIGN KEY ("representativeId") REFERENCES "representative_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "representative_registrations" ADD CONSTRAINT "representative_registrations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "representative_registrations" ADD CONSTRAINT "representative_registrations_endCustomerId_fkey" FOREIGN KEY ("endCustomerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "customer_feedback" ADD CONSTRAINT "customer_feedback_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "communication_messages" ADD CONSTRAINT "communication_messages_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
