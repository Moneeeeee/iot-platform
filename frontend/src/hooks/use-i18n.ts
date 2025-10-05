/**
 * 国际化Hook
 * 提供多语言支持功能
 */

"use client";

import { useState, useEffect, useCallback } from 'react';
import { Language, getCurrentLanguage, setLanguage as setLanguageUtil } from '@/lib/i18n';
import { zhCN } from '@/locales/zh-CN';
import { zhTW } from '@/locales/zh-TW';
import { en } from '@/locales/en';

// 语言包映射
const translations = {
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  'en': en
};

// 类型定义
type TranslationKey = keyof typeof zhCN;
type NestedKeyOf<T> = T extends object ? {
  [K in keyof T]: K extends string ? K | `${K}.${NestedKeyOf<T[K]>}` : never;
}[keyof T] : never;

type TranslationKeys = NestedKeyOf<typeof zhCN>;

/**
 * 获取嵌套对象的值
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * 替换模板字符串中的占位符
 */
function replacePlaceholders(text: string, params: Record<string, any> = {}): string {
  return text.replace(/\{(\w+)\}/g, (match, key) => {
    return params[key] !== undefined ? String(params[key]) : match;
  });
}

export function useI18n() {
  const [currentLanguage, setCurrentLanguageState] = useState<Language>(getCurrentLanguage());
  const [isLoading, setIsLoading] = useState(false);

  // 获取翻译文本
  const t = useCallback((key: string, params?: Record<string, any>): string => {
    const translation = getNestedValue(translations[currentLanguage], key);
    
    if (translation === undefined) {
      // 如果当前语言没有找到，尝试使用默认语言
      const fallbackTranslation = getNestedValue(translations['zh-CN'], key);
      if (fallbackTranslation !== undefined) {
        return typeof fallbackTranslation === 'string' 
          ? replacePlaceholders(fallbackTranslation, params)
          : String(fallbackTranslation);
      }
      
      // 如果都没有找到，返回key本身
      console.warn(`Translation key "${key}" not found for language "${currentLanguage}"`);
      return key;
    }

    return typeof translation === 'string' 
      ? replacePlaceholders(translation, params)
      : String(translation);
  }, [currentLanguage]);

  // 切换语言
  const setLanguage = useCallback((language: Language) => {
    setIsLoading(true);
    try {
      setLanguageUtil(language);
      setCurrentLanguageState(language);
    } catch (error) {
      console.error('Failed to set language:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 监听语言变更事件
  useEffect(() => {
    const handleLanguageChange = (event: CustomEvent) => {
      setCurrentLanguageState(event.detail);
    };

    window.addEventListener('languageChanged', handleLanguageChange as EventListener);
    
    return () => {
      window.removeEventListener('languageChanged', handleLanguageChange as EventListener);
    };
  }, []);

  // 获取支持的语言列表
  const supportedLanguages = [
    { code: 'zh-CN' as Language, name: '简体中文', flag: '🇨🇳' },
    { code: 'zh-TW' as Language, name: '繁體中文', flag: '🇹🇼' },
    { code: 'en' as Language, name: 'English', flag: '🇺🇸' }
  ];

  // 获取当前语言信息
  const currentLanguageInfo = supportedLanguages.find(lang => lang.code === currentLanguage);

  return {
    t,
    language: currentLanguage,
    setLanguage,
    isLoading,
    supportedLanguages,
    currentLanguageInfo
  };
}

// 导出类型
export type { Language, TranslationKeys };
