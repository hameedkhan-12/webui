// export interface PublishConfig {
//   r2: {
//     accountId: string;
//     accessKeyId: string;
//     secretAccessKey: string;
//     bucketName: string;
//     publicUrl: string;
//   };
//   publishing: {
//     baseDomain: string;
//     maxBundleSize: number;
//     maxBuildTime: number;
//     maxFilesPerProject: number;
//   };
//   redis: {
//     host: string;
//     port: number;
//     password?: string;
//   };
//   queue: {
//     publishQueueName: string;
//     concurrency: number;
//   };
// }

// let _config: PublishConfig | null = null;

// export function getPublishConfig(): PublishConfig {
//   if (_config) return _config;

//   _config = {
//     r2: {
//       accountId: requireEnv("R2_ACCOUNT_ID"),
//       accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
//       secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
//       bucketName: process.env.R2_BUCKET_NAME || "published-sites",
//       publicUrl: requireEnv("R2_PUBLIC_URL"), // your R2 custom domain
//     },
//     publishing: {
//       baseDomain: process.env.PUBLISH_BASE_DOMAIN || "yourdomain.com",
//       maxBundleSize: parseInt(
//         process.env.MAX_BUNDLE_SIZE || String(50 * 1024 * 1024),
//       ),
//       maxBuildTime: parseInt(process.env.MAX_BUILD_TIME_MS || "30000"),
//       maxFilesPerProject: parseInt(process.env.MAX_FILES_PER_PROJECT || "500"),
//     },
//     redis: {
//       host: process.env.REDIS_HOST || "localhost",
//       port: parseInt(process.env.REDIS_PORT || "6379"),
//       password: process.env.REDIS_PASSWORD,
//     },
//     queue: {
//       publishQueueName: "publish-jobs",
//       concurrency: parseInt(process.env.PUBLISH_CONCURRENCY || "5"),
//     },
//   };

//   return _config;
// }

// function requireEnv(key: string): string {
//   const val = process.env[key];
//   if (!val) throw new Error(`Missing required environment variable: ${key}`);
//   return val;
// }
