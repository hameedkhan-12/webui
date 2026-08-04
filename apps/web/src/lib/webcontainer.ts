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

const WEBCONTAINER_DEV_SCRIPT =
  "NEXT_PRIVATE_WORKERS=0 next dev --hostname 0.0.0.0 --port 3000";

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
    if (
      !pkg.scripts.dev?.includes("NEXT_PRIVATE_WORKERS") ||
      !pkg.scripts.dev?.includes("0.0.0.0")
    ) {
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
 
  var captureLog = function(level) {
    var original = console[level];
    return function() {
      var args = Array.prototype.slice.call(arguments);
      if (typeof original === 'function') { try { original.apply(console, args); } catch(err) {} }
      try {
        window.parent.postMessage({
          type: 'IFRAME_CONSOLE', level: level,
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
    if (typeof originalOnError === 'function') { try { originalOnError.apply(window, arguments); } catch(err) {} }
    try { window.parent.postMessage({ type: 'RUNTIME_ERROR', message: message + ' (' + lineno + ':' + colno + ')' }, '*'); } catch(e) {}
    return true;
  };
 
  var styleEl = document.createElement('style');
  styleEl.id = 'aura-inspector-styles';
  styleEl.innerHTML = [
    '.designer-hover { outline: 2px dashed rgba(168,85,247,0.7) !important; outline-offset: -2px !important; cursor: crosshair !important; }',
    '.designer-selected { outline: 2px solid #a855f7 !important; outline-offset: -2px !important; box-shadow: 0 0 0 4px rgba(168,85,247,0.15) !important; }',
    '.designer-hover-label { position:fixed; background:#a855f7; color:#fff; font:bold 10px/1 system-ui,sans-serif; padding:2px 5px; border-radius:3px; pointer-events:none; z-index:2147483647; white-space:nowrap; }',
    '.designer-breadcrumb { position:fixed; bottom:8px; left:8px; background:rgba(10,10,10,0.85); color:#a78bfa; font:10px/1.4 monospace; padding:4px 8px; border-radius:4px; pointer-events:none; z-index:2147483647; backdrop-filter:blur(6px); max-width:80%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }',
  ].join('\\n');
 
  var injectStyle = function() {
    if (document.head && !document.getElementById('aura-inspector-styles')) document.head.appendChild(styleEl);
  };
  if (document.head) { injectStyle(); }
  else { window.addEventListener('DOMContentLoaded', injectStyle); }
 
  try { window.parent.postMessage({ type: 'INSPECTOR_READY' }, '*'); } catch(e) {}
 
  var SKIP_TAGS = new Set(['HTML','HEAD','BODY','SCRIPT','STYLE','NOSCRIPT','SVG','PATH','DEFS','SYMBOL','G','USE']);
  var idCounter = 5000;
 
  // Runtime id: ALWAYS unique per actual DOM node, minted once via a
  // dedicated attribute separate from the static source data-id. Used for
  // selection/hover/highlight/position tracking only -- never for file
  // writes, since it has no meaning after the next hot-reload recreates
  // the DOM from scratch.
  function getRuntimeId(target) {
    var rtId = target.getAttribute('data-aura-rt');
    if (!rtId) {
      rtId = 'rt-' + (idCounter++) + '-' + Math.random().toString(36).substring(2,7);
      target.setAttribute('data-aura-rt', rtId);
    }
    return rtId;
  }
 
  // Source id: the static data-id/data-aura-id baked into JSX at build time
  // (by tagWithCounter). Shared across EVERY rendered instance of the same
  // JSX -- e.g. every card in a .map() has the same source id. Correct for
  // file mutations (editing "the template" should affect all instances),
  // but never for click targeting.
  function getSourceId(target) {
    return target.getAttribute('data-aura-id') || target.getAttribute('data-id') || null;
  }
 
  // Resolves ONLY by the unique runtime id -- never ambiguous, always
  // resolves to the exact DOM node that was actually interacted with.
  function findByRuntimeId(id) {
    return document.querySelector('[data-aura-rt="' + id + '"]');
  }
 
  function getComputedStyleSnapshot(el) {
    var cs = window.getComputedStyle(el);
    return {
      width: cs.width, height: cs.height,
      minWidth: cs.minWidth, maxWidth: cs.maxWidth,
      minHeight: cs.minHeight, maxHeight: cs.maxHeight,
      position: cs.position, top: cs.top, right: cs.right, bottom: cs.bottom, left: cs.left, zIndex: cs.zIndex,
      marginTop: cs.marginTop, marginRight: cs.marginRight, marginBottom: cs.marginBottom, marginLeft: cs.marginLeft,
      paddingTop: cs.paddingTop, paddingRight: cs.paddingRight, paddingBottom: cs.paddingBottom, paddingLeft: cs.paddingLeft,
      display: cs.display, flexDirection: cs.flexDirection, flexWrap: cs.flexWrap,
      justifyContent: cs.justifyContent, alignItems: cs.alignItems, gap: cs.gap,
      gridTemplateColumns: cs.gridTemplateColumns, gridTemplateRows: cs.gridTemplateRows,
      backgroundColor: cs.backgroundColor, backgroundImage: cs.backgroundImage,
      opacity: cs.opacity, borderWidth: cs.borderWidth, borderStyle: cs.borderStyle,
      borderColor: cs.borderColor, borderRadius: cs.borderRadius, boxShadow: cs.boxShadow,
      fontFamily: cs.fontFamily, fontSize: cs.fontSize, fontWeight: cs.fontWeight,
      fontStyle: cs.fontStyle, lineHeight: cs.lineHeight, letterSpacing: cs.letterSpacing,
      textAlign: cs.textAlign, color: cs.color, textDecoration: cs.textDecoration,
      transform: cs.transform, filter: cs.filter, backdropFilter: cs.backdropFilter,
      mixBlendMode: cs.mixBlendMode, overflow: cs.overflow, overflowX: cs.overflowX,
      overflowY: cs.overflowY, cursor: cs.cursor,
    };
  }
 
  function getAncestors(el) {
    var parts = [];
    var node = el;
    while (node && node !== document.body && parts.length < 5) {
      var tag = node.tagName ? node.tagName.toLowerCase() : '';
      if (tag && tag !== 'html') {
        var id = node.getAttribute('data-id') || node.getAttribute('data-aura-id') || node.id || '';
        parts.unshift(id ? tag + '#' + id : tag);
      }
      node = node.parentElement;
    }
    return parts.join(' › ');
  }
 
  var hoverLabel = null;
  var breadcrumb = null;
 
  function ensureHoverLabel() {
    if (!hoverLabel) {
      hoverLabel = document.createElement('div');
      hoverLabel.className = 'designer-hover-label';
      document.body.appendChild(hoverLabel);
    }
    if (!breadcrumb) {
      breadcrumb = document.createElement('div');
      breadcrumb.className = 'designer-breadcrumb';
      document.body.appendChild(breadcrumb);
    }
  }
 
  function showHoverLabel(el) {
    ensureHoverLabel();
    var rect = el.getBoundingClientRect();
    var w = Math.round(rect.width);
    var h = Math.round(rect.height);
    hoverLabel.textContent = w + ' × ' + h;
    hoverLabel.style.display = 'block';
    var top = rect.top - 20;
    if (top < 4) top = rect.bottom + 4;
    hoverLabel.style.top = top + 'px';
    hoverLabel.style.left = rect.left + 'px';
    breadcrumb.textContent = getAncestors(el);
    breadcrumb.style.display = 'block';
  }
 
  function hideHoverLabel() {
    if (hoverLabel) hoverLabel.style.display = 'none';
    if (breadcrumb) breadcrumb.style.display = 'none';
  }
 
  function buildDomTree(el, depth) {
    if (!el || !el.tagName) return null;
    var tag = el.tagName.toLowerCase();
    if (['script','style','head','noscript'].indexOf(tag) >= 0) return null;
    var id = el.getAttribute('data-id') || el.getAttribute('data-aura-id') || '';
    var cls = Array.prototype.slice.call(el.classList).filter(function(c) {
      return c !== 'designer-hover' && c !== 'designer-selected';
    });
    var children = [];
    if (depth < 10) {
      Array.prototype.forEach.call(el.children, function(child) {
        var node = buildDomTree(child, depth + 1);
        if (node) children.push(node);
      });
    }
    return { id: id, tag: tag, classes: cls, children: children, depth: depth };
  }
 
  window.addEventListener('message', function(e) {
    if (!e.data || typeof e.data !== 'object') return;
    var d = e.data;
 
    if (d.type === 'SET_DESIGN_MODE') {
      window.__designMode = !!d.enabled;
      if (!window.__designMode) {
        document.querySelectorAll('.designer-hover').forEach(function(x) { x.classList.remove('designer-hover'); });
        hideHoverLabel();
      }
    }
 
    if (d.type === 'INJECT_INSPECTOR') {
      if (typeof d.script === 'string') { try { (0, eval)(d.script); } catch(err) {} }
      try { window.parent.postMessage({ type: 'INSPECTOR_READY' }, '*'); } catch(e) {}
    }
 
    if (d.type === 'SELECT_ELEMENT') {
      document.querySelectorAll('.designer-selected').forEach(function(x) { x.classList.remove('designer-selected'); });
      if (d.id) {
        var el = findByRuntimeId(d.id);
        if (el) el.classList.add('designer-selected');
      }
    }
 
    if (d.type === 'HOVER_ELEMENT') {
      document.querySelectorAll('.designer-hover').forEach(function(x) { x.classList.remove('designer-hover'); });
      if (d.id) {
        var el = findByRuntimeId(d.id);
        if (el) { el.classList.add('designer-hover'); showHoverLabel(el); }
      } else { hideHoverLabel(); }
    }
 
    if (d.type === 'APPLY_STYLE') {
      if (d.id && d.property) {
        var el = findByRuntimeId(d.id);
        if (el) {
          var prop = d.property.replace(/-([a-z])/g, function(_, c) { return c.toUpperCase(); });
          el.style[prop] = d.value || '';
        }
      }
    }
 
    if (d.type === 'APPLY_CLASS') {
      if (d.id) {
        var el = findByRuntimeId(d.id);
        if (el) {
          (d.remove || []).forEach(function(c) { el.classList.remove(c); });
          (d.add || []).forEach(function(c) { el.classList.add(c); });
        }
      }
    }
 
    if (d.type === 'SET_TEXT') {
      if (d.id) {
        var el = findByRuntimeId(d.id);
        if (el && d.text !== undefined) el.innerText = d.text;
      }
    }
 
    if (d.type === 'GET_DOM_TREE') {
      var tree = buildDomTree(document.body, 0);
      try { window.parent.postMessage({ type: 'DOM_TREE_SNAPSHOT', tree: tree }, '*'); } catch(e) {}
    }
  });
 
  window.addEventListener('mouseover', function(e) {
    if (!window.__designMode) return;
    var target = e.target;
    if (!target || !target.tagName || SKIP_TAGS.has(target.tagName)) return;
    document.querySelectorAll('.designer-hover').forEach(function(x) {
      if (x !== target) x.classList.remove('designer-hover');
    });
    target.classList.add('designer-hover');
    showHoverLabel(target);
  }, true);
 
  window.addEventListener('mouseout', function(e) {
    if (!window.__designMode) return;
    if (e.target && e.target.classList) e.target.classList.remove('designer-hover');
    hideHoverLabel();
  }, true);
 
  window.addEventListener('click', function(e) {
    if (!window.__designMode) return;
    var target = e.target;
    if (!target || !target.tagName || SKIP_TAGS.has(target.tagName)) return;
 
    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
 
    document.querySelectorAll('.designer-selected, .designer-hover').forEach(function(x) {
      x.classList.remove('designer-selected', 'designer-hover');
    });
    target.classList.add('designer-selected');
    hideHoverLabel();
 
    var runtimeId = getRuntimeId(target);
    var sourceId = getSourceId(target);
    var classList = Array.prototype.slice.call(target.classList).filter(function(c) {
      return c !== 'designer-hover' && c !== 'designer-selected' && c !== 'designer-dragover';
    });
    var rect = target.getBoundingClientRect();
 
    try {
      window.parent.postMessage({
        type: 'ELEMENT_SELECTED',
        id: runtimeId,        // unique per DOM node -- selection/highlight/position tracking
        sourceId: sourceId,   // shared across .map() instances -- the actual file-mutation target
        tagName: target.tagName,
        text: (target.children && target.children.length === 0) ? (target.innerText || target.textContent || '').trim().slice(0, 200) : undefined,
        classes: classList,
        computedStyle: getComputedStyleSnapshot(target),
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      }, '*');
    } catch(err) {}
  }, true);
 
})();
`;

const INSPECTOR_SCRIPT_MARKER = "aura-inspector-script";

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
      `[injectInspector] No </body> found in ${path}; falling back to </html> insertion point.`,
    );
    return modified.replace(htmlCloseRegex, `${scriptTag}\n</html>`);
  }

  console.warn(
    `[injectInspector] Could not find an insertion point in ${path} — inspector will NOT be available for this preview.`,
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
