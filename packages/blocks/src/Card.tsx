import type { BlockProps } from './types.js'

export interface CardProps extends BlockProps {
    readonly title: string
    readonly description?: string
    readonly imageUrl?: string
    readonly elevated?: boolean
    readonly auraId?: string
}

export function Card({
    title,
    description,
    imageUrl,
    elevated = false,
    auraId,
    className,
    children
}: CardProps) {
    const classes = [
        'rounded-lg border border-gray-200 bg-white overflow-hidden',
        elevated ? 'shadow-lg' : 'shadow-sm',
        className ?? ''
    ].join(' ')

    return (
        <div data-aura-id={auraId} data-aura-type="Card" className={classes}>
            {imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt={title} className="h-40 w-full object-cover" />
            )}
            <div className="p-5">
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                {description && <p className="mt-2 text-sm text-gray-600">{description}</p>}
                {children}
            </div>
        </div>
    )
}