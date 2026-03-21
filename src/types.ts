export type Severity = 'error' | 'warning' | 'info' | 'off';

export interface LintDiagnostic {
  ruleId: string;
  severity: 'error' | 'warning' | 'info';
  target: string;
  message: string;
  suggestion?: string;
  elementName: string;
  elementCategory: 'tool' | 'resource' | 'resourceTemplate' | 'prompt';
}

export interface LintSummary {
  total: number;
  errors: number;
  warnings: number;
  infos: number;
  toolsAnalyzed: number;
  resourcesAnalyzed: number;
  promptsAnalyzed: number;
}

export interface LintReport {
  passed: boolean;
  timestamp: string;
  durationMs: number;
  diagnostics: LintDiagnostic[];
  summary: LintSummary;
  preset: string;
  ruleStates: Record<string, Severity>;
}

export interface ToolDefinition {
  name: string;
  description?: string;
  inputSchema?: JSONSchema;
  outputSchema?: JSONSchema;
  title?: string;
  annotations?: {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
  };
}

export interface ResourceDefinition {
  uri: string;
  mimeType?: string;
  description?: string;
}

export interface PromptDefinition {
  name: string;
  description?: string;
  arguments?: Array<{ name: string; description?: string; required?: boolean }>;
}

export interface JSONSchema {
  type?: string;
  properties?: Record<string, JSONSchema>;
  required?: string[];
  description?: string;
  enum?: unknown[];
  $ref?: string;
  [k: string]: unknown;
}

export interface SchemaInput {
  tools?: ToolDefinition[];
  resources?: ResourceDefinition[];
  prompts?: PromptDefinition[];
}

export interface RuleContext {
  report(d: { message: string; suggestion?: string }): void;
}

export interface CustomRuleDefinition {
  id: string;
  category: string;
  defaultSeverity: Severity;
  description: string;
  check(element: unknown, context: RuleContext): void;
}

export interface LintOptions {
  source?: SchemaInput;
  preset?: 'recommended' | 'strict' | 'minimal' | 'off';
  rules?: Record<string, Severity | { severity?: Severity }>;
  customRules?: CustomRuleDefinition[];
}
