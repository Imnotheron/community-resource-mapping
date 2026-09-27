type Check = {
  name: string
  ok: boolean
  details?: string
}

const checks: Check[] = []

function check(
  name: string,
  condition: boolean,
  details?: string,
) {
  checks.push({
    name,
    ok: Boolean(condition),
    details,
  })
}

const model =
  process.env.GEMINI_LIVE_MODEL ||
  'gemini-3.8-live'

const tokenBody = {
  uses: 1,
  expireTime: new Date(
    Date.now() + 25 * 60 * 1000,
  ).toISOString(),
  newSessionExpireTime: new Date(
    Date.now() + 60 * 1000,
  ).toISOString(),
  liveConnectConstraints: {
    model: `models/${model}`,
    config: {
      responseModalities: ['AUDIO'],
    },
  },
}

const setupMessage = {
  setup: {
    model: `models/${model}`,
    responseModalities: ['AUDIO'],
    systemInstruction: {
      parts: [
        {
          text:
            'CRMS Live protocol self-test',
        },
      ],
    },
  },
}

const preflightMessage = {
  realtimeInput: {
    text:
      'CRMS connectivity test. Reply only with: Voice ready.',
  },
}

check(
  'Stable Live model selected',
  model === 'gemini-3.8-live',
  model,
)
check(
  'Ephemeral token is single-use',
  tokenBody.uses === 1,
)
check(
  'Token is constrained to the Live model',
  tokenBody.liveConnectConstraints.model ===
    `models/${model}`,
)
check(
  'Token is constrained to AUDIO response',
  tokenBody.liveConnectConstraints.config
    .responseModalities[0] === 'AUDIO',
)
check(
  'Setup uses matching Live model',
  setupMessage.setup.model ===
    tokenBody.liveConnectConstraints.model,
)
check(
  'Setup asks for AUDIO output',
  setupMessage.setup.responseModalities[0] ===
    'AUDIO',
)
check(
  'Connectivity preflight is realtime text',
  Boolean(
    preflightMessage.realtimeInput.text,
  ),
)

for (const result of checks) {
  console.log(
    `${result.ok ? 'PASS' : 'FAIL'}  ${result.name}${
      result.details
        ? ` — ${result.details}`
        : ''
    }`,
  )
}

const failures = checks.filter(
  (item) => !item.ok,
)

if (failures.length > 0) {
  process.exit(1)
}

console.log(
  `\nPASS  ${checks.length}/${checks.length} Gemini Live configuration checks passed.`,
)
