export function customField(key, label, overrides) {
    return {
        key,
        type: 'custom',
        label,
        defaultValue: null,
        ...overrides
    };
}
//# sourceMappingURL=custom.field.js.map