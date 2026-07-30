export function validateField(field, value) {
    const errors = [];
    // Required check
    if (field.required) {
        const isEmpty = value === undefined ||
            value === null ||
            value === '' ||
            (Array.isArray(value) && value.length === 0);
        if (isEmpty) {
            errors.push({ field: field.key, message: `'${field.label}' is required.` });
            return errors; // Early return — further checks are meaningless if value is absent
        }
    }
    // Skip further validation if no value
    if (value === undefined || value === null)
        return errors;
    // Select: value must be one of the available options (always checked, not just with validation)
    if (field.type === 'select' && field.options) {
        const validValues = field.options.map(o => o.value);
        if (!validValues.includes(String(value))) {
            errors.push({ field: field.key, message: `'${field.label}' must be one of: ${validValues.join(', ')}.` });
        }
    }
    const validation = field.validation;
    if (!validation)
        return errors;
    // Number range checks
    if (field.type === 'number' && typeof value === 'number') {
        if (validation.min !== undefined && value < validation.min) {
            errors.push({ field: field.key, message: `'${field.label}' must be at least ${validation.min}.` });
        }
        if (validation.max !== undefined && value > validation.max) {
            errors.push({ field: field.key, message: `'${field.label}' must be at most ${validation.max}.` });
        }
    }
    // Text length checks (min/max used as min/maxLength for text)
    if ((field.type === 'text' || field.type === 'textarea' || field.type === 'richtext') && typeof value === 'string') {
        if (validation.min !== undefined && value.length < validation.min) {
            errors.push({ field: field.key, message: `'${field.label}' must be at least ${validation.min} characters.` });
        }
        if (validation.max !== undefined && value.length > validation.max) {
            errors.push({ field: field.key, message: `'${field.label}' must be at most ${validation.max} characters.` });
        }
        if (validation.pattern) {
            const regex = new RegExp(validation.pattern);
            if (!regex.test(value)) {
                errors.push({ field: field.key, message: `'${field.label}' does not match the required pattern.` });
            }
        }
    }
    return errors;
}
export function validate(schema, data) {
    const allErrors = [];
    for (const field of schema.fields) {
        const value = data[field.key];
        const fieldErrors = validateField(field, value);
        allErrors.push(...fieldErrors);
    }
    return {
        valid: allErrors.length === 0,
        errors: allErrors
    };
}
//# sourceMappingURL=schema.validator.js.map