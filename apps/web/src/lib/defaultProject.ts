import { WorkspaceFiles } from "@repo/shared";

/** Bolt-style default: Next.js App Router + TypeScript + Tailwind */
export const APP_ENTRY = "src/app/page.tsx";
export const LAYOUT_ENTRY = "src/app/layout.tsx";
export const STYLES_ENTRY = "src/app/globals.css";
export const PACKAGE_JSON = "package.json";

export const BOLT_STACK_LABEL = "Next.js · React · TypeScript · Tailwind";
export const BOLT_PROJECT_NAME = "nextjs-app";
export const DEV_SERVER_URL = "http://localhost:3000/";
export const DEV_SERVER_PORT = 3000;

export const PROTECTED_FILES = new Set([
  APP_ENTRY,
  LAYOUT_ENTRY,
  STYLES_ENTRY,
  PACKAGE_JSON,
  "next.config.ts",
  "next-env.d.ts",
  "tsconfig.json",
  "postcss.config.mjs",
  "tailwind.config.ts",
]);

export const DEFAULT_OPEN_TABS = [
  APP_ENTRY,
  LAYOUT_ENTRY,
  STYLES_ENTRY,
  "next.config.ts",
  PACKAGE_JSON,
];

export const DEFAULT_FILES: WorkspaceFiles = {
  [PACKAGE_JSON]: {
    name: "package.json",
    path: PACKAGE_JSON,
    content: `{
  "name": "${BOLT_PROJECT_NAME}",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev --hostname 0.0.0.0 --port 3000",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "15.4.1",
    "react": "18.2.0",
    "react-dom": "18.2.0",
    "lucide-react": "^0.468.0",
    "recharts": "^2.15.0",
    "framer-motion": "^11.15.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.5.5",
    "class-variance-authority": "^0.7.1",
    "date-fns": "^4.1.0"
  },
  "devDependencies": {
    "@types/node": "20.11.5",
    "@types/react": "18.2.65",
    "@types/react-dom": "18.2.0",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.39.1",
    "eslint-config-next": "15.4.1",
    "postcss": "^8.4.49",
    "tailwindcss": "3.4.4",
    "typescript": "5.3.3"
  }
}`,
  },
  "next.config.ts": {
    name: "next.config.ts",
    path: "next.config.ts",
    content: `import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    // Suppress AsyncLocalStorage warnings in WebContainer environments
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'async_hooks': false,
      };
    }
    return config;
  },
};

export default nextConfig;
`,
  },
  "next-env.d.ts": {
    name: "next-env.d.ts",
    path: "next-env.d.ts",
    content: `/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited — see https://nextjs.org/docs/app/api-reference/config/typescript
`,
  },
  "tsconfig.json": {
    name: "tsconfig.json",
    path: "tsconfig.json",
    content: `{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}`,
  },
  "postcss.config.mjs": {
    name: "postcss.config.mjs",
    path: "postcss.config.mjs",
    content: `/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

export default config;
`,
  },
  "tailwind.config.ts": {
    name: "tailwind.config.ts",
    path: "tailwind.config.ts",
    content: `import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          950: '#070913',
          500: '#a855f7',
        },
      },
    },
  },
  plugins: [],
};

export default config;
`,
  },
  [LAYOUT_ENTRY]: {
    name: "layout.tsx",
    path: LAYOUT_ENTRY,
    content: `import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Next.js App',
  description: 'Built with Bolt-style workspace',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: \`
              try {
                if (localStorage.theme === 'dark' || (!('theme' in localStorage))) {
                  document.documentElement.classList.add('dark');
                }
              } catch (e) {}
            \`,
          }}
        />
      </head>
      <body className="antialiased bg-brand-950 text-slate-100">{children}</body>
    </html>
  );
}
`,
  },
  [STYLES_ENTRY]: {
    name: "globals.css",
    path: STYLES_ENTRY,
    content: `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  color-scheme: dark;
}

body {
  margin: 0;
  min-height: 100vh;
}
`,
  },
  [APP_ENTRY]: {
    name: "page.tsx",
    path: APP_ENTRY,
    content: `export default function Home() {
  return (
    <main
      data-id="el-1"
      className="min-h-screen flex flex-col items-center justify-center p-6 text-center relative"
    >
      <div
        data-id="el-2"
        className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(168,85,247,0.2),transparent)] pointer-events-none"
      />
      <div
        data-id="el-3"
        className="relative z-10 max-w-lg p-8 rounded-2xl border border-white/10 bg-slate-900/50 backdrop-blur-md"
      >
        <p
          data-id="el-4"
          className="text-[10px] uppercase tracking-widest text-purple-400 font-semibold mb-3"
        >
          Next.js · TypeScript · Tailwind
        </p>
        <h1
          data-id="el-5"
          className="text-3xl font-bold mb-3 bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent"
        >
          Bolt-style workspace
        </h1>
        <p data-id="el-6" className="text-sm text-slate-400 leading-relaxed mb-6">
          Edit <code className="text-purple-300">src/app/page.tsx</code>, run{' '}
          <code className="text-purple-300">npm install</code> and{' '}
          <code className="text-purple-300">npm run dev</code>, or ask AI to build your app.
        </p>
        <button
          data-id="el-7"
          type="button"
          className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 font-semibold text-sm shadow-lg shadow-purple-500/25 transition-colors"
        >
          Get started
        </button>
      </div>
    </main>
  );
}
`,
  },
};

const PREVIEW_ENTRY_CANDIDATES = [
  APP_ENTRY,
  "app/page.tsx",
  "src/App.tsx",
  "App.jsx",
  "src/App.jsx",
];

/** Resolve page/component source for iframe preview */
export function getAppSource(files: WorkspaceFiles): string {
  for (const path of PREVIEW_ENTRY_CANDIDATES) {
    if (files[path]?.content) return files[path].content;
  }
  return "";
}

export function getStylesSource(files: WorkspaceFiles): string {
  return (
    files[STYLES_ENTRY]?.content ??
    files["app/globals.css"]?.content ??
    files["styles.css"]?.content ??
    files["src/index.css"]?.content ??
    ""
  );
}

export function parsePackageDeps(content: string): Record<string, string> {
  try {
    const pkg = JSON.parse(content) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    return { ...pkg.devDependencies, ...pkg.dependencies };
  } catch {
    return {};
  }
}
