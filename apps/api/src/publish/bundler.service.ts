// apps/api/src/modules/publish/bundler.service.ts

import { Injectable, Logger } from '@nestjs/common';
import * as esbuild from 'esbuild';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as os from 'os';
import * as mime from 'mime-types';
import {
  BuildFile,
  BundleResult,
  BundledFile,
  ENTRY_POINT_FALLBACKS,
  getConfig,
  getFrameworkConfig,
} from '@repo/shared';

@Injectable()
export class BundlerService {
  private readonly logger = new Logger(BundlerService.name);
  private readonly config = getConfig();

  /**
   * Bundle a project's source files into deployable static assets.
   *
   * Flow:
   *   1. Write source files to an isolated temp directory
   *   2. Call esbuild programmatically (in-process — no shell, no Docker)
   *   3. Read the dist output, enrich with MIME types and cache headers
   *   4. Return BundledFile[] ready for R2 upload
   *   5. Always clean up the temp directory
   */
  async bundle(files: BuildFile[], framework: string): Promise<BundleResult> {
    const startTime = Date.now();
    const tmpDir = await this.createIsolatedTmpDir();

    try {
      this.logger.log(
        `Bundling ${files.length} files (${framework}) in ${tmpDir}`,
      );

      // ── 1. Write source files safely ──────────────────────────────────────
      await this.writeSourceFiles(tmpDir, files);

      // ── 2. Resolve entry point ────────────────────────────────────────────
      const frameworkConfig = getFrameworkConfig(framework);
      const entryPoint = await this.resolveEntryPoint(
        tmpDir,
        frameworkConfig.entryPoint,
      );

      // ── 3. Install shim dependencies (React, etc.) ────────────────────────
      await this.installShims(tmpDir, framework);

      // ── 4. Run esbuild ────────────────────────────────────────────────────
      const outDir = path.join(tmpDir, 'dist');
      await fs.mkdir(outDir, { recursive: true });

      // List of packages to treat as external (load from CDN in browser)
      const externalPackages = [
        'react',
        'react-dom',
        'lucide-react',
        'class-variance-authority',
        'classnames',
        'clsx',
      ];

      // Plugin to handle missing CSS and other asset files
      const handleMissingAssetsPlugin: esbuild.Plugin = {
        name: 'handle-missing-assets',
        setup: (build) => {
          build.onResolve({ filter: /\.(css|less|scss|sass)$/ }, (args) => {
            // Check if file exists
            const fullPath = path.join(args.resolveDir, args.path);
            try {
              fsSync.accessSync(fullPath);
              return undefined; // Let esbuild handle it normally
            } catch {
              // File doesn't exist - return empty module
              this.logger.warn(`CSS file not found, stubbing: ${args.path}`);
              return {
                path: fullPath,
                namespace: 'stub',
              };
            }
          });

          build.onLoad({ filter: /.*/, namespace: 'stub' }, () => {
            return {
              contents: '/* CSS file not found */',
              loader: 'css',
            };
          });
        },
      };

      const buildResult = await esbuild.build({
        entryPoints: [entryPoint],
        bundle: true,
        minify: true,
        splitting: true,
        format: 'esm',
        platform: frameworkConfig.platform,
        plugins: [handleMissingAssetsPlugin],
        external: externalPackages,
        outdir: outDir,
        entryNames: 'assets/[name]-[hash]',
        chunkNames: 'assets/[name]-[hash]',
        assetNames: 'assets/[name]-[hash]',
        metafile: true,
        define: {
          'process.env.NODE_ENV': '"production"',
          'import.meta.env.MODE': '"production"',
          'import.meta.env.PROD': 'true',
          'import.meta.env.DEV': 'false',
        },
        loader: {
          '.tsx': 'tsx',
          '.ts': 'ts',
          '.jsx': 'jsx',
          '.js': 'js',
          '.css': 'css',
          '.svg': 'dataurl',
          '.png': 'dataurl',
          '.jpg': 'dataurl',
          '.jpeg': 'dataurl',
          '.gif': 'dataurl',
          '.webp': 'dataurl',
          '.woff': 'dataurl',
          '.woff2': 'dataurl',
          '.ttf': 'dataurl',
          '.eot': 'dataurl',
        },
        absWorkingDir: tmpDir,
        logLevel: 'silent',
        ...frameworkConfig.esbuildOverrides,
      });

      if (buildResult.errors.length > 0) {
        const errorMessages = buildResult.errors
          .map((e) => esbuild.formatMessages([e], { kind: 'error' }))
          .join('\n');
        throw new Error(`esbuild errors:\n${errorMessages}`);
      }

      // ── 5. Inject index.html ──────────────────────────────────────────────
      const indexHtml = await this.generateIndexHtml(
        outDir,
        frameworkConfig.htmlTemplate,
        buildResult.metafile,
      );
      await fs.writeFile(path.join(outDir, 'index.html'), indexHtml, 'utf-8');

      // ── 6. Read and validate output ───────────────────────────────────────
      const bundledFiles = await this.readOutputFiles(outDir);
      const totalSize = bundledFiles.reduce((sum, f) => sum + f.size, 0);

      if (this.config && this.config.publishing) {
        if (totalSize > this.config.publishing.maxBundleSize) {
          throw new Error(
            `Bundle size ${totalSize} bytes exceeds maximum ${this.config.publishing.maxBundleSize} bytes`,
          );
        }
      }

      const buildTime = Date.now() - startTime;
      this.logger.log(
        `Bundle complete: ${bundledFiles.length} files, ${totalSize} bytes, ${buildTime}ms`,
      );

      return {
        success: true,
        files: bundledFiles,
        buildTime,
        totalSize,
      };
    } catch (error) {
      this.logger.error(`Bundle failed: ${error.message}`, error.stack);
      return {
        success: false,
        files: [],
        buildTime: Date.now() - startTime,
        totalSize: 0,
        error: error.message,
      };
    } finally {
      // Always clean up — never leak temp files
      await this.cleanup(tmpDir);
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Create a fresh isolated temp directory per build.
   * Each build is completely independent — no shared state.
   */
  private async createIsolatedTmpDir(): Promise<string> {
    const base = path.join(os.tmpdir(), 'publish-builds');
    await fs.mkdir(base, { recursive: true });
    return fs.mkdtemp(path.join(base, 'build-'));
  }

  /**
   * Write source files with path traversal protection.
   * Every path is validated and resolved inside tmpDir before writing.
   */
  private async writeSourceFiles(
    tmpDir: string,
    files: BuildFile[],
  ): Promise<void> {
    for (const file of files) {
      const safePath = this.validateFilePath(file.path);
      const absolutePath = path.join(tmpDir, safePath);

      // Confirm resolved path is inside tmpDir (defense in depth)
      if (!absolutePath.startsWith(tmpDir + path.sep)) {
        throw new Error(`Path traversal detected: ${file.path}`);
      }

      await fs.mkdir(path.dirname(absolutePath), { recursive: true });
      await fs.writeFile(absolutePath, file.content, 'utf-8');
    }

    this.logger.debug(`Wrote ${files.length} source files to ${tmpDir}`);
  }

  /**
   * Resolve the entry point, trying fallbacks if the primary doesn't exist.
   */
  private async resolveEntryPoint(
    tmpDir: string,
    primaryEntryPoint: string,
  ): Promise<string> {
    const candidates = [primaryEntryPoint, ...ENTRY_POINT_FALLBACKS];

    for (const candidate of candidates) {
      const fullPath = path.join(tmpDir, candidate);
      try {
        await fs.access(fullPath);
        this.logger.debug(`Entry point resolved: ${candidate}`);
        return fullPath;
      } catch {
        this.logger.debug(`Entry point not found: ${candidate}`);
      }
    }

    throw new Error(
      `Could not find entry point. Tried: ${candidates.join(', ')}`,
    );
  }

  private async installShims(tmpDir: string, framework: string): Promise<void> {
    // Write a package.json so esbuild understands the project root
    const pkgJson = {
      name: 'published-app',
      version: '1.0.0',
      type: 'module',
    };
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify(pkgJson, null, 2),
    );
    // External dependencies will be loaded from CDN via importmap in HTML
  }


  private async generateIndexHtml(
    outDir: string,
    template: string,
    metafile?: esbuild.Metafile,
  ): Promise<string> {
    let html = template;

    // Add importmap for external dependencies to load from CDN
    const importmap = {
      imports: {
        react: 'https://esm.sh/react@18',
        'react-dom': 'https://esm.sh/react-dom@18',
        'react-dom/client': 'https://esm.sh/react-dom@18/client',
        'react/jsx-runtime': 'https://esm.sh/react@18/jsx-runtime',
        'lucide-react': 'https://esm.sh/lucide-react@0.263.1',
      },
    };
    const importmapScript = `<script type="importmap">${JSON.stringify(importmap)}</script>`;
    html = html.replace('</head>', `${importmapScript}</head>`);

    if (metafile) {
      const outputs = Object.entries(metafile.outputs);
      const mainJs = outputs.find(
        ([file, meta]) => file.endsWith('.js') && meta.entryPoint !== undefined,
      );
      const mainCss = outputs.find(([file]) => file.endsWith('.css'));

      if (mainJs) {
        // metafile paths are already relative to outDir, just normalize slashes for web
        const jsPath = mainJs[0].replace(/\\/g, '/');
        html = html.replace(/assets\/index\.js/g, `./${jsPath}`);
      }
      if (mainCss) {
        // metafile paths are already relative to outDir, just normalize slashes for web
        const cssPath = mainCss[0].replace(/\\/g, '/');
        html = html.replace(/assets\/index\.css/g, `./${cssPath}`);
      }
    }

    return html;
  }

  private async readOutputFiles(outDir: string): Promise<BundledFile[]> {
    const filePaths = await this.walkDirectory(outDir);
    const bundledFiles: BundledFile[] = [];

    for (const filePath of filePaths) {
      const relativePath = path.relative(outDir, filePath);
      const content = await fs.readFile(filePath);
      const contentType = mime.lookup(filePath) || 'application/octet-stream';

      bundledFiles.push({
        path: relativePath,
        content,
        contentType,
        size: content.length,
      });
    }

    return bundledFiles;
  }

  private async walkDirectory(dir: string): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...(await this.walkDirectory(full)));
      } else {
        files.push(full);
      }
    }

    return files;
  }

  private validateFilePath(filePath: string): string {
    if (!filePath || filePath.trim() === '') {
      throw new Error('File path must not be empty');
    }
    if (path.isAbsolute(filePath)) {
      throw new Error(`Absolute paths not allowed: "${filePath}"`);
    }
    const normalized = path.normalize(filePath);
    const parts = normalized.split(path.sep);
    for (const part of parts) {
      if (part === '..') {
        throw new Error(`Path traversal detected: "${filePath}"`);
      }
    }
    return normalized;
  }

  private async cleanup(tmpDir: string): Promise<void> {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch (err) {
      this.logger.warn(`Cleanup failed for ${tmpDir}: ${err.message}`);
    }
  }
}
