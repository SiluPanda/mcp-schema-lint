import { describe, it, expect } from 'vitest';
import { lintSchemas, lint, createRule } from '../lint.js';
import type { ToolDefinition, SchemaInput, CustomRuleDefinition, RuleContext } from '../types.js';

const validTool: ToolDefinition = {
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
};

// ─── Tool rules ───────────────────────────────────────────────────────────────

describe('tool-description-missing', () => {
  it('reports error when description is absent', () => {
    const report = lintSchemas({ tools: [{ name: 'myTool' }] });
    const d = report.diagnostics.find((x) => x.ruleId === 'tool-description-missing');
    expect(d).toBeDefined();
    expect(d?.severity).toBe('error');
    expect(d?.elementName).toBe('myTool');
  });

  it('does not report when description is present', () => {
    const report = lintSchemas({ tools: [validTool] });
    const d = report.diagnostics.find((x) => x.ruleId === 'tool-description-missing');
    expect(d).toBeUndefined();
  });
});

describe('tool-input-schema-missing', () => {
  it('reports error when inputSchema is absent', () => {
    const tool: ToolDefinition = {
      name: 'myTool',
      description: 'Does something useful here.',
    };
    const report = lintSchemas({ tools: [tool] });
    const d = report.diagnostics.find((x) => x.ruleId === 'tool-input-schema-missing');
    expect(d).toBeDefined();
    expect(d?.severity).toBe('error');
  });

  it('does not report when inputSchema is present', () => {
    const report = lintSchemas({ tools: [validTool] });
    const d = report.diagnostics.find((x) => x.ruleId === 'tool-input-schema-missing');
    expect(d).toBeUndefined();
  });
});

describe('tool-input-schema-empty', () => {
  it('reports warning when inputSchema is object with no properties', () => {
    const tool: ToolDefinition = {
      name: 'myTool',
      description: 'Does something useful here.',
      inputSchema: { type: 'object' },
    };
    const report = lintSchemas({ tools: [tool] });
    const d = report.diagnostics.find((x) => x.ruleId === 'tool-input-schema-empty');
    expect(d).toBeDefined();
    expect(d?.severity).toBe('warning');
  });

  it('does not report when inputSchema has properties', () => {
    const report = lintSchemas({ tools: [validTool] });
    const d = report.diagnostics.find((x) => x.ruleId === 'tool-input-schema-empty');
    expect(d).toBeUndefined();
  });
});

describe('tool-input-schema-no-required', () => {
  it('reports warning when properties exist but no required array', () => {
    const tool: ToolDefinition = {
      name: 'myTool',
      description: 'Does something useful here.',
      inputSchema: {
        type: 'object',
        properties: { query: { type: 'string', description: 'Search query.' } },
      },
    };
    const report = lintSchemas({ tools: [tool] });
    const d = report.diagnostics.find((x) => x.ruleId === 'tool-input-schema-no-required');
    expect(d).toBeDefined();
    expect(d?.severity).toBe('warning');
  });
});

describe('tool-annotations-inconsistent', () => {
  it('reports error when readOnly and destructive are both true', () => {
    const tool: ToolDefinition = {
      name: 'badTool',
      description: 'This annotation is contradictory.',
      inputSchema: { type: 'object', properties: {}, required: [] },
      annotations: { readOnlyHint: true, destructiveHint: true },
    };
    const report = lintSchemas({ tools: [tool] });
    const d = report.diagnostics.find((x) => x.ruleId === 'tool-annotations-inconsistent');
    expect(d).toBeDefined();
    expect(d?.severity).toBe('error');
  });
});

// ─── Resource rules ───────────────────────────────────────────────────────────

describe('resource-description-missing', () => {
  it('reports warning when resource description is missing', () => {
    const report = lintSchemas({ resources: [{ uri: 'file:///data.json' }] });
    const d = report.diagnostics.find((x) => x.ruleId === 'resource-description-missing');
    expect(d).toBeDefined();
    expect(d?.severity).toBe('warning');
    expect(d?.elementCategory).toBe('resource');
  });

  it('does not report when description is present', () => {
    const report = lintSchemas({
      resources: [{ uri: 'file:///data.json', description: 'Contains user data.', mimeType: 'application/json' }],
    });
    const d = report.diagnostics.find((x) => x.ruleId === 'resource-description-missing');
    expect(d).toBeUndefined();
  });
});

describe('resource-mime-type-missing', () => {
  it('reports warning when mimeType is absent', () => {
    const report = lintSchemas({
      resources: [{ uri: 'file:///data.json', description: 'Data file.' }],
    });
    const d = report.diagnostics.find((x) => x.ruleId === 'resource-mime-type-missing');
    expect(d).toBeDefined();
    expect(d?.severity).toBe('warning');
  });
});

// ─── Prompt rules ─────────────────────────────────────────────────────────────

describe('prompt-description-missing', () => {
  it('reports warning when prompt description is missing', () => {
    const report = lintSchemas({ prompts: [{ name: 'summarize' }] });
    const d = report.diagnostics.find((x) => x.ruleId === 'prompt-description-missing');
    expect(d).toBeDefined();
    expect(d?.severity).toBe('warning');
    expect(d?.elementCategory).toBe('prompt');
  });
});

// ─── Duplicate names ──────────────────────────────────────────────────────────

describe('duplicate-names', () => {
  it('reports error when two tools share the same name', () => {
    const schemas: SchemaInput = {
      tools: [
        { name: 'search', description: 'Search for items.', inputSchema: { type: 'object', properties: { q: { type: 'string', description: 'Query.' } }, required: ['q'] } },
        { name: 'search', description: 'Another search.', inputSchema: { type: 'object', properties: { q: { type: 'string', description: 'Query.' } }, required: ['q'] } },
      ],
    };
    const report = lintSchemas(schemas);
    const d = report.diagnostics.find((x) => x.ruleId === 'duplicate-names');
    expect(d).toBeDefined();
    expect(d?.severity).toBe('error');
  });
});

// ─── Presets ──────────────────────────────────────────────────────────────────

describe('preset=minimal', () => {
  it('only runs 3 rules', () => {
    const report = lintSchemas(
      { tools: [{ name: 'myTool' }] },
      { preset: 'minimal' }
    );
    const ruleIds = new Set(report.diagnostics.map((d) => d.ruleId));
    // minimal only has tool-description-missing, tool-input-schema-missing, duplicate-names
    for (const id of ruleIds) {
      expect(['tool-description-missing', 'tool-input-schema-missing', 'duplicate-names']).toContain(id);
    }
    expect(report.preset).toBe('minimal');
  });
});

describe('preset=off', () => {
  it('produces no diagnostics', () => {
    const report = lintSchemas({ tools: [{ name: 'myTool' }] }, { preset: 'off' });
    expect(report.diagnostics).toHaveLength(0);
    expect(report.passed).toBe(true);
  });
});

// ─── Custom rules ─────────────────────────────────────────────────────────────

describe('createRule / custom rules', () => {
  it('custom rule fires correctly on matching tool', () => {
    const customRule: CustomRuleDefinition = createRule({
      id: 'custom-no-foo',
      category: 'tool',
      defaultSeverity: 'warning',
      description: 'Tools must not be named foo.',
      check(element, ctx) {
        const tool = element as ToolDefinition;
        if (tool.name === 'foo') {
          ctx.report({ message: 'Tool name "foo" is not allowed.' });
        }
      },
    });

    const report = lintSchemas(
      { tools: [{ name: 'foo', description: 'Bad name tool.' }] },
      { preset: 'off', customRules: [customRule] }
    );
    const d = report.diagnostics.find((x) => x.ruleId === 'custom-no-foo');
    expect(d).toBeDefined();
    expect(d?.message).toBe('Tool name "foo" is not allowed.');
  });

  it('custom rule does not fire when condition is not met', () => {
    const customRule: CustomRuleDefinition = createRule({
      id: 'custom-no-foo',
      category: 'tool',
      defaultSeverity: 'warning',
      description: 'Tools must not be named foo.',
      check(element, ctx) {
        const tool = element as ToolDefinition;
        if (tool.name === 'foo') {
          ctx.report({ message: 'Tool name "foo" is not allowed.' });
        }
      },
    });

    const report = lintSchemas(
      { tools: [validTool] },
      { preset: 'off', customRules: [customRule] }
    );
    const d = report.diagnostics.find((x) => x.ruleId === 'custom-no-foo');
    expect(d).toBeUndefined();
  });

  it('custom rule with category tool does not run on resources', () => {
    let calledWith: string[] = [];
    const customRule: CustomRuleDefinition = {
      id: 'custom-tool-only',
      category: 'tool',
      defaultSeverity: 'warning',
      description: 'Only applies to tools',
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      check(element: unknown, ctx: RuleContext): void {
        const el = element as { name?: string; uri?: string };
        calledWith.push(el.name ?? el.uri ?? 'unknown');
      },
    };

    lintSchemas(
      {
        tools: [{ name: 'myTool', description: 'A valid tool description.' }],
        resources: [{ uri: 'file:///test', description: 'A resource' }],
      },
      { customRules: [customRule] }
    );

    // Should only be called with the tool, not the resource
    expect(calledWith).toEqual(['myTool']);
  });
});

// ─── passed / summary ─────────────────────────────────────────────────────────

describe('passed and summary', () => {
  it('passed=true when no errors', () => {
    const report = lintSchemas({}, { preset: 'off' });
    expect(report.passed).toBe(true);
    expect(report.summary.errors).toBe(0);
  });

  it('passed=false when there are errors', () => {
    const report = lintSchemas({ tools: [{ name: 'badTool' }] });
    expect(report.passed).toBe(false);
    expect(report.summary.errors).toBeGreaterThan(0);
  });

  it('summary counts tools/resources/prompts analyzed correctly', () => {
    const report = lintSchemas({
      tools: [validTool],
      resources: [{ uri: 'file:///a.json', description: 'Test.', mimeType: 'application/json' }],
      prompts: [{ name: 'greet', description: 'Greet the user.' }],
    });
    expect(report.summary.toolsAnalyzed).toBe(1);
    expect(report.summary.resourcesAnalyzed).toBe(1);
    expect(report.summary.promptsAnalyzed).toBe(1);
  });

  it('summary.total equals errors + warnings + infos', () => {
    const report = lintSchemas({ tools: [{ name: 'broken' }] });
    const { total, errors, warnings, infos } = report.summary;
    expect(total).toBe(errors + warnings + infos);
  });
});

// ─── Complete valid tool → passed=true ────────────────────────────────────────

describe('complete valid tool', () => {
  it('passes with no errors or warnings when tool is fully defined', () => {
    const report = lintSchemas({ tools: [validTool] }, { preset: 'recommended' });
    // outputSchema is missing but that is only 'info' — no errors/warnings expected
    const errors = report.diagnostics.filter((d) => d.severity === 'error');
    const warnings = report.diagnostics.filter((d) => d.severity === 'warning');
    expect(errors).toHaveLength(0);
    expect(warnings).toHaveLength(0);
    expect(report.passed).toBe(true);
  });
});

// ─── lint() async wrapper ─────────────────────────────────────────────────────

describe('lint() async wrapper', () => {
  it('returns the same result as lintSchemas()', async () => {
    const schemas: SchemaInput = { tools: [validTool] };
    const asyncReport = await lint({ source: schemas, preset: 'recommended' });
    const syncReport = lintSchemas(schemas, { preset: 'recommended' });
    expect(asyncReport.diagnostics.length).toBe(syncReport.diagnostics.length);
    expect(asyncReport.passed).toBe(syncReport.passed);
    expect(asyncReport.preset).toBe(syncReport.preset);
  });
});

// ─── ruleStates in report ─────────────────────────────────────────────────────

describe('ruleStates in report', () => {
  it('contains all active rule ids', () => {
    const report = lintSchemas({}, { preset: 'recommended' });
    expect(report.ruleStates['tool-description-missing']).toBe('error');
    expect(report.ruleStates['tool-description-quality']).toBe('warning');
    expect(report.ruleStates['tool-output-schema-missing']).toBe('info');
  });

  it('can override individual rules', () => {
    const report = lintSchemas(
      { tools: [{ name: 'x', description: 'Valid description here.' }] },
      { preset: 'recommended', rules: { 'tool-input-schema-missing': 'off' } }
    );
    const d = report.diagnostics.find((x) => x.ruleId === 'tool-input-schema-missing');
    expect(d).toBeUndefined();
  });
});
