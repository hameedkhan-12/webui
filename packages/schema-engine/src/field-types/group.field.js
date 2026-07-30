export function groupField(key, label, overrides) {
    return {
        key,
        type: 'group',
        label,
        defaultValue: {},
        ...overrides
    };
}
//# sourceMappingURL=group.field.js.map