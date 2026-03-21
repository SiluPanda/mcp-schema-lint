import type { ToolDefinition, RuleContext } from '../types.js';
import type { BuiltInRule } from './tool-description-missing.js';

type Convention = 'camelCase' | 'snake_case' | 'kebab-case' | 'PascalCase' | 'mixed';

function detectConvention(name: string): Convention {
  if (/^[a-z][a-zA-Z0-9]*$/.test(name) && /[A-Z]/.test(name)) return 'camelCase';
  if (/^[a-z][a-z0-9]*(_[a-z0-9]+)+$/.test(name)) return 'snake_case';
  if (/^[a-z][a-z0-9]*(-[a-z0-9]+)+$/.test(name)) return 'kebab-case';
  if (/^[A-Z][a-zA-Z0-9]*$/.test(name)) return 'PascalCase';
  // single word all lowercase — ambiguous, skip
  return 'mixed';
}

// This rule is applied across all tools in the rule engine.
// Per-tool check is a no-op; cross-element logic lives in rule-engine.ts.
const rule: BuiltInRule = {
  id: 'naming-convention',
  category: 'tool-cross',
  defaultSeverity: 'warning',
  description: 'All tool names should use a consistent naming convention.',
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  check(_tool: ToolDefinition, _ctx: RuleContext): void {
    // Cross-element logic handled in rule-engine.ts
  },
};

export { detectConvention };
export default rule;
