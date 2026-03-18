# mcp-schema-lint -- Specification

## 1. Overview

`mcp-schema-lint` is a CLI linter and programmatic analysis library for MCP (Model Context Protocol) tool, resource, and prompt schemas. It connects to a live MCP server (or reads static schema files), extracts the server's declared tools, resources, and prompts via `tools/list`, `resources/list`, and `prompts/list`, and evaluates each schema against a configurable set of lint rules. Rules check description quality, naming conventions, annotation completeness, output schema presence, input schema rigor, and parameter documentation. The result is a structured lint report with per-schema diagnostics, severity levels, fix suggestions, and machine-readable output suitable for CI/CD gating.

The gap this package fills is specific and well-defined. The existing `mcp validate` command (from `@anthropic/mcp-cli` and similar tools) verifies structural validity -- it checks that Zod fields have `.describe()` calls and that the JSON Schema emitted by the server is syntactically valid. But structural validity is a low bar. A tool named `x` with description `"does stuff"`, no annotations, no output schema, and input parameters that lack descriptions passes structural validation. It is also useless to an LLM that needs to understand what the tool does, what side effects it has, and what arguments it expects. Nothing in the MCP ecosystem checks description quality (vague vs. specific), naming consistency (camelCase vs. snake_case mixing), annotation completeness (missing `readOnlyHint`/`destructiveHint` on tools that clearly modify state), output schema presence (tools returning structured data without declaring it), or parameter documentation (properties with no `description` field). `mcp-schema-lint` addresses all of these.

The design is modeled on established linting tools. The architecture mirrors Spectral (the OpenAPI linter): a rules engine evaluates a set of named, configurable rules against a schema document, producing diagnostics with severity, location, message, and optional fix suggestions. Rules are organized into presets (recommended, strict, minimal). Users can override severity per rule, disable individual rules, or add custom rules via a plugin interface. Output formats include human-readable terminal output, JSON, and SARIF (Static Analysis Results Interchange Format) for GitHub Actions annotations and CI tool integration.

`mcp-schema-lint` provides both a TypeScript/JavaScript API for programmatic use and a CLI for terminal and shell-script use. The API returns structured `LintReport` objects with per-rule diagnostics. The CLI prints human-readable or machine-readable output and exits with conventional codes (0 for no errors, 1 for lint errors found, 2 for configuration/usage errors).

---

## 2. Goals and Non-Goals

### Goals

- Provide a single function (`lint`) that connects to an MCP server (or reads a static schema file), enumerates tools/resources/prompts, and evaluates all schemas against a configurable ruleset.
- Check description quality: detect vague, overly terse, or missing descriptions on tools, resources, prompts, and their parameters.
- Check naming conventions: enforce consistent naming patterns (camelCase, snake_case, kebab-case) across tool names, resource names, prompt names, and parameter names.
- Check annotation completeness: warn when tools lack `readOnlyHint`, `destructiveHint`, `idempotentHint`, or `openWorldHint` annotations, and detect logical inconsistencies (e.g., `readOnlyHint: true` with `destructiveHint: true`).
- Check output schema presence: warn when tools that return structured data do not declare an `outputSchema`.
- Check input schema rigor: detect missing `type` declarations, missing `required` arrays, missing parameter descriptions, overly permissive schemas (bare `object` with no `properties`), and missing enum documentation.
- Provide a CLI (`mcp-schema-lint`) with JSON, SARIF, and human-readable output, deterministic exit codes, and environment variable configuration for CI integration.
- Support rule presets (`recommended`, `strict`, `minimal`) and per-rule severity overrides via a configuration file.
- Support custom rules via a plugin API that allows users to write and register their own lint rules.
- Support both live MCP server connections (stdio, Streamable HTTP, legacy SSE) and static schema file input (JSON files containing tool/resource/prompt definitions).
- Keep dependencies minimal: depend only on `@modelcontextprotocol/sdk` for live server connections and Node.js built-ins for everything else.

### Non-Goals

- **Not a protocol conformance validator.** This package does not validate that an MCP server's JSON-RPC responses conform to the full protocol specification (correct message framing, required JSON-RPC fields, capability negotiation). Use the MCP Inspector or protocol-level validation tools for that.
- **Not a runtime tool tester.** This package inspects schema definitions returned by `tools/list`, `resources/list`, and `prompts/list`. It does not call `tools/call` on individual tools, read resources, or invoke prompts. Testing tool execution belongs in integration test suites.
- **Not an auto-fixer for all rules.** Some rules (like adding missing descriptions) require human judgment. The linter identifies problems; it does not rewrite server source code. Where mechanical fixes are possible (e.g., adding a missing `type: "object"` wrapper), the linter provides fix suggestions in its output, but does not apply them.
- **Not a continuous monitoring daemon.** This package performs a single point-in-time lint analysis and returns. For continuous monitoring, wrap it in a CI pipeline, pre-commit hook, or a monitoring agent that invokes it periodically.
- **Not a JSON Schema validator.** This package does not validate that a JSON Schema is syntactically valid according to the JSON Schema specification. It assumes the schema is parseable JSON Schema and evaluates its quality, completeness, and adherence to MCP conventions.
- **Not an MCP server implementation framework.** This package does not help you build MCP servers. It evaluates the schemas that existing servers expose.

---

## 3. Target Users and Use Cases

### MCP Server Developers

Developers building MCP servers who want to ensure their tool, resource, and prompt schemas are high-quality before publishing. Running `mcp-schema-lint` during development catches vague descriptions, missing annotations, and inconsistent naming before users encounter them. This is the primary audience.

### AI Application Architects

Teams building MCP host applications (like Claude Desktop, Cursor, or custom agents) that connect to third-party MCP servers. Before integrating a new server, they run `mcp-schema-lint` against it to evaluate schema quality and flag potential issues (missing descriptions that will confuse the LLM, missing annotations that prevent proper safety filtering).

### CI/CD Pipeline Operators

Teams that gate MCP server releases on schema quality. The CLI's deterministic exit codes and SARIF output enable integration with GitHub Actions, GitLab CI, and other CI systems. A pipeline step runs `mcp-schema-lint` against the server's schemas and blocks the release if errors are found.

### MCP Ecosystem Maintainers

Teams maintaining registries or catalogs of MCP servers who need automated quality checks. Running the linter against every registered server produces a quality score that can be displayed in the catalog.

### Open-Source MCP Tool Authors

Developers publishing MCP servers as npm packages who want to ship well-documented, consistently named tools with complete annotations. The linter runs as a pre-publish check.

---

## 4. Core Concepts

### MCP Schema Quality

The MCP protocol defines the structure of tool, resource, and prompt definitions, but it does not mandate quality. A tool with `name: "a"`, `description: ""`, and an empty `inputSchema: { type: "object" }` is protocol-valid but useless. Schema quality is the gap between structural validity and practical utility. `mcp-schema-lint` measures and enforces schema quality.

Quality dimensions:

- **Description quality**: Does the description explain what the tool/resource/prompt does in enough detail for an LLM to use it correctly? Vague descriptions like "does stuff" or single-word descriptions like "search" are low quality. Specific descriptions like "Searches the GitHub API for repositories matching the query string and returns the top 10 results with name, URL, and star count" are high quality.
- **Naming consistency**: Are tool names consistently formatted? Mixing `getWeather`, `create_issue`, and `Delete-File` within the same server creates confusion. The linter enforces a single naming convention per server.
- **Annotation completeness**: Does the tool declare its side-effect behavior via annotations? The MCP specification defines `readOnlyHint`, `destructiveHint`, `idempotentHint`, and `openWorldHint` precisely so that clients can make informed decisions about tool invocation (e.g., requiring user confirmation for destructive tools). Omitting these forces the client to assume worst-case behavior.
- **Output schema presence**: Tools that return structured data should declare an `outputSchema` so clients can validate responses and LLMs can understand the response structure. The 2025-06-18 MCP specification introduced `outputSchema` explicitly for this purpose.
- **Input schema rigor**: Input parameters should have types, descriptions, and constraints. A bare `{ type: "object" }` with no properties is a schema that tells the LLM nothing about what arguments the tool expects.

### Tool Annotations

The MCP specification (2025-06-18) defines tool annotations as optional hints about tool behavior:

| Annotation | Type | Default | Description |
|---|---|---|---|
| `title` | string | - | Human-readable title for UI display |
| `readOnlyHint` | boolean | false | If true, the tool does not modify its environment |
| `destructiveHint` | boolean | true | If true, the tool may perform destructive updates (only meaningful when `readOnlyHint` is false) |
| `idempotentHint` | boolean | false | If true, repeated calls with the same arguments have no additional effect (only meaningful when `readOnlyHint` is false) |
| `openWorldHint` | boolean | true | If true, the tool interacts with external entities beyond a closed system |

The defaults are notably conservative: a tool with no annotations is assumed to be destructive (`destructiveHint` defaults to `true`) and interacting with the open world (`openWorldHint` defaults to `true`). Explicitly declaring these annotations helps clients make better decisions.

### Lint Rules

A lint rule is a named check that evaluates a specific quality dimension of a schema element. Each rule has:

- **Rule ID**: A unique string identifier (e.g., `tool-description-quality`, `naming-convention`).
- **Category**: The schema element type it applies to (`tool`, `resource`, `prompt`, `parameter`, `general`).
- **Default severity**: `error`, `warning`, or `info`.
- **Check function**: The logic that evaluates the schema element and returns zero or more diagnostics.
- **Documentation**: A human-readable explanation of what the rule checks and why it matters.

### Diagnostics

A diagnostic is a single lint finding. It contains:

- **Rule ID**: Which rule produced this diagnostic.
- **Severity**: `error`, `warning`, or `info`.
- **Target**: The schema element that triggered the diagnostic (e.g., `tool:get_weather`, `tool:get_weather.inputSchema.properties.location`).
- **Message**: A human-readable explanation of the problem.
- **Suggestion**: An optional fix suggestion.

### Presets

A preset is a named collection of rule configurations (which rules are enabled and at what severity). Presets allow users to adopt a curated set of rules without configuring each one individually. Built-in presets are `recommended` (balanced defaults), `strict` (everything enabled at highest severity), and `minimal` (only critical structural checks).

---

## 5. Built-in Rules

### 5.1 Tool Rules

#### `tool-description-missing`

**What it checks**: Tool has no `description` field or the description is an empty string.

**Why it matters**: Tools without descriptions are unusable by LLMs. The LLM relies entirely on the description to decide when and how to invoke a tool.

**Default severity**: `error`

**Good example**:
```json
{
  "name": "get_weather",
  "description": "Get current weather conditions for a location, including temperature, humidity, and forecast summary."
}
```

**Bad example**:
```json
{
  "name": "get_weather",
  "description": ""
}
```

**Auto-fix**: No. Descriptions require human judgment.

---

#### `tool-description-quality`

**What it checks**: Tool description is present but too vague, too short (fewer than 10 characters), or uses known low-quality patterns (e.g., matches the tool name exactly, is a single generic word like "utility" or "helper", starts with "This tool" redundantly, or contains only the tool name restated).

**Why it matters**: A vague description like "does stuff" technically passes the `tool-description-missing` check but provides no useful information to an LLM. The LLM needs a specific explanation of what the tool does, what inputs it expects, and what it returns.

**Default severity**: `warning`

**Heuristics**:
- Description length < 10 characters: too short.
- Description exactly equals the tool name (case-insensitive): not informative.
- Description matches known vague patterns: `"does stuff"`, `"a tool"`, `"tool for"`, `"helper"`, `"utility"`, `"misc"`, `"TODO"`, `"placeholder"`.
- Description lacks a verb: descriptions should describe an action (e.g., "Creates...", "Retrieves...", "Deletes...").

**Good example**:
```json
{
  "name": "create_github_issue",
  "description": "Creates a new issue in the specified GitHub repository with the given title, body, and optional labels. Returns the issue number and URL."
}
```

**Bad example**:
```json
{
  "name": "create_github_issue",
  "description": "create github issue"
}
```

**Auto-fix**: No.

---

#### `tool-description-length`

**What it checks**: Tool description exceeds 500 characters, which may indicate the description is being used to embed prompt instructions rather than describe the tool's functionality.

**Why it matters**: Excessively long descriptions can bloat the context window and may indicate prompt injection attempts via schema definitions.

**Default severity**: `info`

**Auto-fix**: No.

---

#### `tool-annotations-missing`

**What it checks**: Tool has no `annotations` field at all.

**Why it matters**: Without annotations, clients must assume worst-case behavior (destructive, non-idempotent, open-world). Explicitly declaring annotations helps clients present appropriate confirmation dialogs, filter tools by behavior category, and make informed safety decisions.

**Default severity**: `warning`

**Good example**:
```json
{
  "name": "get_weather",
  "annotations": {
    "readOnlyHint": true,
    "destructiveHint": false,
    "openWorldHint": true
  }
}
```

**Bad example**:
```json
{
  "name": "get_weather"
}
```

**Auto-fix**: No. Annotations require knowledge of the tool's behavior.

---

#### `tool-annotations-destructive-hint`

**What it checks**: Tool's name or description suggests destructive behavior (contains words like "delete", "remove", "drop", "destroy", "purge", "wipe", "truncate", "erase") but either has no annotations or has `destructiveHint` set to `false`.

**Why it matters**: Clients use `destructiveHint` to decide whether to prompt the user for confirmation before executing a tool. A tool named `delete_file` with `destructiveHint: false` is misleading and dangerous.

**Default severity**: `warning`

**Good example**:
```json
{
  "name": "delete_file",
  "annotations": { "readOnlyHint": false, "destructiveHint": true }
}
```

**Bad example**:
```json
{
  "name": "delete_file",
  "annotations": { "destructiveHint": false }
}
```

**Auto-fix**: No.

---

#### `tool-annotations-readonly-hint`

**What it checks**: Tool's name or description suggests read-only behavior (contains words like "get", "list", "search", "query", "fetch", "read", "describe", "show", "view", "count") but either has no annotations or has `readOnlyHint` set to `false` (or not set, defaulting to `false`).

**Why it matters**: Read-only tools can be invoked with fewer safety restrictions. Marking them as read-only helps clients avoid unnecessary confirmation dialogs.

**Default severity**: `info`

**Auto-fix**: No.

---

#### `tool-annotations-inconsistent`

**What it checks**: Tool annotations contain logically inconsistent combinations:
- `readOnlyHint: true` with `destructiveHint: true` (a read-only tool cannot be destructive).
- `readOnlyHint: true` with `idempotentHint` explicitly set (idempotency is only meaningful for write operations).

**Why it matters**: Inconsistent annotations confuse clients and indicate the server author did not carefully consider the tool's behavior.

**Default severity**: `error`

**Auto-fix**: No.

---

#### `tool-output-schema-missing`

**What it checks**: Tool has no `outputSchema` field.

**Why it matters**: The 2025-06-18 MCP specification introduced `outputSchema` to enable structured tool output. Tools that return structured data (JSON objects) benefit from declaring an output schema so clients can validate responses and LLMs can understand the response structure. While not every tool needs an output schema (tools that return plain text messages do not), the absence of one is worth flagging.

**Default severity**: `info`

**Auto-fix**: No.

---

#### `tool-input-schema-missing`

**What it checks**: Tool has no `inputSchema` field at all.

**Why it matters**: The `inputSchema` is how the LLM knows what arguments to pass to the tool. Without it, the LLM must guess at the argument structure.

**Default severity**: `error`

**Auto-fix**: No.

---

#### `tool-input-schema-empty`

**What it checks**: Tool's `inputSchema` is `{ "type": "object" }` with no `properties` field, or `properties` is an empty object `{}`.

**Why it matters**: An empty input schema tells the LLM nothing about what arguments the tool accepts. If the tool truly takes no arguments, the schema is correct but unusual -- the rule fires at `info` severity for genuinely no-argument tools. If the tool does take arguments, the schema is incomplete.

**Default severity**: `warning`

**Auto-fix**: No.

---

#### `tool-input-schema-no-required`

**What it checks**: Tool's `inputSchema` has `properties` defined but no `required` array.

**Why it matters**: Without a `required` array, all parameters are optional. This is rarely intentional and often indicates the server author forgot to specify which parameters are mandatory.

**Default severity**: `warning`

**Auto-fix**: No.

---

#### `tool-title-missing`

**What it checks**: Tool has no `title` field.

**Why it matters**: The `title` field provides a human-readable display name for the tool, separate from the programmatic `name`. While optional in the protocol, providing a title improves UI presentation in MCP clients. This is a soft recommendation.

**Default severity**: `info`

**Auto-fix**: No.

---

### 5.2 Parameter Rules

#### `parameter-description-missing`

**What it checks**: A property in a tool's `inputSchema.properties` or `outputSchema.properties` has no `description` field.

**Why it matters**: Parameter descriptions tell the LLM what each argument means and what values are acceptable. Without descriptions, the LLM relies solely on the parameter name, which is often ambiguous (e.g., `q` could be "query", "quantity", or "quality").

**Default severity**: `warning`

**Good example**:
```json
{
  "properties": {
    "location": {
      "type": "string",
      "description": "City name or zip code to look up weather for"
    }
  }
}
```

**Bad example**:
```json
{
  "properties": {
    "location": {
      "type": "string"
    }
  }
}
```

**Auto-fix**: No.

---

#### `parameter-type-missing`

**What it checks**: A property in `inputSchema.properties` has no `type` field and is not a `$ref`, `oneOf`, `anyOf`, `allOf`, or `const` schema.

**Why it matters**: Without a type declaration, the LLM does not know whether to pass a string, number, boolean, array, or object. The JSON Schema specification allows omitting `type` (meaning "any type"), but this is almost never intentional in MCP tool schemas.

**Default severity**: `error`

**Auto-fix**: No.

---

#### `parameter-description-quality`

**What it checks**: A parameter description is present but too short (fewer than 5 characters), or matches the parameter name exactly (case-insensitive).

**Why it matters**: A description like `"id"` for a parameter named `id` adds no information. Descriptions should explain what the parameter represents, what format it expects, and what values are valid.

**Default severity**: `info`

**Good example**:
```json
{
  "owner": {
    "type": "string",
    "description": "GitHub username or organization name that owns the repository"
  }
}
```

**Bad example**:
```json
{
  "owner": {
    "type": "string",
    "description": "owner"
  }
}
```

**Auto-fix**: No.

---

#### `parameter-enum-description-missing`

**What it checks**: A parameter uses `enum` to restrict values but has no `description` field explaining what the enum values mean.

**Why it matters**: Enum values like `["a", "b", "c"]` are meaningless without context. Even self-explanatory enums like `["asc", "desc"]` benefit from a description confirming the intended semantics.

**Default severity**: `info`

**Auto-fix**: No.

---

### 5.3 Naming Convention Rules

#### `naming-convention`

**What it checks**: All tool names, resource names, and prompt names within a server follow a single, consistent naming convention. Supported conventions: `camelCase`, `snake_case`, `kebab-case`, `PascalCase`. The rule detects the dominant convention across all names and flags outliers that deviate from it. Alternatively, the user can configure a required convention explicitly.

**Why it matters**: Inconsistent naming creates a jarring experience for users and LLMs. A server with tools named `getWeather`, `create_issue`, and `Delete-File` appears poorly maintained. Consistent naming is a basic quality signal.

**Default severity**: `warning`

**Configuration**:
```json
{
  "naming-convention": {
    "severity": "warning",
    "options": {
      "convention": "auto"
    }
  }
}
```

Valid `convention` values: `"auto"` (detect dominant convention), `"camelCase"`, `"snake_case"`, `"kebab-case"`, `"PascalCase"`.

**Good example** (consistent `snake_case`):
```
get_weather, create_issue, delete_file, list_repos
```

**Bad example** (mixed):
```
getWeather, create_issue, Delete-File, listRepos
```

**Auto-fix**: No. Renaming tools is a breaking change.

---

#### `tool-naming-verb-noun`

**What it checks**: Tool names follow a verb-noun pattern (e.g., `get_weather`, `createIssue`, `delete-file`). The rule checks that the first segment of the name (split by `_`, `-`, or camelCase boundary) is a recognized verb.

**Why it matters**: Verb-noun naming makes tool purpose immediately clear. A tool named `weather` is ambiguous (does it get, set, or delete weather data?). A tool named `get_weather` is unambiguous.

**Default severity**: `info`

**Recognized verbs**: `get`, `set`, `create`, `update`, `delete`, `list`, `search`, `find`, `fetch`, `read`, `write`, `add`, `remove`, `check`, `validate`, `run`, `execute`, `start`, `stop`, `send`, `receive`, `upload`, `download`, `export`, `import`, `parse`, `format`, `convert`, `generate`, `build`, `deploy`, `publish`, `subscribe`, `unsubscribe`, `enable`, `disable`, `open`, `close`, `connect`, `disconnect`, `query`, `count`, `describe`, `show`, `view`, `edit`, `modify`, `move`, `copy`, `rename`, `merge`, `split`, `analyze`, `summarize`, `translate`, `notify`, `log`, `reset`, `clear`, `sync`, `refresh`, `install`, `uninstall`, `configure`, `register`, `lookup`, `resolve`, `approve`, `reject`, `cancel`, `retry`, `archive`, `restore`.

**Configuration**:
```json
{
  "tool-naming-verb-noun": {
    "severity": "info",
    "options": {
      "additionalVerbs": ["ingest", "enqueue", "dequeue"]
    }
  }
}
```

**Auto-fix**: No.

---

### 5.4 Resource Rules

#### `resource-description-missing`

**What it checks**: Resource has no `description` field or the description is an empty string.

**Why it matters**: Resources without descriptions are difficult for users and applications to understand. The description explains what data the resource provides and when to use it.

**Default severity**: `warning`

**Auto-fix**: No.

---

#### `resource-mime-type-missing`

**What it checks**: Resource has no `mimeType` field.

**Why it matters**: The MIME type tells clients how to interpret the resource content (text, JSON, images, etc.). Without it, clients must guess the content type.

**Default severity**: `warning`

**Auto-fix**: No.

---

#### `resource-uri-format`

**What it checks**: Resource URI is not a valid URI according to RFC 3986, or uses an unusual scheme that is neither a standard scheme (`https://`, `file://`, `git://`) nor a recognized custom scheme.

**Why it matters**: Invalid URIs will cause resource read failures. Non-standard schemes should be intentional and documented.

**Default severity**: `warning` for non-standard schemes, `error` for syntactically invalid URIs.

**Auto-fix**: No.

---

#### `resource-template-description-missing`

**What it checks**: Resource template (from `resources/templates/list`) has no `description` field.

**Why it matters**: Resource templates are parameterized resources. Without a description, users cannot understand what the template produces or what parameters to provide.

**Default severity**: `warning`

**Auto-fix**: No.

---

### 5.5 Prompt Rules

#### `prompt-description-missing`

**What it checks**: Prompt has no `description` field or the description is an empty string.

**Why it matters**: Prompts are user-facing interaction templates. Without descriptions, users cannot discover or understand available prompts.

**Default severity**: `warning`

**Auto-fix**: No.

---

#### `prompt-argument-description-missing`

**What it checks**: A prompt argument has no `description` field.

**Why it matters**: Prompt arguments are user-provided inputs. Without descriptions, users cannot understand what values to provide.

**Default severity**: `warning`

**Good example**:
```json
{
  "name": "code_review",
  "arguments": [
    {
      "name": "code",
      "description": "The source code to review. Can be any programming language.",
      "required": true
    }
  ]
}
```

**Bad example**:
```json
{
  "name": "code_review",
  "arguments": [
    {
      "name": "code",
      "required": true
    }
  ]
}
```

**Auto-fix**: No.

---

### 5.6 General Rules

#### `duplicate-names`

**What it checks**: Multiple tools, resources, or prompts share the same `name` within their respective category.

**Why it matters**: The MCP specification states that tool names, resource URIs, and prompt names are unique identifiers. Duplicates indicate a bug in the server implementation.

**Default severity**: `error`

**Auto-fix**: No.

---

#### `schema-depth-excessive`

**What it checks**: An `inputSchema` or `outputSchema` has a nesting depth exceeding a configurable maximum (default: 5 levels).

**Why it matters**: Deeply nested schemas are difficult for LLMs to understand and for users to provide values for. They often indicate over-engineering of the tool interface.

**Default severity**: `info`

**Configuration**:
```json
{
  "schema-depth-excessive": {
    "severity": "info",
    "options": {
      "maxDepth": 5
    }
  }
}
```

**Auto-fix**: No.

---

#### `total-tools-excessive`

**What it checks**: The server exposes more than a configurable maximum number of tools (default: 50).

**Why it matters**: Servers with many tools create large context windows when all tools are presented to an LLM. This increases token costs and can degrade model performance.

**Default severity**: `info`

**Configuration**:
```json
{
  "total-tools-excessive": {
    "severity": "info",
    "options": {
      "maxTools": 50
    }
  }
}
```

**Auto-fix**: No.

---

### 5.7 Rule Summary Table

| Rule ID | Category | Default Severity | Auto-fix |
|---|---|---|---|
| `tool-description-missing` | tool | error | No |
| `tool-description-quality` | tool | warning | No |
| `tool-description-length` | tool | info | No |
| `tool-annotations-missing` | tool | warning | No |
| `tool-annotations-destructive-hint` | tool | warning | No |
| `tool-annotations-readonly-hint` | tool | info | No |
| `tool-annotations-inconsistent` | tool | error | No |
| `tool-output-schema-missing` | tool | info | No |
| `tool-input-schema-missing` | tool | error | No |
| `tool-input-schema-empty` | tool | warning | No |
| `tool-input-schema-no-required` | tool | warning | No |
| `tool-title-missing` | tool | info | No |
| `parameter-description-missing` | parameter | warning | No |
| `parameter-type-missing` | parameter | error | No |
| `parameter-description-quality` | parameter | info | No |
| `parameter-enum-description-missing` | parameter | info | No |
| `naming-convention` | general | warning | No |
| `tool-naming-verb-noun` | general | info | No |
| `resource-description-missing` | resource | warning | No |
| `resource-mime-type-missing` | resource | warning | No |
| `resource-uri-format` | resource | warning/error | No |
| `resource-template-description-missing` | resource | warning | No |
| `prompt-description-missing` | prompt | warning | No |
| `prompt-argument-description-missing` | prompt | warning | No |
| `duplicate-names` | general | error | No |
| `schema-depth-excessive` | general | info | No |
| `total-tools-excessive` | general | info | No |

---

## 6. API Surface

### Installation

```bash
npm install mcp-schema-lint
```

### Peer Dependency

```json
{
  "peerDependencies": {
    "@modelcontextprotocol/sdk": "^1.12.0"
  }
}
```

The peer dependency is only required when linting live MCP servers. For static schema file linting, no peer dependency is needed.

### Main Export: `lint`

The primary API is a single async function that takes a schema source and a configuration, evaluates all applicable rules, and returns a lint report.

```typescript
import { lint } from 'mcp-schema-lint';

const report = await lint({
  source: {
    type: 'stdio',
    command: 'node',
    args: ['./my-mcp-server.js'],
  },
  preset: 'recommended',
});

console.log(report.summary.errors);   // 3
console.log(report.summary.warnings); // 7
console.log(report.diagnostics);      // individual findings
```

### Type Definitions

```typescript
// ── Source Configuration ─────────────────────────────────────────────

/** Connect to an MCP server via stdio transport and enumerate schemas. */
interface StdioSourceConfig {
  type: 'stdio';

  /** The command to execute (e.g., 'node', 'python', 'npx'). */
  command: string;

  /** Arguments to pass to the command. */
  args?: string[];

  /** Environment variables for the subprocess. Merged with process.env. */
  env?: Record<string, string>;

  /** Working directory for the subprocess. */
  cwd?: string;
}

/** Connect to an MCP server via Streamable HTTP and enumerate schemas. */
interface HttpSourceConfig {
  type: 'http';

  /** The URL of the MCP server's HTTP endpoint. */
  url: string;

  /** Additional HTTP headers (e.g., authorization). */
  headers?: Record<string, string>;
}

/** Connect to an MCP server via legacy SSE transport. */
interface SseSourceConfig {
  type: 'sse';

  /** The base URL of the SSE endpoint. */
  url: string;

  /** Additional HTTP headers. */
  headers?: Record<string, string>;
}

/** Read schemas from a static JSON file. */
interface FileSourceConfig {
  type: 'file';

  /**
   * Path to a JSON file containing an object with optional
   * `tools`, `resources`, `resourceTemplates`, and `prompts` arrays.
   * Each array contains objects matching the MCP schema definitions.
   */
  path: string;
}

type SourceConfig = StdioSourceConfig | HttpSourceConfig | SseSourceConfig | FileSourceConfig;

// ── Lint Options ─────────────────────────────────────────────────────

/** Severity level for a lint rule. */
type Severity = 'error' | 'warning' | 'info' | 'off';

/** Configuration for a single rule. */
interface RuleConfig {
  /** Override the rule's default severity. 'off' disables the rule. */
  severity?: Severity;

  /** Rule-specific options. */
  options?: Record<string, unknown>;
}

/** Complete lint configuration. */
interface LintOptions {
  /** How to obtain the schemas to lint. Required. */
  source: SourceConfig;

  /**
   * Preset to use as the base configuration.
   * Default: 'recommended'.
   */
  preset?: 'recommended' | 'strict' | 'minimal' | 'off';

  /**
   * Per-rule overrides. Keys are rule IDs.
   * These override the preset's settings for the specified rules.
   */
  rules?: Record<string, RuleConfig | Severity>;

  /**
   * Custom rules to register. These are evaluated alongside built-in rules.
   */
  customRules?: CustomRuleDefinition[];

  /**
   * Which schema categories to lint.
   * Default: ['tools', 'resources', 'prompts'] (all categories).
   */
  categories?: Array<'tools' | 'resources' | 'prompts'>;

  /**
   * Overall timeout in milliseconds for connecting to a live MCP server,
   * enumerating schemas, and completing the lint analysis.
   * Default: 30_000 (30 seconds).
   */
  timeout?: number;

  /**
   * AbortSignal for external cancellation.
   */
  signal?: AbortSignal;
}

// ── Lint Report ──────────────────────────────────────────────────────

/** A single lint diagnostic. */
interface LintDiagnostic {
  /** The rule ID that produced this diagnostic. */
  ruleId: string;

  /** Severity of this diagnostic. */
  severity: 'error' | 'warning' | 'info';

  /**
   * The schema element that triggered this diagnostic.
   * Format: '<category>:<name>' for top-level elements (e.g., 'tool:get_weather').
   * Format: '<category>:<name>.<path>' for nested elements
   *   (e.g., 'tool:get_weather.inputSchema.properties.location').
   */
  target: string;

  /** Human-readable description of the problem. */
  message: string;

  /** Optional fix suggestion. */
  suggestion?: string;

  /** The name of the schema element (tool name, resource name, etc.). */
  elementName: string;

  /** The category of the schema element. */
  elementCategory: 'tool' | 'resource' | 'resourceTemplate' | 'prompt';
}

/** Summary counts for the lint report. */
interface LintSummary {
  /** Total number of diagnostics. */
  total: number;

  /** Number of error-severity diagnostics. */
  errors: number;

  /** Number of warning-severity diagnostics. */
  warnings: number;

  /** Number of info-severity diagnostics. */
  infos: number;

  /** Total tools analyzed. */
  toolsAnalyzed: number;

  /** Total resources analyzed. */
  resourcesAnalyzed: number;

  /** Total prompts analyzed. */
  promptsAnalyzed: number;

  /** Total resource templates analyzed. */
  resourceTemplatesAnalyzed: number;
}

/** The complete lint report returned by lint(). */
interface LintReport {
  /** Whether the lint passed (no errors). Warnings and infos do not cause failure. */
  passed: boolean;

  /** ISO 8601 timestamp of when the analysis was performed. */
  timestamp: string;

  /** Total wall-clock time for the lint analysis, in milliseconds. */
  durationMs: number;

  /** All diagnostics, sorted by severity (errors first) then by target. */
  diagnostics: LintDiagnostic[];

  /** Summary counts. */
  summary: LintSummary;

  /** Server information, populated when linting a live server. */
  server?: {
    name: string;
    version: string;
    protocolVersion: string;
  };

  /** The preset that was used. */
  preset: string;

  /** Which rules were enabled and their effective severity. */
  ruleStates: Record<string, Severity>;
}
```

### Example: Lint a Local Server

```typescript
import { lint } from 'mcp-schema-lint';

const report = await lint({
  source: {
    type: 'stdio',
    command: 'node',
    args: ['./my-server.js'],
  },
  preset: 'recommended',
  rules: {
    'tool-annotations-missing': 'error',  // upgrade from warning to error
    'tool-title-missing': 'off',          // disable this rule
  },
});

if (!report.passed) {
  console.error(`Lint failed: ${report.summary.errors} error(s)`);
  for (const d of report.diagnostics.filter(d => d.severity === 'error')) {
    console.error(`  ${d.ruleId}: ${d.target} — ${d.message}`);
  }
  process.exit(1);
}
```

### Example: Lint from a Static Schema File

```typescript
import { lint } from 'mcp-schema-lint';

const report = await lint({
  source: {
    type: 'file',
    path: './schemas.json',
  },
  preset: 'strict',
});
```

The static schema file format:

```json
{
  "tools": [
    {
      "name": "get_weather",
      "description": "Get weather for a location",
      "inputSchema": {
        "type": "object",
        "properties": {
          "location": { "type": "string", "description": "City name" }
        },
        "required": ["location"]
      }
    }
  ],
  "resources": [],
  "prompts": []
}
```

### Helper Export: `lintSchemas`

A lower-level function that accepts already-parsed schema arrays (tools, resources, prompts) directly, without connecting to a server or reading files. Useful for integration into build tools or test frameworks.

```typescript
import { lintSchemas } from 'mcp-schema-lint';

const report = lintSchemas({
  tools: [
    {
      name: 'get_weather',
      description: 'Get weather',
      inputSchema: { type: 'object', properties: { location: { type: 'string' } } },
    },
  ],
  resources: [],
  prompts: [],
  resourceTemplates: [],
}, {
  preset: 'recommended',
});
```

**Signature:**

```typescript
function lintSchemas(
  schemas: {
    tools: ToolDefinition[];
    resources: ResourceDefinition[];
    prompts: PromptDefinition[];
    resourceTemplates?: ResourceTemplateDefinition[];
  },
  options?: Omit<LintOptions, 'source'>,
): LintReport;
```

Note: `lintSchemas` is synchronous because it does not perform I/O. The `lint` function (which connects to servers or reads files) is async.

### Helper Export: `createRule`

Factory function for creating custom lint rules with type safety.

```typescript
import { createRule } from 'mcp-schema-lint';

const myRule = createRule({
  id: 'my-custom-rule',
  category: 'tool',
  defaultSeverity: 'warning',
  description: 'Checks that tool names start with a verb',
  check: (tool, context) => {
    if (!startsWithVerb(tool.name)) {
      context.report({
        message: `Tool name "${tool.name}" does not start with a recognized verb.`,
        suggestion: 'Rename the tool to follow a verb-noun pattern (e.g., get_weather).',
      });
    }
  },
});
```

---

## 7. CLI Interface

### Installation and Invocation

```bash
# Global install
npm install -g mcp-schema-lint
mcp-schema-lint --stdio 'node ./server.js'

# npx (no install)
npx mcp-schema-lint --url https://mcp.example.com/mcp

# Package script
# package.json: { "scripts": { "lint:schema": "mcp-schema-lint --stdio 'node ./server.js'" } }
npm run lint:schema
```

### CLI Binary Name

`mcp-schema-lint`

### Commands and Flags

The CLI has no subcommands. It accepts source configuration, rule options, and output options as flags.

```
mcp-schema-lint [options]

Source (exactly one required):
  --stdio <command>          Spawn an MCP server via stdio transport and lint
                             its schemas.
                             Example: --stdio 'node ./server.js'
  --url <url>                Connect to an MCP server via Streamable HTTP.
                             Example: --url https://mcp.example.com/mcp
  --sse <url>                Connect via legacy SSE transport.
                             Example: --sse http://localhost:3000/sse
  --file <path>              Read schemas from a static JSON file.
                             Example: --file ./schemas.json

Source options:
  --header <key:value>       Add an HTTP header (repeatable). Only for --url
                             and --sse.
  --cwd <path>               Working directory for --stdio subprocess.
  --env <key=value>          Environment variable for --stdio subprocess
                             (repeatable).

Rule configuration:
  --preset <name>            Rule preset. Values: recommended, strict,
                             minimal, off. Default: recommended.
  --rule <id:severity>       Override severity for a rule (repeatable).
                             Example: --rule tool-annotations-missing:error
  --config <path>            Path to a configuration file.
                             Default: auto-detect .mcp-schema-lint.json,
                             .mcp-schema-lint.yaml, or .mcp-schema-lintrc
                             in the current directory or ancestors.

Filtering:
  --category <cat>           Schema categories to lint (repeatable).
                             Values: tools, resources, prompts.
                             Default: all categories.

Output options:
  --format <format>          Output format. Values: human, json, sarif.
                             Default: human.
  --quiet                    Suppress all output except errors and the exit
                             code. Overrides --format.
  --verbose                  Show all diagnostics including info-severity.
                             By default, info diagnostics are hidden in
                             human output.
  --no-color                 Disable colored output.

General:
  --timeout <ms>             Overall timeout in milliseconds. Default: 30000.
  --version                  Print version and exit.
  --help                     Print help and exit.
```

### Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Passed. No error-severity diagnostics found. |
| `1` | Failed. One or more error-severity diagnostics found. |
| `2` | Configuration error. Invalid flags, missing source, invalid config file, or connection failure. |

Warnings and info diagnostics do not affect the exit code. Only `error`-severity diagnostics cause exit code `1`.

### Human-Readable Output Example

```
$ mcp-schema-lint --stdio 'node ./server.js'

  mcp-schema-lint v0.1.0

  Target: stdio — node ./server.js
  Server: my-weather-server v1.0.0 (protocol v2025-06-18)
  Preset: recommended

  Analyzing 5 tools, 2 resources, 1 prompt...

  ERROR  tool-description-missing       tool:update_config
         Tool has no description.

  ERROR  parameter-type-missing          tool:search_repos.inputSchema.properties.q
         Parameter "q" has no type declaration.

  ERROR  tool-annotations-inconsistent   tool:delete_backup
         readOnlyHint is true but destructiveHint is also true.
         These annotations are logically inconsistent.

  WARN   tool-description-quality        tool:get_weather
         Description "get weather" is too short and matches the tool name.
         Provide a specific description explaining what the tool does,
         what inputs it expects, and what it returns.

  WARN   tool-annotations-missing        tool:get_weather
         Tool has no annotations. Consider adding readOnlyHint,
         destructiveHint, idempotentHint, and openWorldHint.

  WARN   tool-annotations-missing        tool:create_issue
         Tool has no annotations.

  WARN   parameter-description-missing   tool:search_repos.inputSchema.properties.q
         Parameter "q" has no description.

  WARN   tool-input-schema-no-required   tool:update_config
         inputSchema has properties but no required array.

  WARN   naming-convention               tool:deleteBackup
         Tool name "deleteBackup" uses camelCase, but the dominant
         convention is snake_case (4 of 5 tools).

  WARN   resource-mime-type-missing      resource:config://settings
         Resource has no mimeType field.

  ─────────────────────────────────────────────────────────
  3 errors, 7 warnings (10 diagnostics total)
  5 tools, 2 resources, 1 prompt analyzed in 245ms
  Result: FAILED
```

### JSON Output Example

```
$ mcp-schema-lint --stdio 'node ./server.js' --format json
```

Outputs the `LintReport` object as a JSON string to stdout.

### SARIF Output Example

```
$ mcp-schema-lint --stdio 'node ./server.js' --format sarif > results.sarif
```

Outputs a SARIF v2.1.0 document. Each diagnostic maps to a SARIF `result` with:
- `ruleId`: The lint rule ID.
- `level`: `error`, `warning`, or `note` (SARIF equivalent of `info`).
- `message.text`: The diagnostic message.
- `locations`: A logical location using the `target` path as the `fullyQualifiedName`.

This enables direct integration with GitHub Code Scanning, which displays SARIF results as annotations on pull requests.

### Environment Variables

All CLI flags can be set via environment variables. Environment variables are overridden by explicit flags.

| Environment Variable | Equivalent Flag |
|---------------------|-----------------|
| `MCP_SCHEMA_LINT_STDIO` | `--stdio` |
| `MCP_SCHEMA_LINT_URL` | `--url` |
| `MCP_SCHEMA_LINT_SSE` | `--sse` |
| `MCP_SCHEMA_LINT_FILE` | `--file` |
| `MCP_SCHEMA_LINT_PRESET` | `--preset` |
| `MCP_SCHEMA_LINT_FORMAT` | `--format` |
| `MCP_SCHEMA_LINT_TIMEOUT` | `--timeout` |
| `MCP_SCHEMA_LINT_CONFIG` | `--config` |
| `MCP_SCHEMA_LINT_CATEGORY` | `--category` (comma-separated) |

---

## 8. Configuration

### Configuration File

`mcp-schema-lint` searches for a configuration file in the current directory and ancestor directories, using the first one found:

1. `.mcp-schema-lint.json`
2. `.mcp-schema-lint.yaml`
3. `.mcp-schema-lintrc` (JSON format)
4. `mcp-schema-lint` key in `package.json`

The `--config` flag overrides auto-detection.

### Configuration File Format

```json
{
  "preset": "recommended",
  "rules": {
    "tool-annotations-missing": "error",
    "tool-title-missing": "off",
    "tool-description-length": {
      "severity": "warning",
      "options": {
        "maxLength": 300
      }
    },
    "naming-convention": {
      "severity": "error",
      "options": {
        "convention": "snake_case"
      }
    },
    "schema-depth-excessive": {
      "severity": "warning",
      "options": {
        "maxDepth": 4
      }
    },
    "total-tools-excessive": {
      "severity": "warning",
      "options": {
        "maxTools": 30
      }
    }
  },
  "categories": ["tools", "resources", "prompts"]
}
```

### Configuration Precedence

Configuration is resolved in this order (later sources override earlier):

1. Built-in defaults (every rule has a `defaultSeverity`).
2. Preset configuration (`recommended`, `strict`, `minimal`, or `off`).
3. Configuration file (`.mcp-schema-lint.json` or equivalent).
4. CLI `--rule` flags.
5. Programmatic `rules` in `LintOptions`.

### Shorthand Severity

Rule overrides accept either a severity string or a full `RuleConfig` object:

```json
{
  "rules": {
    "tool-annotations-missing": "error",
    "tool-description-length": { "severity": "warning", "options": { "maxLength": 300 } }
  }
}
```

---

## 9. Rule Presets

### `recommended` (Default)

The balanced default preset. Enables all rules at their default severities. This is the right preset for most users.

| Rule ID | Severity |
|---|---|
| `tool-description-missing` | error |
| `tool-description-quality` | warning |
| `tool-description-length` | info |
| `tool-annotations-missing` | warning |
| `tool-annotations-destructive-hint` | warning |
| `tool-annotations-readonly-hint` | info |
| `tool-annotations-inconsistent` | error |
| `tool-output-schema-missing` | info |
| `tool-input-schema-missing` | error |
| `tool-input-schema-empty` | warning |
| `tool-input-schema-no-required` | warning |
| `tool-title-missing` | info |
| `parameter-description-missing` | warning |
| `parameter-type-missing` | error |
| `parameter-description-quality` | info |
| `parameter-enum-description-missing` | info |
| `naming-convention` | warning |
| `tool-naming-verb-noun` | info |
| `resource-description-missing` | warning |
| `resource-mime-type-missing` | warning |
| `resource-uri-format` | warning |
| `resource-template-description-missing` | warning |
| `prompt-description-missing` | warning |
| `prompt-argument-description-missing` | warning |
| `duplicate-names` | error |
| `schema-depth-excessive` | info |
| `total-tools-excessive` | info |

### `strict`

Upgrades all warnings to errors and enables all info rules as warnings. Use this preset in CI pipelines that require zero-tolerance for schema quality issues.

| Rule ID | Severity |
|---|---|
| `tool-description-missing` | error |
| `tool-description-quality` | error |
| `tool-description-length` | warning |
| `tool-annotations-missing` | error |
| `tool-annotations-destructive-hint` | error |
| `tool-annotations-readonly-hint` | warning |
| `tool-annotations-inconsistent` | error |
| `tool-output-schema-missing` | warning |
| `tool-input-schema-missing` | error |
| `tool-input-schema-empty` | error |
| `tool-input-schema-no-required` | error |
| `tool-title-missing` | warning |
| `parameter-description-missing` | error |
| `parameter-type-missing` | error |
| `parameter-description-quality` | warning |
| `parameter-enum-description-missing` | warning |
| `naming-convention` | error |
| `tool-naming-verb-noun` | warning |
| `resource-description-missing` | error |
| `resource-mime-type-missing` | error |
| `resource-uri-format` | error |
| `resource-template-description-missing` | error |
| `prompt-description-missing` | error |
| `prompt-argument-description-missing` | error |
| `duplicate-names` | error |
| `schema-depth-excessive` | warning |
| `total-tools-excessive` | warning |

### `minimal`

Only critical structural rules that catch actual bugs. Disables all quality-focused and style rules. Use this preset when adopting the linter incrementally.

| Rule ID | Severity |
|---|---|
| `tool-description-missing` | error |
| `tool-annotations-inconsistent` | error |
| `tool-input-schema-missing` | error |
| `parameter-type-missing` | error |
| `duplicate-names` | error |
| `resource-uri-format` | error |
| All other rules | off |

### `off`

Disables all rules. Use this as a base when you want to enable only specific rules via overrides.

---

## 10. Custom Rules API

### Defining a Custom Rule

Custom rules implement the `CustomRuleDefinition` interface:

```typescript
interface CustomRuleDefinition {
  /** Unique rule ID. Must not conflict with built-in rule IDs. */
  id: string;

  /** What category of schema elements this rule applies to. */
  category: 'tool' | 'resource' | 'resourceTemplate' | 'prompt' | 'general';

  /** Default severity when no override is configured. */
  defaultSeverity: Severity;

  /** Human-readable description of what this rule checks. */
  description: string;

  /**
   * The check function. Receives the schema element and a context object
   * for reporting diagnostics.
   *
   * For category 'tool': element is ToolDefinition.
   * For category 'resource': element is ResourceDefinition.
   * For category 'resourceTemplate': element is ResourceTemplateDefinition.
   * For category 'prompt': element is PromptDefinition.
   * For category 'general': element is the full schemas object
   *   { tools, resources, prompts, resourceTemplates }.
   */
  check: (element: unknown, context: RuleContext) => void;
}

interface RuleContext {
  /**
   * Report a diagnostic for the current element.
   */
  report(params: {
    /** Human-readable problem description. */
    message: string;

    /** Optional fix suggestion. */
    suggestion?: string;

    /**
     * Optional sub-path within the element for the diagnostic target.
     * Example: 'inputSchema.properties.location'
     */
    path?: string;
  }): void;

  /** The effective severity for this rule (after preset/config overrides). */
  severity: Severity;

  /** The full set of schemas being linted (for cross-element checks). */
  allSchemas: {
    tools: ToolDefinition[];
    resources: ResourceDefinition[];
    prompts: PromptDefinition[];
    resourceTemplates: ResourceTemplateDefinition[];
  };
}
```

### Registering Custom Rules

Custom rules are registered via the `customRules` option in `LintOptions`:

```typescript
import { lint, createRule } from 'mcp-schema-lint';

const noInternalTools = createRule({
  id: 'no-internal-tools',
  category: 'tool',
  defaultSeverity: 'error',
  description: 'Tool names must not start with an underscore (internal naming pattern).',
  check: (tool, context) => {
    if (tool.name.startsWith('_')) {
      context.report({
        message: `Tool "${tool.name}" starts with an underscore, which is reserved for internal tools.`,
        suggestion: 'Remove the leading underscore or exclude this tool from the public API.',
      });
    }
  },
});

const report = await lint({
  source: { type: 'stdio', command: 'node', args: ['./server.js'] },
  customRules: [noInternalTools],
});
```

### Custom Rule Severity Override

Custom rules can be overridden just like built-in rules:

```json
{
  "rules": {
    "no-internal-tools": "warning"
  }
}
```

---

## 11. Formatters / Reporters

### Human Formatter

The default output format. Produces colored, indented terminal output with severity badges (`ERROR`, `WARN`, `INFO`), rule IDs, targets, messages, and a summary line. Info-severity diagnostics are hidden unless `--verbose` is specified.

### JSON Formatter

Outputs the complete `LintReport` object as pretty-printed JSON to stdout. Suitable for programmatic consumption by other tools.

### SARIF Formatter

Outputs a SARIF v2.1.0 JSON document. The mapping:

| LintReport field | SARIF field |
|---|---|
| `ruleId` | `result.ruleId` |
| `severity: 'error'` | `result.level: 'error'` |
| `severity: 'warning'` | `result.level: 'warning'` |
| `severity: 'info'` | `result.level: 'note'` |
| `message` | `result.message.text` |
| `target` | `result.locations[0].logicalLocations[0].fullyQualifiedName` |
| `suggestion` | `result.fixes[0].description.text` |
| Rule metadata | `run.tool.driver.rules[]` |

SARIF output enables direct integration with:
- **GitHub Code Scanning**: Upload SARIF via the `github/codeql-action/upload-sarif` action.
- **GitHub Actions problem matchers**: GitHub parses SARIF and displays annotations on pull request diffs.
- **VS Code SARIF Viewer**: Open SARIF files in VS Code to navigate diagnostics.
- **Azure DevOps**: Upload SARIF to Azure DevOps for centralized analysis.

### Custom Formatters (Programmatic Only)

The `lint` function returns a `LintReport` object. Users can format it however they like:

```typescript
import { lint, LintReport } from 'mcp-schema-lint';

const report = await lint({ ... });

// Custom CSV output
for (const d of report.diagnostics) {
  console.log(`${d.severity},${d.ruleId},${d.target},"${d.message}"`);
}
```

---

## 12. MCP Server Connection

### Live Server Connection Flow

When linting a live server (stdio, HTTP, or SSE source), `mcp-schema-lint` follows this sequence:

```
lint() called
  │
  ├── Create transport (StdioClientTransport / StreamableHTTPClientTransport / SSEClientTransport)
  │     └── For stdio: spawn subprocess
  │     └── For http/sse: validate URL
  │
  ├── Create Client({ name: 'mcp-schema-lint', version: '<package version>' })
  │
  ├── client.connect(transport)  ◄── performs initialize handshake
  │     ├── Sends: { method: 'initialize', params: { protocolVersion, capabilities, clientInfo } }
  │     ├── Receives: { result: { protocolVersion, capabilities, serverInfo } }
  │     └── Sends: { method: 'notifications/initialized' }
  │
  ├── client.listTools()  ◄── paginate through all pages
  │     └── Collects all tool definitions
  │
  ├── client.listResources()  ◄── if server declares resources capability
  │     └── Collects all resource definitions
  │
  ├── client.listResourceTemplates()  ◄── if server declares resources capability
  │     └── Collects all resource template definitions
  │
  ├── client.listPrompts()  ◄── if server declares prompts capability
  │     └── Collects all prompt definitions
  │
  ├── Run all enabled lint rules against collected schemas
  │
  └── finally:
        ├── client.close()
        └── For stdio: terminate subprocess (SIGTERM, then SIGKILL after 5s)
```

### Static File Connection

When linting from a static file (file source), no MCP connection is established. The file is read and parsed as JSON. The expected format:

```typescript
interface StaticSchemaFile {
  tools?: ToolDefinition[];
  resources?: ResourceDefinition[];
  resourceTemplates?: ResourceTemplateDefinition[];
  prompts?: PromptDefinition[];
}
```

### Schema Extraction

The linter extracts the following from each schema type:

**Tools** (from `tools/list` response):
- `name`: string
- `title`: string | undefined
- `description`: string | undefined
- `inputSchema`: JSON Schema object | undefined
- `outputSchema`: JSON Schema object | undefined
- `annotations`: `{ title?, readOnlyHint?, destructiveHint?, idempotentHint?, openWorldHint? }` | undefined

**Resources** (from `resources/list` response):
- `uri`: string
- `name`: string
- `title`: string | undefined
- `description`: string | undefined
- `mimeType`: string | undefined
- `size`: number | undefined
- `annotations`: `{ audience?, priority?, lastModified? }` | undefined

**Resource Templates** (from `resources/templates/list` response):
- `uriTemplate`: string
- `name`: string
- `title`: string | undefined
- `description`: string | undefined
- `mimeType`: string | undefined

**Prompts** (from `prompts/list` response):
- `name`: string
- `title`: string | undefined
- `description`: string | undefined
- `arguments`: `Array<{ name, description?, required? }>` | undefined

---

## 13. Integration

### CI/CD: GitHub Actions

```yaml
name: MCP Schema Lint
on: [push, pull_request]

jobs:
  lint-schemas:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm ci

      - name: Lint MCP schemas
        run: npx mcp-schema-lint --stdio 'node ./server.js' --preset strict --format sarif > results.sarif

      - name: Upload SARIF
        if: always()
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: results.sarif
```

### CI/CD: GitLab CI

```yaml
lint-mcp-schemas:
  stage: test
  script:
    - npx mcp-schema-lint --stdio 'node ./server.js' --preset recommended
  allow_failure: false
```

### Pre-commit Hook

Add to `.husky/pre-commit` or equivalent:

```bash
#!/bin/sh
npx mcp-schema-lint --file ./schemas.json --preset recommended --quiet
```

Or for live server checks in development:

```bash
#!/bin/sh
npx mcp-schema-lint --stdio 'node ./server.js' --preset minimal --timeout 10000 --quiet
```

### npm Script Integration

```json
{
  "scripts": {
    "lint:schema": "mcp-schema-lint --stdio 'node ./dist/server.js' --preset recommended",
    "test": "vitest run && npm run lint:schema"
  }
}
```

---

## 14. Error Handling

### Connection Errors

When connecting to a live MCP server, the following errors can occur:

| Error | Behavior |
|---|---|
| Command not found (stdio) | Exit code 2. Message: "Failed to spawn subprocess: command not found." |
| Connection refused (HTTP/SSE) | Exit code 2. Message: "Failed to connect to MCP server: connection refused." |
| Handshake failure | Exit code 2. Message: "MCP handshake failed: <error details>." |
| Timeout | Exit code 2. Message: "Connection timed out after <ms>ms." |
| Server crash during enumeration | Exit code 2. Message: "Server disconnected during schema enumeration." |

### File Errors

| Error | Behavior |
|---|---|
| File not found | Exit code 2. Message: "Schema file not found: <path>." |
| Invalid JSON | Exit code 2. Message: "Failed to parse schema file: <parse error>." |
| Invalid structure | Exit code 2. Message: "Schema file does not contain valid tool/resource/prompt arrays." |

### Configuration Errors

| Error | Behavior |
|---|---|
| Invalid config file | Exit code 2. Message: "Invalid configuration: <details>." |
| Unknown rule ID in overrides | Exit code 2. Message: "Unknown rule: <ruleId>." |
| Invalid severity value | Exit code 2. Message: "Invalid severity '<value>' for rule '<ruleId>'. Expected: error, warning, info, off." |

### Partial Results

If the server connection succeeds but one enumeration call fails (e.g., `prompts/list` returns an error while `tools/list` succeeds), the linter proceeds with the schemas it successfully collected and adds a diagnostic:

```
WARN  connection  prompts/list failed: MethodNotFound. Prompt schemas were not analyzed.
```

The lint report includes only the schemas that were successfully retrieved. This fail-soft behavior ensures that a server with tools but no prompts capability does not cause a complete lint failure.

### Rule Errors

If a custom rule's check function throws an exception, the exception is caught and a diagnostic is added:

```
ERROR  internal  Custom rule "my-rule" threw an exception: TypeError: Cannot read properties of undefined.
```

The linter continues with remaining rules. Internal rule errors do not affect the exit code (they are reported as diagnostics but do not count toward the error/warning totals).

---

## 15. Testing Strategy

### Unit Tests

Unit tests verify each lint rule in isolation by providing minimal schema fixtures and asserting the expected diagnostics.

- **Rule tests**: For each built-in rule, test with:
  - A schema element that passes the rule (expect zero diagnostics).
  - A schema element that fails the rule (expect one diagnostic with correct ruleId, severity, target, and message).
  - Edge cases specific to the rule (e.g., `tool-description-quality` with a description that is exactly 10 characters, `naming-convention` with a single tool).
- **Preset tests**: Verify that each preset enables the expected rules at the expected severities.
- **Configuration tests**: Verify config file parsing, precedence resolution, shorthand severity expansion, and error handling for invalid configs.
- **Report builder tests**: Verify that `passed` is `true` when there are no errors (even with warnings), and `false` when there are errors. Verify summary counts. Verify diagnostic sorting.
- **Formatter tests**: Verify human-readable, JSON, and SARIF output for a known report.
- **CLI parsing tests**: Verify argument parsing, environment variable fallback, flag precedence, and error messages for invalid input.

### Integration Tests

Integration tests spawn a real MCP server subprocess and run the linter against it.

- **Well-formed server**: Start a mock MCP server with well-documented tools, resources, and prompts. Run the linter with preset `strict`. Assert zero errors.
- **Poorly-formed server**: Start a mock MCP server with missing descriptions, no annotations, inconsistent naming, and empty schemas. Run the linter with preset `recommended`. Assert the expected errors and warnings are produced.
- **Server with no tools**: Start a minimal server that declares no capabilities. Assert the linter produces no diagnostics (nothing to lint) and exits with code 0.
- **Static file input**: Create a schema file with known issues. Run the linter. Assert the expected diagnostics.
- **Custom rules**: Register a custom rule and verify it runs alongside built-in rules.
- **SARIF output**: Run the linter with `--format sarif` and validate the output against the SARIF v2.1.0 JSON Schema.

### Edge Cases to Test

- Server returns paginated tools (multiple pages via `nextCursor`).
- Server declares `tools` capability but `listTools` throws `MethodNotFound`.
- Server does not declare `resources` capability -- verify resources are not linted.
- Tool with `inputSchema` containing `$ref` references.
- Tool with deeply nested input schema (6+ levels).
- Tool with very long description (1000+ characters).
- Empty tool name (empty string).
- Tool name with special characters.
- Configuration file with unknown rule IDs.
- Custom rule that throws during execution.
- AbortSignal triggered mid-lint.
- Timeout during server connection.
- Static schema file with additional unexpected fields (verify graceful handling).

### Test Framework

Tests use Vitest, matching the project's existing configuration. Mock MCP servers for integration tests are created using the `@modelcontextprotocol/sdk`'s `McpServer` class running as a spawned subprocess.

---

## 16. Performance

### Schema Enumeration

Schema enumeration (`tools/list`, `resources/list`, `prompts/list`) is performed sequentially. For most MCP servers, enumeration completes in under 100ms. Pagination is followed to completion for servers with many tools. The overall timeout (default 30 seconds) acts as a hard ceiling.

### Rule Evaluation

Rule evaluation is synchronous and runs in a single pass after all schemas are collected. Each rule iterates over the relevant schema elements (tools, resources, or prompts) and produces diagnostics. For a server with 50 tools, 20 properties per tool, and 27 rules, the total number of rule evaluations is approximately 50 * 27 = 1,350 for tool-level rules plus 50 * 20 * 4 = 4,000 for parameter-level rules. This completes in under 10ms on modern hardware.

### Memory

The linter holds all schema definitions in memory during analysis. Each tool definition is typically 500 bytes to 5 KB (depending on schema complexity). For a server with 1,000 tools (extreme case), the memory footprint is approximately 5 MB for schemas plus a small overhead for diagnostics. This is well within acceptable limits.

### Large Schema Files

Static schema files are read into memory entirely. For very large files (100 MB+), Node.js's JSON parser handles this efficiently. The linter does not stream-parse JSON files because rule evaluation requires random access to the full schema set (e.g., `naming-convention` needs to see all tool names at once).

### Subprocess Management

For stdio transports, the subprocess is spawned when `lint()` is called and terminated in a `finally` block after enumeration. The subprocess cleanup follows the same pattern as `mcp-healthcheck`: `SIGTERM` with a 5-second grace period before `SIGKILL`. No subprocess is leaked even on timeout or abort.

---

## 17. Dependencies

### Runtime Dependencies

| Dependency | Purpose | Why Not Avoid It |
|---|---|---|
| `@modelcontextprotocol/sdk` | Provides `Client`, `StdioClientTransport`, `StreamableHTTPClientTransport`, `SSEClientTransport`, and all MCP type definitions. Used for live server connections. | This is the official SDK for MCP. Reimplementing the protocol client would be incorrect. The SDK handles protocol version negotiation, JSON-RPC framing, transport lifecycle, and error types. |

### No Other Runtime Dependencies

The package does not depend on any CLI parsing library, YAML parser, or utility library at runtime. CLI argument parsing uses Node.js built-in `util.parseArgs` (Node.js 18+). JSON file reading uses `node:fs/promises`. YAML configuration file parsing is implemented with a minimal inline parser that handles the subset of YAML used in config files (simple key-value pairs and nested objects); alternatively, users use JSON config files to avoid any YAML dependency.

### Dev Dependencies

| Dependency | Purpose |
|---|---|
| `typescript` | TypeScript compiler. |
| `vitest` | Test runner. |
| `eslint` | Linter for the linter's own source code. |
| `@modelcontextprotocol/sdk` | Also a dev dependency for creating mock servers in tests. |

---

## 18. File Structure

```
mcp-schema-lint/
├── package.json
├── tsconfig.json
├── SPEC.md
├── README.md
├── .mcp-schema-lint.json          # Example config file (also used for self-linting)
├── src/
│   ├── index.ts                   # Public API exports: lint, lintSchemas, createRule
│   ├── cli.ts                     # CLI entry point: argument parsing, output formatting, exit codes
│   ├── types.ts                   # All TypeScript type definitions
│   ├── lint.ts                    # Core lint() function: connects to server, collects schemas, runs rules
│   ├── lint-schemas.ts            # Core lintSchemas() function: synchronous rule evaluation
│   ├── config.ts                  # Configuration file loading and resolution
│   ├── presets.ts                 # Built-in preset definitions (recommended, strict, minimal, off)
│   ├── source/
│   │   ├── index.ts               # Source factory: creates the appropriate source reader
│   │   ├── live-source.ts         # Connects to live MCP server and enumerates schemas
│   │   └── file-source.ts         # Reads schemas from a static JSON file
│   ├── rules/
│   │   ├── index.ts               # Rule registry: collects all built-in rules
│   │   ├── rule-runner.ts         # Evaluates rules against schemas, produces diagnostics
│   │   ├── create-rule.ts         # createRule() factory function
│   │   ├── tool-description-missing.ts
│   │   ├── tool-description-quality.ts
│   │   ├── tool-description-length.ts
│   │   ├── tool-annotations-missing.ts
│   │   ├── tool-annotations-destructive-hint.ts
│   │   ├── tool-annotations-readonly-hint.ts
│   │   ├── tool-annotations-inconsistent.ts
│   │   ├── tool-output-schema-missing.ts
│   │   ├── tool-input-schema-missing.ts
│   │   ├── tool-input-schema-empty.ts
│   │   ├── tool-input-schema-no-required.ts
│   │   ├── tool-title-missing.ts
│   │   ├── parameter-description-missing.ts
│   │   ├── parameter-type-missing.ts
│   │   ├── parameter-description-quality.ts
│   │   ├── parameter-enum-description-missing.ts
│   │   ├── naming-convention.ts
│   │   ├── tool-naming-verb-noun.ts
│   │   ├── resource-description-missing.ts
│   │   ├── resource-mime-type-missing.ts
│   │   ├── resource-uri-format.ts
│   │   ├── resource-template-description-missing.ts
│   │   ├── prompt-description-missing.ts
│   │   ├── prompt-argument-description-missing.ts
│   │   ├── duplicate-names.ts
│   │   ├── schema-depth-excessive.ts
│   │   └── total-tools-excessive.ts
│   ├── formatters/
│   │   ├── index.ts               # Formatter factory
│   │   ├── human.ts               # Human-readable terminal output
│   │   ├── json.ts                # JSON output
│   │   └── sarif.ts               # SARIF v2.1.0 output
│   └── utils/
│       ├── naming.ts              # Naming convention detection and validation
│       ├── description.ts         # Description quality heuristics
│       └── schema-walk.ts         # JSON Schema traversal utilities
├── src/__tests__/
│   ├── rules/
│   │   ├── tool-description-missing.test.ts
│   │   ├── tool-description-quality.test.ts
│   │   ├── tool-annotations-missing.test.ts
│   │   ├── tool-annotations-inconsistent.test.ts
│   │   ├── naming-convention.test.ts
│   │   ├── parameter-description-missing.test.ts
│   │   ├── parameter-type-missing.test.ts
│   │   ├── duplicate-names.test.ts
│   │   └── ... (one test file per rule)
│   ├── presets.test.ts
│   ├── config.test.ts
│   ├── lint-schemas.test.ts
│   ├── lint.integration.test.ts
│   ├── cli.test.ts
│   ├── formatters/
│   │   ├── human.test.ts
│   │   ├── json.test.ts
│   │   └── sarif.test.ts
│   └── fixtures/
│       ├── well-formed-server.ts   # Mock MCP server with good schemas
│       ├── poorly-formed-server.ts # Mock MCP server with bad schemas
│       ├── schemas-good.json       # Static schema file with no issues
│       ├── schemas-bad.json        # Static schema file with many issues
│       └── configs/
│           ├── valid-config.json
│           ├── invalid-config.json
│           └── strict-override.json
└── dist/                           # Compiled output (gitignored)
```

---

## 19. Implementation Roadmap

### Phase 1: Core Rules and CLI (v0.1.0)

Implement the foundational linter with the most valuable rules and basic CLI support.

**Deliverables:**
- `lintSchemas()` function with synchronous rule evaluation.
- `lint()` function with stdio source support only.
- Built-in rules: `tool-description-missing`, `tool-description-quality`, `tool-input-schema-missing`, `tool-input-schema-empty`, `tool-input-schema-no-required`, `parameter-description-missing`, `parameter-type-missing`, `naming-convention`, `duplicate-names`.
- `recommended` and `minimal` presets.
- CLI with `--stdio`, `--file`, `--preset`, `--format human`, `--format json` flags.
- Configuration file support (`.mcp-schema-lint.json`).
- Unit tests for all rules and formatters.
- Integration test with a mock MCP server.

### Phase 2: Annotations, Output Schema, and Advanced Rules (v0.2.0)

Add annotation-focused rules and output schema checks.

**Deliverables:**
- Rules: `tool-annotations-missing`, `tool-annotations-destructive-hint`, `tool-annotations-readonly-hint`, `tool-annotations-inconsistent`, `tool-output-schema-missing`, `tool-title-missing`, `tool-description-length`, `tool-naming-verb-noun`, `parameter-description-quality`, `parameter-enum-description-missing`, `schema-depth-excessive`, `total-tools-excessive`.
- `strict` preset.
- SARIF formatter.
- Custom rules API (`createRule`, `customRules` option).
- Resource and prompt rules: `resource-description-missing`, `resource-mime-type-missing`, `resource-uri-format`, `resource-template-description-missing`, `prompt-description-missing`, `prompt-argument-description-missing`.

### Phase 3: HTTP/SSE Transports and Full Integration (v0.3.0)

Add remote server connection support and CI integration features.

**Deliverables:**
- HTTP and SSE source support (`--url`, `--sse` flags).
- Environment variable configuration.
- YAML configuration file support.
- GitHub Actions integration example and documentation.
- `--verbose` and `--no-color` CLI flags.
- Pre-commit hook documentation and examples.
- Performance optimization for large schema sets.
- Edge case handling for paginated results, servers that crash during enumeration, and partial failures.

### Phase 4: Polish and Ecosystem (v1.0.0)

Stabilize the API, complete documentation, and prepare for broad adoption.

**Deliverables:**
- API stability guarantee (semver major version).
- Complete README with usage examples, rule catalog, and configuration guide.
- Published npm package with TypeScript declarations.
- Example custom rule packages.
- Integration with MCP Inspector (optional export of lint results for display in the Inspector UI).
- Performance benchmarks and optimization for servers with 500+ tools.

---

## 20. Example Use Cases

### 20.1 Developer Pre-publish Check

A developer has built an MCP server and wants to verify schema quality before publishing to npm.

```bash
$ mcp-schema-lint --stdio 'node ./dist/server.js' --preset strict

  mcp-schema-lint v0.1.0

  Target: stdio — node ./dist/server.js
  Server: my-github-tools v2.0.0 (protocol v2025-06-18)
  Preset: strict

  Analyzing 8 tools, 0 resources, 2 prompts...

  All checks passed.

  ─────────────────────────────────────────────────────────
  0 errors, 0 warnings (0 diagnostics total)
  8 tools, 0 resources, 2 prompts analyzed in 312ms
  Result: PASSED
```

### 20.2 CI Pipeline Gate

A GitHub Actions workflow lints MCP schemas on every pull request and uploads results as code annotations.

```yaml
- name: Lint MCP schemas
  run: |
    npx mcp-schema-lint \
      --stdio 'node ./dist/server.js' \
      --preset recommended \
      --format sarif > lint-results.sarif
  continue-on-error: true

- name: Upload SARIF
  uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: lint-results.sarif
```

### 20.3 Evaluating a Third-Party Server

A team considering adopting a third-party MCP server runs the linter to evaluate its schema quality before integration.

```bash
$ mcp-schema-lint --url https://third-party.example.com/mcp \
    --header 'Authorization:Bearer sk-...' \
    --preset recommended \
    --format json | jq '.summary'

{
  "total": 12,
  "errors": 2,
  "warnings": 7,
  "infos": 3,
  "toolsAnalyzed": 15,
  "resourcesAnalyzed": 3,
  "promptsAnalyzed": 0,
  "resourceTemplatesAnalyzed": 1
}
```

### 20.4 Static Schema Linting in a Test Suite

An MCP server's test suite extracts schemas and lints them programmatically, failing the test if any errors are found.

```typescript
import { describe, it, expect } from 'vitest';
import { lintSchemas } from 'mcp-schema-lint';
import { getToolDefinitions } from '../src/tools.js';
import { getResourceDefinitions } from '../src/resources.js';
import { getPromptDefinitions } from '../src/prompts.js';

describe('MCP Schema Quality', () => {
  it('should pass recommended lint rules', () => {
    const report = lintSchemas({
      tools: getToolDefinitions(),
      resources: getResourceDefinitions(),
      prompts: getPromptDefinitions(),
      resourceTemplates: [],
    }, {
      preset: 'recommended',
    });

    if (!report.passed) {
      const errors = report.diagnostics
        .filter(d => d.severity === 'error')
        .map(d => `${d.ruleId}: ${d.target} — ${d.message}`)
        .join('\n');
      throw new Error(`Schema lint failed:\n${errors}`);
    }

    expect(report.passed).toBe(true);
  });
});
```

### 20.5 Incremental Adoption with Minimal Preset

A team with an existing MCP server that has many schema quality issues starts with the `minimal` preset and gradually upgrades.

```json
// .mcp-schema-lint.json — Phase 1: Just the critical stuff
{
  "preset": "minimal"
}
```

```json
// .mcp-schema-lint.json — Phase 2: Add description checks
{
  "preset": "minimal",
  "rules": {
    "tool-description-quality": "warning",
    "parameter-description-missing": "warning"
  }
}
```

```json
// .mcp-schema-lint.json — Phase 3: Full recommended
{
  "preset": "recommended"
}
```
