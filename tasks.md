# mcp-schema-lint — Task Breakdown

Comprehensive task list derived from SPEC.md. Each task is granular, actionable, and mapped to a specific spec requirement.

---

## Phase 1: Project Scaffolding and Core Types

- [ ] **Install dev dependencies** — Add `typescript`, `vitest`, `eslint`, and `@modelcontextprotocol/sdk` as dev dependencies. Add `@modelcontextprotocol/sdk` as a peer dependency (`^1.12.0`). Ensure `engines.node` is `>=18`. | Status: not_done
- [ ] **Add CLI bin entry to package.json** — Add `"bin": { "mcp-schema-lint": "./dist/cli.js" }` to package.json so the CLI is available as `mcp-schema-lint` after global install or via npx. | Status: not_done
- [ ] **Define all TypeScript types in src/types.ts** — Create `src/types.ts` with all type definitions from spec section 6: `StdioSourceConfig`, `HttpSourceConfig`, `SseSourceConfig`, `FileSourceConfig`, `SourceConfig`, `Severity`, `RuleConfig`, `LintOptions`, `LintDiagnostic`, `LintSummary`, `LintReport`, `CustomRuleDefinition`, `RuleContext`, `ToolDefinition`, `ResourceDefinition`, `ResourceTemplateDefinition`, `PromptDefinition`, and `StaticSchemaFile`. | Status: not_done
- [ ] **Create directory structure** — Create all directories specified in spec section 18: `src/source/`, `src/rules/`, `src/formatters/`, `src/utils/`, `src/__tests__/`, `src/__tests__/rules/`, `src/__tests__/formatters/`, `src/__tests__/fixtures/`, `src/__tests__/fixtures/configs/`. | Status: not_done

---

## Phase 2: Utility Modules

- [ ] **Implement src/utils/naming.ts** — Naming convention detection and validation utilities. Must support `camelCase`, `snake_case`, `kebab-case`, and `PascalCase` detection. Provide functions to: (1) detect which convention a single name follows, (2) detect the dominant convention across a list of names, (3) validate a name against a specific convention. Handle edge cases: single-word names, names with numbers, empty strings. | Status: not_done
- [ ] **Implement src/utils/description.ts** — Description quality heuristic utilities. Provide functions to: (1) check if a description is too short (< 10 chars for tools, < 5 chars for parameters), (2) check if a description matches known vague patterns (`"does stuff"`, `"a tool"`, `"tool for"`, `"helper"`, `"utility"`, `"misc"`, `"TODO"`, `"placeholder"`), (3) check if a description just restates the name (case-insensitive), (4) check if a description contains a verb, (5) check if a description exceeds a max length. | Status: not_done
- [ ] **Implement src/utils/schema-walk.ts** — JSON Schema traversal utilities. Provide functions to: (1) calculate nesting depth of a JSON Schema object, (2) iterate over all properties (including nested) in a schema, (3) handle `$ref`, `oneOf`, `anyOf`, `allOf`, and `const` schemas gracefully (skip type checks for these). | Status: not_done

---

## Phase 3: Rule Infrastructure

- [ ] **Implement src/rules/create-rule.ts** — Factory function `createRule()` that accepts a `CustomRuleDefinition`-like object and returns a validated rule definition. Ensure type safety for the `check` function signature based on the `category` field. Export from the public API. | Status: not_done
- [ ] **Implement src/rules/rule-runner.ts** — The rule evaluation engine. Takes an array of rule definitions, effective severity map, and schemas object. For each rule: determine effective severity (skip if `off`), iterate over appropriate schema elements based on category, invoke the `check` function with a `RuleContext`, collect diagnostics. Handle custom rule exceptions gracefully (catch, add internal diagnostic, continue). Sort diagnostics by severity (errors first) then by target. | Status: not_done
- [ ] **Implement src/rules/index.ts** — Rule registry that imports and exports all built-in rules as an array. Provides a function to get all built-in rule IDs and their metadata (category, defaultSeverity, description). | Status: not_done

---

## Phase 4: Built-in Rules — Tool Rules

- [ ] **Implement rule: tool-description-missing** — In `src/rules/tool-description-missing.ts`. Check if tool has no `description` field or description is empty string. Default severity: `error`. Target format: `tool:<name>`. | Status: not_done
- [ ] **Implement rule: tool-description-quality** — In `src/rules/tool-description-quality.ts`. Check description quality heuristics: length < 10 chars, matches tool name exactly (case-insensitive), matches vague patterns, lacks a verb. Default severity: `warning`. Use utilities from `src/utils/description.ts`. | Status: not_done
- [ ] **Implement rule: tool-description-length** — In `src/rules/tool-description-length.ts`. Check if tool description exceeds configurable max length (default 500 chars). Default severity: `info`. Support `options.maxLength` configuration. | Status: not_done
- [ ] **Implement rule: tool-annotations-missing** — In `src/rules/tool-annotations-missing.ts`. Check if tool has no `annotations` field at all. Default severity: `warning`. Suggest adding `readOnlyHint`, `destructiveHint`, `idempotentHint`, and `openWorldHint`. | Status: not_done
- [ ] **Implement rule: tool-annotations-destructive-hint** — In `src/rules/tool-annotations-destructive-hint.ts`. Check if tool name/description contains destructive keywords (`delete`, `remove`, `drop`, `destroy`, `purge`, `wipe`, `truncate`, `erase`) but has no annotations or `destructiveHint: false`. Default severity: `warning`. | Status: not_done
- [ ] **Implement rule: tool-annotations-readonly-hint** — In `src/rules/tool-annotations-readonly-hint.ts`. Check if tool name/description contains read-only keywords (`get`, `list`, `search`, `query`, `fetch`, `read`, `describe`, `show`, `view`, `count`) but has `readOnlyHint` unset or `false`. Default severity: `info`. | Status: not_done
- [ ] **Implement rule: tool-annotations-inconsistent** — In `src/rules/tool-annotations-inconsistent.ts`. Check for logically inconsistent annotation combinations: (1) `readOnlyHint: true` with `destructiveHint: true`, (2) `readOnlyHint: true` with `idempotentHint` explicitly set. Default severity: `error`. | Status: not_done
- [ ] **Implement rule: tool-output-schema-missing** — In `src/rules/tool-output-schema-missing.ts`. Check if tool has no `outputSchema` field. Default severity: `info`. | Status: not_done
- [ ] **Implement rule: tool-input-schema-missing** — In `src/rules/tool-input-schema-missing.ts`. Check if tool has no `inputSchema` field at all. Default severity: `error`. | Status: not_done
- [ ] **Implement rule: tool-input-schema-empty** — In `src/rules/tool-input-schema-empty.ts`. Check if `inputSchema` is `{ type: "object" }` with no `properties` or empty `properties: {}`. Default severity: `warning`. | Status: not_done
- [ ] **Implement rule: tool-input-schema-no-required** — In `src/rules/tool-input-schema-no-required.ts`. Check if `inputSchema` has `properties` but no `required` array. Default severity: `warning`. | Status: not_done
- [ ] **Implement rule: tool-title-missing** — In `src/rules/tool-title-missing.ts`. Check if tool has no `title` field. Default severity: `info`. | Status: not_done

---

## Phase 5: Built-in Rules — Parameter Rules

- [ ] **Implement rule: parameter-description-missing** — In `src/rules/parameter-description-missing.ts`. Check each property in `inputSchema.properties` and `outputSchema.properties` for missing `description` field. Default severity: `warning`. Target format: `tool:<name>.inputSchema.properties.<param>`. | Status: not_done
- [ ] **Implement rule: parameter-type-missing** — In `src/rules/parameter-type-missing.ts`. Check each property in `inputSchema.properties` for missing `type` field. Skip properties that use `$ref`, `oneOf`, `anyOf`, `allOf`, or `const`. Default severity: `error`. | Status: not_done
- [ ] **Implement rule: parameter-description-quality** — In `src/rules/parameter-description-quality.ts`. Check if parameter description is present but too short (< 5 chars) or matches the parameter name exactly (case-insensitive). Default severity: `info`. | Status: not_done
- [ ] **Implement rule: parameter-enum-description-missing** — In `src/rules/parameter-enum-description-missing.ts`. Check if a parameter uses `enum` but has no `description` field. Default severity: `info`. | Status: not_done

---

## Phase 6: Built-in Rules — Naming Convention Rules

- [ ] **Implement rule: naming-convention** — In `src/rules/naming-convention.ts`. Detect dominant naming convention across all tool/resource/prompt names and flag outliers. Support configurable `options.convention` (`auto`, `camelCase`, `snake_case`, `kebab-case`, `PascalCase`). Default: `auto`. Default severity: `warning`. Use utilities from `src/utils/naming.ts`. This is a `general` category rule that receives the full schemas object. | Status: not_done
- [ ] **Implement rule: tool-naming-verb-noun** — In `src/rules/tool-naming-verb-noun.ts`. Check that tool names follow a verb-noun pattern by verifying the first segment (split by `_`, `-`, or camelCase boundary) is a recognized verb. Support configurable `options.additionalVerbs` array. Default severity: `info`. Include the full list of recognized verbs from spec section 5.3. | Status: not_done

---

## Phase 7: Built-in Rules — Resource Rules

- [ ] **Implement rule: resource-description-missing** — In `src/rules/resource-description-missing.ts`. Check if resource has no `description` or empty description. Default severity: `warning`. Target format: `resource:<name>`. | Status: not_done
- [ ] **Implement rule: resource-mime-type-missing** — In `src/rules/resource-mime-type-missing.ts`. Check if resource has no `mimeType` field. Default severity: `warning`. | Status: not_done
- [ ] **Implement rule: resource-uri-format** — In `src/rules/resource-uri-format.ts`. Check resource URI validity: (1) syntactically invalid URIs get severity `error`, (2) non-standard schemes (not `https://`, `file://`, `git://`) get severity `warning`. Default severity: `warning`. | Status: not_done
- [ ] **Implement rule: resource-template-description-missing** — In `src/rules/resource-template-description-missing.ts`. Check if resource template has no `description` field. Default severity: `warning`. Target format: `resourceTemplate:<name>`. | Status: not_done

---

## Phase 8: Built-in Rules — Prompt Rules

- [ ] **Implement rule: prompt-description-missing** — In `src/rules/prompt-description-missing.ts`. Check if prompt has no `description` or empty description. Default severity: `warning`. Target format: `prompt:<name>`. | Status: not_done
- [ ] **Implement rule: prompt-argument-description-missing** — In `src/rules/prompt-argument-description-missing.ts`. Check each argument in a prompt's `arguments` array for missing `description` field. Default severity: `warning`. Target format: `prompt:<name>.arguments.<argName>`. | Status: not_done

---

## Phase 9: Built-in Rules — General Rules

- [ ] **Implement rule: duplicate-names** — In `src/rules/duplicate-names.ts`. Check for duplicate names within tools, resources, and prompts respectively. Default severity: `error`. This is a `general` category rule that receives the full schemas object. | Status: not_done
- [ ] **Implement rule: schema-depth-excessive** — In `src/rules/schema-depth-excessive.ts`. Check if `inputSchema` or `outputSchema` nesting depth exceeds configurable max (default 5). Default severity: `info`. Support `options.maxDepth` configuration. Use utilities from `src/utils/schema-walk.ts`. | Status: not_done
- [ ] **Implement rule: total-tools-excessive** — In `src/rules/total-tools-excessive.ts`. Check if the server exposes more than configurable max tools (default 50). Default severity: `info`. Support `options.maxTools` configuration. This is a `general` category rule. | Status: not_done

---

## Phase 10: Presets

- [ ] **Implement src/presets.ts** — Define all four presets (`recommended`, `strict`, `minimal`, `off`) as maps from rule ID to severity. `recommended`: all rules at their default severities (per spec section 9 table). `strict`: all warnings upgraded to errors, all info upgraded to warnings. `minimal`: only `tool-description-missing`, `tool-annotations-inconsistent`, `tool-input-schema-missing`, `parameter-type-missing`, `duplicate-names`, `resource-uri-format` at error; all others off. `off`: all rules disabled. | Status: not_done

---

## Phase 11: Configuration

- [ ] **Implement src/config.ts — config file discovery** — Implement auto-detection of config files by searching current directory and ancestors for: `.mcp-schema-lint.json`, `.mcp-schema-lint.yaml`, `.mcp-schema-lintrc` (JSON format), or `mcp-schema-lint` key in `package.json`. Use the first one found. Support `--config` flag override. | Status: not_done
- [ ] **Implement src/config.ts — config file parsing** — Parse JSON config files. For YAML, implement a minimal inline parser for simple key-value and nested objects (or document JSON-only requirement to avoid YAML dependency). Validate config structure: `preset` must be valid preset name, `rules` keys must be known rule IDs, severity values must be valid. Handle shorthand severity (string) and full `RuleConfig` objects. | Status: not_done
- [ ] **Implement src/config.ts — configuration precedence resolution** — Resolve effective rule severities by applying in order: (1) built-in defaults, (2) preset configuration, (3) config file rules, (4) CLI `--rule` flags, (5) programmatic `rules` in `LintOptions`. Return a resolved map of rule ID to effective severity and options. | Status: not_done
- [ ] **Implement config validation errors** — Return clear error messages for: invalid config file JSON, unknown rule IDs in overrides, invalid severity values. These should result in exit code 2 from CLI. | Status: not_done

---

## Phase 12: Source Readers

- [ ] **Implement src/source/index.ts** — Source factory that dispatches to the appropriate source reader based on `SourceConfig.type`. Returns collected schemas (`tools`, `resources`, `resourceTemplates`, `prompts`) and optional server info. | Status: not_done
- [ ] **Implement src/source/file-source.ts** — Read and parse a static JSON file. Validate the file exists, is valid JSON, and contains the expected structure (optional `tools`, `resources`, `resourceTemplates`, `prompts` arrays). Return parsed schemas. Handle errors: file not found (exit code 2), invalid JSON (exit code 2), invalid structure (exit code 2). | Status: not_done
- [ ] **Implement src/source/live-source.ts — stdio transport** — Connect to a live MCP server via `StdioClientTransport`. Spawn subprocess with configurable `command`, `args`, `env`, `cwd`. Perform MCP handshake (`initialize` + `notifications/initialized`). Enumerate schemas via `client.listTools()`, `client.listResources()`, `client.listResourceTemplates()`, `client.listPrompts()`. Handle pagination (`nextCursor`). Respect server capabilities (only call list methods for declared capabilities). Cleanup: `client.close()` then terminate subprocess (`SIGTERM`, then `SIGKILL` after 5s). | Status: not_done
- [ ] **Implement src/source/live-source.ts — HTTP transport** — Connect via `StreamableHTTPClientTransport`. Accept `url` and optional `headers`. Same handshake and enumeration flow as stdio. | Status: not_done
- [ ] **Implement src/source/live-source.ts — SSE transport** — Connect via `SSEClientTransport`. Accept `url` and optional `headers`. Same handshake and enumeration flow as stdio. | Status: not_done
- [ ] **Implement timeout and abort handling in live-source** — Apply configurable timeout (default 30s) as an overall ceiling for connection + enumeration. Support external `AbortSignal` for cancellation. On timeout: close client, terminate subprocess, return error with message "Connection timed out after <ms>ms." | Status: not_done
- [ ] **Implement partial failure handling in live-source** — If one enumeration call fails (e.g., `prompts/list` returns `MethodNotFound`) while others succeed, continue with successfully collected schemas. Add a warning diagnostic noting which category was not analyzed. Do not fail the entire lint run. | Status: not_done

---

## Phase 13: Core Lint Functions

- [ ] **Implement src/lint-schemas.ts** — Synchronous `lintSchemas()` function. Accepts pre-parsed schemas and optional `LintOptions` (without `source`). Resolves configuration (preset + rule overrides), runs rule evaluation via `rule-runner`, builds and returns `LintReport`. Report includes: `passed` (true if zero errors), `timestamp` (ISO 8601), `durationMs`, sorted `diagnostics`, `summary` counts, `preset` name, `ruleStates` map. | Status: not_done
- [ ] **Implement src/lint.ts** — Async `lint()` function. Accepts full `LintOptions` with source. Dispatches to appropriate source reader, collects schemas and server info, calls `lintSchemas()` internally, augments report with server info. Handle all connection/file errors and return exit code 2 equivalents. | Status: not_done

---

## Phase 14: Formatters

- [ ] **Implement src/formatters/index.ts** — Formatter factory that returns the appropriate formatter function based on format name (`human`, `json`, `sarif`). | Status: not_done
- [ ] **Implement src/formatters/human.ts** — Human-readable terminal output formatter. Produce colored output with severity badges (`ERROR`, `WARN`, `INFO`), rule IDs, targets, messages, and suggestions. Include header (version, target info, server info, preset). Include summary line (error/warning counts, elements analyzed, duration, PASSED/FAILED). Hide info-severity diagnostics unless `--verbose`. Support `--no-color` to disable ANSI colors. Match the exact format shown in spec section 7. | Status: not_done
- [ ] **Implement src/formatters/json.ts** — JSON formatter that outputs the `LintReport` object as pretty-printed JSON to stdout. | Status: not_done
- [ ] **Implement src/formatters/sarif.ts** — SARIF v2.1.0 formatter. Map `LintReport` to SARIF structure: each diagnostic becomes a `result` with `ruleId`, `level` (`error`/`warning`/`note`), `message.text`, logical location using `target` as `fullyQualifiedName`. Include rule metadata in `run.tool.driver.rules[]`. Include `suggestion` as `result.fixes[0].description.text` when present. | Status: not_done

---

## Phase 15: CLI

- [ ] **Implement src/cli.ts — argument parsing** — Parse CLI arguments using Node.js built-in `util.parseArgs` (Node 18+). Support all flags from spec section 7: `--stdio`, `--url`, `--sse`, `--file`, `--header` (repeatable), `--cwd`, `--env` (repeatable), `--preset`, `--rule` (repeatable, format `id:severity`), `--config`, `--category` (repeatable), `--format`, `--quiet`, `--verbose`, `--no-color`, `--timeout`, `--version`, `--help`. Validate exactly one source is specified. | Status: not_done
- [ ] **Implement src/cli.ts — environment variable fallback** — Read environment variables as fallbacks for CLI flags: `MCP_SCHEMA_LINT_STDIO`, `MCP_SCHEMA_LINT_URL`, `MCP_SCHEMA_LINT_SSE`, `MCP_SCHEMA_LINT_FILE`, `MCP_SCHEMA_LINT_PRESET`, `MCP_SCHEMA_LINT_FORMAT`, `MCP_SCHEMA_LINT_TIMEOUT`, `MCP_SCHEMA_LINT_CONFIG`, `MCP_SCHEMA_LINT_CATEGORY` (comma-separated). Explicit flags override env vars. | Status: not_done
- [ ] **Implement src/cli.ts — exit codes** — Exit with code 0 if no error-severity diagnostics, code 1 if one or more errors found, code 2 for configuration/usage errors (invalid flags, missing source, invalid config, connection failure). Warnings and info do not affect exit code. | Status: not_done
- [ ] **Implement src/cli.ts — help text** — Output comprehensive help text matching the format in spec section 7 when `--help` is passed. | Status: not_done
- [ ] **Implement src/cli.ts — version flag** — Output package version from package.json when `--version` is passed. | Status: not_done
- [ ] **Implement src/cli.ts — quiet mode** — When `--quiet` is passed, suppress all output except the exit code. Override `--format`. | Status: not_done
- [ ] **Implement src/cli.ts — main orchestration** — Wire together: parse args, resolve config, build `LintOptions`, call `lint()`, format output, write to stdout, exit with appropriate code. Add shebang `#!/usr/bin/env node` at top of compiled output. | Status: not_done

---

## Phase 16: Public API Exports

- [ ] **Implement src/index.ts** — Export the public API: `lint` (from `lint.ts`), `lintSchemas` (from `lint-schemas.ts`), `createRule` (from `rules/create-rule.ts`). Export all public types: `LintOptions`, `LintReport`, `LintDiagnostic`, `LintSummary`, `Severity`, `RuleConfig`, `SourceConfig`, `StdioSourceConfig`, `HttpSourceConfig`, `SseSourceConfig`, `FileSourceConfig`, `CustomRuleDefinition`, `RuleContext`, `ToolDefinition`, `ResourceDefinition`, `ResourceTemplateDefinition`, `PromptDefinition`. | Status: not_done

---

## Phase 17: Unit Tests — Rule Tests

- [ ] **Test: tool-description-missing** — Test passing case (tool with description), failing case (no description), failing case (empty string description). Verify ruleId, severity, target, and message in diagnostics. | Status: not_done
- [ ] **Test: tool-description-quality** — Test passing case (good description), failing cases: description < 10 chars, description matches tool name, description matches vague patterns, description lacks verb. Test edge case: description exactly 10 chars (should pass). | Status: not_done
- [ ] **Test: tool-description-length** — Test passing case (under 500 chars), failing case (over 500 chars). Test with custom `maxLength` option. | Status: not_done
- [ ] **Test: tool-annotations-missing** — Test passing case (has annotations), failing case (no annotations field). | Status: not_done
- [ ] **Test: tool-annotations-destructive-hint** — Test passing case (destructive tool with `destructiveHint: true`), failing case (tool named `delete_file` with `destructiveHint: false`), failing case (destructive tool with no annotations). Test all destructive keywords. | Status: not_done
- [ ] **Test: tool-annotations-readonly-hint** — Test passing case (read-only tool with `readOnlyHint: true`), failing case (tool named `get_weather` without `readOnlyHint`). Test all read-only keywords. | Status: not_done
- [ ] **Test: tool-annotations-inconsistent** — Test passing case (consistent annotations), failing case (`readOnlyHint: true` + `destructiveHint: true`), failing case (`readOnlyHint: true` + `idempotentHint` explicitly set). | Status: not_done
- [ ] **Test: tool-output-schema-missing** — Test passing case (has outputSchema), failing case (no outputSchema). | Status: not_done
- [ ] **Test: tool-input-schema-missing** — Test passing case (has inputSchema), failing case (no inputSchema). | Status: not_done
- [ ] **Test: tool-input-schema-empty** — Test passing case (inputSchema with properties), failing case (`{ type: "object" }` with no properties), failing case (empty properties `{}`). | Status: not_done
- [ ] **Test: tool-input-schema-no-required** — Test passing case (has required array), failing case (has properties but no required). Test edge case: no properties at all (rule should not fire). | Status: not_done
- [ ] **Test: tool-title-missing** — Test passing case (has title), failing case (no title). | Status: not_done
- [ ] **Test: parameter-description-missing** — Test passing case (all params have descriptions), failing case (param without description). Test both inputSchema and outputSchema parameters. | Status: not_done
- [ ] **Test: parameter-type-missing** — Test passing case (param has type), failing case (param without type). Test that `$ref`, `oneOf`, `anyOf`, `allOf`, `const` schemas are skipped. | Status: not_done
- [ ] **Test: parameter-description-quality** — Test passing case (good description), failing case (description < 5 chars), failing case (description matches param name). | Status: not_done
- [ ] **Test: parameter-enum-description-missing** — Test passing case (enum param with description), failing case (enum param without description). Test non-enum param (rule should not fire). | Status: not_done
- [ ] **Test: naming-convention** — Test consistent snake_case (should pass), mixed naming (should flag outliers), single tool (should pass), configurable convention override. Test all convention types. | Status: not_done
- [ ] **Test: tool-naming-verb-noun** — Test verb-noun name (should pass), noun-only name (should flag), custom additional verbs via options. Test camelCase, snake_case, and kebab-case name splitting. | Status: not_done
- [ ] **Test: resource-description-missing** — Test passing and failing cases for resources. | Status: not_done
- [ ] **Test: resource-mime-type-missing** — Test passing and failing cases. | Status: not_done
- [ ] **Test: resource-uri-format** — Test valid URI (pass), invalid URI (error), non-standard scheme (warning). | Status: not_done
- [ ] **Test: resource-template-description-missing** — Test passing and failing cases for resource templates. | Status: not_done
- [ ] **Test: prompt-description-missing** — Test passing and failing cases for prompts. | Status: not_done
- [ ] **Test: prompt-argument-description-missing** — Test passing case (argument with description), failing case (argument without description). | Status: not_done
- [ ] **Test: duplicate-names** — Test unique names (pass), duplicate tool names (error), duplicate resource names, duplicate prompt names. | Status: not_done
- [ ] **Test: schema-depth-excessive** — Test schema within max depth (pass), schema exceeding max depth (flag). Test custom maxDepth option. | Status: not_done
- [ ] **Test: total-tools-excessive** — Test under max (pass), over max (flag). Test custom maxTools option. | Status: not_done

---

## Phase 18: Unit Tests — Core and Config

- [ ] **Test: presets** — Verify each preset (`recommended`, `strict`, `minimal`, `off`) enables the expected rules at the expected severities. Check every rule ID against the tables in spec section 9. | Status: not_done
- [ ] **Test: configuration file parsing** — Test valid JSON config parsing, shorthand severity expansion, full `RuleConfig` object parsing. Test config file discovery (`.mcp-schema-lint.json`, `.mcp-schema-lintrc`, `package.json` key). | Status: not_done
- [ ] **Test: configuration precedence** — Test that precedence is applied correctly: defaults < preset < config file < CLI `--rule` < programmatic `rules`. Verify each layer can override the previous. | Status: not_done
- [ ] **Test: configuration validation errors** — Test that unknown rule IDs, invalid severity values, and malformed config files produce clear error messages. | Status: not_done
- [ ] **Test: lint-schemas** — Test `lintSchemas()` with known schemas and verify: `passed` is true with zero errors, `passed` is false with errors, summary counts are correct, diagnostics are sorted (errors first, then by target), timestamp is ISO 8601, ruleStates map is populated. | Status: not_done
- [ ] **Test: report builder** — Verify `passed` is `true` when there are warnings but no errors. Verify `passed` is `false` when there is at least one error. Verify summary counts match diagnostic array. | Status: not_done

---

## Phase 19: Unit Tests — Formatters

- [ ] **Test: human formatter** — Test output for a known report: verify severity badges (`ERROR`, `WARN`, `INFO`), rule IDs, targets, messages appear. Verify info diagnostics are hidden without verbose flag. Verify `--no-color` strips ANSI codes. Verify summary line format. | Status: not_done
- [ ] **Test: JSON formatter** — Test that output is valid JSON matching the `LintReport` structure. Test pretty-printing. | Status: not_done
- [ ] **Test: SARIF formatter** — Test SARIF v2.1.0 output structure: verify `$schema`, `version`, `runs`, `results`, `rules` mapping. Verify severity mapping (`error` -> `error`, `warning` -> `warning`, `info` -> `note`). Verify logical locations use `target` as `fullyQualifiedName`. Verify suggestions map to `fixes`. | Status: not_done

---

## Phase 20: Unit Tests — CLI

- [ ] **Test: CLI argument parsing** — Test parsing of all flags: `--stdio`, `--url`, `--sse`, `--file`, `--header`, `--cwd`, `--env`, `--preset`, `--rule`, `--config`, `--category`, `--format`, `--quiet`, `--verbose`, `--no-color`, `--timeout`, `--version`, `--help`. Test repeatable flags (`--header`, `--env`, `--rule`, `--category`). | Status: not_done
- [ ] **Test: CLI environment variable fallback** — Test each env var is used when corresponding flag is not provided. Test that explicit flags override env vars. | Status: not_done
- [ ] **Test: CLI exit codes** — Test exit code 0 (no errors), exit code 1 (errors found), exit code 2 (configuration errors, missing source, connection failure). | Status: not_done
- [ ] **Test: CLI source validation** — Test error when no source is specified. Test error when multiple sources are specified. | Status: not_done

---

## Phase 21: Unit Tests — Utilities

- [ ] **Test: naming utilities** — Test detection of `camelCase`, `snake_case`, `kebab-case`, `PascalCase` names. Test dominant convention detection with various mixes. Test single-word names, names with numbers, empty strings. | Status: not_done
- [ ] **Test: description utilities** — Test vague pattern matching, verb detection, length checks, name-matching detection. Test edge cases: descriptions with mixed case, descriptions that are substrings of name. | Status: not_done
- [ ] **Test: schema-walk utilities** — Test depth calculation for flat schemas, nested schemas, deeply nested schemas. Test handling of `$ref`, `oneOf`, `anyOf`, `allOf`. | Status: not_done

---

## Phase 22: Integration Tests

- [ ] **Create test fixture: well-formed mock MCP server** — In `src/__tests__/fixtures/well-formed-server.ts`. Create a mock MCP server using `@modelcontextprotocol/sdk`'s `McpServer` class with well-documented tools, resources, and prompts. All schemas should pass `strict` preset with zero errors. | Status: not_done
- [ ] **Create test fixture: poorly-formed mock MCP server** — In `src/__tests__/fixtures/poorly-formed-server.ts`. Create a mock MCP server with: missing descriptions, no annotations, inconsistent naming (mixed camelCase/snake_case), empty input schemas, missing parameter types, duplicate tool names. | Status: not_done
- [ ] **Create test fixture: schemas-good.json** — Static schema file with well-formed tools, resources, and prompts that pass all rules. | Status: not_done
- [ ] **Create test fixture: schemas-bad.json** — Static schema file with many issues for testing rule coverage. | Status: not_done
- [ ] **Create test fixture: config files** — In `src/__tests__/fixtures/configs/`: `valid-config.json` (valid config), `invalid-config.json` (unknown rule IDs), `strict-override.json` (strict preset with overrides). | Status: not_done
- [ ] **Integration test: well-formed server via stdio** — Spawn the well-formed mock server via stdio transport. Run linter with `strict` preset. Assert zero errors. | Status: not_done
- [ ] **Integration test: poorly-formed server via stdio** — Spawn the poorly-formed mock server. Run linter with `recommended` preset. Assert specific expected errors and warnings are produced. | Status: not_done
- [ ] **Integration test: server with no tools** — Start a minimal server with no capabilities. Assert no diagnostics and exit code 0. | Status: not_done
- [ ] **Integration test: static file input** — Run linter against `schemas-bad.json`. Assert expected diagnostics. | Status: not_done
- [ ] **Integration test: custom rules** — Register a custom rule and verify it runs alongside built-in rules. | Status: not_done
- [ ] **Integration test: SARIF output validation** — Run linter with `--format sarif` and validate the output is valid SARIF v2.1.0 JSON. | Status: not_done

---

## Phase 23: Edge Case Tests

- [ ] **Test: paginated tools** — Server returns tools across multiple pages via `nextCursor`. Verify all tools are collected and linted. | Status: not_done
- [ ] **Test: server declares capability but method throws** — Server declares `tools` capability but `listTools` throws `MethodNotFound`. Verify graceful handling with warning diagnostic. | Status: not_done
- [ ] **Test: server without resources capability** — Server does not declare `resources` capability. Verify resources are not linted (no `listResources` call). | Status: not_done
- [ ] **Test: tool with $ref in inputSchema** — Tool input schema containing `$ref` references. Verify `parameter-type-missing` does not fire for `$ref` properties. | Status: not_done
- [ ] **Test: deeply nested schema (6+ levels)** — Tool with deeply nested input schema. Verify `schema-depth-excessive` fires. | Status: not_done
- [ ] **Test: very long description (1000+ chars)** — Tool with description exceeding 1000 characters. Verify `tool-description-length` fires. | Status: not_done
- [ ] **Test: empty tool name** — Tool with empty string name. Verify rules handle gracefully. | Status: not_done
- [ ] **Test: tool name with special characters** — Tool name containing special characters. Verify naming rules handle gracefully. | Status: not_done
- [ ] **Test: config file with unknown rule IDs** — Config file containing unrecognized rule IDs. Verify exit code 2 with clear error message. | Status: not_done
- [ ] **Test: custom rule that throws** — Custom rule whose `check` function throws an exception. Verify exception is caught, internal diagnostic is added, linter continues with other rules. | Status: not_done
- [ ] **Test: AbortSignal triggered mid-lint** — Pass an `AbortSignal` that aborts during enumeration. Verify graceful cancellation. | Status: not_done
- [ ] **Test: timeout during server connection** — Set a very short timeout. Verify timeout error message and exit code 2. | Status: not_done
- [ ] **Test: static schema file with extra fields** — Schema file with additional unexpected fields. Verify graceful handling (ignored, not errors). | Status: not_done

---

## Phase 24: Source Reader Error Handling Tests

- [ ] **Test: stdio command not found** — Spawn with a non-existent command. Verify exit code 2 and message "Failed to spawn subprocess: command not found." | Status: not_done
- [ ] **Test: HTTP connection refused** — Connect to a URL that refuses connections. Verify exit code 2 and message "Failed to connect to MCP server: connection refused." | Status: not_done
- [ ] **Test: MCP handshake failure** — Server that fails during initialize handshake. Verify exit code 2 and message "MCP handshake failed: <details>." | Status: not_done
- [ ] **Test: server crash during enumeration** — Server that crashes mid-enumeration. Verify exit code 2 and message "Server disconnected during schema enumeration." | Status: not_done
- [ ] **Test: file not found** — Lint a non-existent file path. Verify exit code 2 and message "Schema file not found: <path>." | Status: not_done
- [ ] **Test: invalid JSON file** — Lint a file with invalid JSON. Verify exit code 2 and message "Failed to parse schema file: <parse error>." | Status: not_done
- [ ] **Test: invalid schema structure** — Lint a JSON file without valid tool/resource/prompt arrays. Verify exit code 2 and message "Schema file does not contain valid tool/resource/prompt arrays." | Status: not_done

---

## Phase 25: Documentation

- [ ] **Create README.md** — Write comprehensive README covering: package overview, installation, quick start (CLI and programmatic), full CLI reference, configuration file format, all built-in rules with descriptions, preset descriptions, custom rules API, SARIF/CI integration examples (GitHub Actions, GitLab CI, pre-commit hook), programmatic API examples, static schema file format, environment variables, exit codes. | Status: not_done
- [ ] **Add JSDoc comments to all public API exports** — Add thorough JSDoc comments to `lint()`, `lintSchemas()`, `createRule()`, and all exported types. Include `@param`, `@returns`, `@example` tags. | Status: not_done
- [ ] **Create example config file** — Create `.mcp-schema-lint.json` at project root as both a usage example and self-linting config. | Status: not_done

---

## Phase 26: Build, Lint, and CI

- [ ] **Configure ESLint** — Set up ESLint for the project's TypeScript source code. Ensure `npm run lint` passes. | Status: not_done
- [ ] **Verify TypeScript build** — Ensure `npm run build` compiles all source files to `dist/` with declarations and source maps. Verify the CLI entry point has the shebang line. | Status: not_done
- [ ] **Verify test suite** — Run `npm run test` and ensure all tests pass. Verify coverage of all rules, formatters, config, CLI parsing, and integration scenarios. | Status: not_done
- [ ] **Version bump** — Bump version in package.json per semver as appropriate for the release (0.1.0 for initial release per spec roadmap Phase 1). | Status: not_done

---

## Phase 27: Publishing Preparation

- [ ] **Verify package.json fields** — Ensure `name`, `version`, `description`, `main`, `types`, `bin`, `files`, `engines`, `publishConfig`, `peerDependencies`, `keywords`, `license`, `author` are all correct and complete. Add relevant keywords (`mcp`, `lint`, `schema`, `model-context-protocol`, `cli`). | Status: not_done
- [ ] **Verify dist output** — Run `npm run build` and inspect `dist/` contents. Ensure `index.js`, `index.d.ts`, `cli.js` (with shebang) are present. Ensure no test files or fixtures are included in the published package. | Status: not_done
- [ ] **Dry-run npm publish** — Run `npm publish --dry-run` to verify package contents and metadata before actual publish. | Status: not_done
