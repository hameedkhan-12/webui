"use client";

import React from "react";
import {
  Play,
  Laptop,
  Tablet,
  Smartphone,
  RotateCw,
  AlertTriangle,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { WorkspaceFiles, SelectedElement } from "@repo/shared";
import {
  APP_ENTRY,
  DEV_SERVER_URL,
  getAppSource,
  getStylesSource,
} from "../lib/defaultProject";

interface LivePreviewProps {
  files: WorkspaceFiles;
  onSelectElement: (element: SelectedElement | null) => void;
  selectedElement: SelectedElement | null;
  designMode: boolean;
  onAddConsoleLine: (
    line: string,
    type: "info" | "success" | "warning" | "error",
  ) => void;
  devServerActive: boolean;
  onStartDevServer: () => void;
  onDropComponent?: (targetId: string, dragData: string) => void;
  onDeleteElement?: (elementId: string) => void;
  onRuntimeError?: (message: string) => void;
  onFixError?: () => void;
  webcontainerUrl?: string;
  webcontainerStatus?: "idle" | "booting" | "ready" | "error";
}

export const LivePreview: React.FC<LivePreviewProps> = ({
  files,
  onSelectElement,
  selectedElement,
  designMode,
  onAddConsoleLine,
  devServerActive,
  onStartDevServer,
  onDropComponent,
  onDeleteElement,
  onRuntimeError,
  onFixError,
  webcontainerUrl,
  webcontainerStatus = "idle",
}) => {
  const isWebContainerMode = webcontainerStatus !== "error";
  const previewUrl = webcontainerUrl?.trim() ?? "";
  const useWebContainerPreview = isWebContainerMode && previewUrl.length > 0;

  const isBootingPreview =
    isWebContainerMode &&
    (webcontainerStatus === "booting" ||
      (webcontainerStatus === "ready" && !useWebContainerPreview));

  const showStartScreen =
    isWebContainerMode && !devServerActive && !isBootingPreview;
  const [deviceSize, setDeviceSize] = React.useState<
    "desktop" | "tablet" | "mobile"
  >("desktop");
  const [compileError, setCompileError] = React.useState<string | null>(null);
  const [iframeKey, setIframeKey] = React.useState<number>(0);
  const iframeRef = React.useRef<HTMLIFrameElement>(null);

  const [urlPath, setUrlPath] = React.useState("/");
  const [inputValue, setInputValue] = React.useState("/");

  const baseUrl = useWebContainerPreview
    ? previewUrl
    : devServerActive
      ? DEV_SERVER_URL
      : "";

  const currentUrl = React.useMemo(() => {
    if (!baseUrl) return "";
    return baseUrl + (urlPath === "/" ? "" : urlPath);
  }, [baseUrl, urlPath]);

  const iframeSrc = React.useMemo(() => {
    if (!useWebContainerPreview) return undefined;
    return previewUrl + (urlPath === "/" ? "" : urlPath);
  }, [useWebContainerPreview, previewUrl, urlPath]);

  React.useEffect(() => {
    if (baseUrl) {
      setInputValue(baseUrl + (urlPath === "/" ? "" : urlPath));
    } else {
      setInputValue(
        isBootingPreview ? "Starting preview..." : "preview offline",
      );
    }
  }, [baseUrl, urlPath, isBootingPreview]);

  const handleUrlKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      try {
        let path = inputValue;
        if (baseUrl && path.startsWith(baseUrl)) {
          path = path.slice(baseUrl.length);
        }
        if (!path.startsWith("/")) {
          path = "/" + path;
        }
        setUrlPath(path);
        e.currentTarget.blur();
      } catch (err) {
        // ignore
      }
    }
  };

  const handleOpenExternal = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentUrl) {
      window.open(currentUrl, "_blank", "noopener,noreferrer");
    }
  };

  // Debounce files updates by 800ms to avoid compiling/reloading on every keystroke
  const [debouncedFiles, setDebouncedFiles] = React.useState(files);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFiles(files);
    }, 800);
    return () => clearTimeout(timer);
  }, [files]);

  // Clear compile error when files change
  React.useEffect(() => {
    setCompileError(null);
  }, [files]);

  // In non-WebContainer mode, reload/re-render the iframe when files stop changing (debounced)
  React.useEffect(() => {
    if (!isWebContainerMode) {
      setIframeKey((k) => k + 1);
    }
  }, [debouncedFiles, isWebContainerMode, designMode, selectedElement?.id]);

  const [inspectorReady, setInspectorReady] = React.useState(false);
  const inspectorReadyRef = React.useRef(false);

  React.useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      const data = e.data;
      if (!data || typeof data !== "object") return;

      if (data.type === 'AURA_REGISTER_GENERATED_COMPONENT') {
        try {
          const iframe = iframeRef.current;
          if (iframe?.contentWindow) {
            iframe.contentWindow.postMessage({ type: 'REGISTER_GENERATED_COMPONENT', meta: data.meta, path: data.path }, '*');
            onAddConsoleLine(`Registered generated component ${data.meta?.name ?? data.path}`, 'info');
          }
        } catch (err) {
          // ignore
        }
        return;
      }

      if (data.type === "INSPECTOR_READY") {
        console.log('[LivePreview] Received INSPECTOR_READY from iframe');
        inspectorReadyRef.current = true;
        setInspectorReady(true);
        return;
      }

      if (data.type === "ELEMENT_SELECTED") {
        onSelectElement({
          id: data.id,
          tagName: data.tagName,
          text: data.text,
          classes: data.classes,
          filePath: APP_ENTRY,
        });
        onAddConsoleLine(`Selected <${data.tagName.toLowerCase()}>`, "info");
      } else if (data.type === "COMPONENT_DROPPED") {
        onDropComponent?.(data.targetId, data.data);
      } else if (data.type === "ELEMENT_MUTATION" && data.action === "delete") {
        onDeleteElement?.(data.id);
      } else if (data.type === "IFRAME_CONSOLE") {
        const consoleType =
          data.level === "error"
            ? "error"
            : data.level === "warn"
              ? "warning"
              : "info";
        onAddConsoleLine(`[preview] ${data.message}`, consoleType);
      } else if (data.type === "RUNTIME_ERROR") {
        setCompileError(data.message);
        onAddConsoleLine(`[preview] ${data.message}`, "error");
        onRuntimeError?.(data.message);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [
    onSelectElement,
    onAddConsoleLine,
    onDropComponent,
    onDeleteElement,
    onRuntimeError,
  ]);

  // Inject inspector script directly into the live iframe when design mode activates.
  const RUNTIME_INSPECTOR = React.useMemo(() => `
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

  try { window.parent.postMessage({ type: 'INSPECTOR_READY' }, '*'); } catch(e) {}

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

  var SKIP_TAGS = new Set(['HTML', 'HEAD', 'BODY', 'SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'PATH', 'DEFS', 'SYMBOL', 'G', 'USE']);
  var idCounter = 5000;

  function getCleanId(target) {
    var id = target.getAttribute('data-aura-id') || target.getAttribute('data-id');
    if (!id) {
      id = 'rt-' + (idCounter++) + '-' + Math.random().toString(36).substring(2, 7);
      target.setAttribute('data-aura-id', id);
      target.setAttribute('data-id', id);
    }
    return id;
  }

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
  `, []);

  // suppress unused warning — inspectorReady is consumed by the polling logic via ref
  void inspectorReady;

  // ── Polling to inject inspector script into the iframe ────────────────────────
  const pollingRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const designModeRef = React.useRef(designMode);
  designModeRef.current = designMode;

  const stopPolling = React.useCallback(() => {
    if (pollingRef.current !== null) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const startPolling = React.useCallback(() => {
    stopPolling();
    inspectorReadyRef.current = false;
    setInspectorReady(false);

    // Limit polling attempts — give up after 15s (18 × 800ms) to avoid infinite loops.
    // The overlay-based selection works regardless of inspector ack.
    let attempts = 0;
    pollingRef.current = setInterval(() => {
      const win = iframeRef.current?.contentWindow;
      if (!win || attempts++ > 18) { stopPolling(); return; }

      win.postMessage({ type: 'SET_DESIGN_MODE', enabled: designModeRef.current }, '*');

      if (!inspectorReadyRef.current) {
        // Try direct DOM injection first (works if same-origin)
        try {
          const doc = iframeRef.current?.contentDocument;
          if (doc && doc.head && !doc.getElementById('aura-inspector-script')) {
            const script = doc.createElement('script');
            script.id = 'aura-inspector-script';
            script.textContent = RUNTIME_INSPECTOR;
            doc.head.appendChild(script);
          }
        } catch (_) { /* cross-origin — use postMessage fallback */ }
        win.postMessage({ type: 'INJECT_INSPECTOR', script: RUNTIME_INSPECTOR }, '*');
      } else {
        stopPolling();
      }
    }, 800);
  }, [stopPolling, RUNTIME_INSPECTOR]);

  const handleIframeLoad = React.useCallback(() => {
    startPolling();
  }, [startPolling]);

  React.useEffect(() => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.postMessage({ type: 'SET_DESIGN_MODE', enabled: designMode }, '*');
    if (designMode && !inspectorReadyRef.current) {
      win.postMessage({ type: 'INJECT_INSPECTOR', script: RUNTIME_INSPECTOR }, '*');
    }
  }, [designMode, RUNTIME_INSPECTOR]);

  React.useEffect(() => {
    if (devServerActive && useWebContainerPreview) startPolling();
    return stopPolling;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devServerActive, useWebContainerPreview]);

  React.useEffect(() => stopPolling, [stopPolling]);

  React.useEffect(() => {
    const win = iframeRef.current?.contentWindow;
    if (win) {
      win.postMessage({ type: "SELECT_ELEMENT", id: selectedElement?.id || null }, "*");
    }
  }, [selectedElement]);


  const getIframeSrcDoc = () => {
    const stylesCode = getStylesSource(debouncedFiles);
    const isDesignMode = designMode;
    const selectedId = selectedElement?.id ?? "";

    const jsFiles: Record<string, string> = {};
    for (const [path, file] of Object.entries(debouncedFiles)) {
      if (
        path.endsWith(".tsx") ||
        path.endsWith(".ts") ||
        path.endsWith(".jsx") ||
        path.endsWith(".js")
      ) {
        jsFiles[path] = file.content;
      }
    }

    return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Preview</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
      tailwind.config = {
        theme: {
          extend: {
            colors: {
              brand: { 950: '#070913', 500: '#a855f7' }
            }
          }
        }
      }
    </script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script src="https://unpkg.com/react@18.3.1/umd/react.development.js"></script>
    <script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js"></script>
    <style>
      body { margin: 0; font-family: system-ui, sans-serif; background: #070913; color: #f1f5f9; }
      ${stylesCode}
      .designer-hover { outline: 1.5px dashed rgba(168,85,247,0.6) !important; outline-offset: -1.5px !important; cursor: pointer !important; }
      .designer-selected { outline: 2px solid #a855f7 !important; outline-offset: -2px !important; }
      .designer-dragover { outline: 2.5px dashed #a855f7 !important; outline-offset: -2.5px !important; background-color: rgba(168, 85, 247, 0.15) !important; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script>
      const captureLog = (level, ...args) => {
        window.parent.postMessage({
          type: 'IFRAME_CONSOLE',
          level,
          message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')
        }, '*');
      };
      console.log = (...a) => captureLog('log', ...a);
      console.error = (...a) => captureLog('error', ...a);
      console.warn = (...a) => captureLog('warn', ...a);
      window.onerror = (message, _s, lineno, colno) => {
        window.parent.postMessage({ type: 'RUNTIME_ERROR', message: message + ' (' + lineno + ':' + colno + ')' }, '*');
        return true;
      };
    </script>
    <script>
      // Lightweight in-iframe Aura runtime shim for srcDoc preview.
      (function() {
        try {
          const registry = {};
          const runtime = {
            registerComponentMeta(meta) {
              if (!meta || !meta.name) return;
              registry[meta.name] = meta;
              window.parent.postMessage({ type: 'IFRAME_CONSOLE', level: 'info', message: 'aura-runtime: registered component ' + meta.name }, '*');
            },
            getComponentMeta(name) {
              return registry[name];
            },
            list() { return Object.values(registry); }
          };
          // Expose globally
          Object.defineProperty(window, '__auraRuntime', { value: runtime, writable: false });

          window.addEventListener('message', (e) => {
            try {
              const d = e.data;
              if (!d || typeof d !== 'object') return;
              if (d.type === 'REGISTER_GENERATED_COMPONENT' && d.meta) {
                runtime.registerComponentMeta(d.meta);
              }
            } catch (err) {
              // ignore
            }
          });
        } catch (err) {
          // ignore
        }
      })();
    </script>
    <script>
      try {
        const isDesignModeFlag = ${isDesignMode};
        const selectedIdFlag = ${JSON.stringify(selectedId)};
        const virtualFiles = ${JSON.stringify(jsFiles)};

        function resolvePath(currentPath, importPath) {
          const parts = currentPath.split('/');
          parts.pop(); // Remove filename
          const importParts = importPath.split('/');
          for (const part of importParts) {
            if (part === '.') continue;
            if (part === '..') {
              parts.pop();
            } else {
              parts.push(part);
            }
          }
          return parts.join('/');
        }

        function findFile(resolvedPath) {
          const candidates = [
            resolvedPath,
            resolvedPath + '.tsx',
            resolvedPath + '.ts',
            resolvedPath + '.jsx',
            resolvedPath + '.js',
            resolvedPath + '/index.tsx',
            resolvedPath + '/index.ts',
            resolvedPath + '/index.jsx',
            resolvedPath + '/index.js'
          ];
          for (const c of candidates) {
            if (virtualFiles[c] !== undefined) return c;
          }
          return null;
        }

        const externalPackages = new Set();
        const importRegex = /import\\s+.*?\\s+from\\s+['"]([^'"]+)['"]/g;
        for (const [path, content] of Object.entries(virtualFiles)) {
          let match;
          while ((match = importRegex.exec(content)) !== null) {
            const pkg = match[1];
            if (!pkg.startsWith('.') && !pkg.startsWith('/') && pkg !== 'react' && pkg !== 'react-dom') {
              if (!pkg.endsWith('.css')) {
                externalPackages.add(pkg);
              }
            }
          }
        }

        const externals = {};

        async function startApp() {
          const pkgs = Array.from(externalPackages);
          if (pkgs.length > 0) {
            window.parent.postMessage({ type: 'IFRAME_CONSOLE', level: 'info', message: 'Loading external packages: ' + pkgs.join(', ') }, '*');
            await Promise.all(pkgs.map(async (pkg) => {
              try {
                const mod = await import('https://esm.sh/' + pkg + '?dev');
                externals[pkg] = mod;
              } catch (err) {
                window.parent.postMessage({ type: 'IFRAME_CONSOLE', level: 'error', message: 'Failed to load package ' + pkg + ': ' + err.message }, '*');
              }
            }));
          }

          const modules = {};
          for (const [path, content] of Object.entries(virtualFiles)) {
            try {
              const compiled = Babel.transform(content, {
                presets: [['env', { modules: 'commonjs' }], ['react', { runtime: 'classic' }], 'typescript'],
                filename: path
              }).code;

              modules[path] = {
                factory: new Function('exports', 'require', 'module', compiled),
                exports: {},
                loaded: false
              };
            } catch (err) {
              window.parent.postMessage({ type: 'RUNTIME_ERROR', message: 'Compilation error in ' + path + ': ' + err.message }, '*');
              return;
            }
          }

          function requireModule(currentPath, importPath) {
            if (importPath.endsWith('.css')) {
              return {};
            }

            if (importPath.startsWith('.') || importPath.startsWith('/')) {
              const resolved = resolvePath(currentPath, importPath);
              const matched = findFile(resolved);
              if (!matched) {
                throw new Error('Cannot find module "' + importPath + '" imported from "' + currentPath + '"');
              }

              const mod = modules[matched];
              if (!mod.loaded) {
                mod.loaded = true;
                mod.factory(mod.exports, (p) => requireModule(matched, p), mod);
              }
              return mod.exports;
            }

            if (importPath === 'react') return React;
            if (importPath === 'react-dom') return ReactDOM;
            if (externals[importPath]) return externals[importPath];

            throw new Error('External package "' + importPath + '" was not pre-loaded.');
          }

          const PREVIEW_ENTRY_CANDIDATES = ['src/app/page.tsx', 'app/page.tsx', 'src/App.tsx', 'App.jsx', 'src/App.jsx'];
          let entryPath = PREVIEW_ENTRY_CANDIDATES.find(p => virtualFiles[p] !== undefined);
          if (!entryPath) {
            entryPath = Object.keys(virtualFiles)[0];
          }

          if (!entryPath) {
            throw new Error('No files found to preview.');
          }

          const entryMod = modules[entryPath];
          entryMod.loaded = true;
          entryMod.factory(entryMod.exports, (p) => requireModule(entryPath, p), entryMod);

          const exported = entryMod.exports;
          const AppElement = exported.default || exported.Home || exported.Page || exported.App || Object.values(exported)[0];

          if (!AppElement) {
            throw new Error('Export a default component from ' + entryPath);
          }

          ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(AppElement));

          setTimeout(function() {
            if (isDesignModeFlag) {
              document.body.style.position = 'relative';
              const showToolbar = function(targetEl) {
                const existing = document.getElementById('designer-toolbar');
                if (existing) existing.remove();
                if (!targetEl) return;
                const rect = targetEl.getBoundingClientRect();
                const toolbar = document.createElement('div');
                toolbar.id = 'designer-toolbar';
                toolbar.style.position = 'absolute';
                toolbar.style.top = (rect.top + window.scrollY - 30) + 'px';
                toolbar.style.left = (rect.left + window.scrollX) + 'px';
                toolbar.style.height = '24px';
                toolbar.style.display = 'flex';
                toolbar.style.alignItems = 'center';
                toolbar.style.gap = '4px';
                toolbar.style.padding = '2px 6px';
                toolbar.style.borderRadius = '6px';
                toolbar.style.backgroundColor = '#a855f7';
                toolbar.style.color = '#ffffff';
                toolbar.style.fontSize = '10px';
                toolbar.style.fontFamily = 'system-ui, sans-serif';
                toolbar.style.fontWeight = 'bold';
                toolbar.style.zIndex = '99999';
                toolbar.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
                toolbar.style.pointerEvents = 'auto';
                const label = document.createElement('span');
                label.innerText = targetEl.tagName.toLowerCase();
                label.style.marginRight = '6px';
                label.style.opacity = '0.9';
                toolbar.appendChild(label);
                const btnDelete = document.createElement('button');
                btnDelete.innerText = '✕';
                btnDelete.title = 'Delete Element';
                btnDelete.style.border = 'none';
                btnDelete.style.background = 'rgba(255,255,255,0.2)';
                btnDelete.style.color = 'white';
                btnDelete.style.padding = '1px 6px';
                btnDelete.style.borderRadius = '4px';
                btnDelete.style.cursor = 'pointer';
                btnDelete.style.fontSize = '9px';
                btnDelete.style.fontWeight = 'bold';
                btnDelete.addEventListener('mouseenter', function() { btnDelete.style.background = 'rgba(255,255,255,0.4)'; });
                btnDelete.addEventListener('mouseleave', function() { btnDelete.style.background = 'rgba(255,255,255,0.2)'; });
                btnDelete.addEventListener('click', function(e) {
                  e.preventDefault(); e.stopPropagation();
                  window.parent.postMessage({
                    type: 'ELEMENT_MUTATION',
                    id: targetEl.getAttribute('data-id'),
                    action: 'delete'
                  }, '*');
                  toolbar.remove();
                });
                toolbar.appendChild(btnDelete);
                document.body.appendChild(toolbar);
              };
              document.querySelectorAll('[data-id]').forEach(function(el) {
                el.setAttribute('draggable', 'true');
                el.addEventListener('mouseenter', function(e) { e.stopPropagation(); el.classList.add('designer-hover'); });
                el.addEventListener('mouseleave', function(e) { e.stopPropagation(); el.classList.remove('designer-hover'); });
                el.addEventListener('dragstart', function(e) {
                  e.stopPropagation();
                  e.dataTransfer.setData('text/plain', 'element-id:' + el.getAttribute('data-id'));
                  el.classList.add('opacity-40');
                });
                el.addEventListener('dragend', function(e) {
                  e.stopPropagation();
                  el.classList.remove('opacity-40');
                });
                el.addEventListener('dragover', function(e) {
                  e.preventDefault();
                  e.stopPropagation();
                  el.classList.add('designer-dragover');
                });
                el.addEventListener('dragenter', function(e) {
                  e.preventDefault();
                  e.stopPropagation();
                  el.classList.add('designer-dragover');
                });
                el.addEventListener('dragleave', function(e) {
                  e.stopPropagation();
                  el.classList.remove('designer-dragover');
                });
                el.addEventListener('drop', function(e) {
                  e.preventDefault();
                  e.stopPropagation();
                  el.classList.remove('designer-dragover');
                  const data = e.dataTransfer.getData('text/plain');
                  if (data) {
                    window.parent.postMessage({
                      type: 'COMPONENT_DROPPED',
                      targetId: el.getAttribute('data-id'),
                      data: data
                    }, '*');
                  }
                });
                el.addEventListener('click', function(e) {
                  e.preventDefault(); e.stopPropagation();
                  document.querySelectorAll('.designer-selected').forEach(function(x) { x.classList.remove('designer-selected'); });
                  el.classList.add('designer-selected');
                  showToolbar(el);
                  window.parent.postMessage({
                    type: 'ELEMENT_SELECTED',
                    id: el.getAttribute('data-id'),
                    tagName: el.tagName,
                    text: el.innerText,
                    classes: Array.from(el.classList).filter(function(c) { return c !== 'designer-hover' && c !== 'designer-selected' && c !== 'designer-dragover'; })
                  }, '*');
                });
                if (el.getAttribute('data-id') === JSON.stringify(selectedIdFlag)) {
                  el.classList.add('designer-selected');
                  showToolbar(el);
                }
              });
            }
          }, 100);
        }

        startApp().catch(err => {
          window.parent.postMessage({ type: 'RUNTIME_ERROR', message: err.message }, '*');
        });

      } catch (err) {
        window.parent.postMessage({ type: 'RUNTIME_ERROR', message: err.message }, '*');
      }
    </script>
  </body>
</html>`;
  };

  const reloadIframe = () => {
    setCompileError(null);
    setIframeKey((prev) => prev + 1);
    onAddConsoleLine("Preview refreshed", "info");
  };

  const getWidthClass = () => {
    switch (deviceSize) {
      case "mobile":
        return "w-[375px]";
      case "tablet":
        return "w-[768px]";
      default:
        return "w-full";
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#070913] border-l border-white/5 min-h-0">
      <div className="h-10 shrink-0 border-b border-white/5 px-3 flex items-center justify-between bg-slate-950/60 select-none gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1 shrink-0">
            <span className="w-2 h-2 rounded-full bg-rose-500/70" />
            <span className="w-2 h-2 rounded-full bg-amber-500/70" />
            <span className="w-2 h-2 rounded-full bg-emerald-500/70" />
          </div>
          <button
            type="button"
            onClick={reloadIframe}
            disabled={!devServerActive}
            className="p-1 rounded hover:bg-white/5 text-slate-400 hover:text-white disabled:opacity-30"
          >
            <RotateCw size={12} />
          </button>
          <div className="flex-1 min-w-0 max-w-60 bg-slate-900 border border-white/5 rounded-md py-0.5 px-2 flex items-center gap-1 text-[10px] font-mono">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleUrlKeyDown}
              disabled={!devServerActive}
              className="flex-1 bg-transparent border-none outline-none text-slate-300 text-[10px] min-w-0 font-mono"
            />
            {currentUrl && (
              <button
                type="button"
                onClick={handleOpenExternal}
                className="shrink-0 p-0.5 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
                title="Open in new tab"
              >
                <ExternalLink size={10} />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex bg-slate-900 border border-white/5 rounded-md p-0.5">
            {(["desktop", "tablet", "mobile"] as const).map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setDeviceSize(size)}
                disabled={!devServerActive}
                className={`p-1 rounded ${deviceSize === size ? "bg-purple-600/15 text-purple-300" : "text-slate-500"} disabled:opacity-30`}
              >
                {size === "desktop" ? (
                  <Laptop size={12} />
                ) : size === "tablet" ? (
                  <Tablet size={12} />
                ) : (
                  <Smartphone size={12} />
                )}
              </button>
            ))}
          </div>
          <span
            className={`text-[9px] font-medium px-2 py-0.5 rounded-full border ${devServerActive
              ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/5"
              : isBootingPreview
                ? "border-amber-500/30 text-amber-400 bg-amber-500/5"
                : "border-white/10 text-slate-600"
              }`}
          >
            {devServerActive
              ? "Live"
              : isBootingPreview
                ? "Starting"
                : "Stopped"}
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-slate-950 flex items-center justify-center p-3 overflow-hidden relative">
        {devServerActive && compileError && (
          <div className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="max-w-lg w-full p-5 rounded-xl border border-rose-500/30 bg-[#120808]">
              <div className="flex items-center gap-2 text-rose-400 mb-3">
                <AlertTriangle size={18} />
                <h3 className="text-xs font-bold uppercase tracking-wide">
                  Build error
                </h3>
              </div>
              <pre className="text-[11px] font-mono text-rose-200/90 whitespace-pre-wrap wrap-break-word max-h-40 overflow-y-auto p-3 rounded-lg bg-black/50 border border-rose-500/10">
                {compileError}
              </pre>
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-rose-500/10 pt-3">
                <p className="text-[10px] text-slate-500">
                  Fix {APP_ENTRY} and refresh preview.
                </p>
                {onFixError && (
                  <button
                    type="button"
                    onClick={onFixError}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-[10px] font-semibold text-white transition-colors flex items-center gap-1.5 shadow-lg shadow-rose-600/20"
                  >
                    <Sparkles size={11} />
                    Fix with AI
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {isBootingPreview ? (
          <div className="max-w-sm w-full p-6 rounded-2xl border border-white/10 bg-slate-900/30 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full border border-purple-500/20 flex items-center justify-center text-purple-400 relative">
              <span className="absolute w-2 h-2 rounded-full bg-purple-400 animate-ping" />
              <RotateCw size={22} className="animate-spin" />
            </div>
            <h3 className="text-sm font-semibold text-slate-200 mb-1">
              Starting WebContainer preview
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Booting the in-browser Node environment, installing dependencies,
              and launching Next.js…
            </p>
          </div>
        ) : showStartScreen ? (
          <div className="max-w-sm w-full p-6 rounded-2xl border border-white/10 bg-slate-900/30 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full border border-purple-500/20 flex items-center justify-center text-purple-400 relative">
              <span className="absolute w-2 h-2 rounded-full bg-purple-400 animate-ping" />
              <Play size={22} className="ml-0.5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-200 mb-1">
              Start Next.js dev server
            </h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Run <code className="text-purple-300">npm install</code> then{" "}
              <code className="text-purple-300">npm run dev</code> in the
              terminal below, or click start.
            </p>
            <div className="text-left font-mono text-[10px] text-slate-500 bg-black/40 rounded-lg p-3 mb-4 border border-white/5 space-y-0.5">
              <div>
                <span className="text-purple-400">~/project $</span> npm install
              </div>
              <div>
                <span className="text-purple-400">~/project $</span> npm run dev
              </div>
            </div>
            <button
              type="button"
              onClick={onStartDevServer}
              className="w-full py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-semibold text-white transition-colors"
            >
              Start preview
            </button>
          </div>
        ) : (
          <div
            className={`h-full max-h-full bg-white/2 border border-white/10 rounded-lg overflow-hidden shadow-xl transition-all ${getWidthClass()}`}
          >
            <div className="relative w-full h-full">
              <iframe
                key={iframeKey}
                ref={iframeRef}
                title="App preview"
                src={iframeSrc}
                srcDoc={!isWebContainerMode ? getIframeSrcDoc() : undefined}
                className="w-full h-full min-h-50 bg-[#070913]"
                allow="cross-origin-isolated"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads"
                onLoad={handleIframeLoad}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
