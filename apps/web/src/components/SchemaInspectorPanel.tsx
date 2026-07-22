'use client'

import { useState } from 'react'
import type { ValidationError } from '@aura/schema-engine'
import type { SchemaField } from '@repo/shared'
import { findNodeById, useAuraRuntime, useDesignMode, type ContentNode } from '@aura/renderer'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export interface SchemaInspectorPanelProps {
  readonly nodes: readonly ContentNode[]
  readonly updateProp: (
    nodeId: string,
    propKey: string,
    value: unknown
  ) => readonly ValidationError[]
}

/**
 * Phase 3: Schema-driven prop editor.
 *
 * Renders one form control per SchemaField based on the selected node's
 * ComponentSchema. Every edit goes through ContentTreeStore.updateProp which:
 *   1. Validates against the schema (validateField in @aura/schema-engine).
 *   2. On success, produces an immutable new tree object.
 *   3. Notifies all useSyncExternalStore subscribers (Canvas re-renders).
 *
 * No file writes, no WebContainer round-trips — purely local React state.
 */
export function SchemaInspectorPanel({ nodes, updateProp }: SchemaInspectorPanelProps) {
  const { selectedId } = useDesignMode()
  const runtime = useAuraRuntime()
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // ── Empty state ──────────────────────────────────────────────────────────

  if (!selectedId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
          <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zm-7.518-.267A8.25 8.25 0 1120.25 10.5M8.288 14.212A5.25 5.25 0 1117.25 10.5" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-700">Nothing selected</p>
        <p className="text-xs text-gray-400">Click a block on the canvas to inspect and edit its props.</p>
      </div>
    )
  }

  const node = findNodeById(nodes, selectedId)
  if (!node) {
    return (
      <div className="p-4 text-sm text-gray-400">
        The selected element no longer exists.
      </div>
    )
  }

  const schema = runtime.schemas.get(node.type)
  const meta = runtime.components.get(node.type)

  if (!schema || schema.fields.length === 0) {
    return (
      <div className="p-4 text-sm text-gray-400">
        {meta?.name ?? node.type} has no editable fields yet.
      </div>
    )
  }

  function handleChange(field: SchemaField, value: unknown) {
    const errors = updateProp(node!.id, field.key, value)
    
    // TODO (Phase 4/5): Wire PersistenceService update with a debounced delay.
    // PersistenceService currently expects a file path, line number, and auraId
    // to execute AST-based code modifications (UpdatePropOperation). For now,
    // updates are applied purely in-memory to the content-tree-store for
    // instantaneous preview, and actual filesystem/database synchronization is
    // deferred to Phase 4 (tree composition) and Phase 5 (AST synchronization).

    setFieldErrors(prev => ({
      ...prev,
      [field.key]: errors.length > 0 ? (errors[0]!.message) : ''
    }))
  }

  return (
    <div className="flex flex-col gap-1 overflow-y-auto">
      {/* Block header */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-indigo-100 text-xs font-bold text-indigo-700">
            {(meta?.name ?? node.type).charAt(0)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900">{meta?.name ?? node.type}</p>
            <p className="truncate font-mono text-[10px] text-gray-400">{node.id}</p>
          </div>
        </div>
      </div>

      {/* Fields */}
      <div className="flex flex-col gap-4 p-4">
        {schema.fields.map(field => (
          <FieldEditor
            key={field.key}
            field={field}
            value={node!.props[field.key]}
            error={fieldErrors[field.key]}
            onChange={value => handleChange(field, value)}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Field editor ─────────────────────────────────────────────────────────────

function FieldEditor({
  field,
  value,
  error,
  onChange
}: {
  readonly field: SchemaField
  readonly value: unknown
  readonly error: string | undefined
  readonly onChange: (value: unknown) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-1 text-xs font-medium text-gray-700">
        {field.label}
        {field.required ? <span className="text-red-500">*</span> : null}
      </label>

      {renderInput(field, value, onChange)}

      {field.description ? (
        <span className="text-[11px] text-gray-400">{field.description}</span>
      ) : null}
      {error ? <span className="text-[11px] font-medium text-red-500">{error}</span> : null}
    </div>
  )
}

function renderInput(
  field: SchemaField,
  value: unknown,
  onChange: (value: unknown) => void
) {
  switch (field.type) {
    case 'text':
      return (
        <Input
          type="text"
          value={typeof value === 'string' ? value : ''}
          onChange={e => onChange(e.target.value)}
          className="h-8 text-sm"
        />
      )

    case 'textarea':
    case 'richtext':
      return (
        <Textarea
          value={typeof value === 'string' ? value : ''}
          onChange={e => onChange(e.target.value)}
          rows={4}
          className="text-sm"
        />
      )

    case 'number':
      return (
        <Input
          type="number"
          value={typeof value === 'number' ? value : ''}
          onChange={e => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
          className="h-8 text-sm"
        />
      )

    case 'boolean':
      return (
        <label className="flex cursor-pointer items-center gap-2">
          <div className="relative">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={e => onChange(e.target.checked)}
              className="sr-only"
            />
            <div
              className={[
                'h-5 w-9 rounded-full transition-colors',
                Boolean(value) ? 'bg-indigo-500' : 'bg-gray-200'
              ].join(' ')}
            />
            <div
              className={[
                'absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
                Boolean(value) ? 'translate-x-4' : 'translate-x-0'
              ].join(' ')}
            />
          </div>
          <span className="text-xs text-gray-600">{Boolean(value) ? 'On' : 'Off'}</span>
        </label>
      )

    case 'color':
      return (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={typeof value === 'string' && value ? value : '#000000'}
            onChange={e => onChange(e.target.value)}
            className="h-8 w-10 cursor-pointer rounded border border-gray-200 bg-white p-0.5"
          />
          <Input
            type="text"
            value={typeof value === 'string' ? value : ''}
            onChange={e => onChange(e.target.value)}
            placeholder="#000000"
            className="h-8 flex-1 text-sm"
          />
        </div>
      )

    case 'select':
      const stringValue = value !== undefined && value !== null ? String(value) : ''
      return (
        <select
          value={stringValue}
          onChange={e => {
            const rawVal = e.target.value
            const isNumeric = typeof field.defaultValue === 'number' || typeof value === 'number'
            onChange(isNumeric ? Number(rawVal) : rawVal)
          }}
          className="flex h-8 w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-sm text-gray-900 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
        >
          <option value="" disabled>Select…</option>
          {(field.options ?? []).map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )

    case 'image':
      return (
        <Input
          type="text"
          value={typeof value === 'string' ? value : ''}
          onChange={e => onChange(e.target.value)}
          placeholder="https://example.com/image.jpg"
          className="h-8 text-sm"
        />
      )

    case 'array':
      // Array editor: each item is a plain object with string values.
      // Used by Nav/Footer's `links` (label+href) and Form's `fields`
      // (label+placeholder+type). The item shape is inferred from the
      // first existing item or the field.defaultValue's first element.
      return (
        <ArrayFieldEditor
          value={value}
          onChange={onChange}
        />
      )

    case 'slot':
      // TODO (Phase 4/5): Slots are child-node compositions in the tree.
      // Editing them requires drag-and-drop tree manipulation, not a simple
      // prop write. Skip for now and let the user use the canvas directly.
      return (
        <p className="text-xs italic text-gray-400">
          Edit slot content by selecting child blocks on the canvas.
        </p>
      )

    case 'group':
    case 'custom':
    default:
      // TODO (Phase 4/5): group fields contain nested SchemaField arrays and
      // need a recursive editor UI; custom fields are plugin-supplied. Both are
      // out of scope for Phase 3's single-field prop editing.
      return (
        <p className="text-xs italic text-gray-400">
          This field type ({field.type}) is not yet editable in the inspector.
        </p>
      )
  }
}

// ─── Array field editor ───────────────────────────────────────────────────────

/**
 * Simple repeatable-list editor for `array` schema fields.
 *
 * Supports any array of plain objects with string values (e.g. Nav/Footer
 * links: { label, href }; Form fields: { label, placeholder, type }).
 * The set of sub-keys is inferred from the first item or the current value.
 */
function ArrayFieldEditor({
  value,
  onChange,
}: {
  readonly value: unknown
  readonly onChange: (value: unknown) => void
}) {
  const items = Array.isArray(value)
    ? (value as Record<string, string>[])
    : []

  // Derive sub-keys from the first item (or empty list if none yet)
  const subKeys: string[] = items.length > 0
    ? Object.keys(items[0]!)
    : []

  function updateItem(index: number, key: string, newValue: string) {
    const next = items.map((item, i) =>
      i === index ? { ...item, [key]: newValue } : item
    )
    onChange(next)
  }

  function addItem() {
    const template: Record<string, string> = {}
    for (const k of subKeys) template[k] = ''
    // If no existing items yet, start with sensible defaults
    const newItem = subKeys.length > 0 ? template : { label: '', href: '' }
    onChange([...items, newItem])
  }

  function removeItem(index: number) {
    onChange(items.filter((_, i) => i !== index))
  }

  // If there are no items yet and no subKeys, show default sub-fields
  const effectiveSubKeys = subKeys.length > 0 ? subKeys : ['label', 'href']

  return (
    <div className="flex flex-col gap-2">
      {items.length === 0 ? (
        <p className="text-[11px] italic text-gray-400">No items yet. Click + to add one.</p>
      ) : (
        items.map((item, index) => (
          <div key={index} className="rounded-md border border-gray-200 bg-gray-50 p-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-medium text-gray-500">Item {index + 1}</span>
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="flex h-5 w-5 items-center justify-center rounded text-gray-400 hover:bg-red-50 hover:text-red-500"
                aria-label="Remove item"
              >
                ×
              </button>
            </div>
            <div className="flex flex-col gap-1.5">
              {effectiveSubKeys.map(key => (
                <div key={key} className="flex items-center gap-2">
                  <label className="w-16 shrink-0 text-[10px] text-gray-400 capitalize">{key}</label>
                  <input
                    type="text"
                    value={typeof item[key] === 'string' ? item[key] : ''}
                    onChange={e => updateItem(index, key, e.target.value)}
                    className="h-7 min-w-0 flex-1 rounded border border-gray-200 bg-white px-2 text-xs focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  />
                </div>
              ))}
            </div>
          </div>
        ))
      )}
      <button
        type="button"
        onClick={addItem}
        className="flex h-7 items-center justify-center gap-1 rounded-md border border-dashed border-gray-300 text-xs text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
      >
        <span className="text-base leading-none">+</span> Add item
      </button>
    </div>
  )
}