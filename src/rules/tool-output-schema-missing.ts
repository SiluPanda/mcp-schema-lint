import type { ToolDefinition, RuleContext } from '../types.js';
import type { BuiltInRule } from './tool-description-missing.js';

const rule: BuiltInRule = {
  id: 'tool-output-schema-missing',
  category: 'tool',
  defaultSeverity: 'info',
  description: 'Tool should have an outputSchema to document return format.',
  check(tool: ToolDefinition, ctx: RuleContext): void {
    if (!tool.outputSchema) {
      ctx.report({
        message: `Tool "${tool.name}" has no outputSchema.`,
        suggestion: 'Consider adding an outputSchema to document the return format.',
      });
    }
  },
};

export default rule;
