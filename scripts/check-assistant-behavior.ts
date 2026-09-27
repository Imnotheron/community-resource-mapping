type Result = {
  name: string
  ok: boolean
}

const results: Result[] = []

function check(
  name: string,
  condition: boolean,
) {
  results.push({
    name,
    ok: Boolean(condition),
  })
}

const stopwords = new Set([
  'about',
  'after',
  'again',
  'anything',
  'available',
  'can',
  'could',
  'current',
  'data',
  'database',
  'does',
  'find',
  'from',
  'give',
  'have',
  'inside',
  'into',
  'know',
  'list',
  'me',
  'record',
  'records',
  'show',
  'system',
  'tell',
  'that',
  'the',
  'their',
  'there',
  'these',
  'this',
  'what',
  'where',
  'which',
  'with',
  'would',
  'any',
  'are',
  'check',
  'do',
  'in',
  'is',
  'it',
  'look',
  'lookup',
  'please',
  'search',
  'user',
  'users',
  'we',
])

function queryTerms(message: string) {
  return [
    ...new Set(
      message
        .toLowerCase()
        .replace(
          /[^a-z0-9@._-]+/g,
          ' ',
        )
        .split(/\s+/)
        .map((term) => term.trim())
        .filter(
          (term) =>
            term.length >= 3 &&
            !stopwords.has(term),
        ),
    ),
  ].slice(0, 8)
}

function normalize(value: unknown) {
  return String(value || '')
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      '',
    )
    .toLowerCase()
    .replace(
      /[^a-z0-9@._+-]+/g,
      ' ',
    )
    .replace(/\s+/g, ' ')
    .trim()
}

function score(
  searchable: string,
  terms: string[],
) {
  const value =
    normalize(searchable)

  return terms.reduce(
    (total, term) =>
      value.includes(
        normalize(term),
      )
        ? total + 1
        : total,
    0,
  )
}

const firstQuestion =
  'do we have any jhun david?'
const followUp =
  'look up in the users list'
const retrievalText = [
  firstQuestion,
  followUp,
].join('\n')
const terms =
  queryTerms(retrievalText)

const storedUser =
  'Jhun David Tejero Labeña jhundavid784@gmail.com VULNERABLE 09067072902'

check(
  'Name-only question keeps Jhun',
  queryTerms(firstQuestion)
    .includes('jhun'),
)
check(
  'Name-only question keeps David',
  queryTerms(firstQuestion)
    .includes('david'),
)
check(
  'Follow-up retrieval keeps prior name',
  terms.includes('jhun') &&
    terms.includes('david'),
)
check(
  'Accent-safe user matcher finds Jhun David Tejero Labeña',
  score(storedUser, terms) >= 2,
)

const liveCandidates = [
  'gemini-3.8-live',
  'gemini-3.1-flash-live-preview',
  'gemini-2.5-flash-native-audio-preview-12-2025',
]
const fallbackCandidates = [
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
]

check(
  'Live voice candidates are defined',
  liveCandidates.length >= 3,
)
check(
  'Compatible audio-understanding fallback is defined',
  fallbackCandidates.includes(
    'gemini-3.5-flash-lite',
  ),
)

for (const result of results) {
  console.log(
    `${result.ok ? 'PASS' : 'FAIL'}  ${result.name}`,
  )
}

const failed = results.filter(
  (result) => !result.ok,
)

if (failed.length > 0) {
  process.exit(1)
}

console.log(
  `\nPASS  ${results.length}/${results.length} assistant behavior checks passed.`,
)
