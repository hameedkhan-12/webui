export function arrayField(key, label, overrides) {
    return {
        key,
        type: 'array',
        label,
        defaultValue: [],
        ...overrides
    };
}
//# sourceMappingURL=array.field.js.map