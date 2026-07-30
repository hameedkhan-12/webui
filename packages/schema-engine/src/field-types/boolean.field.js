export function booleanField(key, label, overrides) {
    return {
        key,
        type: 'boolean',
        label,
        defaultValue: false,
        ...overrides
    };
}
//# sourceMappingURL=boolean.field.js.map