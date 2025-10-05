/**
 * 国际化配置
 * 支持中文简体、中文繁体、英文
 */

export type Language = 'zh-CN' | 'zh-TW' | 'en';

export interface I18nConfig {
  language: Language;
  fallbackLanguage: Language;
  supportedLanguages: Language[];
}

export const i18nConfig: I18nConfig = {
  language: 'zh-CN',
  fallbackLanguage: 'zh-CN',
  supportedLanguages: ['zh-CN', 'zh-TW', 'en']
};

export const languageNames: Record<Language, string> = {
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
  'en': 'English'
};

export const languageFlags: Record<Language, string> = {
  'zh-CN': '🇨🇳',
  'zh-TW': '🇹🇼',
  'en': '🇺🇸'
};

/**
 * 获取当前语言
 */
export function getCurrentLanguage(): Language {
  if (typeof window === 'undefined') {
    return i18nConfig.language;
  }
  
  const stored = localStorage.getItem('language') as Language;
  if (stored && i18nConfig.supportedLanguages.includes(stored)) {
    return stored;
  }
  
  // 从浏览器语言检测
  const browserLang = navigator.language;
  if (browserLang.startsWith('zh-CN')) return 'zh-CN';
  if (browserLang.startsWith('zh-TW') || browserLang.startsWith('zh-HK')) return 'zh-TW';
  if (browserLang.startsWith('en')) return 'en';
  
  return i18nConfig.language;
}

/**
 * 设置语言
 */
export function setLanguage(language: Language): void {
  if (typeof window === 'undefined') return;
  
  if (i18nConfig.supportedLanguages.includes(language)) {
    localStorage.setItem('language', language);
    // 触发语言变更事件
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: language }));
  }
}

/**
 * 格式化数字
 */
export function formatNumber(value: number, language: Language = getCurrentLanguage()): string {
  return new Intl.NumberFormat(language === 'en' ? 'en-US' : 'zh-CN').format(value);
}

/**
 * 格式化日期
 */
export function formatDate(
  date: Date | string, 
  options: Intl.DateTimeFormatOptions = {},
  language: Language = getCurrentLanguage()
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const locale = language === 'en' ? 'en-US' : 'zh-CN';
  
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options
  }).format(dateObj);
}

/**
 * 格式化时间
 */
export function formatTime(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {},
  language: Language = getCurrentLanguage()
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const locale = language === 'en' ? 'en-US' : 'zh-CN';
  
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    ...options
  }).format(dateObj);
}

/**
 * 格式化相对时间
 */
export function formatRelativeTime(
  date: Date | string,
  language: Language = getCurrentLanguage()
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);
  
  const rtf = new Intl.RelativeTimeFormat(language === 'en' ? 'en-US' : 'zh-CN');
  
  if (diffInSeconds < 60) {
    return rtf.format(-diffInSeconds, 'second');
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return rtf.format(-minutes, 'minute');
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return rtf.format(-hours, 'hour');
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return rtf.format(-days, 'day');
  }
}
