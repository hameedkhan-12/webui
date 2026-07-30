export function selectField(key, label, options, overrides) {
    return {
        key,
        type: 'select',
        label,
        options,
        defaultValue: options[0]?.value ?? '',
        ...overrides
    };
}
//# sourceMappingURL=select.field.js.map