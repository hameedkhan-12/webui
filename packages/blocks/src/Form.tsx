import type { BlockProps } from './types.js'

export interface FormField {
    readonly label: string
    readonly placeholder?: string
    readonly type?: 'text' | 'email' | 'tel' | 'textarea'
}

export interface FormProps extends BlockProps {
    readonly title?: string
    readonly fields?: readonly FormField[]
    readonly submitLabel?: string
    readonly auraId?: string
    readonly onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void
}

export function Form({
    title,
    fields = [],
    submitLabel = 'Submit',
    auraId,
    className,
    onSubmit
}: FormProps) {
    const classes = [
        'flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-6',
        className ?? ''
    ].join(' ')

    return (
        <form data-aura-id={auraId} data-aura-type="Form" className={classes} onSubmit={onSubmit}>
            {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
            {fields.map((field) => (
                <label key={field.label} className="flex flex-col gap-1 text-sm font-medium text-gray-700">
                    {field.label}
                    {field.type === 'textarea' ? (
                        <textarea
                            placeholder={field.placeholder}
                            className="rounded-md border border-gray-300 px-3 py-2 text-sm font-normal focus:border-indigo-500 focus:outline-none"
                            rows={4}
                        />
                    ) : (
                        <input
                            type={field.type ?? 'text'}
                            placeholder={field.placeholder}
                            className="rounded-md border border-gray-300 px-3 py-2 text-sm font-normal focus:border-indigo-500 focus:outline-none"
                        />
                    )}
                </label>
            ))}
            <button
                type="submit"
                className="mt-2 inline-flex items-center justify-center rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
            >
                {submitLabel}
            </button>
        </form>
    )
}