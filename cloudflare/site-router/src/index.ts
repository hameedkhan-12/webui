
// export interface Env {
//   SITES_BUCKET: R2Bucket;            
//     BASE_DOMAIN: string;               
//   ENVIRONMENT: string;              
// }

// const STATIC_ASSET_EXTENSIONS = new Set([
//   'js', 'css', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg',
//   'ico', 'woff', 'woff2', 'ttf', 'eot', 'otf',
//   'json', 'xml', 'txt', 'pdf', 'zip',
//   'mp4', 'webm', 'ogg', 'mp3', 'wav',
//   'map',  
// ]);

// const SECURITY_HEADERS: Record<string, string> = {
//   'X-Frame-Options': 'SAMEORIGIN',
//   'X-Content-Type-Options': 'nosniff',
//   'Referrer-Policy': 'strict-origin-when-cross-origin',
//   'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
//   'X-XSS-Protection': '1; mode=block',
// };

// export default {
//   async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
//     try {
//       return await handleRequest(request, env, ctx);
//     } catch (err) {
//       console.error('Worker error:', err);
//       return errorResponse(500, 'Internal server error');
//     }
//   },
// };

// async function handleRequest(
//   request: Request,
//   env: Env,
//   ctx: ExecutionContext,
// ): Promise<Response> {
//   const url = new URL(request.url);
//   const hostname = url.hostname;

//   const slug = extractSlug(hostname, env.BASE_DOMAIN);
//   if (!slug) {
//     return errorResponse(400, 'Invalid hostname');
//   }

//   const pathname = url.pathname;
//   const extension = getExtension(pathname);
//   const isStaticAsset = extension && STATIC_ASSET_EXTENSIONS.has(extension);

//   const r2Key = isStaticAsset
//     ? `sites/${slug}${pathname}`
//     : `sites/${slug}/index.html`;

//   const object = await env.SITES_BUCKET.get(r2Key, {
//     onlyIf: buildConditionalHeaders(request),
//   });

//   if (object === null) {
//     if (isStaticAsset) {
//       return notFoundResponse(slug);
//     }

//     return unpublishedResponse(slug);
//   }

//   if (!(object instanceof R2ObjectBody)) {
//     return new Response(null, { status: 304 });
//   }

//   // ── 6. Build response ─────────────────────────────────────────────────────
//   const contentType = object.httpMetadata?.contentType ?? inferContentType(r2Key);
//   const cacheControl = object.httpMetadata?.cacheControl ?? getCacheControl(r2Key);

//   const headers = new Headers({
//     'Content-Type': contentType,
//     'Cache-Control': cacheControl,
//     'ETag': object.httpEtag,
//     'Last-Modified': object.uploaded.toUTCString(),
//     ...SECURITY_HEADERS,
//   });

//   // Add CORS for font/API assets
//   if (contentType.startsWith('font/') || contentType === 'application/json') {
//     headers.set('Access-Control-Allow-Origin', '*');
//   }

//   return new Response(object.body, {
//     status: 200,
//     headers,
//   });
// }

// // ── Helpers ──────────────────────────────────────────────────────────────────

// function extractSlug(hostname: string, baseDomain: string): string | null {
//   // hostname: my-project-abc1.yourdomain.com
//   // baseDomain: yourdomain.com
//   if (!hostname.endsWith(`.${baseDomain}`)) return null;
//   const slug = hostname.slice(0, -(baseDomain.length + 1));
//   // Validate: DNS label characters only
//   if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug)) return null;
//   return slug;
// }

// function getExtension(pathname: string): string | null {
//   const lastSegment = pathname.split('/').pop() ?? '';
//   const dotIndex = lastSegment.lastIndexOf('.');
//   if (dotIndex === -1) return null;
//   return lastSegment.slice(dotIndex + 1).toLowerCase();
// }

// function buildConditionalHeaders(request: Request): R2GetOptions['onlyIf'] {
//   const ifNoneMatch = request.headers.get('if-none-match');
//   const ifModifiedSince = request.headers.get('if-modified-since');

//   if (ifNoneMatch) return { etagDoesNotMatch: ifNoneMatch };
//   if (ifModifiedSince) return { uploadedAfter: new Date(ifModifiedSince) };
//   return undefined;
// }

// function getCacheControl(r2Key: string): string {
//   const fileName = r2Key.split('/').pop() ?? '';

//   if (fileName === 'index.html') {
//     return 'public, max-age=0, must-revalidate';
//   }
//   // Hashed assets
//   if (/[\.\-][a-f0-9]{6,}[\.\-](js|css|woff2?|ttf)$/.test(fileName)) {
//     return 'public, max-age=31536000, immutable';
//   }
//   if (fileName.endsWith('.js') || fileName.endsWith('.css')) {
//     return 'public, max-age=3600';
//   }
//   const ext = getExtension(r2Key);
//   if (ext && ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico'].includes(ext)) {
//     return 'public, max-age=86400';
//   }
//   return 'public, max-age=3600';
// }

// function inferContentType(key: string): string {
//   const ext = getExtension(key);
//   const map: Record<string, string> = {
//     html: 'text/html; charset=utf-8',
//     js: 'application/javascript',
//     mjs: 'application/javascript',
//     css: 'text/css',
//     json: 'application/json',
//     png: 'image/png',
//     jpg: 'image/jpeg',
//     jpeg: 'image/jpeg',
//     gif: 'image/gif',
//     svg: 'image/svg+xml',
//     webp: 'image/webp',
//     ico: 'image/x-icon',
//     woff: 'font/woff',
//     woff2: 'font/woff2',
//     ttf: 'font/ttf',
//     txt: 'text/plain',
//     xml: 'application/xml',
//     pdf: 'application/pdf',
//   };
//   return map[ext ?? ''] ?? 'application/octet-stream';
// }

// function errorResponse(status: number, message: string): Response {
//   return new Response(
//     JSON.stringify({ error: message }),
//     {
//       status,
//       headers: { 'Content-Type': 'application/json', ...SECURITY_HEADERS },
//     },
//   );
// }

// function notFoundResponse(slug: string): Response {
//   const html = `<!DOCTYPE html>
// <html lang="en">
// <head>
//   <meta charset="UTF-8" />
//   <meta name="viewport" content="width=device-width, initial-scale=1.0" />
//   <title>404 – Not Found</title>
//   <style>
//     body { font-family: system-ui, sans-serif; display: flex; align-items: center;
//            justify-content: center; min-height: 100vh; margin: 0; background: #f8fafc; color: #1e293b; }
//     .container { text-align: center; }
//     h1 { font-size: 4rem; font-weight: 800; margin: 0; color: #0f172a; }
//     p  { color: #64748b; font-size: 1.1rem; margin: 1rem 0 2rem; }
//     a  { color: #3b82f6; text-decoration: none; font-weight: 500; }
//     a:hover { text-decoration: underline; }
//   </style>
// </head>
// <body>
//   <div class="container">
//     <h1>404</h1>
//     <p>The page you're looking for doesn't exist.</p>
//   </div>
// </body>
// </html>`;

//   return new Response(html, {
//     status: 404,
//     headers: { 'Content-Type': 'text/html; charset=utf-8', ...SECURITY_HEADERS },
//   });
// }

// function unpublishedResponse(slug: string): Response {
//   const html = `<!DOCTYPE html>
// <html lang="en">
// <head>
//   <meta charset="UTF-8" />
//   <meta name="viewport" content="width=device-width, initial-scale=1.0" />
//   <title>Site Not Published</title>
//   <style>
//     body { font-family: system-ui, sans-serif; display: flex; align-items: center;
//            justify-content: center; min-height: 100vh; margin: 0; background: #f8fafc; color: #1e293b; }
//     .container { text-align: center; max-width: 480px; padding: 2rem; }
//     .badge { background: #fef3c7; color: #92400e; font-size: 0.75rem; font-weight: 600;
//              padding: 0.25rem 0.75rem; border-radius: 9999px; display: inline-block; margin-bottom: 1.5rem; }
//     h1 { font-size: 1.75rem; font-weight: 700; margin: 0 0 0.75rem; }
//     p  { color: #64748b; }
//   </style>
// </head>
// <body>
//   <div class="container">
//     <div class="badge">⚠ Not Published</div>
//     <h1>This site isn't published yet</h1>
//     <p>The project at <strong>${slug}</strong> exists but hasn't been published. Return to the editor and click "Publish".</p>
//   </div>
// </body>
// </html>`;

//   return new Response(html, {
//     status: 404,
//     headers: { 'Content-Type': 'text/html; charset=utf-8', ...SECURITY_HEADERS },
//   });
// }