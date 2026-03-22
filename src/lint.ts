import type {
  LintReport,
  LintSummary,
  LintOptions,
  SchemaInput,
  LintDiagnostic,
  CustomRuleDefinition,
} from './types.js';
import { resolveRules, runRules, ALL_RULES } from './rule-engine.js';

function buildSummary(diagnostics: LintDiagnostic[], schemas: SchemaInput): LintSummary {
  let errors = 0;
  let warnings = 0;
  let infos = 0;
  for (const d of diagnostics) {
    if (d.severity === 'error') errors++;
    else if (d.severity === 'warning') warnings++;
    else if (d.severity === 'info') infos++;
  }
  return {
    total: diagnostics.length,
    errors,
    warnings,
    infos,
    toolsAnalyzed: schemas.tools?.length ?? 0,
    resourcesAnalyzed: schemas.resources?.length ?? 0,
    promptsAnalyzed: schemas.prompts?.length ?? 0,
  };
}

export function lintSchemas(
  schemas: SchemaInput,
  options?: Omit<LintOptions, 'source'>
): LintReport {
  const start = Date.now();
  const preset = options?.preset ?? 'recommended';
  const severities = resolveRules({ ...options, preset });
  const diagnostics = runRules(schemas, ALL_RULES, severities, options?.customRules);
  const summary = buildSummary(diagnostics, schemas);
  return {
    passed: summary.errors === 0,
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - start,
    diagnostics,
    summary,
    preset,
    ruleStates: Object.fromEntries(severities),
  };
}

export async function lint(options: LintOptions): Promise<LintReport> {
  const schemas = options.source ?? {};
  return lintSchemas(schemas, options);
}

export function createRule(def: CustomRuleDefinition): CustomRuleDefinition {
  return def;
}
