import type { ToolDefinition, RuleContext, JSONSchema } from '../types.js';
import type { BuiltInRule } from './tool-description-missing.js';

function checkSchemaProperties(
  toolName: string,
  props: Record<string, JSONSchema>,
  ctx: RuleContext,
  prefix: string
): void {
  for (const [name, schema] of Object.entries(props)) {
    if (!schema.description) {
      ctx.report({
        message: `Parameter "${prefix}${name}" in tool "${toolName}" has no description.`,
      });
    }
    if (schema.properties) {
      checkSchemaProperties(toolName, schema.properties, ctx, `${prefix}${name}.`);
    }
  }
}

const rule: BuiltInRule = {
  id: 'parameter-description-missing',
  category: 'tool',
  defaultSeverity: 'warning',
  description: 'All inputSchema parameters should have descriptions.',
  check(tool: ToolDefinition, ctx: RuleContext): void {
    checkSchemaProperties(tool.name, tool.inputSchema?.properties ?? {}, ctx, '');
  },
};

export default rule;
