// backend/src/env.ts
import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import dotenv from "dotenv";

// 加载 .env 文件
dotenv.config();

type Env = {
  NODE_ENV: string;
  PORT: number;
  LOG_LEVEL: string;

  DATA_PROFILE: "vanilla" | "timescale";
  FRONTEND_ROUTER: "app" | "pages";

  DATABASE_URL: string;
  REDIS_URL: string;
  MQTT_BROKER_URL: string;

  JWT_SECRET: string;
  TOKEN_EXPIRES_IN: string;

  CORS_ORIGIN: string;
  PUBLIC_ORIGIN: string;

  WS_PATH: string;

  FEATURE_OTA: boolean;
  FEATURE_RULE_ENGINE: boolean;
  FEATURE_AGGREGATES: boolean;

  METRICS_ENABLED: boolean;
  METRICS_PATH: string;

  DEFAULT_TIMEZONE: string; // IANA timezone, e.g., "Asia/Shanghai"
};

function bool(v: any, d = false) {
  if (v === undefined || v === null || v === "") return d;
  return ["1", "true", "yes", "on"].includes(String(v).toLowerCase());
}

const envFromProcess: Env = {
  NODE_ENV: process.env['NODE_ENV'] ?? "development",
  PORT: parseInt(process.env['PORT'] ?? "8000", 10),
  LOG_LEVEL: process.env['LOG_LEVEL'] ?? "info",

  DATA_PROFILE: (process.env['DATA_PROFILE'] as any) ?? "vanilla",
  FRONTEND_ROUTER: (process.env['FRONTEND_ROUTER'] as any) ?? "app",

  DATABASE_URL: process.env['DATABASE_URL'] ?? "",
  REDIS_URL: process.env['REDIS_URL'] ?? "redis://localhost:6379/0",
  MQTT_BROKER_URL: process.env['MQTT_BROKER_URL'] ?? "mqtt://localhost:1883",

  JWT_SECRET: process.env['JWT_SECRET'] ?? "",
  TOKEN_EXPIRES_IN: process.env['TOKEN_EXPIRES_IN'] ?? "12h",

  CORS_ORIGIN: process.env['CORS_ORIGIN'] ?? "http://localhost",
  PUBLIC_ORIGIN: process.env['PUBLIC_ORIGIN'] ?? "http://localhost",

  WS_PATH: process.env['WS_PATH'] ?? "/ws",

  FEATURE_OTA: bool(process.env['FEATURE_OTA'], true),
  FEATURE_RULE_ENGINE: bool(process.env['FEATURE_RULE_ENGINE'], true),
  FEATURE_AGGREGATES: bool(process.env['FEATURE_AGGREGATES'], false),

  METRICS_ENABLED: bool(process.env['METRICS_ENABLED'], false),
  METRICS_PATH: process.env['METRICS_PATH'] ?? "/metrics",

  DEFAULT_TIMEZONE: process.env['DEFAULT_TIMEZONE'] ?? "UTC",
};

// optional structured config
const CONFIG_PATH = process.env['CONFIG_PATH'] ?? path.resolve(process.cwd(), 'config.yaml');
if (fs.existsSync(CONFIG_PATH)) {
  try {
    const doc = yaml.load(fs.readFileSync(CONFIG_PATH, "utf8")) as any;
    envFromProcess.DATA_PROFILE = (process.env['DATA_PROFILE'] as any) ?? doc?.profiles?.data ?? envFromProcess.DATA_PROFILE;
    envFromProcess.FRONTEND_ROUTER = (process.env['FRONTEND_ROUTER'] as any) ?? doc?.profiles?.router ?? envFromProcess.FRONTEND_ROUTER;

    envFromProcess.TOKEN_EXPIRES_IN = process.env['TOKEN_EXPIRES_IN'] ?? doc?.security?.token_expires_in ?? envFromProcess.TOKEN_EXPIRES_IN;
    envFromProcess.CORS_ORIGIN = process.env['CORS_ORIGIN'] ?? doc?.security?.cors_origin ?? envFromProcess.CORS_ORIGIN;
    envFromProcess.PUBLIC_ORIGIN = process.env['PUBLIC_ORIGIN'] ?? doc?.security?.public_origin ?? envFromProcess.PUBLIC_ORIGIN;

    envFromProcess.WS_PATH = process.env['WS_PATH'] ?? doc?.realtime?.ws_path ?? envFromProcess.WS_PATH;
    envFromProcess.MQTT_BROKER_URL = process.env['MQTT_BROKER_URL'] ?? doc?.realtime?.mqtt?.url ?? envFromProcess.MQTT_BROKER_URL;

    envFromProcess.FEATURE_OTA = bool(process.env['FEATURE_OTA'], !!doc?.features?.ota);
    envFromProcess.FEATURE_RULE_ENGINE = bool(process.env['FEATURE_RULE_ENGINE'], !!doc?.features?.rule_engine);
    envFromProcess.FEATURE_AGGREGATES = bool(process.env['FEATURE_AGGREGATES'], !!doc?.features?.aggregates);

    envFromProcess.METRICS_ENABLED = bool(process.env['METRICS_ENABLED'], !!doc?.metrics?.enabled);
    envFromProcess.METRICS_PATH = process.env['METRICS_PATH'] ?? doc?.metrics?.path ?? envFromProcess.METRICS_PATH;

    // default timezone from config
    envFromProcess.DEFAULT_TIMEZONE = process.env['DEFAULT_TIMEZONE'] ?? doc?.i18n?.default_timezone ?? envFromProcess.DEFAULT_TIMEZONE;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(`Failed to parse ${CONFIG_PATH}:`, e);
  }
}

const required = ["DATABASE_URL", "JWT_SECRET", "REDIS_URL"] as const;
for (const k of required) {
  if (!envFromProcess[k]) {
    throw new Error(`Missing required env: ${k}`);
  }
}

// 额外校验：避免本地开发时误连默认 Redis
if (envFromProcess.REDIS_URL === "redis://redis:6379/0" && envFromProcess.NODE_ENV === "development") {
  console.warn("Warning: Using default Redis URL in development. Make sure Redis is running or set REDIS_URL");
}

export const env: Env = envFromProcess;
export default env;
