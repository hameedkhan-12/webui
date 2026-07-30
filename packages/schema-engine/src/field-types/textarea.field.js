export function textareaField(key, label, overrides) {
    return {
        key,
        type: 'textarea',
        label,
        defaultValue: '',
        ...overrides
    };
}
//# sourceMappingURL=textarea.field.js.map