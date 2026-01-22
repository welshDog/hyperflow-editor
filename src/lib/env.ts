import { z } from "zod";

const isTest = process.env.NODE_ENV === "test";
const isProd = process.env.NODE_ENV === "production";

const EnvSchema = z.object({
  DATABASE_URL: isTest ? z.string().min(1) : z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: isTest ? z.string().min(1) : z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

export const env = EnvSchema.parse({
  DATABASE_URL:
    process.env.DATABASE_URL ?? (isProd ? undefined : "postgresql://user:pass@localhost:5432/db"),
  NEXT_PUBLIC_SUPABASE_URL:
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? (isProd ? undefined : "https://project.supabase.co"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? (isProd ? undefined : "test-key"),
});

const HyperSchema = z.object({
  HYPER_CONFIG_VERSION: z.coerce.number().int().min(1).default(1),
  HYPER_COMPAT_TARGET: z.string().min(1).default("hyperflow-editor@0.1.0"),
  HYPER_ENABLE_POWERS: z.coerce.boolean().default(true),
  HYPER_ENABLE_VERSIONING: z.coerce.boolean().default(true),
  HYPER_ENABLE_MINIMAP: z.coerce.boolean().default(true),
  HYPER_ENABLE_TOASTS: z.coerce.boolean().default(true),
  HYPER_ENABLE_AUTH_GUARDS: z.coerce.boolean().default(true),
  HYPER_ENABLE_MONITORING: z.coerce.boolean().default(true),
  HYPER_MAX_CONCURRENCY: z.coerce.number().int().min(1).max(16).default(4),
  HYPER_PAGINATION_LIMIT: z.coerce.number().int().min(10).max(100).default(20),
  HYPER_VERSION_HISTORY_LIMIT: z.coerce.number().int().min(20).default(1000),
  HYPER_PERF_BUDGET_LCP_MS: z.coerce.number().int().min(500).default(2500),
  HYPER_PERF_BUDGET_CLS: z.coerce.number().min(0).max(0.25).default(0.1),
  HYPER_PERF_BUDGET_TTI_MS: z.coerce.number().int().min(1000).default(5000),
  HYPER_SAFE_MODE: z.coerce.boolean().default(false),
  HYPER_AUTH_REQUIRED_FOR_RESTORE: z.coerce.boolean().default(true),
  HYPER_ROLLBACK_ON_FAILURE: z.coerce.boolean().default(true),
  HYPER_MAX_RESOURCE_USAGE_PERCENT: z.coerce.number().int().min(10).max(100).default(85),
  HYPER_LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  HYPER_DEBUG_FEATURES: z.coerce.boolean().default(false),
  HYPER_MONITOR_INTERVAL_MS: z.coerce.number().int().min(1000).max(60000).default(10000),
  HYPER_METRICS_DESTINATION: z.enum(["console", "file", "http"]).default("console"),
});

export const hyper = HyperSchema.parse({
  HYPER_CONFIG_VERSION: process.env.HYPER_CONFIG_VERSION,
  HYPER_COMPAT_TARGET: process.env.HYPER_COMPAT_TARGET,
  HYPER_ENABLE_POWERS: process.env.HYPER_ENABLE_POWERS,
  HYPER_ENABLE_VERSIONING: process.env.HYPER_ENABLE_VERSIONING,
  HYPER_ENABLE_MINIMAP: process.env.HYPER_ENABLE_MINIMAP,
  HYPER_ENABLE_TOASTS: process.env.HYPER_ENABLE_TOASTS,
  HYPER_ENABLE_AUTH_GUARDS: process.env.HYPER_ENABLE_AUTH_GUARDS,
  HYPER_ENABLE_MONITORING: process.env.HYPER_ENABLE_MONITORING,
  HYPER_MAX_CONCURRENCY: process.env.HYPER_MAX_CONCURRENCY,
  HYPER_PAGINATION_LIMIT: process.env.HYPER_PAGINATION_LIMIT,
  HYPER_VERSION_HISTORY_LIMIT: process.env.HYPER_VERSION_HISTORY_LIMIT,
  HYPER_PERF_BUDGET_LCP_MS: process.env.HYPER_PERF_BUDGET_LCP_MS,
  HYPER_PERF_BUDGET_CLS: process.env.HYPER_PERF_BUDGET_CLS,
  HYPER_PERF_BUDGET_TTI_MS: process.env.HYPER_PERF_BUDGET_TTI_MS,
  HYPER_SAFE_MODE: process.env.HYPER_SAFE_MODE,
  HYPER_AUTH_REQUIRED_FOR_RESTORE: process.env.HYPER_AUTH_REQUIRED_FOR_RESTORE,
  HYPER_ROLLBACK_ON_FAILURE: process.env.HYPER_ROLLBACK_ON_FAILURE,
  HYPER_MAX_RESOURCE_USAGE_PERCENT: process.env.HYPER_MAX_RESOURCE_USAGE_PERCENT,
  HYPER_LOG_LEVEL: process.env.HYPER_LOG_LEVEL,
  HYPER_DEBUG_FEATURES: process.env.HYPER_DEBUG_FEATURES,
  HYPER_MONITOR_INTERVAL_MS: process.env.HYPER_MONITOR_INTERVAL_MS,
  HYPER_METRICS_DESTINATION: process.env.HYPER_METRICS_DESTINATION,
});
