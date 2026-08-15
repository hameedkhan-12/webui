"use client";

/**
 * StylePanel — Onlook-style real-time CSS property inspector & visual editor.
 *
 * Features:
 *   1. Displays live computed CSS properties read directly from the DOM element.
 *   2. Instant visual mutation in iframe via postMessage + debounced file write.
 *   3. Interactive Tailwind class chip editor.
 *   4. Sections: Position & Size → Layout → Spacing → Typography → Appearance → Tailwind Classes
 */

import React from "react";
import {
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  ArrowRight,
  ArrowDown,
  Minus,
  Layers,
  ChevronDown,
  ChevronRight,
  Plus,
  X,
  Type,
  Maximize2,
  Sparkles,
  Palette,
  Layout,
  Box,
} from "lucide-react";
import { SelectedElement } from "@repo/shared";

// ─── Event Bridge ─────────────────────────────────────────────────────────────
// Dispatches an aura:post-to-preview CustomEvent which LivePreview.tsx forwards
// to the preview iframe for instant zero-latency DOM updates.

function postToPreview(message: Record<string, unknown>) {
  try {
    window.dispatchEvent(
      new CustomEvent("aura:post-to-preview", { detail: message }),
    );
  } catch {
    // ignore
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function findClass(classes: string[], prefixes: string[]): string | null {
  for (const prefix of prefixes) {
    const found = classes.find((c) => c.startsWith(prefix));
    if (found) return found;
  }
  return null;
}

function replaceClass(
  classes: string[],
  prefixes: string[],
  newValue: string | null,
): string[] {
  const filtered = classes.filter(
    (c) => !prefixes.some((p) => c.startsWith(p)),
  );
  return newValue ? [...filtered, newValue] : filtered;
}

// ─── Section ──────────────────────────────────────────────────────────────────

const Section: React.FC<{
  title: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({ title, icon, defaultOpen = true, children }) => {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <div className="border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 h-8 text-[10px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200 transition-colors select-none"
      >
        <div className="flex items-center gap-1.5">
          {icon && <span className="text-purple-400">{icon}</span>}
          <span>{title}</span>
        </div>
        {open ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
      </button>
      {open && <div className="px-3 pb-3 space-y-2.5">{children}</div>}
    </div>
  );
};

// ─── Control Atoms ────────────────────────────────────────────────────────────

const ToggleGroup: React.FC<{
  options: { value: string; icon: React.ReactNode; title: string }[];
  active: string | null;
  onChange: (v: string) => void;
}> = ({ options, active, onChange }) => (
  <div
    className="flex rounded-md overflow-hidden border"
    style={{ borderColor: "rgba(255,255,255,0.08)" }}
  >
    {options.map((opt) => (
      <button
        key={opt.value}
        type="button"
        title={opt.title}
        onClick={() => onChange(opt.value)}
        className={`flex-1 h-7 flex items-center justify-center transition-all text-[11px] ${
          active === opt.value
            ? "bg-purple-600/20 text-purple-300 border-b-2 border-purple-500"
            : "bg-white/3 text-slate-500 hover:text-slate-300 hover:bg-white/5"
        }`}
      >
        {opt.icon}
      </button>
    ))}
  </div>
);

const SelectInput: React.FC<{
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (v: string) => void;
}> = ({ label, value, options, onChange }) => (
  <div className="flex items-center gap-2">
    <span className="text-[10px] text-slate-500 w-16 shrink-0">{label}</span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex-1 h-6 bg-black/40 border text-[11px] text-slate-300 rounded px-1.5 outline-none cursor-pointer"
      style={{ borderColor: "rgba(255,255,255,0.08)" }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-[#141414]">
          {o.label}
        </option>
      ))}
    </select>
  </div>
);

const InlineInput: React.FC<{
  label: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
}> = ({ label, value, placeholder, onChange }) => (
  <div className="flex items-center gap-2">
    <span className="text-[10px] text-slate-500 w-16 shrink-0">{label}</span>
    <input
      type="text"
      value={value}
      placeholder={placeholder ?? "auto"}
      onChange={(e) => onChange(e.target.value)}
      className="flex-1 h-6 bg-black/40 border text-[11px] text-slate-300 rounded px-1.5 outline-none font-mono"
      style={{ borderColor: "rgba(255,255,255,0.08)" }}
    />
  </div>
);

// ─── Color Presets ────────────────────────────────────────────────────────────

const COLOR_PRESETS = [
  { name: "Slate 950", bg: "#020617", tw: "bg-slate-950" },
  { name: "Slate 900", bg: "#0f172a", tw: "bg-slate-900" },
  { name: "Purple 600", bg: "#9333ea", tw: "bg-purple-600" },
  { name: "Indigo 600", bg: "#4f46e5", tw: "bg-indigo-600" },
  { name: "Blue 600", bg: "#2563eb", tw: "bg-blue-600" },
  { name: "Emerald 600", bg: "#059669", tw: "bg-emerald-600" },
  { name: "Rose 600", bg: "#e11d48", tw: "bg-rose-600" },
  { name: "Amber 600", bg: "#d97706", tw: "bg-amber-600" },
  { name: "White", bg: "#ffffff", tw: "bg-white" },
  { name: "Transparent", bg: "transparent", tw: "" },
];

// ─── Spacing Box Model ─────────────────────────────────────────────────────────

const SpacingBox: React.FC<{
  classes: string[];
  onChange: (classes: string[]) => void;
}> = ({ classes, onChange }) => {
  const spacingOpts = [
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "8",
    "10",
    "12",
    "16",
    "20",
    "24",
  ];

  const getVal = (prefix: string) => {
    const found = classes.find((c) => c.startsWith(prefix + "-"));
    return found ? found.replace(prefix + "-", "") : "0";
  };

  const setVal = (prefix: string, val: string) => {
    const filtered = classes.filter((c) => !c.startsWith(prefix + "-"));
    onChange(val === "0" ? filtered : [...filtered, `${prefix}-${val}`]);
  };

  const SpacingField = ({
    prefix,
    label,
  }: {
    prefix: string;
    label: string;
  }) => (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[8px] text-slate-600 uppercase font-mono">
        {label}
      </span>
      <select
        value={getVal(prefix)}
        onChange={(e) => setVal(prefix, e.target.value)}
        className="w-8 h-5 bg-black/50 border rounded text-[9px] text-slate-300 text-center outline-none cursor-pointer"
        style={{ borderColor: "rgba(255,255,255,0.08)" }}
      >
        {spacingOpts.map((v) => (
          <option key={v} value={v} className="bg-[#141414]">
            {v}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-1 py-1">
      <div className="text-[8px] text-slate-500 uppercase font-semibold self-start">
        Margin & Padding (Box Model)
      </div>
      <SpacingField prefix="mt" label="T" />
      <div className="flex items-center gap-2">
        <SpacingField prefix="ml" label="L" />
        <div
          className="w-24 h-14 rounded border flex items-center justify-center p-1"
          style={{
            borderColor: "color-mix(in oklch, var(--ring) 30%, transparent)",
            background: "color-mix(in oklch, var(--ring) 5%, transparent)",
          }}
        >
          <div className="flex flex-col items-center gap-0.5">
            <SpacingField prefix="pt" label="T" />
            <div className="flex items-center gap-1">
              <SpacingField prefix="pl" label="L" />
              <div
                className="w-6 h-6 rounded flex items-center justify-center"
                style={{
                  background: "color-mix(in oklch, var(--ring) 20%, transparent)",
                  border: "1px solid color-mix(in oklch, var(--ring) 40%, transparent)",
                }}
              >
                <span className="text-[7px] text-purple-300 font-mono">
                  DOM
                </span>
              </div>
              <SpacingField prefix="pr" label="R" />
            </div>
            <SpacingField prefix="pb" label="B" />
          </div>
        </div>
        <SpacingField prefix="mr" label="R" />
      </div>
      <SpacingField prefix="mb" label="B" />
    </div>
  );
};

// ─── Main Panel ───────────────────────────────────────────────────────────────

interface StylePanelProps {
  selectedElement: SelectedElement | null;
  onClose: () => void;
  onUpdateElement: (
    filePath: string,
    elementId: string,
    updatedProps: { text?: string; classes?: string[] },
  ) => void;
  onUpdateArrayItemField: (
    filePath: string,
    iterableName: string,
    index: number,
    key: string,
    value: string,
  ) => void;
}

export const StylePanel: React.FC<StylePanelProps> = ({
  selectedElement,
  onClose,
  onUpdateElement,
  onUpdateArrayItemField,
}) => {
  const [newClassInput, setNewClassInput] = React.useState("");

  if (!selectedElement) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <div
          className="w-12 h-12 rounded-full border flex items-center justify-center mb-3 text-slate-600"
          style={{
            borderColor: "rgba(255,255,255,0.06)",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <Layers size={18} className="animate-pulse text-purple-400" />
        </div>
        <p className="text-[11px] font-semibold text-slate-300">
          No element selected
        </p>
        <p className="text-[10px] text-slate-500 mt-1 leading-relaxed max-w-[180px]">
          Click any element in the Live Preview in{" "}
          <strong className="text-purple-400">Design Mode</strong> to inspect
          and edit its styles
        </p>
      </div>
    );
  }

  const {
    filePath,
    id,
    sourceId,
    tagName,
    text,
    classes,
    computedStyle,
    rect,
    isRepeated,
    repeatSourceName,
    repeatIndex,
    arrayFieldKey,
    arrayEditable,
    arrayItemCount,
  } = selectedElement;

  const update = (patch: { text?: string; classes?: string[] }) => {
    if (patch.text !== undefined) {
      postToPreview({ type: "SET_TEXT", id, text: patch.text });
    }
    if (patch.classes !== undefined) {
      const add = patch.classes.filter((c) => !classes.includes(c));
      const remove = classes.filter((c) => !patch.classes!.includes(c));
      if (add.length > 0 || remove.length > 0) {
        postToPreview({ type: "APPLY_CLASS", id, add, remove });
      }
    }

    // Text on a per-card-editable repeated element goes through the
    // array-item writer, not the generic JSX-child writer: its child is a
    // data binding like {item.title}, not plain text, so onUpdateElement's
    // underlying updateChildren would correctly REFUSE it as "non-text
    // children" -- previously this meant the edit looked like it worked
    // (the preview updates via SET_TEXT above) but silently never reached
    // the file. See packages/ast-engine's updateArrayItemField.
    const textGoesToArrayItem =
      patch.text !== undefined &&
      arrayEditable &&
      repeatSourceName != null &&
      repeatIndex != null &&
      arrayFieldKey != null;

    if (textGoesToArrayItem) {
      onUpdateArrayItemField(
        filePath,
        repeatSourceName!,
        repeatIndex!,
        arrayFieldKey!,
        patch.text!,
      );
      if (patch.classes !== undefined && sourceId) {
        onUpdateElement(filePath, sourceId, { classes: patch.classes });
      }
    } else if (sourceId) {
      onUpdateElement(filePath, sourceId, patch);
    } else {
      console.warn(
        `[StylePanel] Element "${id}" has no source id -- this element's ` +
          `visual edit cannot be saved to a file (tagging likely failed for ` +
          `this element). The preview update above is visual-only and will ` +
          `be lost on next reload.`,
      );
    }
  };

  const updateClasses = (prefixes: string[], newVal: string | null) =>
    update({ classes: replaceClass(classes, prefixes, newVal) });

  const addTailwindClass = (clsToAdd: string) => {
    const trimmed = clsToAdd.trim();
    if (!trimmed || classes.includes(trimmed)) return;
    update({ classes: [...classes, trimmed] });
    setNewClassInput("");
  };

  const removeTailwindClass = (clsToRemove: string) => {
    update({ classes: classes.filter((c) => c !== clsToRemove) });
  };

  // Layout values
  const displayVal =
    findClass(classes, ["flex", "grid", "block", "inline", "hidden"]) ??
    computedStyle?.display ??
    "block";
  const flexDirVal = findClass(classes, ["flex-row", "flex-col"]) ?? "flex-row";
  const justifyVal = findClass(classes, ["justify-"]) ?? "";
  const alignVal = findClass(classes, ["items-"]) ?? "";
  const gapVal = findClass(classes, ["gap-"]) ?? "";

  // Size values
  const widthVal = findClass(classes, ["w-"]) ?? "";
  const heightVal = findClass(classes, ["h-"]) ?? "";

  // Typography
  const textSizeVal =
    findClass(classes, [
      "text-xs",
      "text-sm",
      "text-base",
      "text-lg",
      "text-xl",
      "text-2xl",
      "text-3xl",
      "text-4xl",
    ]) ?? "";
  const fontWeightVal = findClass(classes, ["font-"]) ?? "";

  return (
    <div className="flex flex-col h-full bg-[#141414] overflow-hidden select-none">
      {/* Header */}
      <div
        className="shrink-0 px-3 py-2 border-b flex items-center justify-between"
        style={{ borderColor: "rgba(255,255,255,0.06)", background: "#171717" }}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className="px-1.5 py-0.5 rounded text-[9px] font-bold font-mono uppercase shrink-0"
            style={{ background: "color-mix(in oklch, var(--ring) 15%, transparent)", color: "#a78bfa" }}
          >
            {tagName.toLowerCase()}
          </span>
          <span className="text-[10px] text-slate-400 font-mono truncate">
            {sourceId ?? `${id} (unsaved)`}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-500 hover:text-slate-200 transition-colors p-1 rounded hover:bg-white/5"
        >
          <X size={12} />
        </button>
      </div>

      {/* Bounding Box Badge */}
      {rect && (
        <div
          className="shrink-0 px-3 py-1 bg-black/40 border-b flex items-center justify-between text-[9px] font-mono text-slate-500"
          style={{ borderColor: "rgba(255,255,255,0.04)" }}
        >
          <span>
            W:{" "}
            <strong className="text-purple-400">
              {Math.round(rect.width)}px
            </strong>
          </span>
          <span>
            H:{" "}
            <strong className="text-purple-400">
              {Math.round(rect.height)}px
            </strong>
          </span>
          <span>X: {Math.round(rect.x)}</span>
          <span>Y: {Math.round(rect.y)}</span>
        </div>
      )}

      {/* Repeated-element notice -- shown when this node's sourceId is shared
          across multiple rendered instances (inside a .map()). Two distinct
          states: arrayEditable means text edits on THIS card are isolated to
          its one data item (see updateArrayItemField); otherwise style/class
          edits still visibly apply to every card sharing the template, and
          text edits specifically will not persist (see the update() comment
          above), so say so plainly instead of letting it look like it worked. */}
      {isRepeated && arrayEditable && (
        <div
          className="shrink-0 px-3 py-2 border-b flex items-start gap-2"
          style={{
            borderColor: "color-mix(in oklch, var(--ring) 25%, transparent)",
            background: "color-mix(in oklch, var(--ring) 8%, transparent)",
          }}
        >
          <Layers size={12} className="text-purple-400 mt-0.5 shrink-0" />
          <p className="text-[10px] leading-relaxed text-purple-300/90">
            Editing item {(repeatIndex ?? 0) + 1}
            {arrayItemCount ? ` of ${arrayItemCount}` : ""} in{" "}
            <code className="text-purple-200">{repeatSourceName}</code>. Text
            changes apply to just this item. Style/class changes still apply
            to every item using this template.
          </p>
        </div>
      )}
      {isRepeated && !arrayEditable && (
        <div
          className="shrink-0 px-3 py-2 border-b flex items-start gap-2"
          style={{
            borderColor: "rgba(245,158,11,0.25)",
            background: "rgba(245,158,11,0.08)",
          }}
        >
          <Layers size={12} className="text-amber-400 mt-0.5 shrink-0" />
          <p className="text-[10px] leading-relaxed text-amber-300/90">
            This element is inside {repeatSourceName ? (
              <code className="text-amber-200">{repeatSourceName}.map()</code>
            ) : (
              "a list (.map())"
            )}
            . Style and class changes apply to every item rendered from this
            template. Text here isn't editable per-item — either its data
            isn't a plain array literal in this file, or its content is more
            than a single bound field — so text edits will show in the
            preview but won't be saved. Edit the underlying data instead.
          </p>
        </div>
      )}

      {/* Scrollable Inspector Body */}
      <div
        className="flex-1 overflow-y-auto"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "#262626 transparent",
        }}
      >
        {/* Content Section */}
        {text !== undefined && (
          <Section title="Text Content" icon={<Type size={11} />}>
            <input
              type="text"
              value={text}
              onChange={(e) => update({ text: e.target.value })}
              placeholder="Text content…"
              className="w-full h-7 bg-black/40 border rounded px-2 text-[11px] text-slate-200 placeholder-slate-600 outline-none focus:border-purple-500/50"
              style={{ borderColor: "rgba(255,255,255,0.08)" }}
            />
          </Section>
        )}

        {/* Position & Size */}
        <Section title="Position & Size" icon={<Maximize2 size={11} />}>
          <div className="grid grid-cols-2 gap-2">
            <InlineInput
              label="Width"
              value={widthVal}
              placeholder={computedStyle?.width ?? "auto"}
              onChange={(v) => {
                updateClasses(["w-"], v || null);
                postToPreview({
                  type: "APPLY_STYLE",
                  id,
                  property: "width",
                  value: v,
                });
              }}
            />
            <InlineInput
              label="Height"
              value={heightVal}
              placeholder={computedStyle?.height ?? "auto"}
              onChange={(v) => {
                updateClasses(["h-"], v || null);
                postToPreview({
                  type: "APPLY_STYLE",
                  id,
                  property: "height",
                  value: v,
                });
              }}
            />
          </div>
          <SelectInput
            label="Position"
            value={
              findClass(classes, ["relative", "absolute", "fixed", "sticky"]) ??
              "static"
            }
            options={[
              { label: "Static", value: "static" },
              { label: "Relative", value: "relative" },
              { label: "Absolute", value: "absolute" },
              { label: "Fixed", value: "fixed" },
              { label: "Sticky", value: "sticky" },
            ]}
            onChange={(v) =>
              updateClasses(
                ["relative", "absolute", "fixed", "sticky"],
                v === "static" ? null : v,
              )
            }
          />
        </Section>

        {/* Layout */}
        <Section title="Layout" icon={<Layout size={11} />}>
          <SelectInput
            label="Display"
            value={displayVal}
            options={[
              { label: "Block", value: "block" },
              { label: "Flex", value: "flex" },
              { label: "Grid", value: "grid" },
              { label: "Inline", value: "inline" },
              { label: "Hidden", value: "hidden" },
            ]}
            onChange={(v) => {
              updateClasses(["flex", "grid", "block", "inline", "hidden"], v);
              postToPreview({
                type: "APPLY_STYLE",
                id,
                property: "display",
                value: v,
              });
            }}
          />

          {displayVal === "flex" && (
            <>
              <div>
                <span className="text-[10px] text-slate-500 block mb-1">
                  Direction
                </span>
                <ToggleGroup
                  options={[
                    {
                      value: "flex-row",
                      icon: <ArrowRight size={11} />,
                      title: "Row",
                    },
                    {
                      value: "flex-col",
                      icon: <ArrowDown size={11} />,
                      title: "Column",
                    },
                    {
                      value: "flex-row-reverse",
                      icon: <Minus size={11} />,
                      title: "Row Reverse",
                    },
                  ]}
                  active={flexDirVal}
                  onChange={(v) =>
                    updateClasses(
                      ["flex-row", "flex-col", "flex-row-reverse"],
                      v,
                    )
                  }
                />
              </div>

              <div>
                <span className="text-[10px] text-slate-500 block mb-1">
                  Justify
                </span>
                <ToggleGroup
                  options={[
                    {
                      value: "justify-start",
                      icon: <AlignStartVertical size={11} />,
                      title: "Start",
                    },
                    {
                      value: "justify-center",
                      icon: <AlignCenterVertical size={11} />,
                      title: "Center",
                    },
                    {
                      value: "justify-end",
                      icon: <AlignEndVertical size={11} />,
                      title: "End",
                    },
                    {
                      value: "justify-between",
                      icon: <Minus size={11} />,
                      title: "Space Between",
                    },
                  ]}
                  active={justifyVal}
                  onChange={(v) => updateClasses(["justify-"], v)}
                />
              </div>

              <div>
                <span className="text-[10px] text-slate-500 block mb-1">
                  Align Items
                </span>
                <ToggleGroup
                  options={[
                    {
                      value: "items-start",
                      icon: <AlignStartHorizontal size={11} />,
                      title: "Start",
                    },
                    {
                      value: "items-center",
                      icon: <AlignCenterHorizontal size={11} />,
                      title: "Center",
                    },
                    {
                      value: "items-end",
                      icon: <AlignEndHorizontal size={11} />,
                      title: "End",
                    },
                    {
                      value: "items-stretch",
                      icon: <AlignCenterHorizontal size={11} />,
                      title: "Stretch",
                    },
                  ]}
                  active={alignVal}
                  onChange={(v) => updateClasses(["items-"], v)}
                />
              </div>

              <SelectInput
                label="Gap"
                value={gapVal}
                options={[
                  { label: "None", value: "" },
                  ...["1", "2", "3", "4", "5", "6", "8", "10", "12"].map(
                    (v) => ({
                      label: `gap-${v}`,
                      value: `gap-${v}`,
                    }),
                  ),
                ]}
                onChange={(v) => updateClasses(["gap-"], v || null)}
              />
            </>
          )}
        </Section>

        {/* Spacing Box Model */}
        <Section title="Spacing" icon={<Box size={11} />} defaultOpen={false}>
          <SpacingBox
            classes={classes}
            onChange={(next) => update({ classes: next })}
          />
        </Section>

        {/* Typography */}
        <Section
          title="Typography"
          icon={<Type size={11} />}
          defaultOpen={false}
        >
          <SelectInput
            label="Size"
            value={textSizeVal}
            options={[
              { label: "Default", value: "" },
              { label: "xs (12px)", value: "text-xs" },
              { label: "sm (14px)", value: "text-sm" },
              { label: "base (16px)", value: "text-base" },
              { label: "lg (18px)", value: "text-lg" },
              { label: "xl (20px)", value: "text-xl" },
              { label: "2xl (24px)", value: "text-2xl" },
              { label: "3xl (30px)", value: "text-3xl" },
              { label: "4xl (36px)", value: "text-4xl" },
            ]}
            onChange={(v) =>
              updateClasses(
                [
                  "text-xs",
                  "text-sm",
                  "text-base",
                  "text-lg",
                  "text-xl",
                  "text-2xl",
                  "text-3xl",
                  "text-4xl",
                ],
                v || null,
              )
            }
          />

          <SelectInput
            label="Weight"
            value={fontWeightVal}
            options={[
              { label: "Default", value: "" },
              { label: "Normal (400)", value: "font-normal" },
              { label: "Medium (500)", value: "font-medium" },
              { label: "Semibold (600)", value: "font-semibold" },
              { label: "Bold (700)", value: "font-bold" },
            ]}
            onChange={(v) => updateClasses(["font-"], v || null)}
          />

          <SelectInput
            label="Align"
            value={
              findClass(classes, ["text-left", "text-center", "text-right"]) ??
              ""
            }
            options={[
              { label: "Default", value: "" },
              { label: "Left", value: "text-left" },
              { label: "Center", value: "text-center" },
              { label: "Right", value: "text-right" },
            ]}
            onChange={(v) =>
              updateClasses(
                ["text-left", "text-center", "text-right", "text-justify"],
                v || null,
              )
            }
          />
        </Section>

        {/* Appearance */}
        <Section
          title="Appearance"
          icon={<Palette size={11} />}
          defaultOpen={false}
        >
          <div className="space-y-2">
            <span className="text-[10px] text-slate-500 block">
              Background Presets
            </span>
            <div className="grid grid-cols-5 gap-1.5">
              {COLOR_PRESETS.map((preset) => {
                const isActive = classes.includes(preset.tw);
                return (
                  <button
                    key={preset.name}
                    type="button"
                    title={preset.name}
                    onClick={() => updateClasses(["bg-"], preset.tw || null)}
                    className={`w-full aspect-square rounded-md border transition-all ${
                      isActive
                        ? "ring-2 ring-purple-400 ring-offset-1 ring-offset-[#141414]"
                        : ""
                    }`}
                    style={{
                      background:
                        preset.bg === "transparent"
                          ? "linear-gradient(135deg,#555 25%,transparent 25%,transparent 75%,#555 75%)"
                          : preset.bg,
                      borderColor: isActive
                        ? "color-mix(in oklch, var(--ring) 60%, transparent)"
                        : "rgba(255,255,255,0.08)",
                    }}
                  />
                );
              })}
            </div>

            <SelectInput
              label="Rounded"
              value={findClass(classes, ["rounded-"]) ?? "rounded-none"}
              options={[
                { label: "None", value: "rounded-none" },
                { label: "SM", value: "rounded-sm" },
                { label: "MD", value: "rounded-md" },
                { label: "LG", value: "rounded-lg" },
                { label: "XL", value: "rounded-xl" },
                { label: "Full", value: "rounded-full" },
              ]}
              onChange={(v) =>
                updateClasses(["rounded-"], v === "rounded-none" ? null : v)
              }
            />
          </div>
        </Section>

        {/* Tailwind Classes Manager */}
        <Section
          title="Tailwind Classes"
          icon={<Sparkles size={11} />}
          defaultOpen={true}
        >
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto p-1.5 bg-black/40 rounded border border-white/5">
              {classes.map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center gap-1 text-[9px] font-mono text-purple-300 px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 group hover:border-purple-500/40 transition-colors"
                >
                  .{c}
                  <button
                    type="button"
                    onClick={() => removeTailwindClass(c)}
                    className="text-purple-400/60 hover:text-rose-400 transition-colors"
                  >
                    <X size={9} />
                  </button>
                </span>
              ))}
              {classes.length === 0 && (
                <span className="text-[10px] text-slate-600 italic">
                  No classes applied
                </span>
              )}
            </div>

            {/* Add Class Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addTailwindClass(newClassInput);
              }}
              className="flex items-center gap-1"
            >
              <input
                type="text"
                value={newClassInput}
                onChange={(e) => setNewClassInput(e.target.value)}
                placeholder="Add class (e.g. shadow-lg)"
                className="flex-1 h-6 bg-black/40 border rounded px-2 text-[10px] font-mono text-slate-200 placeholder-slate-600 outline-none focus:border-purple-500/50"
                style={{ borderColor: "rgba(255,255,255,0.08)" }}
              />
              <button
                type="submit"
                className="h-6 px-2 bg-purple-600/20 border border-purple-500/30 hover:bg-purple-600/30 text-purple-300 rounded text-[10px] flex items-center gap-1 font-semibold transition-colors"
              >
                <Plus size={10} /> Add
              </button>
            </form>
          </div>
        </Section>
      </div>
    </div>
  );
};
