import type { BlockProps } from './types.js'

export interface NavLink {
    readonly label: string
    readonly href: string
}

export interface NavProps extends BlockProps {
    readonly brand?: string
    readonly links?: readonly NavLink[]
    readonly auraId?: string
}

export function Nav({
    brand = 'Brand',
    links = [],
    auraId,
    className
}: NavProps) {
    const classes = [
        'flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white',
        className ?? ''
    ].join(' ')

    return (
        <nav data-aura-id={auraId} data-aura-type="Nav" className={classes}>
            <span className="text-lg font-bold text-gray-900">{brand}</span>
            <ul className="flex items-center gap-6">
                {links.map((link) => (
                    <li key={link.href}>
                        <a href={link.href} className="text-sm font-medium text-gray-600 hover:text-gray-900">
                            {link.label}
                        </a>
                    </li>
                ))}
            </ul>
        </nav>
    )
}