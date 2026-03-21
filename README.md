# mcp-schema-lint

Static linter for MCP (Model Context Protocol) tool, resource, and prompt schema definitions.

Catches missing descriptions, inconsistent annotations, duplicate names, parameter quality issues, and more — with zero external runtime dependencies.

## Install

```bash
npm install mcp-schema-lint
```

## Quick start

```typescript
import { lintSchemas } from 'mcp-schema-lint';

const report = lintSchemas({
  tools: [
    {
      name: 'searchFiles',
      description: 'Search for files matching a pattern in a directory.',
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

console.log(report.passed);        // true / false
console.log(report.summary);       // { total, errors, warnings, infos, ... }
console.log(report.diagnostics);   // array of LintDiagnostic
```

## Async variant

```typescript
import { lint } from 'mcp-schema-lint';

const report = await lint({
  source: { tools: [...], resources: [...], prompts: [...] },
  preset: 'recommended',
});
```

## Presets

| Preset | Description |
|---|---|
| `recommended` | Balanced defaults — errors for critical issues, warnings for quality. |
| `strict` | All rules elevated to error/warning. |
| `minimal` | Only 3 essential rules: `tool-description-missing`, `tool-input-schema-missing`, `duplicate-names`. |
| `off` | No rules active. Useful when only custom rules are needed. |

```typescript
lintSchemas(schemas, { preset: 'strict' });
```

## Rule overrides

```typescript
lintSchemas(schemas, {
  preset: 'recommended',
  rules: {
    'tool-output-schema-missing': 'off',
    'tool-annotations-missing': 'error',
  },
});
```

## Built-in rules

| Rule ID | Default (recommended) | Description |
|---|---|---|
| `tool-description-missing` | error | Tool must have a description. |
| `tool-description-quality` | warning | Description must not be too short, a placeholder, or identical to the tool name. |
| `tool-input-schema-missing` | error | Tool must have an `inputSchema`. |
| `tool-input-schema-empty` | warning | `inputSchema` of type `object` must define at least one property. |
| `tool-input-schema-no-required` | warning | `inputSchema` with properties must have a `required` array. |
| `tool-annotations-missing` | warning | Tool should declare behavioral annotations. |
| `tool-annotations-inconsistent` | error | Annotations must not be logically contradictory (e.g., `readOnlyHint + destructiveHint`). |
| `tool-output-schema-missing` | info | Tool should document its output format. |
| `parameter-description-missing` | warning | All `inputSchema` parameters should have descriptions. |
| `parameter-type-missing` | error | All `inputSchema` parameters must declare a `type`. |
| `naming-convention` | warning | All tool names must use a single consistent convention. |
| `resource-description-missing` | warning | Resource should have a description. |
| `resource-mime-type-missing` | warning | Resource should declare a `mimeType`. |
| `prompt-description-missing` | warning | Prompt should have a description. |
| `duplicate-names` | error | No two tools/resources/prompts may share the same name. |

## Custom rules

```typescript
import { createRule, lintSchemas } from 'mcp-schema-lint';
import type { ToolDefinition } from 'mcp-schema-lint';

const noFooRule = createRule({
  id: 'custom-no-foo',
  category: 'tool',
  defaultSeverity: 'warning',
  description: 'Tools must not be named "foo".',
  check(element, ctx) {
    const tool = element as ToolDefinition;
    if (tool.name === 'foo') {
      ctx.report({ message: 'Tool name "foo" is not allowed.' });
    }
  },
});

const report = lintSchemas(schemas, { customRules: [noFooRule] });
```

## LintReport shape

```typescript
interface LintReport {
  passed: boolean;          // true when errors === 0
  timestamp: string;        // ISO 8601
  durationMs: number;
  diagnostics: LintDiagnostic[];
  summary: LintSummary;
  preset: string;
  ruleStates: Record<string, Severity>;
}

interface LintDiagnostic {
  ruleId: string;
  severity: 'error' | 'warning' | 'info';
  target: string;           // e.g. "tool:searchFiles"
  message: string;
  suggestion?: string;
  elementName: string;
  elementCategory: 'tool' | 'resource' | 'resourceTemplate' | 'prompt';
}
```

## License

MIT
