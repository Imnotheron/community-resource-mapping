# CRMS Hard Stability Debug Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate confirmed CRMS correctness, authorization, data-integrity, and regression defects, then prove the stabilization branch builds and passes explicit stability contracts before any merge to `main`.

**Architecture:** Keep the existing Next.js 16 + Prisma/libSQL architecture and harden it in place. Signed session identity is authoritative at every sensitive route, database role checks happen inside route handlers, UI fixes are paired with server-route fixes, and concurrent state changes only notify records actually changed.

**Tech Stack:** Next.js 16, React 19, TypeScript, Prisma 6, SQLite/libSQL (Turso), Node.js, GitHub Actions, Vercel.

**Spec:** User-requested hard-debug/stability pass on 2026-10-07 plus current production code on `main` at `e1b7df80de630033006c5155d69b93460c8441e0`.

## Global Constraints

- Never implement directly on `main`; use `stability-hard-debug-2026-10-07`.
- Preserve existing user-facing workflows unless a workflow is itself defective or insecure.
- Administrator pages must work on mobile as explicitly requested.
- Browser-supplied user/admin IDs must never override signed session identity.
- Sensitive admin mutations must re-check the current database role, not trust only the role embedded in an existing token.
- Never return or email password hashes; do not expose generated plaintext passwords in JSON when email delivery succeeded.
- Keep demo-account OTP bypass behavior unchanged.
- Add no new production dependency unless a verified defect cannot be fixed with the existing stack.
- Do not claim stability until fresh contract, lint, build, and deployment evidence is available.

## Review Focus

- A mobile Administrator opens `/admin/dashboard`: the server must not redirect them away solely because of user agent.
- An authenticated user supplies another user's ID to activity/heartbeat/feedback endpoints: the request must not mutate or expose the other user's data.
- An Administrator is demoted/deleted while an 8-hour token still exists: sensitive admin routes must reject the stale privilege.
- Two Administrators act on the same pending relief distribution nearly simultaneously: only the successful state transition may produce a notification.
- Admin signup approval: approval email must never contain a bcrypt hash or unusable credential.

---

### Task 1: Baseline regression contracts and CI

**Files:**
- Create: `scripts/check-stability-contracts.mjs`
- Create: `.github/workflows/stability.yml`
- Modify: `package.json`

**Interfaces:**
- Consumes: current repository source.
- Produces: `npm run test:stability`, plus branch CI for contracts, lint, and build.

- [ ] **Step 1: Write failing stability contracts for each confirmed defect.**
- [ ] **Step 2: Run the branch workflow and verify at least the known defects fail.**
- [ ] **Step 3: Add `test:stability` to package scripts.**
- [ ] **Step 4: Keep CI running contracts separately from lint/build so one failure does not hide another.**
- [ ] **Step 5: Commit the regression harness.**

### Task 2: Fix mobile Administrator access at the actual server gate

**Files:**
- Modify: `src/proxy.ts`
- Test: `scripts/check-stability-contracts.mjs`

**Interfaces:**
- Consumes: existing session-token role routing.
- Produces: mobile and desktop Administrators follow the same authenticated `/admin/*` route policy.

- [ ] **Step 1: Confirm the contract fails because `src/proxy.ts` redirects mobile `/admin` requests to `/intro`.**
- [ ] **Step 2: Remove the obsolete user-agent mobile block and its unused helper.**
- [ ] **Step 3: Verify the stability contract passes for mobile-admin routing.**
- [ ] **Step 4: Commit.**

### Task 3: Eliminate cross-user ID trust on user and feedback APIs

**Files:**
- Modify: `src/app/api/user/activity/route.ts`
- Modify: `src/app/api/user/heartbeat/route.ts`
- Modify: `src/app/api/general-feedback/route.ts`
- Modify: `src/hooks/use-activity.tsx`
- Test: `scripts/check-stability-contracts.mjs`

**Interfaces:**
- Consumes: `requireRequestUser(request, { requestedUserId })`.
- Produces: session-bound user mutations; admin-only cross-user feedback visibility.

- [ ] **Step 1: Pin the existing IDOR behavior with failing contracts.**
- [ ] **Step 2: Require a valid current database user for activity and heartbeat, reject mismatched IDs, and write only `auth.userId`.**
- [ ] **Step 3: Make the activity hook use the authenticated API client so it sends the session token.**
- [ ] **Step 4: Require authentication for general feedback; non-admins can submit/read only their own feedback while admins may filter/read all.**
- [ ] **Step 5: Verify contracts and commit.**

### Task 4: Re-check current Administrator role inside sensitive handlers

**Files:**
- Modify: `src/app/api/admin/approve/route.ts`
- Modify: `src/app/api/admin/reject/route.ts`
- Modify: `src/app/api/admin/feedback/route.ts`
- Modify: `src/app/api/admin/users/route.ts`
- Modify: `src/app/api/admin/create-staff/route.ts`
- Modify: `src/app/api/admin/create-worker/route.ts`
- Modify: `src/app/api/admin/approve-worker-signup/route.ts`
- Modify: `src/app/api/admin/reject-worker-signup/route.ts`
- Test: `scripts/check-stability-contracts.mjs`

**Interfaces:**
- Consumes: `requireRequestUser(... allowedRoles: ['ADMIN'])`.
- Produces: handler-level authorization with the database as the authoritative current role.

- [ ] **Step 1: Assert each sensitive route has a handler-level Administrator guard.**
- [ ] **Step 2: Replace browser-supplied `adminId` attribution with `auth.userId`.**
- [ ] **Step 3: Stop returning internal exception strings in production-facing admin APIs.**
- [ ] **Step 4: Verify and commit.**

### Task 5: Repair staff/admin credential lifecycle defects

**Files:**
- Modify: `src/app/api/admin/create-worker/route.ts`
- Modify: `src/app/api/admin/approve-worker-signup/route.ts`
- Modify: `src/lib/email.ts` only if copy must distinguish user-chosen vs generated password.
- Test: `scripts/check-stability-contracts.mjs`

**Interfaces:**
- Consumes: existing bcrypt hashes and email helpers.
- Produces: cryptographically generated temporary worker password; no password hash sent as a credential.

- [ ] **Step 1: Pin the current bcrypt-hash-in-approval-email defect.**
- [ ] **Step 2: Use `crypto.randomInt` for legacy worker password generation and do not expose plaintext in the API response.**
- [ ] **Step 3: For admin signup approvals, tell the applicant to use the password they chose during signup; never pass the stored bcrypt hash to email templates.**
- [ ] **Step 4: Verify and commit.**

### Task 6: Make relief bulk approval concurrency-safe

**Files:**
- Modify: `src/app/api/admin/relief-approval/route.ts`
- Test: `scripts/check-stability-contracts.mjs`

**Interfaces:**
- Consumes: selected pending distribution IDs.
- Produces: exact `updatedIds`, exact skipped count, notifications only for rows that this request actually changed.

- [ ] **Step 1: Pin notification/state mismatch risk in the current bulk flow.**
- [ ] **Step 2: Perform conditional per-record transitions in a transaction and collect only successful IDs.**
- [ ] **Step 3: Notify only successful transitions and return exactly those IDs.**
- [ ] **Step 4: Require a rejection reason for REJECT actions.**
- [ ] **Step 5: Verify and commit.**

### Task 7: Harden upload and error surfaces without destabilizing storage

**Files:**
- Modify: `src/app/api/upload/route.ts`
- Modify: `src/app/api/auth/login/route.ts`
- Test: `scripts/check-stability-contracts.mjs`

**Interfaces:**
- Consumes: authenticated user session and current upload implementation.
- Produces: no anonymous upload abuse and no internal login exception leakage.

- [ ] **Step 1: Require an authenticated CRMS role before accepting uploads.**
- [ ] **Step 2: Keep existing MIME/extension/size protections.**
- [ ] **Step 3: Return a generic login failure on server exceptions; log diagnostic details server-side only.**
- [ ] **Step 4: Record the remaining architectural limitation that server-local uploads are not a durable cloud-storage strategy rather than pretending it is fixed.**
- [ ] **Step 5: Verify and commit.**

### Task 8: Full branch verification and review

**Files:**
- Review all branch changes.

**Interfaces:**
- Consumes: Tasks 1-7.
- Produces: evidence-backed stabilization result suitable for PR review.

- [ ] **Step 1: Run `npm run test:stability`.**
- [ ] **Step 2: Run `npm run lint`.**
- [ ] **Step 3: Run `npm run build`.**
- [ ] **Step 4: Confirm branch deployment/check status.**
- [ ] **Step 5: Re-review changed code for authorization bypasses, races, error leakage, and UI regressions.**
- [ ] **Step 6: Do not merge to `main` until all required checks are green and the user approves the merge.**
