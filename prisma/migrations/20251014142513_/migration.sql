-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "image" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Claim" (
    "id" TEXT NOT NULL,
    "claim_id" TEXT NOT NULL,
    "encounter_type" TEXT NOT NULL,
    "service_date" TIMESTAMP(3) NOT NULL,
    "national_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "facility_id" TEXT NOT NULL,
    "unique_id" TEXT NOT NULL,
    "diagnosis_codes" TEXT NOT NULL,
    "service_code" TEXT NOT NULL,
    "paid_amount_aed" DOUBLE PRECISION NOT NULL,
    "approval_number" TEXT,
    "status" TEXT NOT NULL,
    "error_type" TEXT NOT NULL,
    "error_explanation" TEXT,
    "recommended_action" TEXT,
    "raw_errors" TEXT[],
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Claim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalRuleSet" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "rawText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "MedicalRuleSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EncounterRule" (
    "id" TEXT NOT NULL,
    "ruleSetId" TEXT NOT NULL,
    "encounterType" TEXT NOT NULL,
    "services" TEXT[],

    CONSTRAINT "EncounterRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacilityRule" (
    "id" TEXT NOT NULL,
    "ruleSetId" TEXT NOT NULL,
    "facilityType" TEXT NOT NULL,
    "services" TEXT[],

    CONSTRAINT "FacilityRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiagnosisRule" (
    "id" TEXT NOT NULL,
    "ruleSetId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "diagnosis" TEXT NOT NULL,
    "requiredService" TEXT NOT NULL,

    CONSTRAINT "DiagnosisRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExclusionRule" (
    "id" TEXT NOT NULL,
    "ruleSetId" TEXT NOT NULL,
    "codeA" TEXT NOT NULL,
    "codeB" TEXT NOT NULL,
    "rule" TEXT NOT NULL,

    CONSTRAINT "ExclusionRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TechnicalRuleSet" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "rawText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "TechnicalRuleSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceApprovalRule" (
    "id" TEXT NOT NULL,
    "ruleSetId" TEXT NOT NULL,
    "serviceCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "approvalRequired" BOOLEAN NOT NULL,

    CONSTRAINT "ServiceApprovalRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiagnosisApprovalRule" (
    "id" TEXT NOT NULL,
    "ruleSetId" TEXT NOT NULL,
    "diagnosisCode" TEXT NOT NULL,
    "diagnosis" TEXT NOT NULL,
    "approvalRequired" BOOLEAN NOT NULL,

    CONSTRAINT "DiagnosisApprovalRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThresholdRule" (
    "id" TEXT NOT NULL,
    "ruleSetId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "condition" TEXT NOT NULL,

    CONSTRAINT "ThresholdRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdFormatRule" (
    "id" TEXT NOT NULL,
    "ruleSetId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "pattern" TEXT,

    CONSTRAINT "IdFormatRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details" TEXT NOT NULL,
    "userId" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Claim_claim_id_key" ON "Claim"("claim_id");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalRuleSet" ADD CONSTRAINT "MedicalRuleSet_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncounterRule" ADD CONSTRAINT "EncounterRule_ruleSetId_fkey" FOREIGN KEY ("ruleSetId") REFERENCES "MedicalRuleSet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityRule" ADD CONSTRAINT "FacilityRule_ruleSetId_fkey" FOREIGN KEY ("ruleSetId") REFERENCES "MedicalRuleSet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosisRule" ADD CONSTRAINT "DiagnosisRule_ruleSetId_fkey" FOREIGN KEY ("ruleSetId") REFERENCES "MedicalRuleSet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExclusionRule" ADD CONSTRAINT "ExclusionRule_ruleSetId_fkey" FOREIGN KEY ("ruleSetId") REFERENCES "MedicalRuleSet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicalRuleSet" ADD CONSTRAINT "TechnicalRuleSet_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceApprovalRule" ADD CONSTRAINT "ServiceApprovalRule_ruleSetId_fkey" FOREIGN KEY ("ruleSetId") REFERENCES "TechnicalRuleSet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosisApprovalRule" ADD CONSTRAINT "DiagnosisApprovalRule_ruleSetId_fkey" FOREIGN KEY ("ruleSetId") REFERENCES "TechnicalRuleSet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThresholdRule" ADD CONSTRAINT "ThresholdRule_ruleSetId_fkey" FOREIGN KEY ("ruleSetId") REFERENCES "TechnicalRuleSet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdFormatRule" ADD CONSTRAINT "IdFormatRule_ruleSetId_fkey" FOREIGN KEY ("ruleSetId") REFERENCES "TechnicalRuleSet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
