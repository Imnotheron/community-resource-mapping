import { createClient } from '@libsql/client'
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

function smokeDbClient() {
  const rawUrl = process.env.DATABASE_URL || 'file:./smoke.db'
  const url =
    rawUrl.startsWith('file:./') && !rawUrl.startsWith('file:./prisma/')
      ? rawUrl.replace('file:./', 'file:./prisma/')
      : rawUrl

  return createClient({ url })
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

test('fresh Worker and Vulnerable UI logins start on overview', async ({ page }) => {
  const workerPage = page
  await workerPage.goto('/login?role=worker')
  await workerPage.getByLabel('Email address').fill('worker@sampolicarpo.gov')
  await workerPage.locator('#password').fill('worker123')
  await workerPage.getByRole('button', { name: 'Continue securely' }).click()
  await expect(workerPage).toHaveURL(/\/worker\/dashboard#overview$/)

  const vulnerablePage = await page.context().newPage()
  await vulnerablePage.goto('/login?role=vulnerable')
  await vulnerablePage.getByLabel('Email address').fill('maria.garcia@email.com')
  await vulnerablePage.locator('#password').fill('vulnerable123')
  await vulnerablePage.getByRole('button', { name: 'Continue securely' }).click()
  await expect(vulnerablePage).toHaveURL(/\/vulnerable\/dashboard#overview$/)
  await vulnerablePage.close()
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
    await expect(page.getByRole('button', { name: 'Registrations', exact: true }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Relief Approval', exact: true }).first()).toBeVisible()
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

test('Admin has no duplicate approval workflow and legacy bookmarks resolve to Registrations', async ({ page }) => {
  await browserLogin(page, {
    email: 'admin@crms.gov.ph',
    password: 'admin123',
    role: 'admin',
  })

  await page.goto('/admin/dashboard#approval-center')
  await dismissWelcomeGuide(page)

  await expect(page).toHaveURL(/#registrations$/)
  await expect(
    page.getByRole('heading', { name: 'Vulnerable Registrations' }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Approval Center', exact: true }),
  ).toHaveCount(0)

  await expect(
    page.getByRole('button', { name: 'Registrations', exact: true }).first(),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Relief Approval', exact: true }).first(),
  ).toBeVisible()
})

test('Legacy approval API is retired and only signed Admin users access canonical approval records', async ({ request }) => {
  // The authentication proxy correctly blocks unauthorized requests first.
  const legacyWithoutAuth = await request.get('/api/admin/approval-center', {
    headers: { 'x-user-id': 'admin-smoke' },
  })
  expect(legacyWithoutAuth.status()).toBe(401)

  const registrationsWithoutAuth = await request.get('/api/admin/profiles')
  expect(registrationsWithoutAuth.status()).toBe(401)

  const reliefWithoutAuth = await request.get('/api/admin/distributions')
  expect(reliefWithoutAuth.status()).toBe(401)

  const admin = await login(request, 'admin@crms.gov.ph', 'admin123', 'admin')
  const headers = bearer(admin.token)

  // Authenticated requests reach the retired endpoint, which no longer exists.
  const legacyGet = await request.get('/api/admin/approval-center', {
    headers,
  })
  expect(legacyGet.status()).toBe(404)

  const legacyPost = await request.post('/api/admin/approval-center', {
    headers,
    data: {
      type: 'REGISTRATION',
      action: 'APPROVE',
      ids: ['profile-pending-one'],
    },
  })
  expect(legacyPost.status()).toBe(404)

  const registrations = await request.get('/api/admin/profiles', {
    headers,
  })
  expect(registrations.status(), await registrations.text()).toBe(200)

  const relief = await request.get('/api/admin/distributions', {
    headers,
  })
  expect(relief.status(), await relief.text()).toBe(200)
})

test('Daily Reports filter controls fill their responsive columns and open within viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 860 })
  await browserLogin(page, {
    email: 'admin@crms.gov.ph',
    password: 'admin123',
    role: 'admin',
  })
  await page.goto('/admin/dashboard#reports')
  await dismissWelcomeGuide(page)

  await expect(page.getByText('Report Filters', { exact: true })).toBeVisible()
  const filters = page.getByTestId('daily-report-filters')

  for (const name of [
    'Relief status',
    'General relief type',
    'General vulnerability',
    'Sort relief distributions by',
  ]) {
    const container = filters.getByText(name, { exact: true }).locator('..')
    const trigger = container.getByRole('combobox')
    const containerWidth = await container.evaluate((element) =>
      element.getBoundingClientRect().width,
    )
    const triggerWidth = await trigger.evaluate((element) =>
      element.getBoundingClientRect().width,
    )
    expect(triggerWidth, `${name} should fill its filter cell`).toBeGreaterThan(
      containerWidth * 0.85,
    )
  }

  const reliefStatus = filters.getByText('Relief status', { exact: true })
    .locator('..')
    .getByRole('combobox')
  await reliefStatus.click()

  const dropdown = page.locator('[data-slot="select-content"][data-state="open"]')
  await expect(dropdown).toBeVisible()
  const dropdownBounds = await dropdown.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return { left: rect.left, right: rect.right, viewport: window.innerWidth }
  })
  expect(dropdownBounds.left).toBeGreaterThanOrEqual(-1)
  expect(dropdownBounds.right).toBeLessThanOrEqual(dropdownBounds.viewport + 1)

  await page.keyboard.press('Escape')

  await page.setViewportSize({ width: 390, height: 844 })
  const reportFiltersSize = await filters.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return { width: rect.width, viewport: window.innerWidth }
  })
  expect(reportFiltersSize.width).toBeLessThanOrEqual(reportFiltersSize.viewport + 1)

  const mobileReliefStatus = filters.getByText('Relief status', { exact: true })
    .locator('..')
    .getByRole('combobox')
  const mobileParentWidth = await mobileReliefStatus.locator('..').evaluate(
    (element) => element.getBoundingClientRect().width,
  )
  const mobileTriggerWidth = await mobileReliefStatus.evaluate(
    (element) => element.getBoundingClientRect().width,
  )
  expect(mobileTriggerWidth).toBeGreaterThan(mobileParentWidth * 0.85)
})

test('Worker relief recording requires supporting photo evidence and flows to Admin review', async ({ request }) => {
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

  const missingEvidence = await request.post('/api/worker/distribute', {
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
  expect(missingEvidence.status()).toBe(400)

  const record = await request.post('/api/worker/distribute', {
    headers: bearer(worker.token),
    data: {
      workerId: worker.user.id,
      vulnerableProfileId: 'profile-approved',
      distributionType: 'Hygiene Kit',
      itemsProvided: 'Soap and hygiene supplies',
      quantity: 2,
      notes: 'Smoke workflow',
      supportingDocuments: [
        {
          fileName: 'distribution-proof.png',
          mimeType: 'image/png',
          dataUrl:
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        },
      ],
    },
  })

  expect(record.status(), await record.text()).toBe(201)
  const recorded = await record.json()
  expect(recorded.distribution.status).toBe('PENDING')
  expect(recorded.distribution.supportingDocumentCount).toBe(1)

  const adminDetail = await request.get(
    `/api/admin/distributions/${recorded.distribution.id}`,
    { headers: bearer(admin.token) },
  )
  expect(adminDetail.status(), await adminDetail.text()).toBe(200)
  const adminDetailData = await adminDetail.json()
  expect(adminDetailData.distribution.supportingDocuments).toHaveLength(1)
  expect(adminDetailData.distribution.itemsProvided).toBe(
    'Soap and hygiene supplies',
  )

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


test('Relief Report API validates date range, role, and record scope', async ({ request }) => {
  const today = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const fromDate = new Date(`${today}T00:00:00.000Z`)
  fromDate.setUTCDate(fromDate.getUTCDate() - 6)
  const from = fromDate.toISOString().slice(0, 10)
  const params = new URLSearchParams({ from, to: today })

  const anonymous = await request.get(`/api/admin/reports/relief?${params}`)
  expect(anonymous.status()).toBe(401)

  const admin = await login(request, 'admin@crms.gov.ph', 'admin123', 'admin')
  const worker = await login(
    request, 'worker@sampolicarpo.gov', 'worker123', 'worker',
  )
  const vulnerable = await login(
    request, 'maria.garcia@email.com', 'vulnerable123', 'vulnerable',
  )

  const adminResponse = await request.get(`/api/admin/reports/relief?${params}`, {
    headers: bearer(admin.token),
  })
  expect(adminResponse.status(), await adminResponse.text()).toBe(200)
  const adminReport = (await adminResponse.json()).report
  expect(adminReport.from).toBe(from)
  expect(adminReport.to).toBe(today)
  expect(adminReport.scope).toBe('ADMIN')
  expect(adminReport.distributions.map((row: any) => row.id)).toEqual(
    expect.arrayContaining(['distribution-pending-one', 'distribution-approved-one']),
  )
  expect(
    adminReport.distributions.some((row: any) => 'supportingDocuments' in row),
  ).toBe(false)

  const workerResponse = await request.get(`/api/worker/reports/relief?${params}`, {
    headers: bearer(worker.token),
  })
  expect(workerResponse.status(), await workerResponse.text()).toBe(200)
  const workerReport = (await workerResponse.json()).report
  expect(workerReport.scope).toBe('WORKER')
  expect(workerReport.distributions.length).toBeGreaterThan(0)
  expect(
    workerReport.distributions.every(
      (row: any) => row.worker?.id === worker.user.id,
    ),
  ).toBe(true)

  const forbiddenWorker = await request.get(`/api/admin/reports/relief?${params}`, {
    headers: bearer(worker.token),
  })
  expect(forbiddenWorker.status()).toBe(403)

  const forbiddenVulnerable = await request.get(`/api/worker/reports/relief?${params}`, {
    headers: bearer(vulnerable.token),
  })
  expect(forbiddenVulnerable.status()).toBe(403)

  const invalidDate = await request.get('/api/admin/reports/relief?from=2026-02-30&to=2026-03-01', {
    headers: bearer(admin.token),
  })
  expect(invalidDate.status()).toBe(400)

  const reverseRange = await request.get('/api/admin/reports/relief?from=2026-10-09&to=2026-10-01', {
    headers: bearer(admin.token),
  })
  expect(reverseRange.status()).toBe(400)

  const overYear = await request.get('/api/admin/reports/relief?from=2024-01-01&to=2026-10-09', {
    headers: bearer(admin.token),
  })
  expect(overYear.status()).toBe(400)
})

test('Daily Reports can generate a separate relief report with accurate filtered totals', async ({ page }) => {
  await browserLogin(page, {
    email: 'admin@crms.gov.ph',
    password: 'admin123',
    role: 'admin',
  })
  await page.goto('/admin/dashboard#reports')
  await dismissWelcomeGuide(page)

  await expect(
    page.getByRole('tab', { name: 'Daily Operations Report' }),
  ).toHaveAttribute('aria-selected', 'true')
  await page.getByRole('tab', { name: 'Relief Reports' }).click()

  await expect(
    page.getByRole('heading', { name: 'Relief Distribution Reports' }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Request a Relief Report' }),
  ).toBeVisible()

  await page.getByRole('button', { name: 'Generate Relief Report' }).click()
  const preview = page.getByTestId('relief-report-preview')
  await expect(preview).toBeVisible()
  await expect(preview.getByText('Rice and canned goods')).toBeVisible()
  await expect(preview.getByText('Maintenance medicine')).toBeVisible()
  await expect(preview.getByText(/Distribution Details \([2-9]\d*\)/)).toBeVisible()

  const filters = page.getByTestId('relief-report-filters')
  await filters.getByText('Specific relief type', { exact: true })
    .locator('..').getByRole('combobox').click()
  await page.getByRole('option', { name: 'Medicine' }).click()
  await expect(preview.getByText('Distribution Details (1)')).toBeVisible()
  await expect(preview.getByText('Maintenance medicine')).toBeVisible()
  await expect(preview.getByText('Rice and canned goods')).toHaveCount(0)

  await expect(page.getByRole('button', { name: 'Export CSV' })).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Print Relief Report' })).toBeEnabled()

  await page.getByLabel('To', { exact: true }).fill('2025-01-01')
  await expect(page.getByText(/From must not be after To/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Print Relief Report' })).toBeDisabled()

  await page.getByRole('tab', { name: 'Daily Operations Report' }).click()
  await expect(
    page.getByRole('heading', { name: 'Daily Reports' }),
  ).toBeVisible()
})

test('Relief Approval exposes View and Daily Reports mirrors relief sorting controls', async ({ page }) => {
  await browserLogin(page, {
    email: 'admin@crms.gov.ph',
    password: 'admin123',
    role: 'admin',
  })

  await page.goto('/admin/dashboard#distributions')
  await dismissWelcomeGuide(page)
  await expect(
    page.getByRole('heading', { name: 'Relief Distribution Approval' }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'View', exact: true }).first()).toBeVisible()
  await page.getByRole('button', { name: 'View', exact: true }).first().click()
  const reliefDetails = page.getByRole('dialog', {
    name: 'Relief Distribution Details',
  })
  await expect(reliefDetails).toBeVisible()
  await expect(
    reliefDetails.getByText('Specific vulnerability', { exact: true }),
  ).toBeVisible()
  await expect(
    reliefDetails.getByText('General vulnerability', { exact: true }),
  ).toBeVisible()
  await reliefDetails.getByRole('button', { name: 'Close' }).last().click()

  await page.goto('/admin/dashboard#reports')
  await expect(page.getByRole('heading', { name: 'Daily Reports' })).toBeVisible()
  await expect(page.getByText('General relief type', { exact: true })).toBeVisible()
  await expect(page.getByText('Specific relief type', { exact: true })).toBeVisible()
  await expect(page.getByText('General vulnerability', { exact: true })).toBeVisible()
  await expect(page.getByText('Specific vulnerability', { exact: true })).toBeVisible()
  await expect(page.getByText('Relief status', { exact: true })).toBeVisible()
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
  const createdAnnouncement = await createAnnouncement.json()
  const announcementId = createdAnnouncement.announcement.id

  const smokeDb = smokeDbClient()
  try {
    const workerNotification = await smokeDb.execute({
      sql: `
        SELECT COUNT(*) AS "count"
        FROM "Notification"
        WHERE "announcementId" = ? AND "userId" = ?
      `,
      args: [announcementId, worker.user.id],
    })
    expect(Number(workerNotification.rows[0]?.count || 0)).toBe(1)

    const vulnerableNotification = await smokeDb.execute({
      sql: `
        SELECT COUNT(*) AS "count"
        FROM "Notification"
        WHERE "announcementId" = ? AND "userId" = ?
      `,
      args: [announcementId, vulnerable.user.id],
    })
    expect(Number(vulnerableNotification.rows[0]?.count || 0)).toBe(0)

    await expect(
      smokeDb.execute({
        sql: `
          INSERT INTO "Notification" (
            "id", "userId", "announcementId", "type", "title", "message",
            "status", "sentViaEmail", "sentViaSms", "createdAt", "updatedAt"
          ) VALUES (?, ?, ?, 'ANNOUNCEMENT', ?, ?, 'PENDING', false, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `,
        args: [
          'duplicate-announcement-notification-smoke',
          worker.user.id,
          announcementId,
          'Worker Smoke Notice',
          'Duplicate delivery must be rejected.',
        ],
      }),
    ).rejects.toThrow()
  } finally {
    smokeDb.close()
  }

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
      mobileNav.getByRole('button', { name: 'Registrations' }),
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
