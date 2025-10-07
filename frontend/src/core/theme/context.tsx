/**
 * 主题上下文和Provider
 */

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ThemeConfig, 
  ThemeMode, 
  ThemeProviderProps,
  UseThemeReturn,
  ThemeTokens
} from './types';
import { TenantTheme } from '@/types/contracts';

// 默认主题配置
const defaultTheme: ThemeConfig = {
  mode: 'light',
  primaryColor: 'blue',
  backgroundColor: '#ffffff',
  surfaceColor: '#f9fafb',
  textColor: '#111827',
  textSecondaryColor: '#6b7280',
  borderColor: '#e5e7eb',
  shadowColor: '#000000',
  brand: {
    logo: 'default',
    name: 'IoT Platform',
    favicon: 'default',
    colors: {
      primary: '#3b82f6',
    }
  },
  typography: {
    fontFamily: {
      primary: 'Inter, sans-serif',
      secondary: 'Inter, sans-serif',
      mono: 'Monaco, monospace',
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
      '5xl': '3rem',
      '6xl': '3.75rem',
    },
    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },
    lineHeight: {
      tight: 1.25,
      snug: 1.375,
      normal: 1.5,
      relaxed: 1.625,
      loose: 2,
    },
    letterSpacing: {
      tighter: '-0.05em',
      tight: '-0.025em',
      normal: '0em',
      wide: '0.025em',
      wider: '0.05em',
      widest: '0.1em',
    },
  },
  spacing: {
    px: '1px',
    0: '0',
    1: '0.25rem',
    2: '0.5rem',
    3: '0.75rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    8: '2rem',
    10: '2.5rem',
    12: '3rem',
    16: '4rem',
    20: '5rem',
    24: '6rem',
    32: '8rem',
    40: '10rem',
    48: '12rem',
    56: '14rem',
    64: '16rem',
    72: '18rem',
    80: '20rem',
    96: '24rem',
  },
  borderRadius: {
    none: '0',
    sm: '0.125rem',
    base: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    '3xl': '1.5rem',
    full: '9999px',
  },
  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
  },
  animations: {
    duration: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
    },
    easing: {
      linear: 'linear',
      ease: 'ease',
      easeIn: 'ease-in',
      easeOut: 'ease-out',
      easeInOut: 'ease-in-out',
    },
    delay: {
      none: '0ms',
      short: '100ms',
      medium: '200ms',
      long: '300ms',
    },
  },
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
};

// 创建主题上下文
const ThemeContext = createContext<UseThemeReturn | null>(null);

// 从租户主题转换为完整主题配置
function convertTenantTheme(tenantTheme: TenantTheme): ThemeConfig {
  return {
    ...defaultTheme,
    mode: tenantTheme.mode,
    primaryColor: tenantTheme.primaryColor,
    brand: {
      ...defaultTheme.brand,
      ...tenantTheme.brand,
    },
    custom: tenantTheme.custom,
  };
}

// 生成主题令牌
function generateThemeTokens(theme: ThemeConfig): ThemeTokens {
  return {
    colors: {
      primary: theme.brand.colors.primary,
      secondary: theme.brand.colors.secondary || theme.brand.colors.primary,
      accent: theme.brand.colors.accent || theme.brand.colors.primary,
      background: theme.backgroundColor,
      surface: theme.surfaceColor,
      text: theme.textColor,
      textSecondary: theme.textSecondaryColor,
      border: theme.borderColor,
      shadow: theme.shadowColor,
    },
    fonts: {
      primary: theme.typography.fontFamily.primary,
      secondary: theme.typography.fontFamily.secondary,
      mono: theme.typography.fontFamily.mono,
    },
    spacing: theme.spacing,
    borderRadius: theme.borderRadius,
    shadows: theme.shadows,
    animations: {
      duration: theme.animations.duration,
      easing: theme.animations.easing,
      delay: theme.animations.delay,
    },
    breakpoints: theme.breakpoints,
  };
}

// 主题Provider组件
export function ThemeProvider({ 
  children, 
  defaultTheme: userDefaultTheme,
  defaultMode = 'light',
  storageKey = 'iot-platform-theme',
  enableSystem = true,
  disableTransitionOnChange = false
}: ThemeProviderProps) {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<ThemeConfig>(userDefaultTheme || defaultTheme);
  const [mode, setMode] = useState<ThemeMode>(defaultMode);
  const [systemTheme, setSystemTheme] = useState<ThemeMode>('light');

  // 标记组件已挂载（避免hydration不匹配）
  useEffect(() => {
    setMounted(true);
  }, []);

  // 检测系统主题
  useEffect(() => {
    if (!mounted || !enableSystem) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const updateSystemTheme = () => {
      setSystemTheme(mediaQuery.matches ? 'dark' : 'light');
    };

    updateSystemTheme();
    mediaQuery.addEventListener('change', updateSystemTheme);
    return () => mediaQuery.removeEventListener('change', updateSystemTheme);
  }, [mounted, enableSystem]);

  // 从存储加载主题
  useEffect(() => {
    if (!mounted) return;

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        setTheme(parsed.theme || defaultTheme);
        setMode(parsed.mode || defaultMode);
      }
    } catch (error) {
      console.error('Failed to load theme from storage:', error);
    }
  }, [mounted, storageKey, defaultTheme, defaultMode]);

  // 保存主题到存储
  const saveTheme = useCallback((newTheme: ThemeConfig, newMode: ThemeMode) => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(storageKey, JSON.stringify({
        theme: newTheme,
        mode: newMode,
      }));
    } catch (error) {
      console.error('Failed to save theme to storage:', error);
    }
  }, [storageKey]);

  // 切换主题模式
  const toggleTheme = useCallback(() => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    setTheme((prev: ThemeConfig) => ({ ...prev, mode: newMode }));
    saveTheme(theme, newMode);
  }, [mode, theme, saveTheme]);

  // 设置主题
  const setThemeConfig = useCallback((newTheme: Partial<ThemeConfig>) => {
    const updatedTheme = { ...theme, ...newTheme } as ThemeConfig;
    setTheme(updatedTheme);
    saveTheme(updatedTheme, mode);
  }, [theme, mode, saveTheme]);

  // 设置模式
  const setThemeMode = useCallback((newMode: ThemeMode) => {
    setMode(newMode);
    setTheme((prev: ThemeConfig) => ({ ...prev, mode: newMode }));
    saveTheme(theme, newMode);
  }, [theme, saveTheme]);

  // 获取令牌值
  const getToken = useCallback((path: string): string => {
    const tokens = generateThemeTokens(theme);
    const keys = path.split('.');
    let value: any = tokens;
    
    for (const key of keys) {
      value = value?.[key];
      if (value === undefined) break;
    }
    
    return typeof value === 'string' ? value : '';
  }, [theme]);

  // 获取颜色值
  const getColor = useCallback((color: string): string => {
    return getToken(`colors.${color}`) || color;
  }, [getToken]);

  // 获取间距值
  const getSpacing = useCallback((size: string): string => {
    return getToken(`spacing.${size}`) || size;
  }, [getToken]);

  // 获取字体大小
  const getFontSize = useCallback((size: string): string => {
    return getToken(`typography.fontSize.${size}`) || size;
  }, [getToken]);

  // 获取阴影
  const getShadow = useCallback((shadow: string): string => {
    return getToken(`shadows.${shadow}`) || shadow;
  }, [getToken]);

  // 获取圆角
  const getBorderRadius = useCallback((radius: string): string => {
    return getToken(`borderRadius.${radius}`) || radius;
  }, [getToken]);

  // 解析主题
  const resolvedTheme = useMemo(() => {
    if (mode === 'auto' && enableSystem) {
      return { ...theme, mode: systemTheme };
    }
    return theme;
  }, [theme, mode, systemTheme, enableSystem]);

  // 是否为暗色模式
  const isDark = useMemo(() => {
    return resolvedTheme.mode === 'dark';
  }, [resolvedTheme.mode]);

  // 生成令牌
  const tokens = useMemo(() => {
    return generateThemeTokens(resolvedTheme);
  }, [resolvedTheme]);

  // 设置解析后的主题
  const setResolvedTheme = useCallback((newTheme: ThemeConfig) => {
    setTheme(newTheme);
    saveTheme(newTheme, mode);
  }, [mode, saveTheme]);

  const contextValue: UseThemeReturn = {
    theme: resolvedTheme,
    tokens,
    isDark,
    mode,
    toggleTheme,
    setTheme: setThemeConfig,
    setMode: setThemeMode,
    getToken,
    getColor,
    getSpacing,
    getFontSize,
    getShadow,
    getBorderRadius,
    resolvedTheme,
    systemTheme,
    setResolvedTheme,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      <div className={isDark ? 'dark' : ''}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

// 使用主题Hook
export function useTheme(): UseThemeReturn {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
