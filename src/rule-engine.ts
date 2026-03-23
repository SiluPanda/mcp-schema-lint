import type {
  LintDiagnostic,
  LintOptions,
  SchemaInput,
  Severity,
  CustomRuleDefinition,
  RuleContext,
  ToolDefinition,
  ResourceDefinition,
  PromptDefinition,
} from './types.js';
import type { BuiltInRule } from './rules/tool-description-missing.js';
import type { ResourceBuiltInRule } from './rules/resource-description-missing.js';
import type { PromptBuiltInRule } from './rules/prompt-description-missing.js';
import type { CrossBuiltInRule } from './rules/duplicate-names.js';

import toolDescriptionMissing from './rules/tool-description-missing.js';
import toolDescriptionQuality from './rules/tool-description-quality.js';
import toolInputSchemaMissing from './rules/tool-input-schema-missing.js';
import toolInputSchemaEmpty from './rules/tool-input-schema-empty.js';
import toolInputSchemaNoRequired from './rules/tool-input-schema-no-required.js';
import toolAnnotationsMissing from './rules/tool-annotations-missing.js';
import toolAnnotationsInconsistent from './rules/tool-annotations-inconsistent.js';
import toolOutputSchemaMissing from './rules/tool-output-schema-missing.js';
import parameterDescriptionMissing from './rules/parameter-description-missing.js';
import parameterTypeMissing from './rules/parameter-type-missing.js';
import namingConvention, { detectConvention } from './rules/naming-convention.js';
import resourceDescriptionMissing from './rules/resource-description-missing.js';
import resourceMimeTypeMissing from './rules/resource-mime-type-missing.js';
import promptDescriptionMissing from './rules/prompt-description-missing.js';
import duplicateNames from './rules/duplicate-names.js';

export type AnyRule =
  | BuiltInRule
  | ResourceBuiltInRule
  | PromptBuiltInRule
  | CrossBuiltInRule;

export const ALL_RULES: AnyRule[] = [
  toolDescriptionMissing,
  toolDescriptionQuality,
  toolInputSchemaMissing,
  toolInputSchemaEmpty,
  toolInputSchemaNoRequired,
  toolAnnotationsMissing,
  toolAnnotationsInconsistent,
  toolOutputSchemaMissing,
  parameterDescriptionMissing,
  parameterTypeMissing,
  namingConvention,
  resourceDescriptionMissing,
  resourceMimeTypeMissing,
  promptDescriptionMissing,
  duplicateNames,
];

const RECOMMENDED: Record<string, Severity> = {
  'tool-description-missing': 'error',
  'tool-description-quality': 'warning',
  'tool-input-schema-missing': 'error',
  'tool-input-schema-empty': 'warning',
  'tool-input-schema-no-required': 'warning',
  'tool-annotations-missing': 'warning',
  'tool-annotations-inconsistent': 'error',
  'tool-output-schema-missing': 'info',
  'parameter-description-missing': 'warning',
  'parameter-type-missing': 'error',
  'naming-convention': 'warning',
  'resource-description-missing': 'warning',
  'resource-mime-type-missing': 'warning',
  'prompt-description-missing': 'warning',
  'duplicate-names': 'error',
};

const STRICT: Record<string, Severity> = {
  'tool-description-missing': 'error',
  'tool-description-quality': 'error',
  'tool-input-schema-missing': 'error',
  'tool-input-schema-empty': 'error',
  'tool-input-schema-no-required': 'error',
  'tool-annotations-missing': 'error',
  'tool-annotations-inconsistent': 'error',
  'tool-output-schema-missing': 'warning',
  'parameter-description-missing': 'error',
  'parameter-type-missing': 'error',
  'naming-convention': 'error',
  'resource-description-missing': 'error',
  'resource-mime-type-missing': 'error',
  'prompt-description-missing': 'error',
  'duplicate-names': 'error',
};

const MINIMAL: Record<string, Severity> = {
  'tool-description-missing': 'error',
  'tool-input-schema-missing': 'error',
  'duplicate-names': 'error',
};

const PRESETS: Record<string, Record<string, Severity>> = {
  recommended: RECOMMENDED,
  strict: STRICT,
  minimal: MINIMAL,
  off: {},
};

export function resolveRules(options?: LintOptions): Map<string, Severity> {
  const preset = options?.preset ?? 'recommended';
  const base = PRESETS[preset] ?? RECOMMENDED;
  const result = new Map<string, Severity>(Object.entries(base));

  if (options?.rules) {
    for (const [ruleId, cfg] of Object.entries(options.rules)) {
      if (typeof cfg === 'string') {
        result.set(ruleId, cfg as Severity);
      } else if (typeof cfg === 'object' && cfg.severity) {
        result.set(ruleId, cfg.severity);
      }
    }
  }

  // Register custom rules at their default severity if not already set
  if (options?.customRules) {
    for (const cr of options.customRules) {
      if (!result.has(cr.id)) {
        result.set(cr.id, cr.defaultSeverity);
      }
    }
  }

  return result;
}

function makeContext(
  diagnostics: LintDiagnostic[],
  ruleId: string,
  severity: Severity,
  elementName: string,
  elementCategory: LintDiagnostic['elementCategory'],
  target: string
): RuleContext {
  return {
    report(d): void {
      if (severity === 'off') return;
      diagnostics.push({
        ruleId,
        severity: severity as 'error' | 'warning' | 'info',
        target,
        message: d.message,
        suggestion: d.suggestion,
        elementName,
        elementCategory,
      });
    },
  };
}

export function runRules(
  schemas: SchemaInput,
  rules: AnyRule[],
  severities: Map<string, Severity>,
  customRules?: CustomRuleDefinition[]
): LintDiagnostic[] {
  const diagnostics: LintDiagnostic[] = [];
  const tools = schemas.tools ?? [];
  const resources = schemas.resources ?? [];
  const prompts = schemas.prompts ?? [];

  // Tool rules
  const toolRules = rules.filter(
    (r) => r.category === 'tool'
  ) as BuiltInRule[];

  for (const tool of tools) {
    for (const rule of toolRules) {
      const sev = severities.get(rule.id);
      if (!sev || sev === 'off') continue;
      const ctx = makeContext(diagnostics, rule.id, sev, tool.name, 'tool', `tool:${tool.name}`);
      rule.check(tool as ToolDefinition, ctx);
    }
  }

  // Resource rules
  const resourceRules = rules.filter(
    (r) => r.category === 'resource'
  ) as ResourceBuiltInRule[];

  for (const resource of resources) {
    for (const rule of resourceRules) {
      const sev = severities.get(rule.id);
      if (!sev || sev === 'off') continue;
      const ctx = makeContext(
        diagnostics,
        rule.id,
        sev,
        resource.uri,
        'resource',
        `resource:${resource.uri}`
      );
      rule.check(resource as ResourceDefinition, ctx);
    }
  }

  // Prompt rules
  const promptRules = rules.filter(
    (r) => r.category === 'prompt'
  ) as PromptBuiltInRule[];

  for (const prompt of prompts) {
    for (const rule of promptRules) {
      const sev = severities.get(rule.id);
      if (!sev || sev === 'off') continue;
      const ctx = makeContext(
        diagnostics,
        rule.id,
        sev,
        prompt.name,
        'prompt',
        `prompt:${prompt.name}`
      );
      rule.check(prompt as PromptDefinition, ctx);
    }
  }

  // Cross-element: naming-convention
  const namingConventionSev = severities.get('naming-convention');
  if (namingConventionSev && namingConventionSev !== 'off' && tools.length > 1) {
    const convCounts: Record<string, number> = {};
    for (const tool of tools) {
      const conv = detectConvention(tool.name);
      if (conv !== 'mixed') {
        convCounts[conv] = (convCounts[conv] ?? 0) + 1;
      }
    }
    const distinctConventions = Object.keys(convCounts);
    if (distinctConventions.length > 1) {
      // Mixed conventions — report once per offending tool
      const dominant = distinctConventions.reduce((a, b) =>
        (convCounts[a] ?? 0) >= (convCounts[b] ?? 0) ? a : b
      );
      for (const tool of tools) {
        const conv = detectConvention(tool.name);
        if (conv !== 'mixed' && conv !== dominant) {
          diagnostics.push({
            ruleId: 'naming-convention',
            severity: namingConventionSev as 'error' | 'warning' | 'info',
            target: `tool:${tool.name}`,
            message: `Tool "${tool.name}" uses ${conv} naming but other tools use ${dominant}.`,
            suggestion: `Rename to use ${dominant} convention consistently.`,
            elementName: tool.name,
            elementCategory: 'tool',
          });
        }
      }
    }
  }

  // Cross-element: duplicate-names
  const dupSev = severities.get('duplicate-names');
  if (dupSev && dupSev !== 'off') {
    const checkDuplicates = (
      names: string[],
      category: LintDiagnostic['elementCategory'],
      targetPrefix: string
    ): void => {
      const seen = new Map<string, number>();
      for (const name of names) {
        seen.set(name, (seen.get(name) ?? 0) + 1);
      }
      for (const [name, count] of seen.entries()) {
        if (count > 1) {
          diagnostics.push({
            ruleId: 'duplicate-names',
            severity: dupSev as 'error' | 'warning' | 'info',
            target: `${targetPrefix}:${name}`,
            message: `Duplicate ${category} name "${name}" found ${count} times.`,
            elementName: name,
            elementCategory: category,
          });
        }
      }
    };

    checkDuplicates(tools.map((t) => t.name), 'tool', 'tool');
    checkDuplicates(resources.map((r) => r.uri), 'resource', 'resource');
    checkDuplicates(prompts.map((p) => p.name), 'prompt', 'prompt');
  }

  // Custom rules — applied to matching category elements
  if (customRules) {
    for (const cr of customRules) {
      const sev = severities.get(cr.id);
      if (!sev || sev === 'off') continue;

      if (cr.category === 'tool' || cr.category === 'all' || cr.category === 'cross') {
        for (const tool of tools) {
          const ctx = makeContext(diagnostics, cr.id, sev, tool.name, 'tool', `tool:${tool.name}`);
          cr.check(tool, ctx);
        }
      }
      if (cr.category === 'resource' || cr.category === 'all' || cr.category === 'cross') {
        for (const resource of resources) {
          const ctx = makeContext(diagnostics, cr.id, sev, resource.uri, 'resource', `resource:${resource.uri}`);
          cr.check(resource, ctx);
        }
      }
      if (cr.category === 'prompt' || cr.category === 'all' || cr.category === 'cross') {
        for (const prompt of prompts) {
          const ctx = makeContext(diagnostics, cr.id, sev, prompt.name, 'prompt', `prompt:${prompt.name}`);
          cr.check(prompt, ctx);
        }
      }
    }
  }

  // Sort: errors first, warnings second, infos last
  const ORDER: Record<string, number> = { error: 0, warning: 1, info: 2 };
  diagnostics.sort((a, b) => (ORDER[a.severity] ?? 3) - (ORDER[b.severity] ?? 3));

  return diagnostics;
}
