import type { PromptDefinition, RuleContext, Severity } from '../types.js';

export interface PromptBuiltInRule {
  id: string;
  category: string;
  defaultSeverity: Severity;
  description: string;
  check(element: PromptDefinition, ctx: RuleContext): void;
}

const rule: PromptBuiltInRule = {
  id: 'prompt-description-missing',
  category: 'prompt',
  defaultSeverity: 'warning',
  description: 'Prompt should have a description.',
  check(prompt: PromptDefinition, ctx: RuleContext): void {
    if (!prompt.description) {
      ctx.report({
        message: `Prompt "${prompt.name}" is missing a description.`,
      });
    }
  },
};

export default rule;
