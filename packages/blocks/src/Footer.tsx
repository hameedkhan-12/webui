import type { BlockProps } from './types.js'
import type { NavLink } from './Nav.js'

export interface FooterProps extends BlockProps {
    readonly copyrightText?: string
    readonly links?: readonly NavLink[]
    readonly auraId?: string
}

export function Footer({
    copyrightText = `© ${new Date().getFullYear()} Your Company. All rights reserved.`,
    links = [],
    auraId,
    className
}: FooterProps) {
    const classes = [
        'flex flex-col items-center gap-4 border-t border-gray-200 bg-white px-6 py-8 text-sm text-gray-500 sm:flex-row sm:justify-between',
        className ?? ''
    ].join(' ')

    return (
        <footer data-aura-id={auraId} data-aura-type="Footer" className={classes}>
            <span>{copyrightText}</span>
            <ul className="flex items-center gap-6">
                {links.map((link) => (
                    <li key={link.href}>
                        <a href={link.href} className="hover:text-gray-900">
                            {link.label}
                        </a>
                    </li>
                ))}
            </ul>
        </footer>
    )
}