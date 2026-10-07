import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

type LoginResult = {
  token: string
  user: {
    id: string
    email: string
    name: string
    role: 'admin' | 'worker' | 'vulnerable'
  }
}

async function login(
  request: APIRequestContext,
  email: string,
  password: string,
  role: 'admin' | 'worker' | 'vulnerable',
): Promise<LoginResult> {
  const response = await request.post('/api/auth/login', {
    data: { email, password, role },
  })

  expect(response.status(), await response.text()).toBe(200)
  const data = await response.json()
  expect(data.success).toBe(true)
  expect(data.otpRequired).toBe(false)
  expect(data.token).toBeTruthy()
  expect(data.user?.role).toBe(role)
  return data
}

function bearer(token: string) {
  return {
    Authorization: `Bearer ${token}`,
  }
}

async function browserLogin(
  page: Page,
  account: {
    email: string
    password: string
    role: 'admin' | 'worker' | 'vulnerable'
  },
) {
  const response = await page.request.post('/api/auth/login', {
    data: account,
  })
  expect(response.status(), await response.text()).toBe(200)
  const data = await response.json()

  await page.addInitScript(
    ({ user, token }) => {
      localStorage.setItem('crms_user', JSON.stringify(user))
      localStorage.setItem('crms_token', token)
      localStorage.setItem('user', JSON.stringify(user))
      localStorage.setItem('token', token)
    },
    { user: data.user, token: data.token },
  )

  return data as LoginResult
}

async function assertNoPageErrors(page: Page, action: () => Promise<void>) {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await action()
  expect(errors, `Browser page errors: ${errors.join(' | ')}`).toEqual([])
}

async function dismissWelcomeGuide(page: Page) {
  const skip = page.getByRole('button', { name: 'Skip walkthrough' })

  if (await skip.waitFor({ state: 'visible', timeout: 5_000 }).then(() => true).catch(() => false)) {
    await skip.click()
    await skip.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {})
  }
}

test('health endpoint responds', async ({ request }) => {
  const response = await request.get('/api/health')
  expect(response.status()).toBe(200)
})

test('protected record routes reject spoofed or missing sessions', async ({ request }) => {
  const adminStats = await request.get('/api/admin/stats')
  expect(adminStats.status()).toBe(401)

  const adminDistributions = await request.get('/api/admin/distributions')
  expect(adminDistributions.status()).toBe(401)

  const approvalSpoof = await request.get('/api/admin/approval-center', {
    headers: { 'x-user-id': 'admin-smoke' },
  })
  expect(approvalSpoof.status()).toBe(401)

  const signupRequests = await request.get('/api/admin/signup-requests')
  expect(signupRequests.status()).toBe(401)

  const adminUser = await request.get('/api/admin/users/vuln-smoke')
  expect(adminUser.status()).toBe(401)

  const workerUser = await request.get('/api/worker/users/vuln-smoke')
  expect(workerUser.status()).toBe(401)

  const reliefFeedback = await request.get(
    '/api/vulnerable/feedback/relief-feedback-smoke',
  )
  expect(reliefFeedback.status()).toBe(401)
})

test('demo logins work for Admin, Worker, and Vulnerable roles', async ({ request }) => {
  const admin = await login(request, 'admin@crms.gov.ph', 'admin123', 'admin')
  const worker = await login(
    request,
    'worker@sampolicarpo.gov',
    'worker123',
    'worker',
  )
  const vulnerable = await login(
    request,
    'maria.garcia@email.com',
    'vulnerable123',
    'vulnerable',
  )

  expect(admin.user.id).toBe('admin-smoke')
  expect(worker.user.id).toBe('worker-smoke')
  expect(vulnerable.user.id).toBe('vuln-smoke')

  const wrongPassword = await request.post('/api/auth/login', {
    data: {
      email: 'admin@crms.gov.ph',
      password: 'incorrect',
      role: 'admin',
    },
  })
  expect(wrongPassword.status()).toBe(401)

  const wrongRole = await request.post('/api/auth/login', {
    data: {
      email: 'admin@crms.gov.ph',
      password: 'admin123',
      role: 'worker',
    },
  })
  expect(wrongRole.status()).toBe(403)
})

test('Administrator role and sign-in stay available on mobile UI', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })

  await page.goto('/role-selection')
  await expect(
    page.getByRole('button', { name: /Continue as Administrator/i }),
  ).toBeVisible()

  await page.goto('/login?role=admin')
  await expect(page.getByText('Administrator account', { exact: true })).toBeVisible()
  await page.getByLabel('Email address').fill('admin@crms.gov.ph')
  await page.locator('#password').fill('admin123')
  await page.getByRole('button', { name: 'Continue securely' }).click()

  await expect(page).toHaveURL(/\/admin\/dashboard#overview$/)
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible()
})

test('OTP validation enforces attempts and accepts the correct challenge', async ({ request }) => {
  const wrong = await request.post('/api/auth/verify-otp', {
    data: {
      challengeId: 'smoke-challenge',
      otp: '000000',
    },
  })
  expect(wrong.status()).toBe(401)
  const wrongData = await wrong.json()
  expect(wrongData.remainingAttempts).toBe(4)

  const correct = await request.post('/api/auth/verify-otp', {
    data: {
      challengeId: 'smoke-challenge',
      otp: '123456',
    },
  })
  expect(correct.status(), await correct.text()).toBe(200)
  const data = await correct.json()
  expect(data.success).toBe(true)
  expect(data.user.id).toBe('otp-smoke')
  expect(data.token).toBeTruthy()
})

test('real-account OTP delivery failure is sanitized when mail is not configured', async ({ request }) => {
  const response = await request.post('/api/auth/login', {
    data: {
      email: 'otp.login@smoke.test',
      password: 'otp12345',
      role: 'vulnerable',
    },
  })

  expect(response.status()).toBe(503)
  const data = await response.json()
  expect(data.success).toBe(false)
  expect(String(data.message)).toContain('Unable to send the verification code')
  expect(String(data.message)).not.toMatch(/BREVO_|SMTP|stack|Error:/i)
})

test('duplicate registration check catches email, mobile, identity, and PWD ID conflicts', async ({ request }) => {
  const worker = await login(
    request,
    'worker@sampolicarpo.gov',
    'worker123',
    'worker',
  )

  const duplicate = await request.post('/api/registration/duplicate-check', {
    headers: bearer(worker.token),
    data: {
      emailAddress: 'maria.garcia@email.com',
      mobileNumber: '09172000001',
      firstName: 'Maria',
      lastName: 'Garcia',
      dateOfBirth: '1960-01-15',
    },
  })

  expect(duplicate.status(), await duplicate.text()).toBe(200)
  const data = await duplicate.json()
  expect(data.hasDuplicate).toBe(true)
  expect(data.conflicts.map((item: any) => item.type)).toEqual(
    expect.arrayContaining(['EMAIL', 'MOBILE', 'IDENTITY']),
  )

  const pwd = await request.post('/api/registration/duplicate-check', {
    headers: bearer(worker.token),
    data: {
      pwdIdNumber: 'PWD-profile-pending-one',
    },
  })
  expect(pwd.status()).toBe(200)
  const pwdData = await pwd.json()
  expect(pwdData.hasDuplicate).toBe(true)
  expect(pwdData.conflicts.some((item: any) => item.type === 'PWD_ID')).toBe(true)
})

test('Admin account creation rejects duplicates and appears in the users list', async ({ request }) => {
  const admin = await login(request, 'admin@crms.gov.ph', 'admin123', 'admin')
  const headers = bearer(admin.token)

  const create = await request.post('/api/admin/users', {
    headers,
    data: {
      name: 'Smoke Created Worker',
      email: 'created.worker@smoke.test',
      password: 'workerPass123!',
      role: 'WORKER',
      phone: '09173334444',
    },
  })
  expect(create.status(), await create.text()).toBe(201)
  expect((await create.json()).success).toBe(true)

  const duplicate = await request.post('/api/admin/users', {
    headers,
    data: {
      name: 'Smoke Duplicate Worker',
      email: 'created.worker@smoke.test',
      password: 'workerPass123!',
      role: 'WORKER',
    },
  })
  expect(duplicate.status()).toBe(400)

  const list = await request.get('/api/admin/users', { headers })
  expect(list.status(), await list.text()).toBe(200)
  const data = await list.json()
  expect(
    data.users.some(
      (user: any) =>
        user.email === 'created.worker@smoke.test' &&
        user.role === 'WORKER',
    ),
  ).toBe(true)
})

test('presence lifecycle marks a signed-in user online and offline correctly', async ({ request }) => {
  const admin = await login(request, 'admin@crms.gov.ph', 'admin123', 'admin')
  const headers = bearer(admin.token)

  const online = await request.post('/api/user/heartbeat', {
    headers,
    data: { userId: admin.user.id },
  })
  expect(online.status(), await online.text()).toBe(200)
  expect((await online.json()).isOnline).toBe(true)

  const onlineList = await request.get('/api/admin/users', { headers })
  const onlineData = await onlineList.json()
  expect(
    onlineData.users.find((user: any) => user.id === admin.user.id).onlineStatus,
  ).toBe('ONLINE')

  const offline = await request.delete('/api/user/heartbeat', {
    headers,
    data: { userId: admin.user.id },
  })
  expect(offline.status(), await offline.text()).toBe(200)
  expect((await offline.json()).isOnline).toBe(false)

  const offlineList = await request.get('/api/admin/users', { headers })
  const offlineData = await offlineList.json()
  expect(
    offlineData.users.find((user: any) => user.id === admin.user.id).onlineStatus,
  ).toBe('OFFLINE')
})

test('Admin, Worker, and Vulnerable dashboards render without browser exceptions', async ({ page }) => {
  await assertNoPageErrors(page, async () => {
    await browserLogin(page, {
      email: 'admin@crms.gov.ph',
      password: 'admin123',
      role: 'admin',
    })
    await page.goto('/admin/dashboard')
    await expect(page.getByText('Approval Center', { exact: true }).first()).toBeVisible()
  })

  const workerPage = await page.context().newPage()
  await assertNoPageErrors(workerPage, async () => {
    await browserLogin(workerPage, {
      email: 'worker@sampolicarpo.gov',
      password: 'worker123',
      role: 'worker',
    })
    await workerPage.goto('/worker/dashboard')
    await expect(workerPage.getByRole('heading', { name: 'Worker Dashboard' })).toBeVisible()
  })
  await workerPage.close()

  const vulnerablePage = await page.context().newPage()
  await assertNoPageErrors(vulnerablePage, async () => {
    await browserLogin(vulnerablePage, {
      email: 'maria.garcia@email.com',
      password: 'vulnerable123',
      role: 'vulnerable',
    })
    await vulnerablePage.goto('/vulnerable/dashboard')
    await expect(vulnerablePage.getByRole('heading', { name: /Welcome, Maria/i })).toBeVisible()
  })
  await vulnerablePage.close()
})

test('Approval Center filter options reflect the records in the active Pending status', async ({ page }) => {
  await browserLogin(page, {
    email: 'admin@crms.gov.ph',
    password: 'admin123',
    role: 'admin',
  })

  await page.goto('/admin/dashboard#approval-center')
  await dismissWelcomeGuide(page)
  await expect(page.getByText('Approval Center', { exact: true }).first()).toBeVisible()

  const barangaySelect = page.getByRole('combobox').filter({ hasText: 'All barangays' }).first()
  await barangaySelect.click()

  await expect(
    page.getByText('Barangay No. 1 (Poblacion)', { exact: true }).last(),
  ).toBeVisible()

  await expect(
    page.getByText('Barangay No. 3 (Poblacion)', { exact: true }),
  ).toHaveCount(0)
  await page.keyboard.press('Escape')

  const vulnerabilitySelect = page
    .getByRole('combobox')
    .filter({ hasText: 'All vulnerabilities' })
    .first()
  await vulnerabilitySelect.click()
  await expect(page.getByText('PWD', { exact: true }).last()).toBeVisible()
  await expect(page.getByText('SENIOR_CITIZEN', { exact: true })).toHaveCount(0)
  await page.keyboard.press('Escape')

  await page.getByRole('tab', { name: /Relief Distributions/i }).click()
  const distributionTypeSelect = page
    .getByRole('combobox')
    .filter({ hasText: 'All distribution types' })
    .first()
  await distributionTypeSelect.click()
  await expect(page.getByText('Food Pack', { exact: true }).last()).toBeVisible()
  await expect(page.getByText('Medicine', { exact: true })).toHaveCount(0)
})

test('Approval Center supports selected approval and rejection with signed Admin session', async ({ request }) => {
  const admin = await login(request, 'admin@crms.gov.ph', 'admin123', 'admin')
  const headers = {
    ...bearer(admin.token),
    'x-user-id': admin.user.id,
  }

  const before = await request.get('/api/admin/approval-center', { headers })
  expect(before.status(), await before.text()).toBe(200)
  const beforeData = await before.json()
  expect(
    beforeData.registrations.filter((item: any) => item.registrationStatus === 'PENDING'),
  ).toHaveLength(5)

  const approve = await request.post('/api/admin/approval-center', {
    headers,
    data: {
      type: 'REGISTRATION',
      action: 'APPROVE',
      ids: ['profile-pending-one'],
    },
  })
  expect(approve.status(), await approve.text()).toBe(200)
  expect((await approve.json()).processed).toBe(1)

  const reject = await request.post('/api/admin/approval-center', {
    headers,
    data: {
      type: 'REGISTRATION',
      action: 'REJECT',
      ids: ['profile-pending-two'],
      reason: 'Smoke rejection reason',
    },
  })
  expect(reject.status(), await reject.text()).toBe(200)
  expect((await reject.json()).processed).toBe(1)

  const after = await request.get('/api/admin/approval-center', { headers })
  const afterData = await after.json()
  expect(
    afterData.registrations.find((item: any) => item.id === 'profile-pending-one')
      .registrationStatus,
  ).toBe('APPROVED')
  expect(
    afterData.registrations.find((item: any) => item.id === 'profile-pending-two')
      .registrationStatus,
  ).toBe('REJECTED')
})

test('Approval Center Approve All and Reject All act only on the filtered pending view', async ({ page }) => {
  await browserLogin(page, {
    email: 'admin@crms.gov.ph',
    password: 'admin123',
    role: 'admin',
  })

  await page.goto('/admin/dashboard#approval-center')
  await dismissWelcomeGuide(page)

  const search = page.getByPlaceholder('Search...').first()
  await search.fill('Pending Three')

  await expect(page.getByRole('button', { name: 'Approve All' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Reject All' })).toBeVisible()

  await page.getByRole('button', { name: 'Reject All' }).click()
  await expect(page.getByRole('heading', { name: 'Reject records?' })).toBeVisible()
  await page.getByLabel('Rejection reason').fill('Filtered reject-all smoke test')
  await page.getByRole('button', { name: 'Confirm Rejection' }).click()
  await expect(page.getByRole('heading', { name: 'Reject records?' })).not.toBeVisible()

  await search.clear()
  await page.getByRole('button', { name: 'Approve All' }).click()
  await expect(page.getByRole('heading', { name: 'Approve records?' })).toBeVisible()
  await expect(page.getByText(/update 2 record\(s\)/i)).toBeVisible()
  await page.getByRole('button', { name: 'Confirm Approval' }).click()
  await expect(page.getByRole('heading', { name: 'Approve records?' })).not.toBeVisible()

  const admin = await login(page.request, 'admin@crms.gov.ph', 'admin123', 'admin')
  const response = await page.request.get('/api/admin/approval-center', {
    headers: {
      ...bearer(admin.token),
      'x-user-id': admin.user.id,
    },
  })
  expect(response.status(), await response.text()).toBe(200)
  const data = await response.json()

  expect(
    data.registrations.find((item: any) => item.id === 'profile-pending-three')
      .registrationStatus,
  ).toBe('REJECTED')
  expect(
    data.registrations.find((item: any) => item.id === 'profile-pending-four')
      .registrationStatus,
  ).toBe('APPROVED')
  expect(
    data.registrations.find((item: any) => item.id === 'profile-pending-five')
      .registrationStatus,
  ).toBe('APPROVED')
})

test('Worker relief recording flows to Admin approval and Vulnerable relief history', async ({ request }) => {
  const worker = await login(
    request,
    'worker@sampolicarpo.gov',
    'worker123',
    'worker',
  )
  const admin = await login(request, 'admin@crms.gov.ph', 'admin123', 'admin')
  const vulnerable = await login(
    request,
    'maria.garcia@email.com',
    'vulnerable123',
    'vulnerable',
  )

  const record = await request.post('/api/worker/distribute', {
    headers: bearer(worker.token),
    data: {
      workerId: worker.user.id,
      vulnerableProfileId: 'profile-approved',
      distributionType: 'Hygiene Kit',
      itemsProvided: 'Soap and hygiene supplies',
      quantity: 2,
      notes: 'Smoke workflow',
    },
  })

  expect(record.status(), await record.text()).toBe(201)
  const recorded = await record.json()
  expect(recorded.distribution.status).toBe('PENDING')

  const approval = await request.post('/api/admin/relief-approval', {
    headers: bearer(admin.token),
    data: {
      action: 'APPROVE',
      distributionIds: [
        'distribution-pending-one',
        recorded.distribution.id,
      ],
    },
  })
  expect(approval.status(), await approval.text()).toBe(200)
  const approvalData = await approval.json()
  expect(approvalData.updatedCount).toBe(2)

  const workerHistory = await request.get(
    `/api/worker/my-distributions?workerId=${worker.user.id}`,
    { headers: bearer(worker.token) },
  )
  expect(workerHistory.status()).toBe(200)
  const workerData = await workerHistory.json()
  expect(
    workerData.distributions.some(
      (item: any) =>
        item.id === recorded.distribution.id && item.status === 'APPROVED',
    ),
  ).toBe(true)

  const reliefHistory = await request.get(
    `/api/vulnerable/relief-history?userId=${vulnerable.user.id}`,
    { headers: bearer(vulnerable.token) },
  )
  expect(reliefHistory.status(), await reliefHistory.text()).toBe(200)
  const vulnerableData = await reliefHistory.json()
  expect(
    vulnerableData.distributions.some(
      (item: any) => item.id === recorded.distribution.id,
    ),
  ).toBe(true)
})

test('Vulnerable relief feedback is ownership-scoped and Admin general feedback view is complete', async ({ request }) => {
  const vulnerable = await login(
    request,
    'maria.garcia@email.com',
    'vulnerable123',
    'vulnerable',
  )
  const admin = await login(request, 'admin@crms.gov.ph', 'admin123', 'admin')

  const feedback = await request.post('/api/vulnerable/feedback', {
    headers: bearer(vulnerable.token),
    data: {
      userId: vulnerable.user.id,
      reliefDistributionId: 'distribution-pending-one',
      feedbackType: 'FEEDBACK',
      message: 'The approved relief distribution was received successfully.',
    },
  })
  expect(feedback.status(), await feedback.text()).toBe(201)

  const mine = await request.get(
    `/api/vulnerable/feedback?userId=${vulnerable.user.id}`,
    { headers: bearer(vulnerable.token) },
  )
  expect(mine.status()).toBe(200)
  expect((await mine.json()).feedback.length).toBeGreaterThan(0)

  const adminFeedback = await request.get('/api/admin/feedback?adminView=true&limit=100', {
    headers: bearer(admin.token),
  })
  expect(adminFeedback.status(), await adminFeedback.text()).toBe(200)
  const adminData = await adminFeedback.json()
  const ids = adminData.feedback.map((item: any) => item.id)
  expect(ids).toEqual(
    expect.arrayContaining(['feedback-vulnerable', 'feedback-worker']),
  )
})

test('Announcements, operations history, and map data reflect current records', async ({ request }) => {
  const admin = await login(request, 'admin@crms.gov.ph', 'admin123', 'admin')
  const worker = await login(
    request,
    'worker@sampolicarpo.gov',
    'worker123',
    'worker',
  )
  const vulnerable = await login(
    request,
    'maria.garcia@email.com',
    'vulnerable123',
    'vulnerable',
  )

  const createAnnouncement = await request.post('/api/announcements', {
    headers: bearer(admin.token),
    data: {
      title: 'Worker Smoke Notice',
      content: 'Worker-only smoke announcement.',
      type: 'GENERAL',
      priority: 'HIGH',
      targetRole: 'WORKER',
      sendEmail: false,
    },
  })
  expect(createAnnouncement.status(), await createAnnouncement.text()).toBe(201)

  const workerAnnouncements = await request.get('/api/announcements', {
    headers: bearer(worker.token),
  })
  const workerData = await workerAnnouncements.json()
  expect(
    workerData.announcements.some((item: any) => item.title === 'Worker Smoke Notice'),
  ).toBe(true)

  const vulnerableAnnouncements = await request.get('/api/announcements', {
    headers: bearer(vulnerable.token),
  })
  const vulnerableData = await vulnerableAnnouncements.json()
  expect(
    vulnerableData.announcements.some(
      (item: any) => item.title === 'Worker Smoke Notice',
    ),
  ).toBe(false)
  expect(
    vulnerableData.announcements.some(
      (item: any) => item.title === 'Smoke Community Update',
    ),
  ).toBe(true)

  const history = await request.get('/api/admin/history', {
    headers: bearer(admin.token),
  })
  expect(history.status(), await history.text()).toBe(200)
  const historyData = await history.json()
  expect(historyData.events.length).toBeGreaterThan(0)
  expect(historyData.distributions.length).toBeGreaterThan(0)
  expect(historyData.registrations.length).toBeGreaterThan(0)

  const map = await request.get('/api/map/data', {
    headers: bearer(admin.token),
  })
  expect(map.status(), await map.text()).toBe(200)
  const mapData = await map.json()
  expect(mapData.approvedProfiles).toBeGreaterThanOrEqual(2)
  expect(mapData.mappedProfiles).toBeGreaterThanOrEqual(2)
  expect(mapData.mappedProfiles).toBe(mapData.points.length)
  expect(mapData.approvedProfiles).toBeGreaterThanOrEqual(mapData.mappedProfiles)
  expect(new Set(mapData.points.map((point: any) => point.id)).size).toBe(
    mapData.points.length,
  )
  expect(mapData.points.every((point: any) => Number.isFinite(point.latitude))).toBe(true)
  expect(mapData.points.every((point: any) => Number.isFinite(point.longitude))).toBe(true)
})

test('manual Operations History accepts valid past records and rejects future records', async ({ request }) => {
  const admin = await login(request, 'admin@crms.gov.ph', 'admin123', 'admin')
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)

  const past = await request.post('/api/admin/history/manual', {
    headers: bearer(admin.token),
    data: {
      kind: 'EVENT',
      date: yesterday,
      title: 'Smoke Historical Event',
      content: 'Historical smoke record',
      eventType: 'MEETING',
      targetRole: 'ALL',
      priority: 'NORMAL',
    },
  })
  expect(past.status(), await past.text()).toBe(201)

  const future = await request.post('/api/admin/history/manual', {
    headers: bearer(admin.token),
    data: {
      kind: 'EVENT',
      date: tomorrow,
      title: 'Invalid Future Event',
      content: 'Must be rejected',
      eventType: 'MEETING',
      targetRole: 'ALL',
      priority: 'NORMAL',
    },
  })
  expect(future.status()).toBe(400)
})

test('authenticated upload accepts allowed files and rejects unsafe types', async ({ request }) => {
  const admin = await login(request, 'admin@crms.gov.ph', 'admin123', 'admin')

  const allowed = await request.post('/api/upload', {
    headers: bearer(admin.token),
    multipart: {
      file: {
        name: 'smoke.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4 smoke test'),
      },
    },
  })
  expect(allowed.status(), await allowed.text()).toBe(200)
  const allowedData = await allowed.json()
  expect(allowedData.success).toBe(true)
  expect(allowedData.url).toMatch(/^\/uploads\//)

  const unsafe = await request.post('/api/upload', {
    headers: bearer(admin.token),
    multipart: {
      file: {
        name: 'smoke.exe',
        mimeType: 'application/octet-stream',
        buffer: Buffer.from('not executable'),
      },
    },
  })
  expect(unsafe.status()).toBe(400)

  const unauthenticated = await request.post('/api/upload', {
    multipart: {
      file: {
        name: 'no-auth.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF smoke'),
      },
    },
  })
  expect(unauthenticated.status()).toBe(401)
})

test('CRMS chatbot database lookup works without external model access and respects selected language', async ({ request }) => {
  const admin = await login(request, 'admin@crms.gov.ph', 'admin123', 'admin')

  for (const language of ['en', 'tl', 'war']) {
    const response = await request.post('/api/assistant/chat', {
      headers: bearer(admin.token),
      data: {
        message: 'Do we have Maria Garcia in the users list?',
        language,
        activeView: 'users',
        activeViewLabel: 'Users',
        history: [],
      },
    })
    expect(response.status(), await response.text()).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(String(data.reply)).toMatch(/Maria Garcia/i)
  }
})

test('Assistant UI exposes history, new-chat, language, and voice controls', async ({ page }) => {
  await browserLogin(page, {
    email: 'admin@crms.gov.ph',
    password: 'admin123',
    role: 'admin',
  })

  await page.goto('/admin/dashboard')
  await dismissWelcomeGuide(page)

  const launcher = page.getByRole('button', { name: 'Open CRMS Assistant' })
  await expect(launcher).toBeVisible()
  await launcher.click()

  await expect(page.getByText('CRMS Assistant', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'History' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'New chat' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Voice Chat' })).toBeVisible()

  const language = page.getByLabel('Choose CRMS Assistant language')
  await expect(language).toBeVisible()
  await language.selectOption('tl')
  await expect(language).toHaveValue('tl')
  await language.selectOption('war')
  await expect(language).toHaveValue('war')
  await language.selectOption('en')
  await expect(language).toHaveValue('en')

  await page.getByRole('button', { name: 'History' }).click()
  await expect(page.getByText('Chat history', { exact: true })).toBeVisible()
})

test('Admin dashboard remains within the mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await browserLogin(page, {
    email: 'admin@crms.gov.ph',
    password: 'admin123',
    role: 'admin',
  })

  await assertNoPageErrors(page, async () => {
    await page.goto('/admin/dashboard')
    const mobileNav = page.getByRole('navigation', { name: 'Mobile navigation' })
    await expect(mobileNav).toBeVisible()
    await expect(
      mobileNav.getByRole('button', { name: 'Approval Center' }),
    ).toBeVisible()
  })

  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }))

  expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewport + 2)
  expect(dimensions.bodyWidth).toBeLessThanOrEqual(dimensions.viewport + 2)
})

test('Admin Excel import parses a registration and creates an approved citizen record', async ({ page }) => {
  await page.addInitScript(() => {
    ;(window as any).XLSX = {
      read: () => ({
        SheetNames: ['Registration Import'],
        Sheets: {
          'Registration Import': {
            __rows: [
              {
                'First Name': 'Excel',
                'Last Name': 'Smoke',
                'Email Address': 'excel.import@smoke.test',
                'Mobile Number': '09175550000',
                Barangay: 'Barangay No. 2 (Poblacion)',
                Sector: 'Senior Citizen',
                Gender: 'Male',
                'Civil Status': 'Single',
              },
            ],
          },
        },
      }),
      utils: {
        sheet_to_json: (sheet: any) => sheet.__rows || [],
      },
    }
  })

  await browserLogin(page, {
    email: 'admin@crms.gov.ph',
    password: 'admin123',
    role: 'admin',
  })

  await page.goto('/admin/dashboard#registrations')
  await dismissWelcomeGuide(page)
  await expect(page.getByText('Import Excel', { exact: true }).first()).toBeVisible()

  const input = page.locator('input[type="file"][accept*=".xlsx"]').first()
  await input.setInputFiles({
    name: 'smoke.xlsx',
    mimeType:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from('controlled smoke workbook'),
  })

  await expect(page.getByText(/1 person registered successfully/i)).toBeVisible()
  await expect(page.getByText(/Excel Smoke/i).first()).toBeVisible()
})
