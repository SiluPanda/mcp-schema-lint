import type { ToolDefinition, RuleContext } from '../types.js';
import type { BuiltInRule } from './tool-description-missing.js';

const rule: BuiltInRule = {
  id: 'tool-input-schema-empty',
  category: 'tool',
  defaultSeverity: 'warning',
  description: 'Tool inputSchema should define at least one property.',
  check(tool: ToolDefinition, ctx: RuleContext): void {
    const s = tool.inputSchema;
    if (s && s.type === 'object' && (!s.properties || Object.keys(s.properties).length === 0)) {
      ctx.report({
        message: `Tool "${tool.name}" inputSchema has no properties defined.`,
        suggestion: 'Define the expected input parameters.',
      });
    }
  },
};

export default rule;
