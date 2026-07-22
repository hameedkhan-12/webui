import type { BlockProps } from './types.js'

export interface ContainerProps extends BlockProps {
    readonly maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
    readonly auraId?: string
}

const MAX_WIDTH_CLASSES: Record<NonNullable<ContainerProps['maxWidth']>, string> = {
    sm: 'max-w-2xl',
    md: 'max-w-4xl',
    lg: 'max-w-6xl',
    xl: 'max-w-7xl',
    full: 'max-w-full'
}

export function Container({
    maxWidth = 'lg',
    auraId,
    className,
    children
}: ContainerProps) {
    const classes = [
        'mx-auto w-full px-4',
        MAX_WIDTH_CLASSES[maxWidth],
        className ?? ''
    ].join(' ')

    return (
        <div data-aura-id={auraId} data-aura-type="Container" className={classes}>
            {children}
        </div>
    )
}