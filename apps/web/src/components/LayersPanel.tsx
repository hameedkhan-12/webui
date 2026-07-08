"use client";

/**
 * LayersPanel — Builder.io-style DOM tree viewer.
 *
 * Architecture (mirrors Builder.io's approach):
 *  1. **Static parse**: Parses the open JSX/TSX source to build a component
 *     tree (like Builder reads its JSON model). Shows element tags + class names.
 *  2. **Live sync via postMessage**: When the inspector runtime assigns
 *     `data-id` to elements, our INSPECTOR_SCRIPT sends `DOM_TREE_SNAPSHOT`
 *     back to the parent on demand. This gives us live, rendered positions.
 *  3. **Bidirectional selection**: Clicking a layer highlights it in the
 *     canvas; clicking in the canvas highlights it here.
 */

import React from "react";
import { ChevronRight, ChevronDown, Search, Layers } from "lucide-react";
import { WorkspaceFiles, SelectedElement } from "@repo/shared";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LayerNode {
  id: string;
  tag: string;
  classes: string[];
  dataId?: string;
  children: LayerNode[];
  selfClosing: boolean;
  depth: number;
}

// ─── JSX Source Parser ────────────────────────────────────────────────────────
// Parses JSX/TSX source lines to build a layer tree.
// Strategy: track indent level of opening tags, build parent-child from indentation.

const SKIP_TAGS = new Set([
  "React", "Fragment", "Suspense", "ErrorBoundary",
  "style", "script", "head", "meta", "link",
]);

function parseJSXToLayers(source: string): LayerNode[] {
  const lines = source.split("\n");
  const roots: LayerNode[] = [];
  const stack: { node: LayerNode; indent: number }[] = [];
  let idCounter = 0;

  for (const rawLine of lines) {
    const indent = rawLine.search(/\S/); // first non-space char index
    if (indent < 0) continue;
    const line = rawLine.trim();

    // Skip comments, imports, type declarations
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
    ) continue;

    // Match opening JSX tag: <TagName or <tag
    const openMatch = line.match(/^<([A-Za-z][A-Za-z0-9.]*)/);
    if (!openMatch) continue;

    const tag = openMatch[1];
    if (SKIP_TAGS.has(tag)) continue;

    // Extract className
    const classMatch =
      line.match(/className=["']([^"']*)["']/) ||
      line.match(/className=\{`([^`]*)`\}/) ||
      line.match(/className=\{["']([^"']*)["']\}/);
    const classes = classMatch
      ? classMatch[1].split(/\s+/).filter(Boolean).slice(0, 6) // cap at 6 classes
      : [];

    // Extract data-id
    const dataIdMatch = line.match(/data-id=["']([^"']*)["']/);
    const dataId = dataIdMatch?.[1];

    // Is self-closing?
    const selfClosing = line.endsWith("/>") || line.includes("/>");

    const node: LayerNode = {
      id: `layer-${idCounter++}`,
      tag,
      classes,
      dataId,
      children: [],
      selfClosing,
      depth: indent,
    };

    // Pop stack entries that are at same or shallower indent
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
  const isSelected = selectedId === node.dataId || selectedId === node.id;
  const isExpanded = expandedIds.has(node.id);
  const hasChildren = node.children.length > 0;

  // Filter by search
  const label = node.tag + (node.classes.length > 0 ? "." + node.classes.join(".") : "");
  if (searchQuery && !label.toLowerCase().includes(searchQuery.toLowerCase())) {
    // Still render children in case they match
    if (!node.children.some(c => JSON.stringify(c).toLowerCase().includes(searchQuery.toLowerCase()))) {
      return null;
    }
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(node)}
        onKeyDown={(e) => e.key === "Enter" && onSelect(node)}
        className={`flex items-center gap-0.5 h-6 cursor-pointer transition-colors text-[11px] font-mono group ${
          isSelected
            ? "bg-blue-500/20 text-blue-300"
            : "hover:bg-white/5 text-slate-400"
        }`}
        style={{ paddingLeft: `${8 + depth * 12}px`, paddingRight: "8px" }}
      >
        {/* Expand toggle */}
        <span
          className="w-4 h-4 flex items-center justify-center shrink-0"
          onClick={(e) => { e.stopPropagation(); if (hasChildren) onToggleExpand(node.id); }}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown size={10} className="text-slate-500" />
            ) : (
              <ChevronRight size={10} className="text-slate-500" />
            )
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-slate-700 mx-auto" />
          )}
        </span>

        {/* Tag label */}
        <span
          className={`font-mono truncate ${
            isSelected ? "text-blue-300" : "text-slate-400"
          }`}
        >
          <span className={isSelected ? "text-blue-400" : "text-slate-500"}>
            {node.tag.charAt(0) === node.tag.charAt(0).toUpperCase()
              ? "⬡ " // Component (uppercase)
              : ""}
          </span>
          <span className={isSelected ? "text-blue-300" : "text-slate-400"}>
            {node.tag}
          </span>
          {node.classes.slice(0, 3).map((cls) => (
            <span key={cls} className={isSelected ? "text-blue-400/70" : "text-slate-600"}>
              .{cls}
            </span>
          ))}
          {node.classes.length > 3 && (
            <span className="text-slate-700">+{node.classes.length - 3}</span>
          )}
        </span>

        {/* data-id badge */}
        {node.dataId && (
          <span className="ml-auto shrink-0 text-[9px] font-mono text-slate-700 group-hover:text-slate-600">
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

  // Parse layers from the active file source
  const layers = React.useMemo(() => {
    const source = files[activeFile]?.content ?? "";
    if (!source || (!activeFile.endsWith(".tsx") && !activeFile.endsWith(".jsx"))) return [];
    return parseJSXToLayers(source);
  }, [files, activeFile]);

  // Auto-expand the first 2 levels on initial parse
  React.useEffect(() => {
    const autoExpand = new Set<string>();
    const expand = (nodes: LayerNode[], depth: number) => {
      if (depth > 2) return;
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
        <div className="w-10 h-10 rounded-full border flex items-center justify-center mb-3 text-slate-600 animate-pulse"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <Layers size={16} />
        </div>
        <p className="text-[11px] font-medium text-slate-500">No JSX layers found</p>
        <p className="text-[10px] text-slate-700 mt-1">
          Open a .tsx or .jsx file to see its component tree
        </p>
      </div>
    );
  }

  const selectedId = selectedElement?.id ?? null;

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a]">
      {/* Search */}
      <div className="p-2 border-b shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-2 bg-black/30 border rounded-md px-2 h-7"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <Search size={10} className="text-slate-600 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search layers…"
            className="flex-1 bg-transparent text-[11px] text-slate-300 placeholder-slate-700 outline-none"
          />
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-1" style={{ scrollbarWidth: "thin", scrollbarColor: "#2a2a2a transparent" }}>
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

      {/* Footer hint */}
      <div className="shrink-0 px-3 py-2 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <p className="text-[9px] text-slate-700">
          {activeFile} · {layers.length} root element{layers.length !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
};
