-- Add per-login email OTP state without adding another capstone data table.
ALTER TABLE "User" ADD COLUMN "loginOtpHash" TEXT;
ALTER TABLE "User" ADD COLUMN "loginOtpExpiresAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "loginOtpChallengeId" TEXT;
ALTER TABLE "User" ADD COLUMN "loginOtpAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "loginOtpLastSentAt" DATETIME;

CREATE UNIQUE INDEX "User_loginOtpChallengeId_key"
ON "User"("loginOtpChallengeId");
