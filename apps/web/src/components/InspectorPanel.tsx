"use client";

import React from 'react';
import { Layers, Type, Paintbrush, Sliders, X, Check, Grid, RefreshCw } from 'lucide-react';
import { SelectedElement } from '@repo/shared';

interface InspectorPanelProps {
  selectedElement: SelectedElement | null;
  onClose: () => void;
  onUpdateElement: (filePath: string, elementId: string, updatedProps: { text?: string; classes?: string[] }) => void;
}

// Spacing utility class mappings
const PADDING_OPTIONS = [
  { label: 'None', value: 'p-0' },
  { label: 'Extra Small (4px)', value: 'p-1' },
  { label: 'Small (8px)', value: 'p-2' },
  { label: 'Medium (12px)', value: 'p-3' },
  { label: 'Normal (16px)', value: 'p-4' },
  { label: 'Large (24px)', value: 'p-6' },
  { label: 'Extra Large (32px)', value: 'p-8' },
];

const RADIUS_OPTIONS = [
  { label: 'Sharp', value: 'rounded-none' },
  { label: 'Small', value: 'rounded-sm' },
  { label: 'Normal', value: 'rounded-md' },
  { label: 'Large', value: 'rounded-lg' },
  { label: 'Rounded XL', value: 'rounded-xl' },
  { label: 'Rounded 2XL', value: 'rounded-2xl' },
  { label: 'Pill/Full', value: 'rounded-full' },
];

const COLOR_OPTIONS = [
  { name: 'Slate Deep', bg: 'bg-slate-950', border: 'border-slate-800', text: 'text-white' },
  { name: 'Indigo Light', bg: 'bg-indigo-600', border: 'border-indigo-500', text: 'text-indigo-200' },
  { name: 'Purple Neon', bg: 'bg-purple-600', border: 'border-purple-500', text: 'text-purple-200' },
  { name: 'Blue Cyber', bg: 'bg-blue-600', border: 'border-blue-500', text: 'text-blue-200' },
  { name: 'Emerald Mint', bg: 'bg-emerald-600', border: 'border-emerald-500', text: 'text-emerald-200' },
  { name: 'Crimson Rose', bg: 'bg-rose-600', border: 'border-rose-500', text: 'text-rose-200' },
  { name: 'Amber Gold', bg: 'bg-amber-600', border: 'border-amber-500', text: 'text-amber-200' },
];

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  selectedElement,
  onClose,
  onUpdateElement,
}) => {
  if (!selectedElement) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#070913] p-6 text-center">
        <div className="w-12 h-12 rounded-full border border-white/5 bg-slate-900/40 flex items-center justify-center mb-4 text-slate-500 animate-pulse">
          <Layers size={18} />
        </div>
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Canvas Inspector</h3>
        <p className="text-[10px] text-slate-500 max-w-[180px] leading-relaxed">
          Select any component or element in the Live Preview to inspect its parameters, modify styles visually, and update files.
        </p>
      </div>
    );
  }

  // Find existing class tokens
  const currentClasses = selectedElement.classes;
  const paddingClass = currentClasses.find(c => c.startsWith('p-') || c.startsWith('px-') || c.startsWith('py-')) || 'p-4';
  const radiusClass = currentClasses.find(c => c.startsWith('rounded-')) || 'rounded-none';

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateElement(selectedElement.filePath, selectedElement.id, { text: e.target.value });
  };

  const handleClassToggle = (newClass: string, prefixToRemove: string) => {
    // Filter out old classes matching prefix
    const cleanClasses = currentClasses.filter(c => !c.startsWith(prefixToRemove));
    // Add new class if value is valid
    if (newClass) {
      cleanClasses.push(newClass);
    }
    onUpdateElement(selectedElement.filePath, selectedElement.id, { classes: cleanClasses });
  };

  const handleToggleAlign = (align: 'text-left' | 'text-center' | 'text-right') => {
    const cleanClasses = currentClasses.filter(c => c !== 'text-left' && c !== 'text-center' && c !== 'text-right');
    cleanClasses.push(align);
    onUpdateElement(selectedElement.filePath, selectedElement.id, { classes: cleanClasses });
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#070913] border-l border-white/5">
      {/* Header */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="px-2 py-0.5 rounded bg-purple-600/10 border border-purple-500/20 text-[10px] text-purple-400 font-mono uppercase">
            {selectedElement.tagName}
          </div>
          <span className="text-xs font-semibold text-white">Element Properties</span>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-white/5 text-slate-400 hover:text-white transition-all">
          <X size={14} />
        </button>
      </div>

      {/* Editor Controls */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* Content Field */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Type size={12} />
            <label className="text-[10px] font-semibold uppercase tracking-wider">Content Text</label>
          </div>
          <input
            type="text"
            value={selectedElement.text}
            onChange={handleTextChange}
            placeholder="No content text..."
            className="w-full bg-slate-900 border border-white/5 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/50 transition-all"
          />
        </div>

        {/* Alignment */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Sliders size={12} />
            <label className="text-[10px] font-semibold uppercase tracking-wider">Alignment</label>
          </div>
          <div className="flex rounded-lg bg-slate-900 border border-white/5 p-0.5">
            {(['left', 'center', 'right'] as const).map((align) => {
              const alignClass = `text-${align}` as const;
              const isActive = currentClasses.includes(alignClass) || (align === 'left' && !currentClasses.some(c => c.startsWith('text-') && c !== 'text-xs' && c !== 'text-sm' && c !== 'text-lg' && c !== 'text-xl' && c !== 'text-white' && c !== 'text-slate-400'));
              return (
                <button
                  key={align}
                  onClick={() => handleToggleAlign(alignClass)}
                  className={`flex-1 py-1.5 rounded-md text-[10px] font-medium capitalize transition-all ${
                    isActive
                      ? 'bg-purple-600/10 text-purple-300 border border-purple-500/20'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {align}
                </button>
              );
            })}
          </div>
        </div>

        {/* Spacing (Padding) */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-slate-400">
            <div className="flex items-center gap-1.5">
              <Grid size={12} />
              <label className="text-[10px] font-semibold uppercase tracking-wider">Spacing (Padding)</label>
            </div>
            <span className="text-[10px] font-mono text-purple-400">{paddingClass}</span>
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {PADDING_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleClassToggle(opt.value, 'p-')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-left text-[10px] font-medium transition-all ${
                  paddingClass === opt.value
                    ? 'bg-purple-600/10 border-purple-500/30 text-purple-300'
                    : 'bg-slate-900/30 border-white/5 text-slate-400 hover:bg-slate-900/60'
                }`}
              >
                <span>{opt.label}</span>
                {paddingClass === opt.value && <Check size={10} />}
              </button>
            ))}
          </div>
        </div>

        {/* Corner Radius */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-slate-400">
            <div className="flex items-center gap-1.5">
              <Sliders size={12} />
              <label className="text-[10px] font-semibold uppercase tracking-wider">Corner Radius</label>
            </div>
            <span className="text-[10px] font-mono text-purple-400">{radiusClass}</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {RADIUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleClassToggle(opt.value, 'rounded-')}
                className={`flex items-center justify-between px-3 py-2 rounded-lg border text-left text-[9px] font-medium transition-all ${
                  radiusClass === opt.value
                    ? 'bg-purple-600/10 border-purple-500/30 text-purple-300'
                    : 'bg-slate-900/30 border-white/5 text-slate-400 hover:bg-slate-900/60'
                }`}
              >
                <span>{opt.label}</span>
                {radiusClass === opt.value && <Check size={8} />}
              </button>
            ))}
          </div>
        </div>

        {/* Brand Presets (Colors) */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Paintbrush size={12} />
            <label className="text-[10px] font-semibold uppercase tracking-wider">Color Style Presets</label>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {COLOR_OPTIONS.map((col) => {
              const matchesBg = currentClasses.includes(col.bg);
              return (
                <button
                  key={col.name}
                  onClick={() => {
                    const clean = currentClasses.filter(c => !c.startsWith('bg-') && !c.startsWith('text-indigo-') && !c.startsWith('text-purple-') && !c.startsWith('text-blue-') && !c.startsWith('text-emerald-') && !c.startsWith('text-rose-') && !c.startsWith('text-amber-'));
                    clean.push(col.bg);
                    clean.push(col.text);
                    onUpdateElement(selectedElement.filePath, selectedElement.id, { classes: clean });
                  }}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all ${
                    matchesBg ? 'border-purple-500/40 ring-1 ring-purple-500/20' : 'border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md ${col.bg} border ${col.border} flex items-center justify-center text-[10px] text-white shadow-sm`}>
                    Aa
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] font-semibold text-slate-200">{col.name}</div>
                    <div className="text-[8px] text-slate-500 uppercase tracking-wider font-mono">{col.bg}</div>
                  </div>
                  {matchesBg && <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Visual State Sync Reminder */}
        <div className="p-3 rounded-xl bg-slate-900/30 border border-white/5 flex items-start gap-2.5">
          <RefreshCw size={12} className="text-purple-400 mt-0.5 animate-spin" style={{ animationDuration: '6s' }} />
          <div className="text-[9px] text-slate-500 leading-normal">
            Changes are compiled and rendered instantly. CodeMirror files are automatically formatted with the new properties.
          </div>
        </div>

      </div>
    </div>
  );
};
