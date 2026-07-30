import { WebContainer } from "@webcontainer/api";
import { WorkspaceFiles } from "@repo/shared";

let webcontainerInstance: WebContainer | null = null;

/** Essential packages that must always be present in the container */
const REQUIRED_DEPS: Record<string, string> = {
  react: "18.2.0",
  "react-dom": "18.2.0",
  next: "14.2.5",
  "lucide-react": "^0.468.0",
  recharts: "^2.15.0",
  "framer-motion": "^11.15.0",
  clsx: "^2.1.1",
  "tailwind-merge": "^2.5.5",
  "class-variance-authority": "^0.7.1",
  "date-fns": "^4.1.0",
};

const REQUIRED_DEV_DEPS: Record<string, string> = {
  "@types/node": "20.11.5",
  "@types/react": "18.2.65",
  "@types/react-dom": "18.2.0",
  autoprefixer: "^10.4.20",
  postcss: "^8.4.49",
  tailwindcss: "3.4.4",
  typescript: "5.3.3",
};

const WEBCONTAINER_DEV_SCRIPT = "NEXT_PRIVATE_WORKERS=0 next dev --hostname 0.0.0.0 --port 3000";

/** Merges required deps into the package.json content string.
 * Spread order: user packages first, then REQUIRED_DEPS — so our pinned
 * versions ALWAYS override whatever the AI or the user stored.
 */
function mergePackageJson(content: string): string {
  try {
    const pkg = JSON.parse(content);
    // User deps first, our pins last → our pins always win
    pkg.dependencies = { ...(pkg.dependencies ?? {}), ...REQUIRED_DEPS };
    pkg.devDependencies = {
      ...(pkg.devDependencies ?? {}),
      ...REQUIRED_DEV_DEPS,
    };
    pkg.scripts = pkg.scripts ?? {};
    // Disable worker thread spawning and bind to 0.0.0.0
    if (!pkg.scripts.dev?.includes("NEXT_PRIVATE_WORKERS") || !pkg.scripts.dev?.includes("0.0.0.0")) {
      pkg.scripts.dev = WEBCONTAINER_DEV_SCRIPT;
    }
    return JSON.stringify(pkg, null, 2);
  } catch {
    return content;
  }
}

export async function getWebContainer(): Promise<WebContainer> {
  if (typeof window === "undefined") {
    throw new Error("WebContainer can only be initialized in the browser.");
  }
  if (!webcontainerInstance) {
    webcontainerInstance = await WebContainer.boot({
      // credentialless allows SharedArrayBuffer without requiring CORP headers
      // on every sub-resource — matches how bolt.new and bolt.diy boot.
      coep: "credentialless",
      workdirName: "project",
      forwardPreviewErrors: true,
    });
  }
  return webcontainerInstance;
}

const INSPECTOR_SCRIPT = `
(function() {
  if (typeof window === 'undefined') return;

  if (window.__auraInspectorLoaded) {
    try { window.parent.postMessage({ type: 'INSPECTOR_READY' }, '*'); } catch(e) {}
    return;
  }
  window.__auraInspectorLoaded = true;
  window.__designMode = true;

  // Log & Error interception
  var captureLog = function(level) {
    var original = console[level];
    return function() {
      var args = Array.prototype.slice.call(arguments);
      if (typeof original === 'function') {
        try { original.apply(console, args); } catch(err) {}
      }
      try {
        window.parent.postMessage({
          type: 'IFRAME_CONSOLE',
          level: level,
          message: args.map(function(a) { return typeof a === 'object' ? JSON.stringify(a) : String(a); }).join(' ')
        }, '*');
      } catch(e) {}
    };
  };
  console.log   = captureLog('log');
  console.error = captureLog('error');
  console.warn  = captureLog('warn');

  var originalOnError = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    if (typeof originalOnError === 'function') {
      try { originalOnError.apply(window, arguments); } catch(err) {}
    }
    try {
      window.parent.postMessage({ type: 'RUNTIME_ERROR', message: message + ' (' + lineno + ':' + colno + ')' }, '*');
    } catch(e) {}
    return true;
  };

  // Inject inspector styles
  var style = document.createElement('style');
  style.id = 'aura-inspector-styles';
  style.innerHTML = [
    '.designer-hover { outline: 2px dashed #a855f7 !important; outline-offset: -2px !important; cursor: pointer !important; }',
    '.designer-selected { outline: 2px solid #a855f7 !important; outline-offset: -2px !important; box-shadow: 0 0 0 2px rgba(168,85,247,0.3) !important; }'
  ].join('\\n');
  
  var injectStyle = function() {
    if (document.head && !document.getElementById('aura-inspector-styles')) {
      document.head.appendChild(style);
    }
  };
  if (document.head) { injectStyle(); }
  else { window.addEventListener('DOMContentLoaded', injectStyle); }

  // Ack ready to parent
  try { window.parent.postMessage({ type: 'INSPECTOR_READY' }, '*'); } catch(e) {}

  // Parent message handling
  window.addEventListener('message', function(e) {
    if (!e.data || typeof e.data !== 'object') return;
    if (e.data.type === 'SET_DESIGN_MODE') {
      window.__designMode = !!e.data.enabled;
      if (!window.__designMode) {
        document.querySelectorAll('.designer-hover').forEach(function(x) { x.classList.remove('designer-hover'); });
      }
    }
    if (e.data.type === 'INJECT_INSPECTOR') {
      if (typeof e.data.script === 'string') {
        try { (0, eval)(e.data.script); } catch(err) {}
      }
      try { window.parent.postMessage({ type: 'INSPECTOR_READY' }, '*'); } catch(err) {}
    }
    if (e.data.type === 'SELECT_ELEMENT') {
      document.querySelectorAll('.designer-selected').forEach(function(x) { x.classList.remove('designer-selected'); });
      if (e.data.id) {
        var el = document.querySelector('[data-aura-id="' + e.data.id + '"]') || document.querySelector('[data-id="' + e.data.id + '"]');
        if (el) {
          el.classList.add('designer-selected');
        }
      }
    }
  });

  // Delegated event handling (Onlook style)
  var SKIP_TAGS = new Set(['HTML', 'HEAD', 'BODY', 'SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'PATH', 'DEFS', 'SYMBOL', 'G', 'USE']);
  var idCounter = 1000;

  function getCleanId(target) {
    var id = target.getAttribute('data-aura-id') || target.getAttribute('data-id');
    if (!id) {
      id = 'el-' + (idCounter++) + '-' + Math.random().toString(36).substring(2, 7);
      target.setAttribute('data-aura-id', id);
      target.setAttribute('data-id', id);
    }
    return id;
  }

  // Hover in design mode
  window.addEventListener('mouseover', function(e) {
    if (!window.__designMode) return;
    var target = e.target;
    if (!target || !target.tagName || SKIP_TAGS.has(target.tagName)) return;
    document.querySelectorAll('.designer-hover').forEach(function(x) {
      if (x !== target) x.classList.remove('designer-hover');
    });
    target.classList.add('designer-hover');
  }, true);

  window.addEventListener('mouseout', function(e) {
    if (!window.__designMode) return;
    if (e.target && e.target.classList) {
      e.target.classList.remove('designer-hover');
    }
  }, true);

  // Click selection in design mode
  window.addEventListener('click', function(e) {
    if (!window.__designMode) return;
    var target = e.target;
    if (!target || !target.tagName || SKIP_TAGS.has(target.tagName)) return;

    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === 'function') {
      e.stopImmediatePropagation();
    }

    document.querySelectorAll('.designer-selected, .designer-hover').forEach(function(x) {
      x.classList.remove('designer-selected', 'designer-hover');
    });
    target.classList.add('designer-selected');

    var id = getCleanId(target);
    var classList = Array.prototype.slice.call(target.classList).filter(function(c) {
      return c !== 'designer-hover' && c !== 'designer-selected' && c !== 'designer-dragover';
    });

    try {
      window.parent.postMessage({
        type: 'ELEMENT_SELECTED',
        id: id,
        tagName: target.tagName,
        text: (target.innerText || target.textContent || '').trim().slice(0, 200),
        classes: classList
      }, '*');
    } catch(err) {}
  }, true);

})();
`;

const INSPECTOR_SCRIPT_MARKER = 'aura-inspector-script';

/**
 * Only the ROOT layout qualifies for beforeInteractive injection.
 * Next.js explicitly restricts `strategy="beforeInteractive"` to the root
 * layout; injecting into nested route layouts (app/dashboard/layout.tsx)
 * produces duplicate script ids / undefined behavior.
 */
function isRootLayoutPath(path: string): boolean {
  const normalized = path.replace(/\\/g, "/").replace(/^\/+/, "");
  return (
    normalized === "src/app/layout.tsx" ||
    normalized === "src/app/layout.jsx" ||
    normalized === "src/app/layout.js" ||
    normalized === "app/layout.tsx" ||
    normalized === "app/layout.jsx" ||
    normalized === "app/layout.js"
  );
}

function injectInspector(path: string, content: string): string {
  if (!isRootLayoutPath(path)) {
    return content;
  }

  if (content.includes(INSPECTOR_SCRIPT_MARKER)) {
    return content;
  }

  const escapedScript = INSPECTOR_SCRIPT.replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\${/g, "\\${");

  const scriptTag = `<script id="${INSPECTOR_SCRIPT_MARKER}" dangerouslySetInnerHTML={{ __html: \`${escapedScript}\` }} />`;

  const modified = content;
  const bodyCloseRegex = /<\/body>/i;
  if (bodyCloseRegex.test(modified)) {
    return modified.replace(bodyCloseRegex, `\n${scriptTag}\n</body>`);
  }

  const htmlCloseRegex = /<\/html>/i;
  if (htmlCloseRegex.test(modified)) {
    console.warn(
      `[injectInspector] No </body> found in ${path}; falling back to </html> insertion point.`
    );
    return modified.replace(htmlCloseRegex, `${scriptTag}\n</html>`);
  }

  console.warn(
    `[injectInspector] Could not find an insertion point in ${path} — inspector will NOT be available for this preview.`
  );
  return content;
}

/**
 * Converts a flat WorkspaceFiles dict to the nested tree required by WebContainer.fs.mount.
 * Also merges required dependencies into package.json so lucide-react etc. are always present.
 */
export function filesToWebContainerTree(
  files: WorkspaceFiles,
): Record<string, any> {
  const tree: Record<string, any> = {};

  for (const [path, file] of Object.entries(files)) {
    if (path === "chat-sessions.json" || path === "chat-history.json") continue;

    const parts = path.split("/");
    let current = tree;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;

      if (isLast) {
        let content = file.content;
        if (path === "package.json") {
          content = mergePackageJson(content);
        } else {
          content = injectInspector(path, content);
        }
        current[part] = { file: { contents: content } };
      } else {
        if (!current[part]) {
          current[part] = { directory: {} };
        }
        current = current[part].directory;
      }
    }
  }

  return tree;
}

export async function writeWebContainerFile(
  webcontainer: WebContainer,
  path: string,
  content: string,
): Promise<void> {
  if (path === "chat-sessions.json" || path === "chat-history.json") return;

  const parts = path.split("/");
  if (parts.length > 1) {
    let dirPath = "";
    for (let i = 0; i < parts.length - 1; i++) {
      dirPath = dirPath ? `${dirPath}/${parts[i]}` : parts[i];
      try {
        await webcontainer.fs.mkdir(dirPath, { recursive: true });
      } catch (e) {
        // Directory might already exist
      }
    }
  }

  let finalContent = content;
  if (path === "package.json") {
    finalContent = mergePackageJson(content);
  } else {
    finalContent = injectInspector(path, content);
  }
  await webcontainer.fs.writeFile(path, finalContent);
}

export async function deleteWebContainerPath(
  webcontainer: WebContainer,
  path: string,
): Promise<void> {
  try {
    await webcontainer.fs.rm(path, { recursive: true });
  } catch (e) {
    // Path might not exist
  }
}