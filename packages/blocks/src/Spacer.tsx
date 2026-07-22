import type { BlockProps } from './types.js'

export interface SpacerProps extends BlockProps {
    readonly size?: 'sm' | 'md' | 'lg' | 'xl'
    readonly auraId?: string
}

const SIZE_CLASSES: Record<NonNullable<SpacerProps['size']>, string> = {
    sm: 'h-4',
    md: 'h-8',
    lg: 'h-16',
    xl: 'h-32'
}

export function Spacer({
    size = 'md',
    auraId,
    className
}: SpacerProps) {
    const classes = [SIZE_CLASSES[size], 'w-full', className ?? ''].join(' ')

    return <div data-aura-id={auraId} data-aura-type="Spacer" className={classes} aria-hidden="true" />
}