import { WebContainer } from "@webcontainer/api";
import { WorkspaceFiles } from "@repo/shared";

let webcontainerInstance: WebContainer | null = null;

/** Essential packages that must always be present in the container */
const REQUIRED_DEPS: Record<string, string> = {
  react: "18.2.0",
  "react-dom": "18.2.0",
  next: "15.4.1",
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

const WEBCONTAINER_DEV_SCRIPT = "next dev --hostname 0.0.0.0 --port 3000";

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
    // WebContainer must bind to 0.0.0.0 so the preview iframe can reach the dev server
    if (!pkg.scripts.dev?.includes("0.0.0.0")) {
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

  // Propagate console + errors to parent
  var captureLog = function(level) {
    var original = console[level];
    return function() {
      var args = Array.prototype.slice.call(arguments);
      if (typeof original === 'function') {
        try { original.apply(console, args); } catch(err) {}
      }
      window.parent.postMessage({
        type: 'IFRAME_CONSOLE',
        level: level,
        message: args.map(function(a) { return typeof a === 'object' ? JSON.stringify(a) : String(a); }).join(' ')
      }, '*');
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
    window.parent.postMessage({ type: 'RUNTIME_ERROR', message: message + ' (' + lineno + ':' + colno + ')' }, '*');
    return true;
  };

  if (window.__inspectorInjected) {
    console.log('[Inspector] Already injected in layout.tsx, sending ready signal');
    window.parent.postMessage({type:'INSPECTOR_READY'},'*');
    return;
  }
  window.__inspectorInjected = true;
  window.__designMode = false;
  console.log('[Inspector] Initializing inspector script from layout.tsx...');
  window.parent.postMessage({type:'INSPECTOR_READY'},'*');

  var idCounter = 1000;

  var style = document.createElement('style');
  style.innerHTML = [
    '.designer-hover { outline: 1.5px dashed rgba(168,85,247,0.6) !important; outline-offset: -1.5px !important; cursor: pointer !important; }',
    '.designer-selected { outline: 2px solid #a855f7 !important; outline-offset: -2px !important; }',
    '.designer-dragover { outline: 2.5px dashed #a855f7 !important; outline-offset: -2.5px !important; background-color: rgba(168,85,247,0.15) !important; }'
  ].join('\\n');
  document.head.appendChild(style);

  // Floating Debug Overlay Widget
  var debugWidget = document.createElement('div');
  debugWidget.id = 'aura-inspector-debug-widget';
  debugWidget.style.cssText = 'position: fixed; bottom: 8px; right: 8px; background: rgba(15, 23, 42, 0.95); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); padding: 6px 10px; font-family: monospace; font-size: 10px; border-radius: 6px; z-index: 999999; pointer-events: none; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); line-height: 1.4;';
  
  var attachWidget = function() {
    if (document.body && !document.getElementById('aura-inspector-debug-widget')) {
      document.body.appendChild(debugWidget);
    }
  };
  if (document.body) { attachWidget(); } else { window.addEventListener('DOMContentLoaded', attachWidget); }

  var updateDebugWidget = function(msg) {
    var wiredCount = document.querySelectorAll('[data-inspector-wired]').length;
    debugWidget.innerHTML = [
      '<div><strong>AURA INSPECTOR ACTIVE</strong></div>',
      '<div>Design Mode: <span style="color: ' + (window.__designMode ? '#4ade80' : '#f87171') + '">' + window.__designMode + '</span></div>',
      '<div>Wired Elements: ' + wiredCount + '</div>',
      msg ? '<div style="color: #e2e8f0; border-top: 1px solid rgba(255,255,255,0.1); margin-top: 4px; padding-top: 4px;">Last Msg: ' + msg + '</div>' : ''
    ].join('');
  };
  updateDebugWidget('Initialized');

  // Accept commands from parent
  window.addEventListener('message', function(e) {
    if (!e.data) return;
    if (e.data.type === 'SET_DESIGN_MODE') {
      console.log('[Inspector] Received SET_DESIGN_MODE from parent:', e.data.enabled);
      window.__designMode = !!e.data.enabled;
      updateDebugWidget('SET_DESIGN_MODE: ' + e.data.enabled);
    }
    // Allow parent to inject inspector at runtime (for apps running before inspector was installed)
    if (e.data.type === 'INJECT_INSPECTOR' && typeof e.data.script === 'string') {
      console.log('[Inspector] Received INJECT_INSPECTOR request');
      updateDebugWidget('INJECT_INSPECTOR');
      try { (0, eval)(e.data.script); } catch(err) { console.error('[Inspector] Failed to eval runtime script:', err); }
    }
    if (e.data.type === 'SELECT_ELEMENT') {
      document.querySelectorAll('.designer-selected').forEach(function(x) {
        x.classList.remove('designer-selected');
      });
      if (e.data.id) {
        var el = document.querySelector('[data-id="' + e.data.id + '"]');
        if (el) {
          el.classList.add('designer-selected');
          el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          updateDebugWidget('SELECT_ELEMENT: ' + e.data.id);
        }
      }
    }
  });

  function getInspectableElements() {
    // Skip tiny/invisible elements and structural wrappers
    var SKIP_TAGS = new Set(['HTML','HEAD','BODY','SCRIPT','STYLE','NOSCRIPT','SVG','PATH','DEFS','SYMBOL','G','USE']);
    var all = document.body ? Array.prototype.slice.call(document.body.querySelectorAll('*')) : [];
    return all.filter(function(el) {
      if (SKIP_TAGS.has(el.tagName)) return false;
      var rect = el.getBoundingClientRect();
      return rect.width > 4 && rect.height > 4;
    });
  }

  function wireElement(el) {
    if (el.dataset.inspectorWired) return;
    el.dataset.inspectorWired = 'true';

    // Auto-assign an ID if none exists
    if (!el.dataset.id && !el.getAttribute('data-id')) {
      el.setAttribute('data-id', 'rt-' + (idCounter++));
    }
    var elId = el.getAttribute('data-id') || el.dataset.id;

    el.setAttribute('draggable', 'true');

    el.addEventListener('mouseenter', function(e) {
      if (!window.__designMode) return;
      e.stopPropagation();
      el.classList.add('designer-hover');
    });
    el.addEventListener('mouseleave', function(e) {
      e.stopPropagation();
      el.classList.remove('designer-hover');
    });
    el.addEventListener('dragstart', function(e) {
      if (!window.__designMode) return;
      e.stopPropagation();
      e.dataTransfer.setData('text/plain', 'element-id:' + elId);
      el.classList.add('opacity-40');
    });
    el.addEventListener('dragend', function(e) {
      e.stopPropagation();
      el.classList.remove('opacity-40');
    });
    el.addEventListener('dragover', function(e) {
      if (!window.__designMode) return;
      e.preventDefault();
      e.stopPropagation();
      el.classList.add('designer-dragover');
    });
    el.addEventListener('dragenter', function(e) {
      if (!window.__designMode) return;
      e.preventDefault();
      e.stopPropagation();
      el.classList.add('designer-dragover');
    });
    el.addEventListener('dragleave', function(e) {
      e.stopPropagation();
      el.classList.remove('designer-dragover');
    });
    el.addEventListener('drop', function(e) {
      if (!window.__designMode) return;
      e.preventDefault();
      e.stopPropagation();
      el.classList.remove('designer-dragover');
      var data = e.dataTransfer.getData('text/plain');
      if (data) {
        window.parent.postMessage({ type: 'COMPONENT_DROPPED', targetId: elId, data: data }, '*');
      }
    });
    el.addEventListener('click', function(e) {
      if (!window.__designMode) return;
      e.preventDefault();
      e.stopPropagation();
      document.querySelectorAll('.designer-selected').forEach(function(x) {
        x.classList.remove('designer-selected');
      });
      el.classList.add('designer-selected');
      window.parent.postMessage({
        type: 'ELEMENT_SELECTED',
        id: elId,
        tagName: el.tagName,
        text: (el.innerText || '').slice(0, 200),
        classes: Array.prototype.filter.call(el.classList, function(c) {
          return c !== 'designer-hover' && c !== 'designer-selected' && c !== 'designer-dragover' && c !== 'opacity-40';
        })
      }, '*');
    });
  }

  // Poll and wire new elements every 800ms (covers React re-renders)
  setInterval(function() {
    attachWidget();
    getInspectableElements().forEach(wireElement);
    updateDebugWidget();
  }, 800);
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

/**
 * Finds the end index (exclusive) of a leading 'use client' / "use client"
 * directive, tolerating leading whitespace, a UTF-8 BOM, and leading
 * // or /* comments (all legal before a directive prologue, and common in
 * AI-generated files). Returns 0 if no directive is present.
 */
function findUseClientDirectiveEnd(content: string): number {
  let i = 0;
  const len = content.length;

  // Skip BOM
  if (content.charCodeAt(0) === 0xfeff) i = 1;

  for (; ;) {
    // Skip whitespace/newlines
    while (i < len && /\s/.test(content[i]!)) i++;

    if (content.startsWith("//", i)) {
      const nl = content.indexOf("\n", i);
      i = nl === -1 ? len : nl + 1;
      continue;
    }
    if (content.startsWith("/*", i)) {
      const end = content.indexOf("*/", i + 2);
      i = end === -1 ? len : end + 2;
      continue;
    }
    break;
  }

  const rest = content.slice(i);
  const match = rest.match(/^(['"])use client\1;?/);
  return match ? i + match[0].length : 0;
}

function injectInspector(path: string, content: string): string {
  if (!isRootLayoutPath(path)) {
    return content;
  }

  // Idempotency guard: never re-splice if this exact content already
  // carries the marker (e.g. redundant writes of unchanged files).
  if (content.includes(INSPECTOR_SCRIPT_MARKER)) {
    return content;
  }

  let modified = content;
  if (!modified.includes("import Script from 'next/script'")) {
    const insertIndex = findUseClientDirectiveEnd(modified);
    modified =
      modified.slice(0, insertIndex) +
      (insertIndex > 0 ? `\nimport Script from 'next/script';\n` : `import Script from 'next/script';\n`) +
      modified.slice(insertIndex);
  }

  const scriptTag = `<Script id="${INSPECTOR_SCRIPT_MARKER}" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: ${JSON.stringify(INSPECTOR_SCRIPT)} }} />`;

  const bodyCloseRegex = /<\/body>/i;
  if (bodyCloseRegex.test(modified)) {
    return modified.replace(bodyCloseRegex, `\n${scriptTag}\n</body>`);
  }

  // Fallback: no literal </body> (e.g. custom <Body>/provider wrapper).
  // Insert right before </html> so the script still ships instead of
  // silently doing nothing.
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
    // Skip internal IDE files
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
  // Skip internal IDE files
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