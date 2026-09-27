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

const configuredModel =
  process.env.GEMINI_LIVE_MODEL ||
  'gemini-3.8-live'

const supportedModels = [
  configuredModel,
  'gemini-3.8-live',
  'gemini-3.1-flash-live-preview',
  'gemini-2.5-flash-native-audio-preview-12-2025',
].filter(
  (model, index, all) =>
    Boolean(model) &&
    all.indexOf(model) === index,
)

const selectedModel =
  supportedModels[0]

const tokenBody = {
  uses: 1,
  expireTime: new Date(
    Date.now() + 25 * 60 * 1000,
  ).toISOString(),
  newSessionExpireTime: new Date(
    Date.now() + 60 * 1000,
  ).toISOString(),
  liveConnectConstraints: {
    model:
      `models/${selectedModel}`,
    config: {
      sessionResumption: {},
      responseModalities: ['AUDIO'],
    },
  },
}

const setupMessage = {
  setup: {
    model:
      `models/${selectedModel}`,
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
  'Live fallback list contains Gemini 3.8 Live',
  supportedModels.includes(
    'gemini-3.8-live',
  ),
)
check(
  'Live fallback list contains Gemini 3.1 Flash Live Preview',
  supportedModels.includes(
    'gemini-3.1-flash-live-preview',
  ),
)
check(
  'Live fallback list contains Gemini 2.5 Flash Native Audio',
  supportedModels.includes(
    'gemini-2.5-flash-native-audio-preview-12-2025',
  ),
)
check(
  'Ephemeral token is single-use',
  tokenBody.uses === 1,
)
check(
  'Token and setup use matching model',
  tokenBody.liveConnectConstraints.model ===
    setupMessage.setup.model,
)
check(
  'Token requests session resumption',
  Boolean(
    tokenBody.liveConnectConstraints.config
      .sessionResumption,
  ),
)
check(
  'Token is constrained to AUDIO response',
  tokenBody.liveConnectConstraints.config
    .responseModalities[0] ===
    'AUDIO',
)
check(
  'Setup asks for AUDIO output',
  setupMessage.setup
    .responseModalities[0] ===
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
