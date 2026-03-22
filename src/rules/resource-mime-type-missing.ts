import type { ResourceDefinition, RuleContext } from '../types.js';
import type { ResourceBuiltInRule } from './resource-description-missing.js';

const rule: ResourceBuiltInRule = {
  id: 'resource-mime-type-missing',
  category: 'resource',
  defaultSeverity: 'warning',
  description: 'Resource should declare a mimeType.',
  check(resource: ResourceDefinition, ctx: RuleContext): void {
    if (!resource.mimeType) {
      ctx.report({
        message: `Resource "${resource.uri}" has no mimeType.`,
        suggestion: 'Add a MIME type (e.g., "application/json", "text/plain").',
      });
    }
  },
};

export default rule;
