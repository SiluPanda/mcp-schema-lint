import type { ResourceDefinition, RuleContext, Severity } from '../types.js';

export interface ResourceBuiltInRule {
  id: string;
  category: string;
  defaultSeverity: Severity;
  description: string;
  check(element: ResourceDefinition, ctx: RuleContext): void;
}

const rule: ResourceBuiltInRule = {
  id: 'resource-description-missing',
  category: 'resource',
  defaultSeverity: 'warning',
  description: 'Resource should have a description.',
  check(resource: ResourceDefinition, ctx: RuleContext): void {
    if (!resource.description) {
      ctx.report({
        message: `Resource "${resource.uri}" is missing a description.`,
      });
    }
  },
};

export default rule;
