# Environment Configuration Guide

This monorepo uses a **production-grade environment architecture** inspired by [cal.com](https://github.com/calcom/cal.com), featuring:

✅ **Zod runtime validation** - Catches config errors at startup  
✅ **TypeScript type definitions** - Full IDE support for process.env  
✅ **Structured type-safe configs** - No string-based env access  
✅ **Clear naming conventions** - Prefixes indicate purpose and visibility  
✅ **Centralized configuration** - Single source of truth for all env vars  

## Architecture

```
@repo/shared/src/
├── config/
│   ├── env.config.ts       ← Zod validation + config loading
│   └── publish.config.ts   ← Publishing service configuration
├── types/
│   └── environment.d.ts    ← Global TypeScript definitions
└── index.ts

.env                         ← All secrets in one place (NEVER commit)
.env.example                 ← Documentation of all variables
```

### How it works

```typescript
// 1. environment.d.ts provides global type definitions
declare namespace NodeJS {
  interface ProcessEnv {
    DATABASE_URL: string;
    CLERK_SECRET_KEY: string;
    // ... all typed
  }
}

// 2. env.config.ts validates with Zod at runtime
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  CLERK_SECRET_KEY: z.string().min(1),
  // ...
});

export function getConfig(): AppConfig {
  // ✓ Validates all vars exist and are correct type
  // ✓ Clear error messages if validation fails
  // ✓ Transforms raw env into structured config
}

// 3. Apps import and use type-safe config
import { getConfig } from '@repo/shared';
const config = getConfig();
// TypeScript knows: config.api.port is a number, config.clerk.secretKey is a string
```

## Files & Structure

### 1. Root `.env.example` (Documentation)

Lists **ALL** environment variables used anywhere in the monorepo:

```bash
# Database (Required)
DATABASE_URL="postgresql://..."

# Authentication - Clerk (Required)
CLERK_SECRET_KEY=sk_test_xxxxx
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx

# API Server (Optional, default: 3001)
API_PORT=3001
API_URL=http://localhost:3001

# Event Processing (Optional)
INNGEST_EVENT_KEY=...
INNGEST_SIGNING_KEY=...
```

### 2. Root `.env` (Your Secrets - NEVER COMMIT)

```bash
cp .env.example .env
# Edit with real values
# NEVER commit this file - it's in .gitignore
```

### 3. Per-app `.env.example` (Optional)

Each app shows what specific variables it needs. Most apps just use the shared root `.env`.

## Usage

### In NestJS (API)

```typescript
import { getConfig, type AppConfig } from '@repo/shared';

@Injectable()
export class DatabaseService {
  private config: AppConfig;

  constructor() {
    // ✓ Type-safe - TypeScript knows this is AppConfig
    this.config = getConfig();
    
    // ✓ Full typed access
    const dbUrl = this.config.database.url;  // string
    const apiPort = this.config.api?.port;   // number | undefined
    
    // ✓ Optional config is properly typed
    if (this.config.inngest?.eventKey) {
      // Safe to use here
    }
  }
}
```

### In Next.js (Web)

```typescript
import { getConfig } from '@repo/shared';

export async function getServerSideProps() {
  const config = getConfig();
  
  return {
    props: {
      apiUrl: config.api?.url || 'http://localhost:3001',
      clerkPublicKey: config.clerk.publishableKey,
    },
  };
}
```

### In Server Components

```typescript
'use server'

import { getConfig } from '@repo/shared';

export async function fetchUserData(userId: string) {
  const config = getConfig();
  
  // ✓ Type-safe environment access
  const response = await fetch(`${config.api?.url}/api/users/${userId}`, {
    headers: {
      'Authorization': `Bearer ${config.clerk.secretKey}`,
    },
  });
  
  return response.json();
}
```

## Environment Variables Reference

### Naming Conventions

| Prefix | Purpose | Visibility | Example |
|--------|---------|-----------|---------|
| `NEXT_PUBLIC_*` | Client-side vars | Browser | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` |
| `DATABASE_*` | Database config | Server-only | `DATABASE_URL` |
| `CLERK_*` | Auth secrets | Server-only | `CLERK_SECRET_KEY` |
| `API_*` | API config | Server-only | `API_PORT`, `API_URL` |
| `INNGEST_*` | Event processing | Server-only | `INNGEST_EVENT_KEY` |
| `R2_*` | Cloudflare R2 | Server-only | `R2_ACCOUNT_ID` |
| `REDIS_*` | Cache/Queue | Server-only | `REDIS_HOST` |
| *(no prefix)* | Server secrets | Server-only | `NEXTAUTH_SECRET` |

### Required Variables

These **must** be set in `.env` or the app won't start:

| Variable | Type | Purpose |
|----------|------|---------|
| `DATABASE_URL` | URL | PostgreSQL connection string |
| `CLERK_SECRET_KEY` | String | Clerk backend API key |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | String | Clerk frontend key (public) |

### Optional Variables

These are only needed if you're using those services:

| Variable | Default | Purpose |
|----------|---------|---------|
| `API_PORT` | `3001` | NestJS server port |
| `API_URL` | `http://localhost:3001` | API endpoint URL |
| `INNGEST_EVENT_KEY` | - | Event processing (only if using Inngest) |
| `INNGEST_SIGNING_KEY` | - | Event processing signing key |
| `R2_ACCOUNT_ID` | - | Cloudflare R2 (only if publishing enabled) |
| `REDIS_HOST` | `localhost` | Cache backend |
| `REDIS_PORT` | `6379` | Cache port |

## Development Setup

### First Time Setup

```bash
# 1. Clone repo
git clone <repo>
cd <repo>

# 2. Create .env from template
cp .env.example .env

# 3. Edit .env with your actual secrets
# DATABASE_URL="postgresql://..."
# CLERK_SECRET_KEY="sk_test_..."
# etc.

# 4. Install and start
pnpm install
pnpm dev
```

### The app will fail loudly if env vars are missing

When you run the app, `getConfig()` validates all required variables. If any are missing:

```
❌ Environment validation failed:

DATABASE_URL: String must be a valid URL
CLERK_SECRET_KEY: String must contain at least 1 character(s)

Check your .env file and ensure all required variables are set.
```

This is **intentional** - fail fast and loudly during development rather than at runtime in production.

## Deployment

### Docker

Set environment variables in your Docker environment:

```dockerfile
FROM node:18-alpine

ENV DATABASE_URL="postgresql://..."
ENV CLERK_SECRET_KEY="sk_prod_..."
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_prod_..."

# Do NOT include .env file in Docker image
```

### Vercel

Set environment variables in Vercel Dashboard:

1. Go to Project Settings → Environment Variables
2. Add all variables from `.env.example`
3. Set `NODE_ENV=production`

**Do NOT upload .env file to Vercel.**

### Railway / Render / Other Platforms

Each platform has an environment variables section:

- Add variables from `.env.example`
- Never commit `.env` to git
- Platform retrieves them at runtime

## Best Practices

✅ **DO:**
- Keep one `.env` file with all secrets
- Use `.env.example` to document all variables
- Use `getConfig()` - never `process.env.X` directly
- Check for optional features: `if (config.inngest?.eventKey)`
- Let validation errors fail loudly in development
- Version `.env.example` but NOT `.env`

❌ **DON'T:**
- Commit `.env` to git
- Hardcode secrets in code
- Use different env var naming patterns
- Access `process.env` directly without validation
- Mix env var handling across apps
- Trust that env vars are set - validate them

## Zod Validation Errors

If you see validation errors, check your `.env` file:

```
DATABASE_URL: String must be a valid URL
```

**Fix:** Make sure DATABASE_URL is a valid PostgreSQL URL, not just a plain string.

```
INNGEST_SIGNING_KEY: String must contain at least 1 character(s)
```

**Fix:** If using Inngest, provide the signing key. Or comment it out if not using Inngest.

## Type Safety

The configuration is fully typed. Your IDE will help you:

```typescript
const config = getConfig();

config.database.url;           // ✓ IDE knows this is string
config.api?.port;              // ✓ IDE knows this is number | undefined  
config.api.port;               // ❌ Error: port might not exist
config.inngest?.eventKey;     // ✓ Properly typed optional access
config.inngest.eventKey;      // ❌ Error: inngest might not exist
```
