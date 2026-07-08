import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_FILES = [
  {
    path: 'package.json',
    kind: 'file',
    content: `{
  "name": "nextjs-app",
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
  {
    path: 'next.config.ts',
    kind: 'file',
    content: `import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
`,
  },
  {
    path: 'next-env.d.ts',
    kind: 'file',
    content: `/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
`,
  },
  {
    path: 'tsconfig.json',
    kind: 'file',
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
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}`,
  },
  {
    path: 'postcss.config.mjs',
    kind: 'file',
    content: `/** @type {import('postcss-load-config').Config} */
const config = { plugins: { tailwindcss: {}, autoprefixer: {} } };
export default config;
`,
  },
  {
    path: 'tailwind.config.ts',
    kind: 'file',
    content: `import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: { extend: { colors: { brand: { 950: '#070913', 500: '#a855f7' } } } },
  plugins: [],
};
export default config;
`,
  },
  {
    path: 'src/app/layout.tsx',
    kind: 'file',
    content: `import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Next.js App',
  description: 'Built with Bolt-style workspace',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased bg-brand-950 text-slate-100">{children}</body>
    </html>
  );
}
`,
  },
  {
    path: 'src/app/globals.css',
    kind: 'file',
    content: `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\n:root { color-scheme: dark; }\nbody { margin: 0; min-height: 100vh; }\n`,
  },
  {
    path: 'src/app/page.tsx',
    kind: 'file',
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
        <h1
          data-id="el-4"
          className="text-3xl font-bold mb-3 bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent"
        >
          Bolt-style workspace
        </h1>
        <p data-id="el-5" className="text-sm text-slate-400 leading-relaxed mb-6">
          Edit <code className="text-purple-300">src/app/page.tsx</code> or ask AI to build your app.
        </p>
        <button
          data-id="el-6"
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
];

export type WorkspaceEntryInput = {
  path: string;
  content: string;
  kind: string;
};

@Injectable()
export class WorkspaceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolve a project for the given userId.
   * - If projectId === 'default', auto-create a personal default project.
   * - Otherwise look up the project and verify ownership.
   */
  async getProjectOrFallback(userId: string, projectId: string) {
    if (projectId === 'default') {
      const slug = `default-${userId}`;
      let project = await this.prisma.project.findFirst({
        where: { ownerId: userId, slug },
      });

      if (!project) {
        project = await this.prisma.project.create({
          data: {
            name: 'Default Project',
            slug,
            ownerId: userId,
          },
        });
      }
      return project;
    }

    const project = await this.prisma.project.findFirst({
      where: { id: projectId, ownerId: userId },
    });

    if (!project) {
      throw new NotFoundException('Project not found or access denied');
    }

    return project;
  }

  /** Fetch all workspace entries, seeding defaults when the project is brand new. */
  async fetchWorkspace(userId: string, projectId: string) {
    const project = await this.getProjectOrFallback(userId, projectId);

    let entries = await this.prisma.workspaceEntry.findMany({
      where: { projectId: project.id },
      select: { path: true, content: true, kind: true },
      orderBy: { path: 'asc' },
    });

    if (entries.length === 0) {
      await this.prisma.workspaceEntry.createMany({
        data: DEFAULT_FILES.map((f) => ({
          projectId: project.id,
          path: f.path,
          content: f.content,
          kind: f.kind,
        })),
      });

      entries = await this.prisma.workspaceEntry.findMany({
        where: { projectId: project.id },
        select: { path: true, content: true, kind: true },
        orderBy: { path: 'asc' },
      });
    }

    return { entries };
  }

  /** Replace all workspace entries in a single transaction. */
  async saveWorkspace(
    userId: string,
    projectId: string,
    entries: WorkspaceEntryInput[],
  ) {
    const project = await this.getProjectOrFallback(userId, projectId);

    await this.prisma.$transaction(async (tx) => {
      await tx.workspaceEntry.deleteMany({ where: { projectId: project.id } });

      if (entries.length > 0) {
        await tx.workspaceEntry.createMany({
          data: entries.map((e) => ({
            projectId: project.id,
            path: e.path,
            content: e.content,
            kind: e.kind,
          })),
        });
      }

      await tx.project.update({
        where: { id: project.id },
        data: { updatedAt: new Date() },
      });
    });

    return { success: true };
  }

  /** Upsert a single folder entry. */
  async createFolder(userId: string, projectId: string, path: string) {
    const project = await this.getProjectOrFallback(userId, projectId);

    return this.prisma.workspaceEntry.upsert({
      where: { projectId_path: { projectId: project.id, path } },
      create: { projectId: project.id, path, content: '', kind: 'folder' },
      update: { kind: 'folder', content: '' },
    });
  }
}
