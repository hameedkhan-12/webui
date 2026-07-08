"use client";

/**
 * StylePanel — Builder.io-style CSS property inspector.
 * Sections: Selection breadcrumb → Layout → Margin & Padding → Background → Typography
 */

import React from "react";
import {
  AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal,
  ArrowRight, ArrowDown, Minus, Layers, RefreshCw,
  ChevronDown, ChevronRight,
} from "lucide-react";
import { SelectedElement } from "@repo/shared";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cls(list: string[]): string {
  return list.join(" ");
}

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
  const filtered = classes.filter((c) => !prefixes.some((p) => c.startsWith(p)));
  return newValue ? [...filtered, newValue] : filtered;
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

const Section: React.FC<{
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({ title, defaultOpen = true, children }) => {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <div className="border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 h-8 text-[10px] font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-300 transition-colors"
      >
        <span>{title}</span>
        {open ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
      </button>
      {open && <div className="px-3 pb-3 space-y-2.5">{children}</div>}
    </div>
  );
};

// ─── Small control atoms ──────────────────────────────────────────────────────

const ToggleGroup: React.FC<{
  options: { value: string; icon: React.ReactNode; title: string }[];
  active: string | null;
  onChange: (v: string) => void;
}> = ({ options, active, onChange }) => (
  <div className="flex rounded-md overflow-hidden border" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
    {options.map((opt) => (
      <button
        key={opt.value}
        type="button"
        title={opt.title}
        onClick={() => onChange(opt.value)}
        className={cls([
          "flex-1 h-7 flex items-center justify-center transition-all text-[11px]",
          active === opt.value
            ? "bg-blue-500/20 text-blue-300"
            : "bg-white/3 text-slate-500 hover:text-slate-300 hover:bg-white/5",
        ])}
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
    <span className="text-[10px] text-slate-600 w-14 shrink-0">{label}</span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex-1 h-6 bg-black/30 border text-[11px] text-slate-300 rounded px-1.5 outline-none cursor-pointer"
      style={{ borderColor: "rgba(255,255,255,0.08)" }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-[#1a1a1a]">
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
    <span className="text-[10px] text-slate-600 w-14 shrink-0">{label}</span>
    <input
      type="text"
      value={value}
      placeholder={placeholder ?? "auto"}
      onChange={(e) => onChange(e.target.value)}
      className="flex-1 h-6 bg-black/30 border text-[11px] text-slate-300 rounded px-1.5 outline-none"
      style={{ borderColor: "rgba(255,255,255,0.08)" }}
    />
  </div>
);

// ─── Color Swatch ──────────────────────────────────────────────────────────────

const COLOR_PRESETS = [
  { name: "Slate 950",   bg: "#020617", tw: "bg-slate-950" },
  { name: "Slate 900",   bg: "#0f172a", tw: "bg-slate-900" },
  { name: "Purple 600",  bg: "#9333ea", tw: "bg-purple-600" },
  { name: "Indigo 600",  bg: "#4f46e5", tw: "bg-indigo-600" },
  { name: "Blue 600",    bg: "#2563eb", tw: "bg-blue-600" },
  { name: "Emerald 600", bg: "#059669", tw: "bg-emerald-600" },
  { name: "Rose 600",    bg: "#e11d48", tw: "bg-rose-600" },
  { name: "Amber 600",   bg: "#d97706", tw: "bg-amber-600" },
  { name: "White",       bg: "#ffffff", tw: "bg-white" },
  { name: "Transparent", bg: "transparent", tw: "" },
];

// ─── Spacing Box Model ─────────────────────────────────────────────────────────

const SpacingBox: React.FC<{
  classes: string[];
  onChange: (classes: string[]) => void;
}> = ({ classes, onChange }) => {
  const spacingOpts = ["0", "1", "2", "3", "4", "5", "6", "8", "10", "12", "16", "20", "24"];

  const getVal = (prefix: string) => {
    const found = classes.find((c) => c.startsWith(prefix + "-") || c === prefix + "-0");
    return found ? found.replace(prefix + "-", "") : "0";
  };

  const setVal = (prefix: string, val: string) => {
    const filtered = classes.filter((c) => !c.startsWith(prefix + "-"));
    onChange(val === "0" ? filtered : [...filtered, `${prefix}-${val}`]);
  };

  const SpacingField = ({ prefix, label }: { prefix: string; label: string }) => (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[8px] text-slate-700 uppercase">{label}</span>
      <select
        value={getVal(prefix)}
        onChange={(e) => setVal(prefix, e.target.value)}
        className="w-9 h-5 bg-black/40 border rounded text-[10px] text-slate-400 text-center outline-none"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        {spacingOpts.map((v) => (
          <option key={v} value={v} className="bg-[#1a1a1a]">{v}</option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-1 py-1">
      {/* Margin outer */}
      <div className="text-[9px] text-slate-700 uppercase self-start">Margin</div>
      <SpacingField prefix="mt" label="T" />
      <div className="flex items-center gap-2">
        <SpacingField prefix="ml" label="L" />
        <div
          className="w-16 h-10 rounded border flex items-center justify-center"
          style={{ borderColor: "rgba(168,85,247,0.25)", background: "rgba(168,85,247,0.06)" }}
        >
          {/* Padding inner */}
          <div className="flex flex-col items-center gap-0.5">
            <SpacingField prefix="pt" label="T" />
            <div className="flex items-center gap-1">
              <SpacingField prefix="pl" label="L" />
              <div
                className="w-5 h-5 rounded"
                style={{ background: "rgba(168,85,247,0.2)", border: "1px solid rgba(168,85,247,0.3)" }}
              />
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
}

export const StylePanel: React.FC<StylePanelProps> = ({
  selectedElement,
  onClose,
  onUpdateElement,
}) => {
  if (!selectedElement) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <div
          className="w-10 h-10 rounded-full border flex items-center justify-center mb-3 text-slate-600"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}
        >
          <Layers size={16} className="animate-pulse" />
        </div>
        <p className="text-[11px] font-semibold text-slate-400">No element selected</p>
        <p className="text-[10px] text-slate-600 mt-1 leading-relaxed max-w-[160px]">
          Click any element in the Live Preview to inspect its styles
        </p>
      </div>
    );
  }

  const { filePath, id, tagName, text, classes } = selectedElement;

  const update = (patch: { text?: string; classes?: string[] }) =>
    onUpdateElement(filePath, id, patch);

  const updateClasses = (prefixes: string[], newVal: string | null) =>
    update({ classes: replaceClass(classes, prefixes, newVal) });

  // Layout values
  const displayVal = findClass(classes, ["flex", "grid", "block", "inline", "hidden"]) ?? "block";
  const flexDirVal = findClass(classes, ["flex-row", "flex-col"]) ?? "flex-row";
  const justifyVal = findClass(classes, ["justify-"]) ?? "";
  const alignVal   = findClass(classes, ["items-"]) ?? "";
  const gapVal     = findClass(classes, ["gap-"]) ?? "";

  // Size values
  const widthVal  = findClass(classes, ["w-"]) ?? "";
  const heightVal = findClass(classes, ["h-"]) ?? "";

  // Background
  const bgVal = findClass(classes, ["bg-"]) ?? "";

  // Typography
  const textSizeVal   = findClass(classes, ["text-xs", "text-sm", "text-base", "text-lg", "text-xl", "text-2xl", "text-3xl", "text-4xl"]) ?? "";
  const fontWeightVal = findClass(classes, ["font-"]) ?? "";
  const textColorVal  = findClass(classes, ["text-"]) ?? "";

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a] overflow-hidden">
      {/* Selection header */}
      <div
        className="shrink-0 px-3 py-2.5 border-b flex items-center gap-2"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className="px-1.5 py-0.5 rounded text-[9px] font-bold font-mono uppercase"
              style={{ background: "rgba(59,130,246,0.15)", color: "#60a5fa" }}
            >
              {tagName.toLowerCase()}
            </span>
            <span className="text-[10px] text-slate-500 truncate">
              {id}
            </span>
          </div>
          {/* Class breadcrumb */}
          <div className="flex flex-wrap gap-1 mt-1.5">
            {classes.slice(0, 4).map((c) => (
              <span
                key={c}
                className="text-[9px] font-mono text-slate-600 px-1 py-0.5 rounded"
                style={{ background: "rgba(255,255,255,0.04)" }}
              >
                .{c}
              </span>
            ))}
            {classes.length > 4 && (
              <span className="text-[9px] text-slate-700">+{classes.length - 4}</span>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-600 hover:text-slate-300 transition-colors p-1 rounded hover:bg-white/5"
        >
          ×
        </button>
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "#2a2a2a transparent" }}>

        {/* Content */}
        {text !== undefined && (
          <Section title="Content">
            <input
              type="text"
              value={text}
              onChange={(e) => update({ text: e.target.value })}
              placeholder="Text content…"
              className="w-full h-7 bg-black/30 border rounded px-2 text-[11px] text-slate-300 placeholder-slate-700 outline-none"
              style={{ borderColor: "rgba(255,255,255,0.08)" }}
            />
          </Section>
        )}

        {/* Layout */}
        <Section title="Layout">
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
            onChange={(v) => updateClasses(["flex", "grid", "block", "inline", "hidden"], v)}
          />

          {displayVal === "flex" && (
            <>
              <div>
                <span className="text-[10px] text-slate-600 block mb-1">Direction</span>
                <ToggleGroup
                  options={[
                    { value: "flex-row",    icon: <ArrowRight size={11} />, title: "Row" },
                    { value: "flex-col",    icon: <ArrowDown size={11} />,  title: "Column" },
                    { value: "flex-row-reverse", icon: <Minus size={11} />, title: "Row Reverse" },
                  ]}
                  active={flexDirVal}
                  onChange={(v) => updateClasses(["flex-row", "flex-col", "flex-row-reverse", "flex-col-reverse"], v)}
                />
              </div>

              <div>
                <span className="text-[10px] text-slate-600 block mb-1">Justify</span>
                <ToggleGroup
                  options={[
                    { value: "justify-start",   icon: <AlignStartVertical size={11} />,   title: "Start" },
                    { value: "justify-center",  icon: <AlignCenterVertical size={11} />,  title: "Center" },
                    { value: "justify-end",     icon: <AlignEndVertical size={11} />,     title: "End" },
                    { value: "justify-between", icon: <Minus size={11} />,                title: "Space Between" },
                  ]}
                  active={justifyVal}
                  onChange={(v) => updateClasses(["justify-"], v)}
                />
              </div>

              <div>
                <span className="text-[10px] text-slate-600 block mb-1">Align</span>
                <ToggleGroup
                  options={[
                    { value: "items-start",   icon: <AlignStartHorizontal size={11} />,   title: "Start" },
                    { value: "items-center",  icon: <AlignCenterHorizontal size={11} />,  title: "Center" },
                    { value: "items-end",     icon: <AlignEndHorizontal size={11} />,     title: "End" },
                    { value: "items-stretch", icon: <AlignCenterHorizontal size={11} />,  title: "Stretch" },
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
                  ...["1","2","3","4","5","6","8","10","12"].map((v) => ({
                    label: `gap-${v}`,
                    value: `gap-${v}`,
                  })),
                ]}
                onChange={(v) => updateClasses(["gap-"], v || null)}
              />
            </>
          )}

          <div className="grid grid-cols-2 gap-2">
            <InlineInput
              label="Width"
              value={widthVal}
              placeholder="auto"
              onChange={(v) => updateClasses(["w-"], v || null)}
            />
            <InlineInput
              label="Height"
              value={heightVal}
              placeholder="auto"
              onChange={(v) => updateClasses(["h-"], v || null)}
            />
          </div>
        </Section>

        {/* Margin & Padding */}
        <Section title="Margin & Padding" defaultOpen={false}>
          <SpacingBox
            classes={classes}
            onChange={(next) => update({ classes: next })}
          />
        </Section>

        {/* Background */}
        <Section title="Background" defaultOpen={false}>
          <div className="grid grid-cols-5 gap-1.5">
            {COLOR_PRESETS.map((preset) => {
              const isActive = classes.includes(preset.tw);
              return (
                <button
                  key={preset.name}
                  type="button"
                  title={preset.name}
                  onClick={() => updateClasses(["bg-"], preset.tw || null)}
                  className={cls([
                    "w-full aspect-square rounded-md border transition-all",
                    isActive ? "ring-2 ring-blue-400 ring-offset-1 ring-offset-[#1a1a1a]" : "",
                  ])}
                  style={{
                    background: preset.bg === "transparent" ? "linear-gradient(135deg,#555 25%,transparent 25%,transparent 75%,#555 75%)" : preset.bg,
                    borderColor: isActive ? "rgba(96,165,250,0.5)" : "rgba(255,255,255,0.08)",
                  }}
                />
              );
            })}
          </div>
          <InlineInput
            label="Custom"
            value={bgVal}
            placeholder="bg-slate-900"
            onChange={(v) => updateClasses(["bg-"], v || null)}
          />
        </Section>

        {/* Typography */}
        <Section title="Typography" defaultOpen={false}>
          <SelectInput
            label="Size"
            value={textSizeVal}
            options={[
              { label: "—", value: "" },
              { label: "xs (12px)",    value: "text-xs" },
              { label: "sm (14px)",    value: "text-sm" },
              { label: "base (16px)",  value: "text-base" },
              { label: "lg (18px)",    value: "text-lg" },
              { label: "xl (20px)",    value: "text-xl" },
              { label: "2xl (24px)",   value: "text-2xl" },
              { label: "3xl (30px)",   value: "text-3xl" },
              { label: "4xl (36px)",   value: "text-4xl" },
            ]}
            onChange={(v) => updateClasses(["text-xs","text-sm","text-base","text-lg","text-xl","text-2xl","text-3xl","text-4xl"], v || null)}
          />

          <SelectInput
            label="Weight"
            value={fontWeightVal}
            options={[
              { label: "—",           value: "" },
              { label: "Thin (100)",  value: "font-thin" },
              { label: "Light (300)", value: "font-light" },
              { label: "Normal",      value: "font-normal" },
              { label: "Medium",      value: "font-medium" },
              { label: "Semibold",    value: "font-semibold" },
              { label: "Bold",        value: "font-bold" },
              { label: "Extrabold",   value: "font-extrabold" },
            ]}
            onChange={(v) => updateClasses(["font-"], v || null)}
          />

          <SelectInput
            label="Align"
            value={findClass(classes, ["text-left","text-center","text-right"]) ?? ""}
            options={[
              { label: "—",        value: "" },
              { label: "Left",     value: "text-left" },
              { label: "Center",   value: "text-center" },
              { label: "Right",    value: "text-right" },
              { label: "Justify",  value: "text-justify" },
            ]}
            onChange={(v) => updateClasses(["text-left","text-center","text-right","text-justify"], v || null)}
          />
        </Section>

        {/* Border Radius */}
        <Section title="Corner Radius" defaultOpen={false}>
          <div className="grid grid-cols-4 gap-1">
            {[
              { label: "None", value: "rounded-none" },
              { label: "SM",   value: "rounded-sm" },
              { label: "MD",   value: "rounded-md" },
              { label: "LG",   value: "rounded-lg" },
              { label: "XL",   value: "rounded-xl" },
              { label: "2XL",  value: "rounded-2xl" },
              { label: "3XL",  value: "rounded-3xl" },
              { label: "Full", value: "rounded-full" },
            ].map((opt) => {
              const active = classes.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateClasses(["rounded-"], active ? null : opt.value)}
                  className={cls([
                    "h-7 text-[10px] rounded border transition-all",
                    active
                      ? "bg-blue-500/15 border-blue-400/30 text-blue-300"
                      : "bg-white/3 border-white/5 text-slate-500 hover:text-slate-300 hover:border-white/10",
                  ])}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </Section>

        {/* Live sync notice */}
        <div className="flex items-start gap-2 mx-3 my-3 p-2.5 rounded-lg"
          style={{ background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.12)" }}>
          <RefreshCw size={11} className="text-purple-400 mt-0.5 animate-spin" style={{ animationDuration: "4s" }} />
          <span className="text-[10px] text-slate-600 leading-relaxed">
            Style changes write to the source file and hot-reload instantly.
          </span>
        </div>
      </div>
    </div>
  );
};
