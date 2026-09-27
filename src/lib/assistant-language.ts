export const ASSISTANT_LANGUAGES = [
  {
    code: 'en',
    label: 'English',
    speechLocales: ['en-PH', 'en-US'],
  },
  {
    code: 'tl',
    label: 'Tagalog',
    speechLocales: ['fil-PH', 'tl-PH', 'en-PH'],
  },
  {
    code: 'war',
    label: 'Waray-Waray (Eastern Samar)',
    speechLocales: ['war-PH', 'fil-PH', 'en-PH'],
  },
] as const

export type AssistantLanguageCode =
  (typeof ASSISTANT_LANGUAGES)[number]['code']

export const DEFAULT_ASSISTANT_LANGUAGE: AssistantLanguageCode =
  'en'

export function normalizeAssistantLanguage(
  value: unknown,
): AssistantLanguageCode {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()

  return ASSISTANT_LANGUAGES.some(
    (language) =>
      language.code === normalized,
  )
    ? (normalized as AssistantLanguageCode)
    : DEFAULT_ASSISTANT_LANGUAGE
}

export function assistantLanguageName(
  language: AssistantLanguageCode,
) {
  return (
    ASSISTANT_LANGUAGES.find(
      (item) => item.code === language,
    )?.label || 'English'
  )
}

export function assistantSpeechLocales(
  language: AssistantLanguageCode,
) {
  return (
    ASSISTANT_LANGUAGES.find(
      (item) => item.code === language,
    )?.speechLocales || ['en-PH']
  )
}

export function assistantLanguageInstruction(
  language: AssistantLanguageCode,
) {
  if (language === 'tl') {
    return [
      'The user manually selected Tagalog as the assistant language.',
      'Respond in natural Tagalog. Keep CRMS screen names, field names, technical terms, proper nouns, and database values in their original form when translating them would be confusing.',
      'Do not auto-detect another language from the wording of the user message and do not switch response language unless the user changes the language selector.',
    ].join(' ')
  }

  if (language === 'war') {
    return [
      'The user manually selected Waray-Waray as spoken in Eastern Samar as the assistant language.',
      'Respond in natural, everyday Eastern Samar Waray-Waray. Keep CRMS screen names, field names, technical terms, proper nouns, and database values in their original form when that is clearer.',
      'Do not auto-detect another language from the wording of the user message and do not switch response language unless the user changes the language selector.',
    ].join(' ')
  }

  return [
    'The user manually selected English as the assistant language.',
    'Respond in clear natural English.',
    'Do not auto-detect another language from the wording of the user message and do not switch response language unless the user changes the language selector.',
  ].join(' ')
}

export function assistantTranscriptionInstruction(
  language: AssistantLanguageCode,
) {
  if (language === 'tl') {
    return [
      'The speaker manually selected Tagalog.',
      'Transcribe the audio as Tagalog and return only the spoken words with normal punctuation.',
      'Preserve English CRMS names or technical terms when they are actually spoken. Do not translate, answer, summarize, or identify the language.',
    ].join(' ')
  }

  if (language === 'war') {
    return [
      'The speaker manually selected Waray-Waray as spoken in Eastern Samar.',
      'Transcribe the audio using Eastern Samar Waray-Waray wording and return only the spoken words with normal punctuation.',
      'Preserve English CRMS names or technical terms when they are actually spoken. Do not translate, answer, summarize, or identify the language.',
    ].join(' ')
  }

  return [
    'The speaker manually selected English.',
    'Transcribe the audio as English and return only the spoken words with normal punctuation.',
    'Preserve CRMS names and technical terms exactly when possible. Do not translate, answer, summarize, or identify the language.',
  ].join(' ')
}
