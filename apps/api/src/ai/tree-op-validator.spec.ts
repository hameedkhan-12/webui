import { validateNodeSchema, validateTreeOperations } from './tree-op-validator';

describe('tree-op-validator', () => {
  describe('validateNodeSchema', () => {
    it('should validate a correct block structure', () => {
      const node = {
        id: 'test-button',
        type: 'Button',
        props: {
          label: 'Click Here',
          variant: 'secondary',
        },
      };

      const result = validateNodeSchema(node);
      expect(result.valid).toBe(true);
    });

    it('should reject unregistered block types', () => {
      const node = {
        id: 'test-unknown',
        type: 'UnknownBlock',
        props: {},
      };

      const result = validateNodeSchema(node);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('is not registered');
    });

    it('should reject missing id or type', () => {
      const node1 = {
        type: 'Button',
        props: {},
      };
      const node2 = {
        id: 'button-1',
        props: {},
      };

      expect(validateNodeSchema(node1).valid).toBe(false);
      expect(validateNodeSchema(node2).valid).toBe(false);
    });

    it('should reject invalid prop type per schema validation rules', () => {
      const node = {
        id: 'test-button',
        type: 'Button',
        props: {
          label: '', // button schema requires label to be a non-empty string? Let's check: required: true, defaultValue: 'Click me'
        },
      };

      const result = validateNodeSchema(node);
      // Wait, let's see if required check fails for empty string.
      // Yes, required check in validateField: isEmpty if value === ''
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('failed validation for prop');
    });

    it('should recursively validate children', () => {
      const node = {
        id: 'grid-1',
        type: 'Grid',
        props: {
          columns: 3,
        },
        children: [
          {
            id: 'card-1',
            type: 'Card',
            props: {
              title: 'Card Title',
            },
          },
          {
            id: 'invalid-card',
            type: 'Card',
            props: {
              title: '', // fails required: true
            },
          },
        ],
      };

      const result = validateNodeSchema(node);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('failed validation for prop "title"');
    });
  });

  describe('validateTreeOperations', () => {
    it('should accept valid insert operations', () => {
      const ops = [
        {
          kind: 'insert',
          parentId: 'root',
          slot: 'children',
          node: {
            id: 'card-1',
            type: 'Card',
            props: {
              title: 'Card title',
            },
          },
        },
      ];

      const result = validateTreeOperations(ops);
      expect(result.valid).toBe(true);
      expect(result.ops).toBeDefined();
      expect(result.ops![0]?.kind).toBe('insert');
    });

    it('should accept valid updateProps operations', () => {
      const ops = [
        {
          kind: 'updateProps',
          nodeId: 'card-1',
          props: {
            title: 'Updated title',
          },
        },
      ];

      const result = validateTreeOperations(ops);
      expect(result.valid).toBe(true);
      expect(result.ops![0]?.kind).toBe('updateProps');
    });

    it('should reject invalid operation kind', () => {
      const ops = [
        {
          kind: 'delete',
          nodeId: 'card-1',
        },
      ];

      const result = validateTreeOperations(ops);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('invalid kind');
    });
  });
});
