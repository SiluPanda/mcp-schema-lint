import type { ToolDefinition, RuleContext } from '../types.js';
import type { BuiltInRule } from './tool-description-missing.js';

const rule: BuiltInRule = {
  id: 'tool-annotations-missing',
  category: 'tool',
  defaultSeverity: 'warning',
  description: 'Tool should have annotations describing its behavior.',
  check(tool: ToolDefinition, ctx: RuleContext): void {
    if (!tool.annotations) {
      ctx.report({
        message: `Tool "${tool.name}" is missing annotations.`,
        suggestion: 'Add readOnlyHint, destructiveHint, or idempotentHint.',
      });
    }
  },
};

export default rule;
