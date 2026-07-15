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
 * Renders an editing form for whatever is currently selected in the
 * canvas, generated from that block's ComponentSchema. There is no
 * per-block-type UI code here -- adding a new schema field type to a
 * block automatically gets an editor here, and adding a new block never
 * requires touching this file.
 */
export function SchemaInspectorPanel({ nodes, updateProp }: SchemaInspectorPanelProps) {
    const { selectedId } = useDesignMode()
    const runtime = useAuraRuntime()
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

    if (!selectedId) {
        return (
            <div className="p-4 text-sm text-muted-foreground">
                Select an element on the canvas to edit it.
            </div>
        )
    }

    const node = findNodeById(nodes, selectedId)
    if (!node) {
        return (
            <div className="p-4 text-sm text-muted-foreground">
                The selected element no longer exists.
            </div>
        )
    }

    const schema = runtime.schemas.get(node.type)
    const meta = runtime.components.get(node.type)

    if (!schema || schema.fields.length === 0) {
        return (
            <div className="p-4 text-sm text-muted-foreground">
                {meta?.name ?? node.type} has no editable fields yet.
            </div>
        )
    }

    function handleChange(field: SchemaField, value: unknown) {
        const errors = updateProp(node!.id, field.key, value)
        setFieldErrors(prev => ({
            ...prev,
            [field.key]: errors.length > 0 ? errors[0]!.message : ''
        }))
    }

    return (
        <div className="flex flex-col gap-4 p-4">
            <div>
                <h3 className="text-sm font-semibold text-foreground">{meta?.name ?? node.type}</h3>
                <p className="text-xs text-muted-foreground">{node.id}</p>
            </div>

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
    )
}

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
        <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-foreground">
                {field.label}
                {field.required ? <span className="text-red-500"> *</span> : null}
            </span>

            {renderInput(field, value, onChange)}

            {field.description ? (
                <span className="text-xs text-muted-foreground">{field.description}</span>
            ) : null}
            {error ? <span className="text-xs text-red-500">{error}</span> : null}
        </label>
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
                />
            )

        case 'textarea':
        case 'richtext':
            return (
                <Textarea
                    value={typeof value === 'string' ? value : ''}
                    onChange={e => onChange(e.target.value)}
                    rows={4}
                />
            )

        case 'number':
            return (
                <Input
                    type="number"
                    value={typeof value === 'number' ? value : ''}
                    onChange={e => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                />
            )

        case 'boolean':
            return (
                <input
                    type="checkbox"
                    checked={Boolean(value)}
                    onChange={e => onChange(e.target.checked)}
                    className="h-4 w-4 rounded border-input"
                />
            )

        case 'color':
            return (
                <div className="flex items-center gap-2">
                    <input
                        type="color"
                        value={typeof value === 'string' && value ? value : '#000000'}
                        onChange={e => onChange(e.target.value)}
                        className="h-9 w-10 rounded border border-input bg-background"
                    />
                    <Input
                        type="text"
                        value={typeof value === 'string' ? value : ''}
                        onChange={e => onChange(e.target.value)}
                        placeholder="#000000"
                    />
                </div>
            )

        case 'select':
            return (
                <select
                    value={typeof value === 'string' ? value : ''}
                    onChange={e => onChange(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                >
                    <option value="" disabled>
                        Select…
                    </option>
                    {(field.options ?? []).map(opt => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            )

        case 'image':
            return (
                <Input
                    type="text"
                    value={typeof value === 'string' ? value : ''}
                    onChange={e => onChange(e.target.value)}
                    placeholder="Image URL"
                />
            )

        case 'slot':
            return (
                <p className="text-xs italic text-muted-foreground">
                    Edit this by dragging blocks onto the canvas.
                </p>
            )

        case 'group':
        case 'array':
        case 'custom':
        default:
            return (
                <p className="text-xs italic text-muted-foreground">
                    Not yet supported in the inspector panel.
                </p>
            )
    }
}