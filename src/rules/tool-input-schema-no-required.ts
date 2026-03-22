import type { ToolDefinition, RuleContext } from '../types.js';
import type { BuiltInRule } from './tool-description-missing.js';

const rule: BuiltInRule = {
  id: 'tool-input-schema-no-required',
  category: 'tool',
  defaultSeverity: 'warning',
  description: 'Tool inputSchema with properties should have a required array.',
  check(tool: ToolDefinition, ctx: RuleContext): void {
    const s = tool.inputSchema;
    if (s?.properties && Object.keys(s.properties).length > 0 && !s.required?.length) {
      ctx.report({
        message: `Tool "${tool.name}" inputSchema has properties but no "required" array.`,
        suggestion: 'Specify which parameters are required.',
      });
    }
  },
};

export default rule;
