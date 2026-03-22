import type { ToolDefinition, RuleContext, JSONSchema } from '../types.js';
import type { BuiltInRule } from './tool-description-missing.js';

const COMPOSITE_KEYS = ['$ref', 'oneOf', 'anyOf', 'allOf'];

function checkPropertyTypes(
  toolName: string,
  props: Record<string, JSONSchema>,
  ctx: RuleContext,
  prefix: string
): void {
  for (const [name, schema] of Object.entries(props)) {
    const hasComposite = COMPOSITE_KEYS.some((k) => k in schema);
    if (!schema.type && !hasComposite) {
      ctx.report({
        message: `Parameter "${prefix}${name}" in tool "${toolName}" has no type defined.`,
        suggestion: 'Add a "type" field (e.g., "string", "number", "boolean", "object", "array").',
      });
    }
    if (schema.properties) {
      checkPropertyTypes(toolName, schema.properties, ctx, `${prefix}${name}.`);
    }
  }
}

const rule: BuiltInRule = {
  id: 'parameter-type-missing',
  category: 'tool',
  defaultSeverity: 'error',
  description: 'All inputSchema parameters should have a type.',
  check(tool: ToolDefinition, ctx: RuleContext): void {
    checkPropertyTypes(tool.name, tool.inputSchema?.properties ?? {}, ctx, '');
  },
};

export default rule;
