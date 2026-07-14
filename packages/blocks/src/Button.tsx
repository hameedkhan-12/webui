import type { BlockProps } from './types.js'

export interface ButtonProps extends BlockProps {
    readonly label: string
    readonly variant?: 'primary' | 'secondary' | 'ghost'
    readonly disabled?: boolean
    readonly href?: string
    readonly auraId?: string
    readonly onClick?: () => void
}

const VARIANT_CLASSES: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-500',
    secondary: 'bg-white text-indigo-600 border border-indigo-600 hover:bg-indigo-50',
    ghost: 'bg-transparent text-indigo-600 hover:bg-indigo-50'
}

export function Button({
    label,
    variant = 'primary',
    disabled = false,
    href,
    onClick,
    auraId,
    className
}: ButtonProps) {
    const classes = [
        'inline-flex items-center justify-center rounded-md px-5 py-2.5 text-sm font-semibold transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANT_CLASSES[variant],
        className ?? ''
    ].join(' ')

    if (href && !disabled) {
        return (
            <a
                data-aura-id={auraId}
                data-aura-type="Button"
                href={href}
                className={classes}
            >
                {label}
            </a>
        )
    }

    return (
        <button
            data-aura-id={auraId}
            data-aura-type="Button"
            type="button"
            disabled={disabled}
            onClick={onClick}
            className={classes}
        >
            {label}
        </button>
    )
}