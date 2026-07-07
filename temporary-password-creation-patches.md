# Temporary password creation patches

The reminder only shows the password recommendation when the created user has:

```ts
 temporaryPasswordIssued: true,
 passwordChangedAt: null,
 onboardingReminderDismissedAt: null,
```

Add those three fields inside every `db.user.create({ data: { ... } })` that creates an account with a password assigned by the system/admin/worker.

## Must patch these routes if you use them

### `src/app/api/admin/register-vulnerable/route.ts`

Find the `db.user.create` data block and add the three fields:

```ts
const user = await db.user.create({
  data: {
    name: `${firstName} ${middleName || ''} ${lastName}`.trim(),
    email: emailAddress,
    password: hashedPassword,
    role: 'VULNERABLE',
    phone: mobileNumber,
    temporaryPasswordIssued: true,
    passwordChangedAt: null,
    onboardingReminderDismissedAt: null,
  },
})
```

### `src/app/api/worker/register-vulnerable/route.ts`

A full replacement file is included in this package.

### `src/app/api/admin/create-worker/route.ts`

A full replacement file is included in this package.

### `src/app/api/admin/create-vulnerable/route.ts`

A full replacement file is included in this package.

### `src/app/api/admin/users/route.ts`

A full replacement file is included in this package.

## Self-registration

Do not mark self-registration passwords as temporary unless the system generated the password.
For example, `/api/auth/register` can keep the default:

```ts
temporaryPasswordIssued: false
```
