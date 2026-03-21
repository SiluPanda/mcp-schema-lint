import type { ToolDefinition, RuleContext } from '../types.js';
import type { BuiltInRule } from './tool-description-missing.js';

const rule: BuiltInRule = {
  id: 'tool-input-schema-missing',
  category: 'tool',
  defaultSeverity: 'error',
  description: 'Tool must have an inputSchema.',
  check(tool: ToolDefinition, ctx: RuleContext): void {
    if (!tool.inputSchema) {
      ctx.report({
        message: `Tool "${tool.name}" has no inputSchema.`,
        suggestion: 'Add an inputSchema defining expected parameters.',
      });
    }
  },
};

export default rule;
