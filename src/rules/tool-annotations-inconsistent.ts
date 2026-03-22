import type { ToolDefinition, RuleContext } from '../types.js';
import type { BuiltInRule } from './tool-description-missing.js';

const rule: BuiltInRule = {
  id: 'tool-annotations-inconsistent',
  category: 'tool',
  defaultSeverity: 'error',
  description: 'Tool annotations must not be logically contradictory.',
  check(tool: ToolDefinition, ctx: RuleContext): void {
    const a = tool.annotations;
    if (a?.readOnlyHint && a?.destructiveHint) {
      ctx.report({
        message: `Tool "${tool.name}" cannot be both readOnly and destructive.`,
      });
    }
    if (a?.readOnlyHint && a?.idempotentHint === false) {
      ctx.report({
        message: `Tool "${tool.name}" readOnly tools should be idempotent.`,
      });
    }
  },
};

export default rule;
