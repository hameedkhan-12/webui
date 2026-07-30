import type { ComponentSchema, SchemaField } from '@repo/shared';
export interface ValidationError {
    readonly field: string;
    readonly message: string;
}
export interface ValidationResult {
    readonly valid: boolean;
    readonly errors: readonly ValidationError[];
}
export declare function validateField(field: SchemaField, value: unknown): ValidationError[];
export declare function validate(schema: ComponentSchema, data: Record<string, unknown>): ValidationResult;
//# sourceMappingURL=schema.validator.d.ts.map