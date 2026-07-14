import React from 'react'
import type { BlockProps } from './types.js'

export interface HeroProps extends BlockProps {
    readonly title: string
    readonly subtitle?: string
    readonly ctaLabel?: string
    readonly auraId?: string
}

export function Hero({
    title,
    subtitle,
    ctaLabel,
    auraId,
    className
}: HeroProps) {
    return (
        <div
            data-aura-id={auraId}
            data-aura-type="Hero"
            className={`py-12 px-6 text-center bg-gray-50 rounded-lg ${className ?? ''}`}
        >
            <h1 className="text-4xl font-bold text-gray-900">{title}</h1>
            {subtitle && <p className="mt-4 text-lg text-gray-600">{subtitle}</p>}
            {ctaLabel && (
                <button
                    type="button"
                    className="mt-6 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-500 transition-colors"
                >
                    {ctaLabel}
                </button>
            )}
        </div>
    )
}
