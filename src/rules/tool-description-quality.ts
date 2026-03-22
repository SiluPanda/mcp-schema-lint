import type { ToolDefinition, RuleContext } from '../types.js';
import type { BuiltInRule } from './tool-description-missing.js';

const rule: BuiltInRule = {
  id: 'tool-description-quality',
  category: 'tool',
  defaultSeverity: 'warning',
  description: 'Tool description should be meaningful and not a placeholder.',
  check(tool: ToolDefinition, ctx: RuleContext): void {
    const d = tool.description?.trim();
    if (!d) return;
    if (d.length < 10) {
      ctx.report({
        message: `Tool "${tool.name}" description is too short.`,
        suggestion: 'Write a more descriptive explanation (at least 10 characters).',
      });
    } else if (d.toLowerCase() === tool.name.toLowerCase()) {
      ctx.report({
        message: `Tool "${tool.name}" description just repeats the tool name.`,
      });
    } else if (['none', 'n/a', 'todo', 'tbd'].includes(d.toLowerCase())) {
      ctx.report({
        message: `Tool "${tool.name}" has a placeholder description.`,
      });
    }
  },
};

export default rule;
