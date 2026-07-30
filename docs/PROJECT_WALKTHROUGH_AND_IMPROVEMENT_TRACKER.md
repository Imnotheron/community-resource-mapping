# Community Resource Mapping System
## Master Walkthrough and Improvement Tracker

Last updated: July 30, 2026

This document is the permanent project record for the system walkthrough, finished work, incomplete work, known risks, and recommended improvements.

## Status legend

- ✅ Finished and verified
- 🟢 Working, but still needs refinement
- 🟡 Planned or partially implemented
- 🔴 Missing, broken, or requires urgent work
- ⭐ Recommended best version

---

# 1. Project foundation

## ✅ Finished

- Next.js application runs locally.
- Production builds complete successfully.
- TypeScript checking has been stabilized.
- ESLint checking has been stabilized.
- Prisma client generation works.
- Local SQLite development database works.
- Turso production database support exists.
- Localhost can use Turso when shared credentials are provided.
- Vercel deployments are connected.
- `main` and `capstone-stabilization` branches are available.
- Deprecated `middleware.ts` was migrated to `proxy.ts` for Next.js 16.
- Missing CRMS logo references were changed to an existing logo asset.

## 🟢 Needs refinement

- GitHub Actions quality checks must be fully verified as green after every major change.
- Vercel has two connected projects; decide which one is the official production project.
- Environment variables should be reviewed and documented without exposing secret values.

## ⭐ Best recommendation

Use one official production Vercel project and one preview project only. Keep `main` as production and use feature branches for unfinished work.

---

# 2. Authentication and security walkthrough

## ✅ Finished

- Added `AUTH_SECRET` support.
- Authentication tokens are signed rather than using an easily editable token format.
- Role-aware access exists for Admin, Worker, and Vulnerable users.
- Protected routes redirect unauthenticated users.
- Admin mobile access has a desktop-only safety screen.
- Authentication secrets are stored in environment variables.
- Sensitive Vercel variables were marked as Sensitive.

## 🟢 Needs refinement

- Expired or invalid sessions may still produce repeated `401` messages before the interface redirects.
- Login errors should explain the cause clearly without exposing security details.
- Old local-storage keys and cookies should be removed automatically during auth migration.
- Session expiry and forced sign-out behavior need a full test.
- Password reset and account recovery need verification.

## ⭐ Best recommendation

Create one centralized authentication handler that:

1. Detects an expired token.
2. Clears all old session keys and cookies.
3. Shows one message: `Your session expired. Please sign in again.`
4. Redirects to login only once.
5. Restores the intended page after successful login when appropriate.

---

# 3. Landing-page and first-entry walkthrough

## 🟢 Current state

- Landing page introduces the Community Resource Mapping System.
- Main call-to-action opens the portal.
- Visual branding and municipal identity are present.
- System purpose is explained.

## 🟡 Needs improvement

- First-time visitors need a shorter and clearer explanation of the three roles.
- The main call-to-action should state exactly what happens next.
- Add a visible accessibility option before login.
- Add a simple privacy notice because the system handles vulnerable-person information.
- Three.js currently produces a deprecation warning.

## ⭐ Best walkthrough

The landing walkthrough should contain four clear steps:

1. **Welcome** — Explain the system in one sentence.
2. **Choose your access** — Admin, Worker, or Vulnerable Citizen.
3. **Privacy and safety** — Explain that sensitive records are protected and role-restricted.
4. **Continue** — Open login or vulnerable registration.

The walkthrough should be skippable and available again from Help.

---

# 4. Login walkthrough

## ✅ Finished

- Login API exists.
- Role-based dashboard routing exists.
- Invalid credentials return an unauthorized response.

## 🟡 Needs improvement

- Add show/hide password.
- Add Caps Lock warning.
- Add clear loading state during login.
- Replace generic login failure with user-friendly messages.
- Confirm whether account lockout or rate limiting is implemented.
- Add forgot-password workflow if not fully working.
- Add a link for vulnerable-user registration only.

## ⭐ Best walkthrough

- Step 1: Enter registered email.
- Step 2: Enter password.
- Step 3: Explain where the user will be redirected based on role.
- On failure: Keep the email, clear only the password, focus the password field, and show one clear message.

---

# 5. Vulnerable-citizen registration walkthrough

## ✅ Finished

- Public registration is intended for vulnerable citizens.
- Registration form includes required-field navigation improvements.
- Appropriate selection controls were added to parts of the form.
- Document upload support exists.
- Admin approval flow exists.

## 🟢 Needs refinement

- Review every field for plain-language labels.
- Group the long form into smaller steps.
- Show progress and allow save-and-continue later.
- Explain why sensitive information is requested.
- Validate location and household data before submission.
- Improve upload guidance for file type, size, readability, and privacy.
- Add a final review screen before submission.
- Confirm duplicate-registration detection.
- Confirm email notification after submission and approval.

## ⭐ Best walkthrough

Use a six-step registration wizard:

1. Personal information
2. Household information
3. Vulnerability and assistance needs
4. Address and map location
5. Supporting documents
6. Review, consent, and submit

Each step should show completed, current, and remaining sections.

---

# 6. Profile setup walkthrough

## ✅ Finished

- Profile editing exists.
- Saving the profile can return the user to the dashboard.
- Theme, accent, and interface-size preferences exist.
- Small, Medium, and Large interface sizes are supported.
- The Small-size viewport/footer issue was fixed with compensated scaling.

## 🟢 Needs refinement

- Explain which profile fields are required for eligibility.
- Add completion percentage.
- Show missing required items directly.
- Add image crop and compression before profile-photo upload.
- Explain whether profile changes need reapproval.
- Make appearance preview reversible before saving.
- Confirm settings synchronize across devices through the database.

## ⭐ Best recommendation

Add a persistent profile-completion card with:

- percentage complete,
- missing fields,
- missing documents,
- approval status,
- one `Continue setup` button.

---

# 7. Admin dashboard walkthrough

## ✅ Finished

- Responsive desktop sidebar works at normal laptop width.
- Admin dashboard has overview statistics.
- Vulnerable family count is displayed.
- Pending application count is displayed.
- Active user count is displayed.
- Mapped location count is displayed.
- GIS overview is present.
- System activity and alerts are present.
- Footer and sidebar bottom row were aligned.
- Footer behavior was corrected for the Small interface setting.

## 🟢 Needs refinement

- Add a first-login admin tour.
- Explain every dashboard statistic.
- Make each statistic clickable to its detailed page.
- Add date range and barangay filters.
- Show data freshness or last-updated time.
- Add clear empty states.
- Add urgent-action prioritization.
- Confirm dashboard numbers always come from the same production database.

## ⭐ Best admin walkthrough

1. Overview and urgent counts
2. Approval Center
3. Registrations
4. Users and staff roles
5. Relief approval and distribution monitoring
6. Announcements
7. Feedback
8. Analytics
9. Vulnerable map
10. Audit trail and system settings

The walkthrough should highlight the real navigation item while explaining it.

---

# 8. Approval Center walkthrough

## ✅ Finished

- Approval Center exists.
- Admin can review vulnerable registrations.
- Registration approval is protected by role checks.

## 🟡 Needs improvement

- Add a review checklist.
- Show document preview safely.
- Show duplicate or conflicting information warnings.
- Require a rejection reason.
- Allow request-for-correction instead of only approve/reject.
- Record who reviewed the application and when.
- Add filtering by status, barangay, date, and vulnerability type.

## ⭐ Best recommendation

Use four decisions:

- Approve
- Reject with reason
- Return for correction
- Escalate for field verification

---

# 9. User and staff management walkthrough

## ✅ Finished

- Admin, Worker, and Vulnerable roles exist.
- Active-user counts are shown.
- Worker accounts can be created or managed.
- Email welcome support exists in code.

## 🟢 Needs refinement

- Verify worker creation, editing, deactivation, and reactivation.
- Add permission explanations for each role.
- Prevent the last active admin from being deactivated.
- Add password reset for staff.
- Confirm welcome email delivery through Brevo.
- Add account activity and last-login information.

## ⭐ Best recommendation

Use explicit permissions rather than relying only on role names. Add an audit log for all account changes.

---

# 10. Worker dashboard walkthrough

## ✅ Finished

- Worker role and dashboard exist.
- Worker mobile navigation exists.
- Relief-distribution recording exists.
- Worker access is role-restricted.

## 🟡 Needs improvement

- Create a first-login worker tour.
- Show assigned tasks clearly.
- Add beneficiary lookup by name, household, QR code, or location.
- Add offline-friendly field workflow.
- Prevent duplicate relief records.
- Capture evidence and receiver confirmation where appropriate.
- Add location and timestamp verification.
- Add draft mode for poor connectivity.

## ⭐ Best worker walkthrough

1. View assigned area or task
2. Find beneficiary
3. Confirm identity and eligibility
4. Record distributed items
5. Capture acknowledgment
6. Submit or save offline
7. Review completed distributions

---

# 11. Vulnerable-user dashboard walkthrough

## ✅ Finished

- Vulnerable-user dashboard exists.
- Citizen mobile navigation exists.
- Profile and assistance information can be accessed.
- Announcements and feedback features exist.

## 🟡 Needs improvement

- Create a simple first-login citizen tour.
- Show approval status prominently.
- Show upcoming assistance and distribution history.
- Explain map privacy and who can see the location.
- Add easy help/contact options.
- Use plain language and accessible controls.
- Support low-bandwidth usage.

## ⭐ Best citizen walkthrough

1. Account and approval status
2. Complete or update profile
3. View assistance eligibility
4. View announcements
5. Review relief history
6. Submit feedback or request help
7. Manage privacy and account settings

---

# 12. Map and GIS walkthrough

## ✅ Finished

- Interactive map exists.
- Vulnerable locations are displayed.
- Map data API is protected.
- Dashboard map legend exists.
- Mapped-location statistics exist.

## 🟢 Needs refinement

- Explain marker meanings in plain language.
- Add barangay and vulnerability filters.
- Add clustering for larger datasets.
- Add legend accessibility for color-blind users.
- Avoid exposing exact sensitive household coordinates to unauthorized roles.
- Add data freshness and source information.
- Confirm map behavior when session expires.
- Improve empty and loading states.

## ⭐ Best recommendation

Use privacy levels:

- Public/summary: barangay-level totals
- Worker: assigned-area operational detail
- Admin: authorized exact records
- Vulnerable user: only their own household information

---

# 13. Relief distribution walkthrough

## ✅ Finished

- Relief approval feature exists.
- Relief-distribution recording exists.
- Household and user relationships were designed for distribution records.

## 🟡 Needs improvement

- Verify the full approval-to-distribution workflow.
- Add inventory tracking.
- Add duplicate prevention.
- Add distribution batch creation.
- Add eligibility rules and exceptions.
- Add printable or exportable recipient lists.
- Add receipt or acknowledgment.
- Add audit trail and correction process.

## ⭐ Best workflow

1. Create relief program
2. Define eligibility
3. Generate candidate households
4. Review and approve list
5. Assign workers and schedule
6. Record distributions
7. Handle missed or disputed cases
8. Close batch and generate report

---

# 14. Announcements and email walkthrough

## ✅ Finished

- Announcement feature exists.
- Brevo SMTP support exists.
- Welcome, approval, and announcement email templates exist.
- Brevo environment variables are configured in Vercel.

## 🟢 Needs refinement

- Verify actual email delivery from production.
- Ensure sender email is verified.
- Add preview before sending.
- Add recipient count and filters.
- Add scheduled publishing.
- Add delivery result logging.
- Prevent repeated sends.
- Add an in-app notification fallback when email fails.

## ⭐ Best recommendation

Every important notification should be stored in-app first; email should be an additional delivery channel rather than the only record.

---

# 15. Feedback walkthrough

## ✅ Finished

- Feedback feature exists.

## 🟡 Needs improvement

- Add feedback categories.
- Add status tracking.
- Allow attachments where safe.
- Add response and resolution history.
- Protect complainant privacy.
- Add anonymous option only if the LGU process allows it.
- Add service-level targets for urgent concerns.

## ⭐ Best workflow

Submitted → Acknowledged → Assigned → In progress → Resolved → Closed

---

# 16. Analytics and reporting walkthrough

## ✅ Finished

- Analytics navigation exists.
- Dashboard statistics exist.

## 🟡 Needs improvement

- Verify every report against live database records.
- Add filters and export.
- Add printable official report layout.
- Add definitions for every metric.
- Add date coverage and data-source notes.
- Add role-based report access.
- Add charts only where they improve decisions.

## ⭐ Best recommendation

Prioritize decision-focused reports:

- vulnerable households by barangay,
- assistance needs,
- pending and approved registrations,
- relief coverage and gaps,
- distribution timeliness,
- feedback resolution,
- data completeness.

---

# 17. Accessibility, responsiveness, and interface quality

## ✅ Finished

- Desktop sidebar breakpoint issue was fixed.
- Worker and citizen mobile navigation exists.
- Interface size preferences exist.
- Small interface viewport compensation was added.
- Footer and sidebar status row were aligned.

## 🟢 Needs refinement

- Full keyboard-navigation audit.
- Screen-reader labels.
- Color contrast audit.
- Visible focus states.
- Touch-target audit.
- Form error announcements.
- Reduced-motion support.
- Color-blind map legend.
- Testing at browser zoom levels from 80% to 200%.

## ⭐ Best recommendation

Target WCAG 2.2 AA behavior for all essential workflows.

---

# 18. Data quality, privacy, and auditability

## 🟢 Current state

- Role restrictions exist.
- Sensitive environment variables are protected.
- Production database is separated from local SQLite unless shared Turso credentials are used.

## 🔴 High-priority improvements

- Create a formal data-retention policy.
- Add consent records.
- Add audit logs for sensitive record access and changes.
- Define exact map-location privacy rules.
- Add backup and restoration procedure.
- Add data correction and deletion workflow.
- Add least-privilege field visibility.
- Test unauthorized API access systematically.

## ⭐ Best recommendation

Before deployment for real municipal use, complete a privacy and security review covering the Philippine Data Privacy Act, LGU procedures, and DSWD-related handling requirements.

---

# 19. Testing and release readiness

## ✅ Finished

- Local linting passes in the stabilized setup.
- TypeScript checking passes in the stabilized setup.
- Production build passes in the stabilized setup.
- Vercel deployments have succeeded for multiple updates.

## 🟡 Needs improvement

- Automated API tests.
- End-to-end tests for each role.
- Fresh-database setup test.
- Production database migration test.
- Email delivery test.
- Mobile-device test.
- Accessibility test.
- Security test.
- Backup restoration test.
- User acceptance testing with realistic municipal workflows.

## ⭐ Required release checklist

- [ ] Admin can complete every critical workflow
- [ ] Worker can complete field distribution workflow
- [ ] Vulnerable user can register and track approval
- [ ] No unauthorized role can access protected data
- [ ] Email and in-app notifications work
- [ ] Maps protect sensitive coordinates
- [ ] Reports match database records
- [ ] Backup and restore are tested
- [ ] GitHub Actions are green
- [ ] Production deployment is stable
- [ ] Capstone documentation matches the implemented system

---

# 20. Recommended implementation order

## Phase 1 — Walkthrough foundation

1. Build a reusable role-aware walkthrough component.
2. Add `Start tour`, `Skip`, `Back`, `Next`, and `Finish`.
3. Store completion per user and per walkthrough version.
4. Add `Restart walkthrough` under Help/Profile.
5. Make tours responsive and keyboard accessible.

## Phase 2 — Registration and profile guidance

1. Convert vulnerable registration into a step-by-step wizard.
2. Add completion tracking.
3. Add review and consent screen.
4. Improve profile completion guidance.

## Phase 3 — Role-specific tours

1. Admin tour
2. Worker tour
3. Vulnerable-user tour
4. Map tour
5. Relief-distribution tour

## Phase 4 — Help center

1. Searchable help topics
2. Frequently asked questions
3. Role-specific quick guides
4. Privacy and data-use explanation
5. Contact and support information

## Phase 5 — Quality and release

1. End-to-end testing
2. Accessibility review
3. Security and privacy review
4. Performance optimization
5. Final capstone documentation and demonstration script

---

# 21. Rules for all future changes

For every feature we work on, update this tracker using the following format:

- Status before change
- Problem found
- Change implemented
- Verification performed
- Remaining risk
- Best next improvement

A feature must not be marked ✅ Finished unless it has been tested in the environment where it will be used.
