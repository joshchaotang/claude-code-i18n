/**
 * Detect the user's system language and map it to a cc-i18n locale.
 */

const ENV_LOCALE_MAP: Record<string, string> = {
  'zh_TW': 'zh-TW',
  'zh_HK': 'zh-TW',
  'zh_CN': 'zh-CN',
  'zh_SG': 'zh-CN',
  'zh': 'zh-CN',
  'ja_JP': 'ja',
  'ja': 'ja',
  'ko_KR': 'ko',
  'ko': 'ko',
  'es': 'es',
  'fr': 'fr',
  'de': 'de',
  'pt': 'pt',
  'ru_RU': 'ru',
  'ru': 'ru',
};

const TIMEZONE_LOCALE_MAP: Record<string, string> = {
  'Asia/Taipei': 'zh-TW',
  'Asia/Hong_Kong': 'zh-TW',
  'Asia/Shanghai': 'zh-CN',
  'Asia/Chongqing': 'zh-CN',
  'Asia/Harbin': 'zh-CN',
  'Asia/Urumqi': 'zh-CN',
  'Asia/Singapore': 'zh-CN',
  'Asia/Tokyo': 'ja',
  'Asia/Seoul': 'ko',
  'Europe/Madrid': 'es',
  'Europe/Paris': 'fr',
  'Europe/Berlin': 'de',
  'America/Sao_Paulo': 'pt',
  'Europe/Moscow': 'ru',
  'Europe/Kaliningrad': 'ru',
  'Europe/Samara': 'ru',
  'Asia/Yekaterinburg': 'ru',
  'Asia/Novosibirsk': 'ru',
  'Asia/Krasnoyarsk': 'ru',
  'Asia/Irkutsk': 'ru',
  'Asia/Vladivostok': 'ru',
};

export interface DetectionResult {
  locale: string | null;
  source: 'env' | 'timezone' | null;
  raw: string | null;
}

/**
 * Detect system language from environment variables and timezone.
 */
export function detectSystemLanguage(): DetectionResult {
  // Strategy 1: Environment variables
  const envLang = process.env.LANG || process.env.LC_ALL || process.env.LC_MESSAGES;
  if (envLang) {
    // Parse "zh_TW.UTF-8" → "zh_TW"
    const langPart = envLang.split('.')[0];
    // Try full match first (zh_TW), then language only (zh)
    const locale = ENV_LOCALE_MAP[langPart] || ENV_LOCALE_MAP[langPart.split('_')[0]];
    if (locale) {
      return { locale, source: 'env', raw: envLang };
    }
  }

  // Strategy 2: Timezone
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) {
      const locale = TIMEZONE_LOCALE_MAP[tz];
      if (locale) {
        return { locale, source: 'timezone', raw: tz };
      }
    }
  } catch {
    // Intl not available
  }

  return { locale: null, source: null, raw: null };
}
