"use client";

/**
 * LayersPanel — Onlook/Builder-style DOM tree viewer.
 *
 * Support dual modes:
 *  1. Live DOM tree mode (in Design Mode via postMessage DOM_TREE_SNAPSHOT)
 *  2. Static JSX parse mode (fallback when preview is offline or design mode is off)
 */

import React from "react";
import { ChevronRight, ChevronDown, Search, Layers, RefreshCw } from "lucide-react";
import { WorkspaceFiles, SelectedElement } from "@repo/shared";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LayerNode {
  id: string;
  tag: string;
  classes: string[];
  dataId?: string;
  children: LayerNode[];
  selfClosing?: boolean;
  depth: number;
}

// ─── Static JSX Source Parser Fallback ────────────────────────────────────────

const SKIP_TAGS = new Set([
  "React",
  "Fragment",
  "Suspense",
  "ErrorBoundary",
  "style",
  "script",
  "head",
  "meta",
  "link",
]);

function parseJSXToLayers(source: string): LayerNode[] {
  const lines = source.split("\n");
  const roots: LayerNode[] = [];
  const stack: { node: LayerNode; indent: number }[] = [];
  let idCounter = 0;

  for (const rawLine of lines) {
    const indent = rawLine.search(/\S/);
    if (indent < 0) continue;
    const line = rawLine.trim();

    if (
      line.startsWith("//") ||
      line.startsWith("/*") ||
      line.startsWith("*") ||
      line.startsWith("import ") ||
      line.startsWith("export ") ||
      line.startsWith("const ") ||
      line.startsWith("function ") ||
      line.startsWith("return") ||
      line.startsWith("interface ") ||
      line.startsWith("type ")
    )
      continue;

    const openMatch = line.match(/^<([A-Za-z][A-Za-z0-9.]*)/);
    if (!openMatch) continue;

    const tag = openMatch[1];
    if (SKIP_TAGS.has(tag)) continue;

    const classMatch =
      line.match(/className=["']([^"']*)["']/) ||
      line.match(/className=\{`([^`]*)`\}/) ||
      line.match(/className=\{["']([^"']*)["']\}/);
    const classes = classMatch
      ? classMatch[1].split(/\s+/).filter(Boolean).slice(0, 6)
      : [];

    const dataIdMatch = line.match(/data-id=["']([^"']*)["']/);
    const dataId = dataIdMatch?.[1];

    const selfClosing = line.endsWith("/>") || line.includes("/>");

    const node: LayerNode = {
      id: dataId || `layer-${idCounter++}`,
      tag,
      classes,
      dataId,
      children: [],
      selfClosing,
      depth: indent,
    };

    while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    if (stack.length === 0) {
      roots.push(node);
    } else {
      stack[stack.length - 1].node.children.push(node);
    }

    if (!selfClosing) {
      stack.push({ node, indent });
    }
  }

  return roots;
}

// Convert iframe DOM_TREE_SNAPSHOT message into LayerNode format
function domSnapshotToLayers(rawNode: any, depth = 0): LayerNode | null {
  if (!rawNode || !rawNode.tag) return null;
  const children: LayerNode[] = (rawNode.children || [])
    .map((c: any) => domSnapshotToLayers(c, depth + 1))
    .filter(Boolean);

  return {
    id: rawNode.id || `dom-${Math.random().toString(36).substring(2, 7)}`,
    tag: rawNode.tag,
    classes: rawNode.classes || [],
    dataId: rawNode.id,
    children,
    depth,
  };
}

// ─── Layer Row Component ──────────────────────────────────────────────────────

interface LayerRowProps {
  node: LayerNode;
  depth: number;
  selectedId: string | null;
  expandedIds: Set<string>;
  searchQuery: string;
  onSelect: (node: LayerNode) => void;
  onToggleExpand: (id: string) => void;
}

const LayerRow: React.FC<LayerRowProps> = ({
  node,
  depth,
  selectedId,
  expandedIds,
  searchQuery,
  onSelect,
  onToggleExpand,
}) => {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.dataId || selectedId === node.id;

  if (
    searchQuery &&
    !node.tag.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !node.classes.some((c) => c.toLowerCase().includes(searchQuery.toLowerCase())) &&
    !node.dataId?.toLowerCase().includes(searchQuery.toLowerCase())
  ) {
    return null;
  }

  return (
    <>
      <div
        onClick={() => onSelect(node)}
        className={`group flex items-center h-6 px-2 text-[11px] cursor-pointer font-mono transition-colors select-none ${
          isSelected
            ? "bg-purple-600/20 text-purple-200 border-l-2 border-purple-500"
            : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {/* Toggle icon */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand(node.id);
          }}
          className={`w-4 h-4 flex items-center justify-center rounded text-slate-500 hover:text-slate-300 ${
            !hasChildren ? "invisible" : ""
          }`}
        >
          {isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        </button>

        {/* Tag Name */}
        <span className={`font-semibold text-[10px] ${isSelected ? "text-purple-300" : "text-slate-300"}`}>
          &lt;{node.tag.toLowerCase()}&gt;
        </span>

        {/* Class badges */}
        <span className="ml-1.5 flex items-center gap-1 overflow-hidden truncate">
          {node.classes.slice(0, 3).map((c) => (
            <span key={c} className="text-[9px] text-slate-600 group-hover:text-slate-500">
              .{c}
            </span>
          ))}
        </span>

        {/* data-id badge */}
        {node.dataId && (
          <span className="ml-auto shrink-0 text-[8px] font-mono text-purple-400/60 group-hover:text-purple-300">
            #{node.dataId}
          </span>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <>
          {node.children.map((child) => (
            <LayerRow
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              expandedIds={expandedIds}
              searchQuery={searchQuery}
              onSelect={onSelect}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </>
      )}
    </>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

interface LayersPanelProps {
  files: WorkspaceFiles;
  activeFile: string;
  selectedElement: SelectedElement | null;
  onSelectLayer: (dataId: string, tag: string, classes: string[]) => void;
}

export const LayersPanel: React.FC<LayersPanelProps> = ({
  files,
  activeFile,
  selectedElement,
  onSelectLayer,
}) => {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());
  const [liveDomLayers, setLiveDomLayers] = React.useState<LayerNode[] | null>(null);

  // Listen for live DOM_TREE_SNAPSHOT from LivePreview iframe
  React.useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === "DOM_TREE_SNAPSHOT" && e.data.tree) {
        const root = domSnapshotToLayers(e.data.tree);
        if (root) setLiveDomLayers([root]);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Request live DOM tree on mount and when active file changes
  const refreshDomTree = React.useCallback(() => {
    try {
      window.dispatchEvent(new CustomEvent('aura:post-to-preview', { detail: { type: 'GET_DOM_TREE' } }));
    } catch {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    refreshDomTree();
  }, [refreshDomTree, activeFile]);

  // Fallback: Parse layers from the active file source
  const staticLayers = React.useMemo(() => {
    const source = files[activeFile]?.content ?? "";
    if (!source || (!activeFile.endsWith(".tsx") && !activeFile.endsWith(".jsx"))) return [];
    return parseJSXToLayers(source);
  }, [files, activeFile]);

  const layers = liveDomLayers ?? staticLayers;

  // Auto-expand the first 3 levels
  React.useEffect(() => {
    const autoExpand = new Set<string>();
    const expand = (nodes: LayerNode[], depth: number) => {
      if (depth > 3) return;
      for (const n of nodes) {
        if (n.children.length > 0) {
          autoExpand.add(n.id);
          expand(n.children, depth + 1);
        }
      }
    };
    expand(layers, 0);
    setExpandedIds(autoExpand);
  }, [layers]);

  const handleToggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSelectLayer = (node: LayerNode) => {
    const id = node.dataId ?? node.id;
    onSelectLayer(id, node.tag, node.classes);
  };

  if (layers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <div
          className="w-10 h-10 rounded-full border flex items-center justify-center mb-3 text-slate-600 animate-pulse"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}
        >
          <Layers size={16} />
        </div>
        <p className="text-[11px] font-medium text-slate-400">No DOM layers available</p>
        <p className="text-[10px] text-slate-600 mt-1">
          Open a .tsx file or start Design Mode to view rendered elements
        </p>
      </div>
    );
  }

  const selectedId = selectedElement?.id ?? null;

  return (
    <div className="flex flex-col h-full bg-[#141414]">
      {/* Search & Refresh Bar */}
      <div className="p-2 border-b shrink-0 flex items-center gap-1.5" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div
          className="flex-1 flex items-center gap-2 bg-black/40 border rounded-md px-2 h-7"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}
        >
          <Search size={10} className="text-slate-500 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search layers…"
            className="flex-1 bg-transparent text-[11px] text-slate-300 placeholder-slate-600 outline-none"
          />
        </div>
        <button
          type="button"
          onClick={refreshDomTree}
          title="Refresh DOM tree"
          className="p-1.5 rounded hover:bg-white/5 text-slate-500 hover:text-slate-300 transition-colors"
        >
          <RefreshCw size={11} />
        </button>
      </div>

      {/* Tree */}
      <div
        className="flex-1 overflow-y-auto py-1"
        style={{ scrollbarWidth: "thin", scrollbarColor: "#262626 transparent" }}
      >
        {layers.map((node) => (
          <LayerRow
            key={node.id}
            node={node}
            depth={0}
            selectedId={selectedId}
            expandedIds={expandedIds}
            searchQuery={searchQuery}
            onSelect={handleSelectLayer}
            onToggleExpand={handleToggleExpand}
          />
        ))}
      </div>

      {/* Footer Status */}
      <div
        className="shrink-0 px-3 py-1.5 border-t flex items-center justify-between"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        <span className="text-[9px] text-slate-600">
          {liveDomLayers ? "Live DOM Tree" : `${activeFile} (Static)`}
        </span>
        <span className="text-[9px] text-purple-400/80 font-mono">
          {layers.length} root
        </span>
      </div>
    </div>
  );
};
