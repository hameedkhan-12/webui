import type { BlockProps } from './types.js'

export interface GridProps extends BlockProps {
    readonly columns?: 1 | 2 | 3 | 4
    readonly gap?: 'sm' | 'md' | 'lg'
    readonly auraId?: string
}

const COLUMN_CLASSES: Record<NonNullable<GridProps['columns']>, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
}

const GAP_CLASSES: Record<NonNullable<GridProps['gap']>, string> = {
    sm: 'gap-2',
    md: 'gap-6',
    lg: 'gap-10'
}

export function Grid({
    columns = 2,
    gap = 'md',
    auraId,
    className,
    children
}: GridProps) {
    const classes = [
        'grid',
        COLUMN_CLASSES[columns],
        GAP_CLASSES[gap],
        className ?? ''
    ].join(' ')

    return (
        <div data-aura-id={auraId} data-aura-type="Grid" className={classes}>
            {children}
        </div>
    )
}