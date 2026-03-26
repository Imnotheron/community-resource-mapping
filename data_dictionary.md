# Data Dictionary: Community Resource Mapping System

## Database Overview

The system uses a **single SQLite database schema** managed by **Prisma ORM**, but accessed from **two file paths**:

| Database Path | Size | Access Method | Purpose |
|:---|:---|:---|:---|
| [prisma/db/custom.db](file:///c:/Users/Helen%20D%20Placiente/Downloads/Community%20Resource%20Mapping%20System%20CAPSTONE%20FINAL/prisma/db/custom.db) | 147 KB | Prisma Client ORM ([src/lib/db.ts](file:///c:/Users/Helen%20D%20Placiente/Downloads/Community%20Resource%20Mapping%20System%20CAPSTONE%20FINAL/src/lib/db.ts)) | Primary access for all API routes and application logic |
| [db/custom.db](file:///c:/Users/Helen%20D%20Placiente/Downloads/Community%20Resource%20Mapping%20System%20CAPSTONE%20FINAL/db/custom.db) | 163 KB | Direct `better-sqlite3` (`scripts/`) | Utility/debug scripts (e.g., [check-announcements.js](file:///c:/Users/Helen%20D%20Placiente/Downloads/Community%20Resource%20Mapping%20System%20CAPSTONE%20FINAL/scripts/check-announcements.js)) |

> [!IMPORTANT]
> The [.env](file:///c:/Users/Helen%20D%20Placiente/Downloads/Community%20Resource%20Mapping%20System%20CAPSTONE%20FINAL/.env) variable `DATABASE_URL="file:./db/custom.db"` resolves **relative to the [prisma/](file:///c:/Users/Helen%20D%20Placiente/Downloads/Community%20Resource%20Mapping%20System%20CAPSTONE%20FINAL/prisma/schema.prisma) folder**, so Prisma reads [prisma/db/custom.db](file:///c:/Users/Helen%20D%20Placiente/Downloads/Community%20Resource%20Mapping%20System%20CAPSTONE%20FINAL/prisma/db/custom.db). The [db/custom.db](file:///c:/Users/Helen%20D%20Placiente/Downloads/Community%20Resource%20Mapping%20System%20CAPSTONE%20FINAL/db/custom.db) at the project root is a **separate copy** used by standalone scripts via `better-sqlite3`.

---

## Enums

| Enum Name | Values |
|:---|:---|
| `UserRole` | `ADMIN`, `WORKER`, `VULNERABLE` |
| `RegistrationStatus` | `PENDING`, `APPROVED`, `REJECTED` |
| `VulnerabilityType` | `SENIOR_CITIZEN`, `PWD`, `LOW_INCOME`, `PREGNANT`, `CHRONIC_ILLNESS`, `SINGLE_PARENT`, `OTHER` |
| `DistributionStatus` | `PENDING`, `APPROVED`, `REJECTED`, `DISTRIBUTED` |
| `FeedbackType` | `MESSAGE`, `FEEDBACK`, `REPORT`, `BUG_REPORT`, `FEATURE_REQUEST`, `COMPLIMENT`, `SUGGESTION`, `SERVICE_COMPLAINT`, `OTHER` |
| `FeedbackStatus` | `SUBMITTED`, `REVIEWED`, `RESOLVED`, `DISMISSED` |
| `NotificationType` | `ACCOUNT_CREATED`, `ACCOUNT_APPROVED`, `ACCOUNT_REJECTED`, `DOCUMENTS_NEEDED`, `RELIEF_APPROVED`, `RELIEF_REJECTED`, `RELIEF_SCHEDULED`, `RELIEF_DISTRIBUTED`, `ANNOUNCEMENT` |
| `NotificationStatus` | `PENDING`, `SENT`, `FAILED` |
| `AnnouncementType` | `RELIEF_DISTRIBUTION`, `MEETING`, `GENERAL`, `EMERGENCY`, `IMPORTANT` |
| `AnnouncementPriority` | `LOW`, `NORMAL`, `HIGH`, `URGENT` |

---

## Tables

### 1. User

Central authentication and identity table for all system users.

| Column | Data Type | Constraints | Description |
|:---|:---|:---|:---|
| [id](file:///c:/Users/Helen%20D%20Placiente/Downloads/Community%20Resource%20Mapping%20System%20CAPSTONE%20FINAL/src/app/worker/dashboard/page.tsx#303-313) | String | PK, CUID | Unique user identifier |
| `email` | String | Unique, Required | Login email address |
| `password` | String | Required | Bcrypt-hashed password |
| `name` | String | Required | Full display name |
| `role` | UserRole | Required | `ADMIN`, `WORKER`, or `VULNERABLE` |
| `phone` | String | Optional | Contact phone number |
| `profilePicture` | String | Optional | URL/path to profile image |
| `preferences` | String | Optional | JSON string for user preferences (theme, etc.) |
| `lastActive` | DateTime | Optional | Timestamp of last activity (online status tracking) |
| `createdAt` | DateTime | Default: `now()` | Account creation timestamp |
| `updatedAt` | DateTime | Auto-updated | Last modification timestamp |

**Relationships:** Has one [VulnerableProfile](file:///c:/Users/Helen%20D%20Placiente/Downloads/Community%20Resource%20Mapping%20System%20CAPSTONE%20FINAL/src/app/vulnerable/dashboard/page.tsx#74-124), many [ReliefDistribution](file:///c:/Users/Helen%20D%20Placiente/Downloads/Community%20Resource%20Mapping%20System%20CAPSTONE%20FINAL/src/app/vulnerable/dashboard/page.tsx#54-73), many `Household` (as worker), many `ReliefFeedback`, many [Feedback](file:///c:/Users/Helen%20D%20Placiente/Downloads/Community%20Resource%20Mapping%20System%20CAPSTONE%20FINAL/src/app/admin/dashboard/page.tsx#280-291), many [FieldNote](file:///c:/Users/Helen%20D%20Placiente/Downloads/Community%20Resource%20Mapping%20System%20CAPSTONE%20FINAL/src/app/worker/dashboard/page.tsx#409-455), many `Notification`.

---

### 2. VulnerableProfile

Detailed profile for vulnerable/PWD individuals linked to a User account.

| Column | Data Type | Constraints | Description |
|:---|:---|:---|:---|
| [id](file:///c:/Users/Helen%20D%20Placiente/Downloads/Community%20Resource%20Mapping%20System%20CAPSTONE%20FINAL/src/app/worker/dashboard/page.tsx#303-313) | String | PK, CUID | Profile identifier |
| `userId` | String | FK → User.id, Unique | One-to-one link to User |
| `lastName` | String | Required | Surname |
| `firstName` | String | Required | Given name |
| `middleName` | String | Optional | Middle name |
| `suffix` | String | Optional | Name suffix (Jr., Sr., III) |
| `dateOfBirth` | DateTime | Optional | Date of birth |
| `gender` | String | Optional | Gender |
| `civilStatus` | String | Optional | Civil status (Single, Married, Widow, etc.) |
| `mobileNumber` | String | Required | Mobile phone number |
| `landlineNumber` | String | Optional | Landline number |
| `emailAddress` | String | Required | Contact email |
| `houseNumber` | String | Required | House/building number |
| `street` | String | Required | Street name |
| `barangay` | String | Required | Barangay name |
| `municipality` | String | Required | Municipality (default: San Policarpo) |
| `province` | String | Required | Province (default: Eastern Samar) |
| `latitude` | Float | Optional | GPS latitude coordinate |
| `longitude` | Float | Optional | GPS longitude coordinate |
| `educationalAttainment` | String | Optional | Highest education level |
| `employmentStatus` | String | Optional | Employment status |
| `employmentDetails` | String | Optional | Employment description |
| `vulnerabilityTypes` | String | Required | JSON array of VulnerabilityType values |
| `disabilityType` | String | Optional | Specific disability type |
| `disabilityCause` | String | Optional | Cause of disability |
| `disabilityIdNumber` | String | Optional | PWD ID card number |
| `emergencyContact` | String | Optional | Emergency contact person name |
| `emergencyPhone` | String | Optional | Emergency contact phone |
| `hasMedicalCondition` | Boolean | Default: `false` | Has medical condition flag |
| `medicalConditions` | String | Optional | Description of medical conditions |
| `needsAssistance` | Boolean | Default: `false` | Needs assistance flag |
| `assistanceType` | String | Optional | Type of assistance needed |
| `hasRepresentative` | Boolean | Default: `false` | Has a guardian/representative flag |
| `representativeName` | String | Optional | Representative full name |
| `representativeRelationship` | String | Optional | Relationship to vulnerable person |
| `representativePhone` | String | Optional | Representative phone |
| `representativeEmail` | String | Optional | Representative email |
| `hasAuthorizationLetter` | Boolean | Default: `false` | Authorization letter provided flag |
| `registrationStatus` | RegistrationStatus | Default: `PENDING` | Approval status |
| `rejectionReason` | String | Optional | Reason if rejected |
| `createdAt` | DateTime | Default: `now()` | Creation timestamp |
| `updatedAt` | DateTime | Auto-updated | Last modification timestamp |

**Relationships:** Belongs to [User](file:///c:/Users/Helen%20D%20Placiente/Downloads/Community%20Resource%20Mapping%20System%20CAPSTONE%20FINAL/src/app/admin/dashboard/page.tsx#268-279), has many `VulnerabilityDocument`, has one `Household`, has many [ReliefDistribution](file:///c:/Users/Helen%20D%20Placiente/Downloads/Community%20Resource%20Mapping%20System%20CAPSTONE%20FINAL/src/app/vulnerable/dashboard/page.tsx#54-73).

---

### 3. VulnerabilityDocument

Supporting documents uploaded for a vulnerable profile (IDs, certificates, etc.).

| Column | Data Type | Constraints | Description |
|:---|:---|:---|:---|
| [id](file:///c:/Users/Helen%20D%20Placiente/Downloads/Community%20Resource%20Mapping%20System%20CAPSTONE%20FINAL/src/app/worker/dashboard/page.tsx#303-313) | String | PK, CUID | Document identifier |
| `profileId` | String | FK → VulnerableProfile.id | Owning profile (cascade delete) |
| `documentType` | String | Required | Type: `PWD_ID`, `MEDICAL_CERT`, `SENIOR_CITIZEN_ID`, `BIRTH_CERT`, etc. |
| `fileName` | String | Required | Original file name |
| `fileUrl` | String | Required | File storage URL/path |
| `uploadedAt` | DateTime | Default: `now()` | Upload timestamp |

---

### 4. Household

Groups a vulnerable profile with geographic and household data for field operations.

| Column | Data Type | Constraints | Description |
|:---|:---|:---|:---|
| [id](file:///c:/Users/Helen%20D%20Placiente/Downloads/Community%20Resource%20Mapping%20System%20CAPSTONE%20FINAL/src/app/worker/dashboard/page.tsx#303-313) | String | PK, CUID | Household identifier |
| `address` | String | Required | Full address |
| `barangay` | String | Required | Barangay name |
| `latitude` | Float | Required | GPS latitude |
| `longitude` | Float | Required | GPS longitude |
| `headOfHousehold` | String | Optional | Head of household name |
| `totalMembers` | Int | Default: `1` | Total household members |
| `vulnerableMembers` | Int | Default: `0` | Number of vulnerable members |
| `assignedWorkerId` | String | FK → User.id, Optional | Assigned field worker |
| `vulnerableProfileId` | String | FK → VulnerableProfile.id, Unique, Optional | Linked vulnerable profile |
| `notes` | String | Optional | Additional notes |
| `createdAt` | DateTime | Default: `now()` | Creation timestamp |
| `updatedAt` | DateTime | Auto-updated | Last modification timestamp |

---

### 5. ReliefDistribution

Records of relief goods/services distributed to vulnerable individuals.

| Column | Data Type | Constraints | Description |
|:---|:---|:---|:---|
| [id](file:///c:/Users/Helen%20D%20Placiente/Downloads/Community%20Resource%20Mapping%20System%20CAPSTONE%20FINAL/src/app/worker/dashboard/page.tsx#303-313) | String | PK, CUID | Distribution record identifier |
| `householdId` | String | FK → Household.id, Optional | Linked household (cascade delete) |
| `vulnerableProfileId` | String | FK → VulnerableProfile.id, Optional | Recipient profile |
| `workerId` | String | FK → User.id, Required | Worker who performed distribution |
| `distributionDate` | DateTime | Default: `now()` | Date/time of distribution |
| `distributionType` | String | Required | Type: `FOOD_PACK`, `MEDICAL_KIT`, `CASH_AID`, `EMERGENCY_SUPPLY`, etc. |
| `itemsProvided` | String | Required | JSON array of item descriptions |
| `quantity` | Int | Required | Number of items/packs |
| `notes` | String | Optional | Additional notes |
| `status` | DistributionStatus | Default: `PENDING` | Distribution approval status |
| `rejectionReason` | String | Optional | Reason if rejected |
| `createdAt` | DateTime | Default: `now()` | Creation timestamp |
| `updatedAt` | DateTime | Auto-updated | Last modification timestamp |

**Relationships:** Belongs to `Household`, belongs to [VulnerableProfile](file:///c:/Users/Helen%20D%20Placiente/Downloads/Community%20Resource%20Mapping%20System%20CAPSTONE%20FINAL/src/app/vulnerable/dashboard/page.tsx#74-124), belongs to [User](file:///c:/Users/Helen%20D%20Placiente/Downloads/Community%20Resource%20Mapping%20System%20CAPSTONE%20FINAL/src/app/admin/dashboard/page.tsx#268-279) (worker), has many `ReliefFeedback`.

---

### 6. ReliefFeedback

Feedback submitted by vulnerable users about a specific relief distribution.

| Column | Data Type | Constraints | Description |
|:---|:---|:---|:---|
| [id](file:///c:/Users/Helen%20D%20Placiente/Downloads/Community%20Resource%20Mapping%20System%20CAPSTONE%20FINAL/src/app/worker/dashboard/page.tsx#303-313) | String | PK, CUID | Feedback identifier |
| `reliefDistributionId` | String | FK → ReliefDistribution.id | Linked distribution (cascade delete) |
| `userId` | String | FK → User.id | Submitting user (cascade delete) |
| `feedbackType` | FeedbackType | Required | Category of feedback |
| `message` | String | Required | Feedback content |
| `status` | FeedbackStatus | Default: `SUBMITTED` | Processing status |
| `adminResponse` | String | Optional | Admin's reply |
| `adminResponseDate` | DateTime | Optional | When admin responded |
| `createdAt` | DateTime | Default: `now()` | Submission timestamp |
| `updatedAt` | DateTime | Auto-updated | Last modification timestamp |

---

### 7. Feedback

General feedback from users (not tied to a specific distribution).

| Column | Data Type | Constraints | Description |
|:---|:---|:---|:---|
| [id](file:///c:/Users/Helen%20D%20Placiente/Downloads/Community%20Resource%20Mapping%20System%20CAPSTONE%20FINAL/src/app/worker/dashboard/page.tsx#303-313) | String | PK, CUID | Feedback identifier |
| `userId` | String | FK → User.id | Submitting user (cascade delete) |
| `type` | FeedbackType | Required | Category of feedback |
| `subject` | String | Optional | Feedback subject line |
| `message` | String | Required | Feedback content |
| `status` | FeedbackStatus | Default: `SUBMITTED` | Processing status |
| `adminResponse` | String | Optional | Admin's reply |
| `adminResponseDate` | DateTime | Optional | When admin responded |
| `createdAt` | DateTime | Default: `now()` | Submission timestamp |
| `updatedAt` | DateTime | Auto-updated | Last modification timestamp |

---

### 8. CommunityResource

Standalone directory of community facilities and resources for mapping.

| Column | Data Type | Constraints | Description |
|:---|:---|:---|:---|
| [id](file:///c:/Users/Helen%20D%20Placiente/Downloads/Community%20Resource%20Mapping%20System%20CAPSTONE%20FINAL/src/app/worker/dashboard/page.tsx#303-313) | String | PK, CUID | Resource identifier |
| `name` | String | Required | Resource/facility name |
| `type` | String | Required | Type: `EVACUATION_CENTER`, `HEALTH_CENTER`, `SCHOOL`, `MARKET`, `WATER_SOURCE`, etc. |
| `address` | String | Required | Full address |
| `barangay` | String | Required | Barangay name |
| `latitude` | Float | Required | GPS latitude |
| `longitude` | Float | Required | GPS longitude |
| `capacity` | Int | Optional | Maximum capacity |
| `contactInfo` | String | Optional | Contact information |
| `isActive` | Boolean | Default: `true` | Currently active flag |
| `createdAt` | DateTime | Default: `now()` | Creation timestamp |
| `updatedAt` | DateTime | Auto-updated | Last modification timestamp |

---

### 9. FieldNote

Notes submitted by field workers during visits.

| Column | Data Type | Constraints | Description |
|:---|:---|:---|:---|
| [id](file:///c:/Users/Helen%20D%20Placiente/Downloads/Community%20Resource%20Mapping%20System%20CAPSTONE%20FINAL/src/app/worker/dashboard/page.tsx#303-313) | String | PK, CUID | Note identifier |
| `userId` | String | FK → User.id | Worker who submitted (cascade delete) |
| `note` | String | Required | Note content |
| `createdAt` | DateTime | Default: `now()` | Submission timestamp |
| `updatedAt` | DateTime | Auto-updated | Last modification timestamp |

---

### 10. Notification

System notifications sent to users via in-app, email, or SMS.

| Column | Data Type | Constraints | Description |
|:---|:---|:---|:---|
| [id](file:///c:/Users/Helen%20D%20Placiente/Downloads/Community%20Resource%20Mapping%20System%20CAPSTONE%20FINAL/src/app/worker/dashboard/page.tsx#303-313) | String | PK, CUID | Notification identifier |
| `userId` | String | FK → User.id | Recipient user (cascade delete) |
| `type` | NotificationType | Required | Notification category |
| `title` | String | Required | Notification title |
| `message` | String | Required | Notification body |
| `status` | NotificationStatus | Default: `PENDING` | Delivery status |
| `sentViaEmail` | Boolean | Default: `false` | Sent by email flag |
| `sentViaSms` | Boolean | Default: `false` | Sent by SMS flag |
| `emailSentAt` | DateTime | Optional | Email sent timestamp |
| `smsSentAt` | DateTime | Optional | SMS sent timestamp |
| `createdAt` | DateTime | Default: `now()` | Creation timestamp |
| `updatedAt` | DateTime | Auto-updated | Last modification timestamp |

---

### 11. AdminSignupRequest

Pending worker signup requests awaiting admin approval.

| Column | Data Type | Constraints | Description |
|:---|:---|:---|:---|
| [id](file:///c:/Users/Helen%20D%20Placiente/Downloads/Community%20Resource%20Mapping%20System%20CAPSTONE%20FINAL/src/app/worker/dashboard/page.tsx#303-313) | String | PK, CUID | Request identifier |
| `name` | String | Required | Applicant name |
| `email` | String | Unique, Required | Applicant email |
| `password` | String | Required | Bcrypt-hashed password |
| `position` | String | Required | Requested position title |
| `reason` | String | Required | Reason for applying |
| `status` | RegistrationStatus | Default: `PENDING` | Approval status |
| `rejectionReason` | String | Optional | Reason if rejected |
| `requestedBy` | String | Optional | Referrer name |
| `reviewedBy` | String | Optional | Admin who reviewed |
| `reviewedAt` | DateTime | Optional | Review timestamp |
| `createdAt` | DateTime | Default: `now()` | Request timestamp |
| `updatedAt` | DateTime | Auto-updated | Last modification timestamp |

---

### 12. Announcement

System-wide or role-targeted announcements created by admins.

| Column | Data Type | Constraints | Description |
|:---|:---|:---|:---|
| [id](file:///c:/Users/Helen%20D%20Placiente/Downloads/Community%20Resource%20Mapping%20System%20CAPSTONE%20FINAL/src/app/worker/dashboard/page.tsx#303-313) | String | PK, CUID | Announcement identifier |
| `title` | String | Required | Announcement title |
| `content` | String | Required | Full announcement text |
| `type` | AnnouncementType | Required | Category of announcement |
| `targetRole` | UserRole | Optional | Target audience role (null = all users) |
| `eventDate` | DateTime | Optional | Event date (for meetings/distributions) |
| `eventTime` | String | Optional | Event time |
| `location` | String | Optional | Event location |
| `isActive` | Boolean | Default: `true` | Currently visible flag |
| `priority` | AnnouncementPriority | Default: `NORMAL` | Priority level |
| `createdBy` | String | Required | Admin/Worker user ID who created |
| `createdAt` | DateTime | Default: `now()` | Creation timestamp |
| `updatedAt` | DateTime | Auto-updated | Last modification timestamp |
