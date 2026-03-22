# mcp-schema-lint

Static linter for MCP (Model Context Protocol) tool, resource, and prompt schema definitions.

[![npm version](https://img.shields.io/npm/v/mcp-schema-lint.svg)](https://www.npmjs.com/package/mcp-schema-lint)
[![npm downloads](https://img.shields.io/npm/dt/mcp-schema-lint.svg)](https://www.npmjs.com/package/mcp-schema-lint)
[![license](https://img.shields.io/npm/l/mcp-schema-lint.svg)](https://github.com/SiluPanda/mcp-schema-lint/blob/master/LICENSE)
[![node](https://img.shields.io/node/v/mcp-schema-lint.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)

Catches missing descriptions, inconsistent annotations, duplicate names, parameter quality issues, naming convention violations, and more -- with zero external runtime dependencies. Modeled on established linting tools like Spectral for OpenAPI, `mcp-schema-lint` evaluates MCP schema quality beyond structural validity, ensuring tool definitions are practical and useful for LLMs.

---

## Installation

```bash
npm install mcp-schema-lint
```

Requires Node.js >= 18.

---

## Quick Start

```typescript
import { lintSchemas } from 'mcp-schema-lint';

const report = lintSchemas({
  tools: [
    {
      name: 'searchFiles',
      description: 'Search for files matching a glob pattern in a directory.',
      inputSchema: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Glob pattern to match.' },
          directory: { type: 'string', description: 'Root directory to search in.' },
        },
        required: ['pattern'],
      },
      outputSchema: { type: 'object' },
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
  ],
});

console.log(report.passed);        // true
console.log(report.summary.errors); // 0
console.log(report.diagnostics);    // []
```

---

## Features

- **15 built-in rules** covering tools, resources, prompts, parameters, naming, and cross-element checks.
- **4 severity presets** -- `recommended`, `strict`, `minimal`, and `off` -- for different quality bars.
- **Per-rule overrides** to customize severity for any individual rule.
- **Custom rules** via `createRule()` for organization-specific policies.
- **Structured reports** with diagnostics sorted by severity, timing data, and full rule-state snapshots.
- **Synchronous and asynchronous** API entry points (`lintSchemas` and `lint`).
- **Zero runtime dependencies** -- only dev dependencies for build and test tooling.
- **Full TypeScript support** with exported types for all inputs, outputs, and rule definitions.

---

## API Reference

### `lintSchemas(schemas, options?)`

Synchronous entry point. Lints the provided schema definitions and returns a structured report.

**Signature:**

```typescript
function lintSchemas(
  schemas: SchemaInput,
  options?: Omit<LintOptions, 'source'>
): LintReport;
```

**Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `schemas` | `SchemaInput` | Yes | Object containing `tools`, `resources`, and/or `prompts` arrays to lint. |
| `options` | `Omit<LintOptions, 'source'>` | No | Configuration for preset, rule overrides, and custom rules. |

**Returns:** `LintReport`

**Example:**

```typescript
import { lintSchemas } from 'mcp-schema-lint';

const report = lintSchemas(
  {
    tools: [{ name: 'deploy', description: 'Deploy the application to production.' }],
    resources: [{ uri: 'file:///config.json', description: 'App config.', mimeType: 'application/json' }],
    prompts: [{ name: 'summarize', description: 'Summarize the given text.' }],
  },
  { preset: 'strict' }
);

if (!report.passed) {
  for (const d of report.diagnostics) {
    console.error(`[${d.severity}] ${d.ruleId}: ${d.message}`);
  }
}
```

---

### `lint(options)`

Asynchronous entry point. Accepts the full `LintOptions` object including the `source` field. Returns the same `LintReport` as `lintSchemas`.

**Signature:**

```typescript
function lint(options: LintOptions): Promise<LintReport>;
```

**Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `options` | `LintOptions` | Yes | Full configuration including `source` (the schemas to lint), `preset`, `rules`, and `customRules`. |

**Returns:** `Promise<LintReport>`

**Example:**

```typescript
import { lint } from 'mcp-schema-lint';

const report = await lint({
  source: {
    tools: [
      {
        name: 'readFile',
        description: 'Read the contents of a file from disk.',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Absolute file path.' },
          },
          required: ['path'],
        },
        annotations: { readOnlyHint: true },
      },
    ],
  },
  preset: 'recommended',
});

console.log(report.passed);
```

---

### `createRule(definition)`

Factory function for defining custom lint rules. Returns the definition unchanged, serving as a typed constructor for `CustomRuleDefinition`.

**Signature:**

```typescript
function createRule(def: CustomRuleDefinition): CustomRuleDefinition;
```

**Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `def` | `CustomRuleDefinition` | Yes | The custom rule definition object. |

**Returns:** `CustomRuleDefinition`

**Example:**

```typescript
import { createRule, lintSchemas } from 'mcp-schema-lint';
import type { ToolDefinition } from 'mcp-schema-lint';

const noDeletePrefix = createRule({
  id: 'custom-no-delete-prefix',
  category: 'tool',
  defaultSeverity: 'error',
  description: 'Tool names must not start with "delete".',
  check(element, ctx) {
    const tool = element as ToolDefinition;
    if (tool.name.toLowerCase().startsWith('delete')) {
      ctx.report({
        message: `Tool "${tool.name}" starts with "delete", which is forbidden by policy.`,
        suggestion: 'Use "remove" or "archive" instead.',
      });
    }
  },
});

const report = lintSchemas(
  { tools: [{ name: 'deleteUser', description: 'Delete a user account.' }] },
  { customRules: [noDeletePrefix] }
);
```

---

## Types

All types are exported from the package entry point.

### `SchemaInput`

The input object containing MCP schema definitions to lint.

```typescript
interface SchemaInput {
  tools?: ToolDefinition[];
  resources?: ResourceDefinition[];
  prompts?: PromptDefinition[];
}
```

### `ToolDefinition`

Represents a single MCP tool definition.

```typescript
interface ToolDefinition {
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
```

### `ResourceDefinition`

Represents a single MCP resource definition.

```typescript
interface ResourceDefinition {
  uri: string;
  mimeType?: string;
  description?: string;
}
```

### `PromptDefinition`

Represents a single MCP prompt definition.

```typescript
interface PromptDefinition {
  name: string;
  description?: string;
  arguments?: Array<{ name: string; description?: string; required?: boolean }>;
}
```

### `JSONSchema`

A permissive JSON Schema representation used for tool input and output schemas.

```typescript
interface JSONSchema {
  type?: string;
  properties?: Record<string, JSONSchema>;
  required?: string[];
  description?: string;
  enum?: unknown[];
  $ref?: string;
  [k: string]: unknown;
}
```

### `LintOptions`

Configuration object for the `lint` and `lintSchemas` functions.

```typescript
interface LintOptions {
  source?: SchemaInput;
  preset?: 'recommended' | 'strict' | 'minimal' | 'off';
  rules?: Record<string, Severity | { severity?: Severity }>;
  customRules?: CustomRuleDefinition[];
}
```

### `LintReport`

The structured result returned by both `lint` and `lintSchemas`.

```typescript
interface LintReport {
  passed: boolean;                      // true when errors === 0
  timestamp: string;                    // ISO 8601
  durationMs: number;                   // execution time in milliseconds
  diagnostics: LintDiagnostic[];        // sorted: errors first, then warnings, then infos
  summary: LintSummary;
  preset: string;                       // the preset that was applied
  ruleStates: Record<string, Severity>; // final resolved severity for every active rule
}
```

### `LintDiagnostic`

A single diagnostic finding from a lint rule.

```typescript
interface LintDiagnostic {
  ruleId: string;
  severity: 'error' | 'warning' | 'info';
  target: string;           // e.g. "tool:searchFiles", "resource:file:///data.json"
  message: string;
  suggestion?: string;
  elementName: string;
  elementCategory: 'tool' | 'resource' | 'resourceTemplate' | 'prompt';
}
```

### `LintSummary`

Aggregate counts for a lint run.

```typescript
interface LintSummary {
  total: number;
  errors: number;
  warnings: number;
  infos: number;
  toolsAnalyzed: number;
  resourcesAnalyzed: number;
  promptsAnalyzed: number;
}
```

### `Severity`

```typescript
type Severity = 'error' | 'warning' | 'info' | 'off';
```

### `RuleContext`

The context object passed to custom rule `check` functions.

```typescript
interface RuleContext {
  report(d: { message: string; suggestion?: string }): void;
}
```

### `CustomRuleDefinition`

Definition object for a custom lint rule.

```typescript
interface CustomRuleDefinition {
  id: string;
  category: string;
  defaultSeverity: Severity;
  description: string;
  check(element: unknown, context: RuleContext): void;
}
```

---

## Configuration

### Presets

Presets define the default severity for all built-in rules. Pass a preset via the `preset` option.

| Preset | Description |
|---|---|
| `recommended` | Balanced defaults. Errors for critical issues (missing descriptions, missing input schemas, contradictory annotations, missing parameter types, duplicates). Warnings for quality issues. Info for optional improvements. This is the default. |
| `strict` | All rules elevated to `error` or `warning`. Suitable for CI gating where high schema quality is mandatory. |
| `minimal` | Only 3 essential rules active: `tool-description-missing`, `tool-input-schema-missing`, `duplicate-names`. All at `error` severity. |
| `off` | No rules active. Use this when you want only custom rules to run. |

```typescript
lintSchemas(schemas, { preset: 'strict' });
```

### Preset Rule Severity Matrix

| Rule ID | recommended | strict | minimal |
|---|---|---|---|
| `tool-description-missing` | error | error | error |
| `tool-description-quality` | warning | error | -- |
| `tool-input-schema-missing` | error | error | error |
| `tool-input-schema-empty` | warning | error | -- |
| `tool-input-schema-no-required` | warning | error | -- |
| `tool-annotations-missing` | warning | error | -- |
| `tool-annotations-inconsistent` | error | error | -- |
| `tool-output-schema-missing` | info | warning | -- |
| `parameter-description-missing` | warning | error | -- |
| `parameter-type-missing` | error | error | -- |
| `naming-convention` | warning | error | -- |
| `resource-description-missing` | warning | error | -- |
| `resource-mime-type-missing` | warning | error | -- |
| `prompt-description-missing` | warning | error | -- |
| `duplicate-names` | error | error | error |

`--` indicates the rule is not active in that preset.

### Per-Rule Overrides

Override the severity of any individual rule. Overrides are applied on top of the selected preset.

```typescript
lintSchemas(schemas, {
  preset: 'recommended',
  rules: {
    'tool-output-schema-missing': 'off',        // disable this rule
    'tool-annotations-missing': 'error',         // elevate from warning to error
    'parameter-description-missing': { severity: 'info' },  // object form also supported
  },
});
```

---

## Built-in Rules

### Tool Rules

| Rule ID | Default | Description |
|---|---|---|
| `tool-description-missing` | error | Tool must have a non-empty `description` field. |
| `tool-description-quality` | warning | Description must be at least 10 characters, must not be a placeholder (`"todo"`, `"tbd"`, `"n/a"`, `"none"`), and must not simply repeat the tool name. |
| `tool-input-schema-missing` | error | Tool must have an `inputSchema` field. |
| `tool-input-schema-empty` | warning | An `inputSchema` of type `object` must define at least one property. |
| `tool-input-schema-no-required` | warning | An `inputSchema` that defines properties must include a `required` array. |
| `tool-annotations-missing` | warning | Tool should declare behavioral annotations (`readOnlyHint`, `destructiveHint`, `idempotentHint`). |
| `tool-annotations-inconsistent` | error | Annotations must not be logically contradictory. A tool cannot be both `readOnlyHint: true` and `destructiveHint: true`. A `readOnlyHint: true` tool should not have `idempotentHint: false`. |
| `tool-output-schema-missing` | info | Tool should declare an `outputSchema` to document its return format. |

### Parameter Rules

| Rule ID | Default | Description |
|---|---|---|
| `parameter-description-missing` | warning | Every property in `inputSchema.properties` (including nested objects) must have a `description`. |
| `parameter-type-missing` | error | Every property in `inputSchema.properties` (including nested objects) must have a `type` field, unless it uses a composite keyword (`$ref`, `oneOf`, `anyOf`, `allOf`). |

### Resource Rules

| Rule ID | Default | Description |
|---|---|---|
| `resource-description-missing` | warning | Resource must have a `description` field. |
| `resource-mime-type-missing` | warning | Resource must declare a `mimeType` (e.g., `"application/json"`, `"text/plain"`). |

### Prompt Rules

| Rule ID | Default | Description |
|---|---|---|
| `prompt-description-missing` | warning | Prompt must have a `description` field. |

### Cross-Element Rules

| Rule ID | Default | Description |
|---|---|---|
| `naming-convention` | warning | All tool names must use a single consistent naming convention (`camelCase`, `snake_case`, `kebab-case`, or `PascalCase`). When multiple conventions are detected, tools using the minority convention are flagged. Single-word lowercase names are treated as ambiguous and ignored. |
| `duplicate-names` | error | No two tools, resources, or prompts within the same category may share the same name/URI. |

---

## Error Handling

The `passed` field on `LintReport` is `true` when `summary.errors === 0`. Warnings and infos do not cause `passed` to be `false`.

Diagnostics are sorted by severity: errors first, then warnings, then infos. Each diagnostic includes a `suggestion` field (when available) with actionable guidance for resolving the issue.

```typescript
const report = lintSchemas({ tools: [{ name: 'x' }] });

if (!report.passed) {
  const errors = report.diagnostics.filter((d) => d.severity === 'error');
  for (const err of errors) {
    console.error(`${err.ruleId} on ${err.target}: ${err.message}`);
    if (err.suggestion) {
      console.error(`  Fix: ${err.suggestion}`);
    }
  }
  process.exit(1);
}
```

---

## Advanced Usage

### Linting Resources and Prompts

Pass `resources` and `prompts` alongside tools to lint all MCP schema categories in a single call.

```typescript
const report = lintSchemas({
  tools: [
    {
      name: 'getWeather',
      description: 'Retrieve current weather for a city.',
      inputSchema: {
        type: 'object',
        properties: {
          city: { type: 'string', description: 'City name.' },
        },
        required: ['city'],
      },
      annotations: { readOnlyHint: true },
    },
  ],
  resources: [
    {
      uri: 'weather://current',
      description: 'Current weather data.',
      mimeType: 'application/json',
    },
  ],
  prompts: [
    {
      name: 'weatherSummary',
      description: 'Generate a weather summary for a given location.',
      arguments: [
        { name: 'location', description: 'The location to summarize.', required: true },
      ],
    },
  ],
});
```

### Custom Rules Applied to All Elements

Custom rules receive each element (tool, resource, and prompt) in turn. Use the `element` parameter along with type guards or casts to implement cross-category checks.

```typescript
import { createRule, lintSchemas } from 'mcp-schema-lint';

const requirePrefix = createRule({
  id: 'custom-require-prefix',
  category: 'all',
  defaultSeverity: 'warning',
  description: 'All element names/URIs must start with "acme-".',
  check(element, ctx) {
    const name = (element as { name?: string; uri?: string }).name
      ?? (element as { uri?: string }).uri
      ?? '';
    if (!name.startsWith('acme-')) {
      ctx.report({
        message: `Element "${name}" does not start with "acme-".`,
        suggestion: 'Rename to include the "acme-" prefix.',
      });
    }
  },
});

const report = lintSchemas(
  { tools: [{ name: 'search', description: 'Search for items.' }] },
  { preset: 'off', customRules: [requirePrefix] }
);
```

### Inspecting Rule States

The `ruleStates` field on `LintReport` contains the final resolved severity for every active rule after preset and override resolution. This is useful for debugging configuration.

```typescript
const report = lintSchemas({}, { preset: 'recommended' });

console.log(report.ruleStates);
// {
//   'tool-description-missing': 'error',
//   'tool-description-quality': 'warning',
//   'tool-input-schema-missing': 'error',
//   ...
// }
```

### CI/CD Integration

Use the `passed` field and summary counts to gate deployments.

```typescript
import { lintSchemas } from 'mcp-schema-lint';

const report = lintSchemas(serverSchemas, { preset: 'strict' });

if (!report.passed) {
  console.error(
    `Lint failed: ${report.summary.errors} error(s), ${report.summary.warnings} warning(s)`
  );
  process.exit(1);
}

console.log(
  `Lint passed: ${report.summary.toolsAnalyzed} tools, ` +
  `${report.summary.resourcesAnalyzed} resources, ` +
  `${report.summary.promptsAnalyzed} prompts analyzed in ${report.durationMs}ms`
);
```

---

## TypeScript

This package is written in TypeScript and ships type declarations (`dist/index.d.ts`). All public types are exported from the package entry point:

```typescript
import type {
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
} from 'mcp-schema-lint';
```

The package targets ES2022 and uses CommonJS module output. TypeScript strict mode is enabled.

---

## License

MIT
