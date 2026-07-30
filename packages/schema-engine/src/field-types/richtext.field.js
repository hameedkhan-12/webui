export function richtextField(key, label, overrides) {
    return {
        key,
        type: 'richtext',
        label,
        defaultValue: '',
        ...overrides
    };
}
//# sourceMappingURL=richtext.field.js.map