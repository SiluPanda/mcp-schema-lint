// mcp-schema-lint - CLI linter for MCP tool/resource schemas
export { lint, lintSchemas, createRule } from './lint.js';
export type {
  Severity,
  LintDiagnostic,
  LintSummary,
  LintReport,
  LintOptions,
  ToolDefinition,
  ResourceDefinition,
  PromptDefinition,
  JSONSchema,
  SchemaInput,
  RuleContext,
  CustomRuleDefinition,
} from './types.js';
