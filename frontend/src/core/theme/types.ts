/**
 * 主题系统类型定义
 */

import { TenantTheme } from '@/types/contracts';
import { ReactNode } from 'react';

// 主题模式
export type ThemeMode = 'light' | 'dark' | 'auto';

// 主题配置
export interface ThemeConfig {
  mode: ThemeMode;
  primaryColor: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  textSecondaryColor: string;
  borderColor: string;
  shadowColor: string;
  brand: BrandConfig;
  typography: TypographyConfig;
  spacing: SpacingConfig;
  borderRadius: BorderRadiusConfig;
  shadows: ShadowConfig;
  animations: AnimationConfig;
  breakpoints: BreakpointConfig;
  custom?: Record<string, any>;
}

// 品牌配置
export interface BrandConfig {
  logo: string;
  name: string;
  favicon: string;
  colors: {
    primary: string;
    secondary?: string;
    accent?: string;
  };
  fonts?: {
    primary?: string;
    secondary?: string;
    mono?: string;
  };
}

// 字体配置
export interface TypographyConfig {
  fontFamily: {
    primary: string;
    secondary: string;
    mono: string;
  };
  fontSize: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
    '4xl': string;
    '5xl': string;
    '6xl': string;
  };
  fontWeight: {
    light: number;
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
    extrabold: number;
  };
  lineHeight: {
    tight: number;
    snug: number;
    normal: number;
    relaxed: number;
    loose: number;
  };
  letterSpacing: {
    tighter: string;
    tight: string;
    normal: string;
    wide: string;
    wider: string;
    widest: string;
  };
}

// 间距配置
export interface SpacingConfig {
  [key: string]: string;
  px: string;
  0: string;
  1: string;
  2: string;
  3: string;
  4: string;
  5: string;
  6: string;
  8: string;
  10: string;
  12: string;
  16: string;
  20: string;
  24: string;
  32: string;
  40: string;
  48: string;
  56: string;
  64: string;
  72: string;
  80: string;
  96: string;
}

// 圆角配置
export interface BorderRadiusConfig {
  [key: string]: string;
  none: string;
  sm: string;
  base: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  '3xl': string;
  full: string;
}

// 阴影配置
export interface ShadowConfig {
  [key: string]: string;

  none: string;
  sm: string;
  base: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  inner: string;
}

// 动画配置
export interface AnimationConfig {
  duration: {
    fast: string;
    normal: string;
    slow: string;
  };
  easing: {
    linear: string;
    ease: string;
    easeIn: string;
    easeOut: string;
    easeInOut: string;
  };
  delay: {
    none: string;
    short: string;
    medium: string;
    long: string;
  };
}

// 断点配置
export interface BreakpointConfig {
  [key: string]: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
}

// 主题令牌
export interface ThemeTokens {
  colors: Record<string, string>;
  fonts: Record<string, string>;
  spacing: Record<string, string>;
  borderRadius: Record<string, string>;
  shadows: Record<string, string>;
  animations: {
    duration: Record<string, string>;
    easing: Record<string, string>;
    delay: Record<string, string>;
  };
  breakpoints: Record<string, string>;
}

// 主题上下文
export interface ThemeContext {
  theme: ThemeConfig;
  tokens: ThemeTokens;
  isDark: boolean;
  mode: ThemeMode;
  toggleTheme: () => void;
  setTheme: (theme: Partial<ThemeConfig>) => void;
  setMode: (mode: ThemeMode) => void;
  getToken: (path: string) => string;
  getColor: (color: string) => string;
  getSpacing: (size: string) => string;
  getFontSize: (size: string) => string;
  getShadow: (shadow: string) => string;
  getBorderRadius: (radius: string) => string;
}

// 主题Provider Props
export interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Partial<ThemeConfig>;
  defaultMode?: ThemeMode;
  storageKey?: string;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
}

// 主题Hook返回值
export interface UseThemeReturn extends ThemeContext {
  resolvedTheme: ThemeConfig;
  systemTheme: ThemeMode;
  setResolvedTheme: (theme: ThemeConfig) => void;
}

// 主题切换配置
export interface ThemeSwitchConfig {
  enableSystem: boolean;
  enableTransition: boolean;
  transitionDuration: number;
  storageKey: string;
  defaultMode: ThemeMode;
}

// 主题预设
export interface ThemePreset {
  name: string;
  description: string;
  config: ThemeConfig;
  preview?: string;
}

// 主题生成器配置
export interface ThemeGeneratorConfig {
  baseTheme: ThemeConfig;
  colorPalette: ColorPalette;
  typographyScale: TypographyScale;
  spacingScale: SpacingScale;
}

// 颜色调色板
export interface ColorPalette {
  primary: ColorScale;
  secondary?: ColorScale;
  accent?: ColorScale;
  neutral: ColorScale;
  semantic: {
    success: ColorScale;
    warning: ColorScale;
    error: ColorScale;
    info: ColorScale;
  };
}

// 颜色刻度
export interface ColorScale {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  950: string;
}

// 字体刻度
export interface TypographyScale {
  xs: { fontSize: string; lineHeight: string };
  sm: { fontSize: string; lineHeight: string };
  base: { fontSize: string; lineHeight: string };
  lg: { fontSize: string; lineHeight: string };
  xl: { fontSize: string; lineHeight: string };
  '2xl': { fontSize: string; lineHeight: string };
  '3xl': { fontSize: string; lineHeight: string };
  '4xl': { fontSize: string; lineHeight: string };
  '5xl': { fontSize: string; lineHeight: string };
  '6xl': { fontSize: string; lineHeight: string };
}

// 间距刻度
export interface SpacingScale {
  0: string;
  1: string;
  2: string;
  3: string;
  4: string;
  5: string;
  6: string;
  8: string;
  10: string;
  12: string;
  16: string;
  20: string;
  24: string;
  32: string;
  40: string;
  48: string;
  56: string;
  64: string;
  72: string;
  80: string;
  96: string;
}

// 主题验证器
export interface ThemeValidator {
  validate: (theme: ThemeConfig) => ValidationResult;
  validateToken: (token: string, value: string) => boolean;
}

// 验证结果
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// 主题导出器
export interface ThemeExporter {
  exportCSS: (theme: ThemeConfig) => string;
  exportJSON: (theme: ThemeConfig) => string;
  exportTailwind: (theme: ThemeConfig) => Record<string, any>;
}

// 主题导入器
export interface ThemeImporter {
  importCSS: (css: string) => ThemeConfig;
  importJSON: (json: string) => ThemeConfig;
  importTailwind: (config: Record<string, any>) => ThemeConfig;
}

// 主题存储接口
export interface ThemeStorage {
  get: (key: string) => ThemeConfig | null;
  set: (key: string, theme: ThemeConfig) => void;
  remove: (key: string) => void;
  clear: () => void;
  keys: () => string[];
}

// 主题事件
export interface ThemeEvent {
  type: 'theme-change' | 'mode-change' | 'token-change';
  payload: any;
  timestamp: number;
}

// 主题监听器
export interface ThemeListener {
  onThemeChange: (callback: (theme: ThemeConfig) => void) => void;
  onModeChange: (callback: (mode: ThemeMode) => void) => void;
  onTokenChange: (callback: (token: string, value: string) => void) => void;
  offThemeChange: (callback: (theme: ThemeConfig) => void) => void;
  offModeChange: (callback: (mode: ThemeMode) => void) => void;
  offTokenChange: (callback: (token: string, value: string) => void) => void;
}
