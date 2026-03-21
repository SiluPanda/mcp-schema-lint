import type { ToolDefinition, RuleContext, Severity } from '../types.js';

export interface BuiltInRule {
  id: string;
  category: string;
  defaultSeverity: Severity;
  description: string;
  check(element: ToolDefinition, ctx: RuleContext): void;
}

const rule: BuiltInRule = {
  id: 'tool-description-missing',
  category: 'tool',
  defaultSeverity: 'error',
  description: 'Tool must have a description.',
  check(tool: ToolDefinition, ctx: RuleContext): void {
    if (!tool.description || tool.description.trim() === '') {
      ctx.report({
        message: `Tool "${tool.name}" is missing a description.`,
        suggestion: 'Add a clear description explaining what the tool does.',
      });
    }
  },
};

export default rule;
