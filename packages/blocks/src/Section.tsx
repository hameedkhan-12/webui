import type { BlockProps } from './types.js'

export interface SectionProps extends BlockProps {
    readonly background?: 'default' | 'muted' | 'dark'
    readonly padding?: 'sm' | 'md' | 'lg'
    readonly auraId?: string
}

const BACKGROUND_CLASSES: Record<NonNullable<SectionProps['background']>, string> = {
    default: 'bg-white text-gray-900',
    muted: 'bg-gray-50 text-gray-900',
    dark: 'bg-gray-900 text-white'
}

const PADDING_CLASSES: Record<NonNullable<SectionProps['padding']>, string> = {
    sm: 'py-8 px-4',
    md: 'py-16 px-6',
    lg: 'py-24 px-8'
}

export function Section({
    background = 'default',
    padding = 'md',
    auraId,
    className,
    children
}: SectionProps) {
    const classes = [
        BACKGROUND_CLASSES[background],
        PADDING_CLASSES[padding],
        className ?? ''
    ].join(' ')

    return (
        <section data-aura-id={auraId} data-aura-type="Section" className={classes}>
            {children}
        </section>
    )
}