import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid database URL"),
  CLERK_SECRET_KEY: z.string().min(1, "CLERK_SECRET_KEY is required"),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required"),
  API_PORT: z.coerce.number().int().positive().optional().default(3001),
  API_URL: z.string().url().optional().default("http://localhost:3001"),

  INNGEST_EVENT_KEY: z.string().optional(),
  INNGEST_SIGNING_KEY: z.string().optional(),

  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional().default("published-sites"),
  R2_PUBLIC_URL: z.string().url().optional(),

  // Publishing Service Configuration (Optional)
  PUBLISH_BASE_DOMAIN: z.string().optional().default("yourdomain.com"),
  MAX_BUNDLE_SIZE: z.coerce
    .number()
    .optional()
    .default(50 * 1024 * 1024),
  MAX_BUILD_TIME_MS: z.coerce.number().optional().default(30000),
  MAX_FILES_PER_PROJECT: z.coerce.number().optional().default(500),

  // Redis - Cache & Queue (Optional)
  REDIS_HOST: z.string().optional().default("localhost"),
  REDIS_PORT: z.coerce.number().int().positive().optional().default(6379),
  REDIS_PASSWORD: z.string().optional(),

  // Node Environment
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .optional()
    .default("development"),

  //Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
});

export type Environment = z.infer<typeof envSchema>;

export interface AppConfig {
  env: {
    nodeEnv: Environment["NODE_ENV"];
  };
  database: {
    url: Environment["DATABASE_URL"];
  };
  clerk: {
    publishableKey: Environment["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"];
    secretKey: Environment["CLERK_SECRET_KEY"];
  };
  api?: {
    url: Environment["API_URL"];
    port: Environment["API_PORT"];
  };
  inngest?: {
    eventKey: Environment["INNGEST_EVENT_KEY"];
    signingKey: Environment["INNGEST_SIGNING_KEY"];
  };
  publishing?: {
    r2: {
      accountId: Environment["R2_ACCOUNT_ID"];
      accessKeyId: Environment["R2_ACCESS_KEY_ID"];
      secretAccessKey: Environment["R2_SECRET_ACCESS_KEY"];
      bucketName: Environment["R2_BUCKET_NAME"];
      publicUrl: Environment["R2_PUBLIC_URL"];
    };
    baseDomain: Environment["PUBLISH_BASE_DOMAIN"];
    maxBundleSize: Environment["MAX_BUNDLE_SIZE"];
    maxBuildTime: Environment["MAX_BUILD_TIME_MS"];
    maxFilesPerProject: Environment["MAX_FILES_PER_PROJECT"];
  };
  redis?: {
    host: Environment["REDIS_HOST"];
    port: Environment["REDIS_PORT"];
    password?: Environment["REDIS_PASSWORD"];
  };
  cloudinary?: {
    cloudName: Environment["CLOUDINARY_CLOUD_NAME"];
    apiKey: Environment["CLOUDINARY_API_KEY"];
    apiSecret: Environment["CLOUDINARY_API_SECRET"];
  };
}

/**
 * Helper function to get a typed environment variable
 */
export function getEnv<K extends keyof Environment>(
  key: K,
  fallback?: Environment[K],
): Environment[K] {
  const value = process.env[key] as Environment[K] | undefined;

  if (value === undefined && fallback !== undefined) {
    return fallback;
  }

  return value as Environment[K];
}

export function loadConfig(): AppConfig {
  try {
    const env = envSchema.parse(process.env);

    const config: AppConfig = {
      env: {
        nodeEnv: env.NODE_ENV,
      },
      database: {
        url: env.DATABASE_URL,
      },
      clerk: {
        publishableKey: env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
        secretKey: env.CLERK_SECRET_KEY,
      },
    };

    // API specific config - only if API_PORT is set
    if (env.API_PORT) {
      config.api = {
        url: env.API_URL,
        port: env.API_PORT,
      };
    }

    // Inngest config - only if INNGEST_EVENT_KEY is set
    if (env.INNGEST_EVENT_KEY) {
      config.inngest = {
        eventKey: env.INNGEST_EVENT_KEY,
        signingKey: env.INNGEST_SIGNING_KEY || "",
      };
    }

    // Publishing service config - only if R2_ACCOUNT_ID is set
    if (env.R2_ACCOUNT_ID) {
      config.publishing = {
        r2: {
          accountId: env.R2_ACCOUNT_ID,
          accessKeyId: env.R2_ACCESS_KEY_ID || "",
          secretAccessKey: env.R2_SECRET_ACCESS_KEY || "",
          bucketName: env.R2_BUCKET_NAME,
          publicUrl: env.R2_PUBLIC_URL || "",
        },
        baseDomain: env.PUBLISH_BASE_DOMAIN,
        maxBundleSize: env.MAX_BUNDLE_SIZE,
        maxBuildTime: env.MAX_BUILD_TIME_MS,
        maxFilesPerProject: env.MAX_FILES_PER_PROJECT,
      };

      config.redis = {
        host: env.REDIS_HOST,
        port: env.REDIS_PORT,
        password: env.REDIS_PASSWORD,
      };
    }
    
    if (env.CLOUDINARY_CLOUD_NAME) {
      config.cloudinary = {
        cloudName: env.CLOUDINARY_CLOUD_NAME,
        apiKey: env.CLOUDINARY_API_KEY,
        apiSecret: env.CLOUDINARY_API_SECRET,
      };
    }

    return config;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join("\n");

      throw new Error(
        `❌ Environment validation failed:\n\n${formattedErrors}\n\nCheck your .env file and ensure all required variables are set.`,
      );
    }

    throw error;
  }
}

// Singleton instance - load config once on module import
let cachedConfig: AppConfig | null = null;

export function getConfig(): Readonly<AppConfig> {
  if (!cachedConfig) {
    cachedConfig = loadConfig();
  }
  return cachedConfig;
}
