import type { BlockProps } from './types.js'

export interface ImageProps extends BlockProps {
    readonly src: string
    readonly alt: string
    readonly rounded?: boolean
    readonly aspectRatio?: 'square' | 'video' | 'auto'
    readonly auraId?: string
}

const ASPECT_CLASSES: Record<NonNullable<ImageProps['aspectRatio']>, string> = {
    square: 'aspect-square',
    video: 'aspect-video',
    auto: ''
}

export function Image({
    src,
    alt,
    rounded = false,
    aspectRatio = 'auto',
    auraId,
    className
}: ImageProps) {
    const classes = [
        'w-full object-cover',
        ASPECT_CLASSES[aspectRatio],
        rounded ? 'rounded-lg' : '',
        className ?? ''
    ].join(' ')

    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            data-aura-id={auraId}
            data-aura-type="Image"
            src={src}
            alt={alt}
            className={classes}
        />
    )
}