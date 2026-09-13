ALTER TABLE "leads" ADD COLUMN "competitorName" TEXT;
ALTER TABLE "leads" ADD COLUMN "customerType" TEXT;
ALTER TABLE "leads" ADD COLUMN "province" TEXT;
ALTER TABLE "leads" ADD COLUMN "expectedDecisionAt" TIMESTAMP(3);

ALTER TABLE "customer_feedback" ADD COLUMN "dueAt" TIMESTAMP(3);
ALTER TABLE "customer_feedback" ADD COLUMN "firstResponseAt" TIMESTAMP(3);
ALTER TABLE "customer_feedback" ADD COLUMN "slaBreached" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "product_catalog" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "densityMin" DOUBLE PRECISION,
  "densityMax" DOUBLE PRECISION,
  "dimensions" JSONB,
  "basePrice" BIGINT NOT NULL DEFAULT 0,
  "priceUnit" TEXT NOT NULL DEFAULT 'ریال',
  "priceUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "product_catalog_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "product_catalog_code_key" ON "product_catalog"("code");
CREATE INDEX "product_catalog_category_isActive_idx" ON "product_catalog"("category", "isActive");

CREATE TABLE "price_rules" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "ruleType" TEXT NOT NULL,
  "audienceType" TEXT NOT NULL DEFAULT 'ALL',
  "minAmount" BIGINT NOT NULL DEFAULT 0,
  "discountPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "maxDiscountRial" BIGINT,
  "approvalRequired" BOOLEAN NOT NULL DEFAULT false,
  "conditions" JSONB,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "price_rules_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "price_rules_code_key" ON "price_rules"("code");
CREATE INDEX "price_rules_ruleType_isActive_idx" ON "price_rules"("ruleType", "isActive");

CREATE TABLE "sales_targets" (
  "id" TEXT NOT NULL,
  "period" TEXT NOT NULL,
  "scopeType" TEXT NOT NULL DEFAULT 'COMPANY',
  "scopeId" TEXT,
  "scopeLabel" TEXT NOT NULL,
  "targetAmount" BIGINT NOT NULL DEFAULT 0,
  "achievedAmount" BIGINT NOT NULL DEFAULT 0,
  "targetCashShare" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "achievedCashShare" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "targetNewLeads" INTEGER NOT NULL DEFAULT 0,
  "achievedNewLeads" INTEGER NOT NULL DEFAULT 0,
  "targetProjects" INTEGER NOT NULL DEFAULT 0,
  "achievedProjects" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sales_targets_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "sales_targets_period_scopeType_scopeId_key" ON "sales_targets"("period", "scopeType", "scopeId");
CREATE INDEX "sales_targets_period_scopeType_idx" ON "sales_targets"("period", "scopeType");

CREATE TABLE "purchase_requests" (
  "id" TEXT NOT NULL,
  "trackingCode" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "productId" TEXT,
  "requestType" TEXT NOT NULL DEFAULT 'INQUIRY',
  "productTitle" TEXT NOT NULL,
  "quantity" DOUBLE PRECISION,
  "unit" TEXT,
  "projectName" TEXT,
  "city" TEXT,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'NEW',
  "assignedToId" TEXT,
  "contactedAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "purchase_requests_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "purchase_requests_trackingCode_key" ON "purchase_requests"("trackingCode");
CREATE INDEX "purchase_requests_status_createdAt_idx" ON "purchase_requests"("status", "createdAt");
CREATE INDEX "purchase_requests_customerId_createdAt_idx" ON "purchase_requests"("customerId", "createdAt");
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product_catalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "shipments" (
  "id" TEXT NOT NULL,
  "trackingCode" TEXT NOT NULL,
  "customerId" TEXT,
  "invoiceNumber" TEXT,
  "origin" TEXT NOT NULL DEFAULT 'سیرجان',
  "destination" TEXT NOT NULL,
  "province" TEXT,
  "transportCost" BIGINT NOT NULL DEFAULT 0,
  "benefitType" TEXT,
  "benefitAmount" BIGINT NOT NULL DEFAULT 0,
  "pointsUsed" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'PLANNED',
  "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
  "approvedAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "shipments_trackingCode_key" ON "shipments"("trackingCode");
CREATE INDEX "shipments_status_createdAt_idx" ON "shipments"("status", "createdAt");
CREATE INDEX "shipments_customerId_createdAt_idx" ON "shipments"("customerId", "createdAt");
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "customer_merge_requests" (
  "id" TEXT NOT NULL,
  "sourceCustomerId" TEXT NOT NULL,
  "targetCustomerId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "evidence" JSONB,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "requestedById" TEXT,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "customer_merge_requests_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "customer_merge_requests_status_createdAt_idx" ON "customer_merge_requests"("status", "createdAt");
CREATE INDEX "customer_merge_requests_sourceCustomerId_idx" ON "customer_merge_requests"("sourceCustomerId");
CREATE INDEX "customer_merge_requests_targetCustomerId_idx" ON "customer_merge_requests"("targetCustomerId");
