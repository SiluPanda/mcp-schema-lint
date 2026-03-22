import type { ToolDefinition, RuleContext, Severity } from '../types.js';

// This rule is cross-element and handled entirely in rule-engine.ts.
// The per-element check is a no-op.

export interface CrossBuiltInRule {
  id: string;
  category: string;
  defaultSeverity: Severity;
  description: string;
  check(element: ToolDefinition, ctx: RuleContext): void;
}

const rule: CrossBuiltInRule = {
  id: 'duplicate-names',
  category: 'cross',
  defaultSeverity: 'error',
  description: 'No two tools, resources, or prompts within the same category should share a name.',
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  check(_element: ToolDefinition, _ctx: RuleContext): void {
    // Cross-element logic handled in rule-engine.ts
  },
};

export default rule;
