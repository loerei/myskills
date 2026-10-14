# Library and SDK Security: Credential Encapsulation, Prototype Pollution, and Parser Bounds

Audits secret encapsulation, prototype pollution defenses on config merging, public parser resource bounds, and supply-chain hygiene in libraries and SDKs.

## Domain Audit Checklist

### 1. Explicit Credential Injection & Private Field Encapsulation
- [ ] **No Silent `process.env` Credential Sniffing**: Libraries MUST NOT silently read `process.env` inside internal functions or default parameters. Require explicit credential passing (`new Client({ apiKey })`) or an explicit opt-in static factory (`Client.fromEnv()`).
- [ ] **True Private Storage (`#apiKey`)**: Store credentials in hard private class fields (`#apiKey` in JS/TS) or closures rather than public/TypeScript-`private` properties so `Object.keys(client)`, ` {...client}`, and `JSON.stringify(client)` cannot exfiltrate secrets.

### 2. Prototype Pollution Defense in Config & Payload Merging
- [ ] **Safe Recursive Merge / Object Creation**: If the library deep-merges caller options or parses dynamic key-value structures, explicitly reject keys matching `__proto__`, `constructor`, and `prototype` (or validate through strict Zod/TypeBox schemas / `Object.hasOwn`).

### 3. Public Parser Input Ceilings & ReDoS Protection
- [ ] **Pre-Parse Input Length Bounds**: Public library functions parsing strings, headers, URLs, markup, or binary buffers MUST enforce a configurable `maxInputLength` / `maxDepth` ceiling before executing regexes or recursive AST traversal.
- [ ] **Linear-Time Regex Guarantee**: Reject ambiguous nested quantifiers (`(a+)+`) on public library inputs to prevent a single malformed caller string from freezing the host application's thread.

### 4. Supply-Chain & Install Script Hygiene
- [ ] **Ban Unnecessary `postinstall` Scripts**: Avoid `preinstall`/`postinstall` shell scripts in published packages unless required for verified native binary prebuilds.
- [ ] **Minimal Runtime Dependency Surface**: Prefer native runtime APIs (`node:crypto`, `fetch`, `URL`, `TextEncoder`) over pulling transitive third-party utility packages.

## Concrete Anti-Patterns

### Anti-Pattern 1: Prototype Pollution in Library `mergeOptions` & Public Secret Property

```typescript
// BAD:
// 1. Recursive merge copies "__proto__" from untrusted user config, polluting Object.prototype globally!
// 2. TypeScript "private apiKey" is still a normal enumerable JS property leaked by JSON.stringify(client)!
function mergeOptionsBad(target: any, source: any) {
  for (const key of Object.keys(source)) {
    if (typeof source[key] === "object" && source[key] !== null) {
      target[key] = mergeOptionsBad(target[key] || {}, source[key]);
    } else {
      target[key] = source[key]; // Pollutes Object.prototype when key === "__proto__"
    }
  }
  return target;
}

// GOOD: Block dangerous prototype keys and store secrets in ECMAScript #private fields
const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export function mergeOptionsSafe<T extends Record<string, unknown>>(target: T, source: Record<string, unknown>): T {
  const out: Record<string, unknown> = { ...target };
  for (const [key, val] of Object.entries(source)) {
    if (FORBIDDEN_KEYS.has(key)) continue;
    if (typeof val === "object" && val !== null && !Array.isArray(val)) {
      const base = typeof out[key] === "object" && out[key] !== null ? (out[key] as Record<string, unknown>) : {};
      out[key] = mergeOptionsSafe(base, val as Record<string, unknown>);
    } else {
      out[key] = val;
    }
  }
  return out as T;
}

export class SdkClient {
  readonly #apiKey: string; // Inaccessible to JSON.stringify, Object.keys, or spread
  constructor(options: { apiKey: string }) {
    this.#apiKey = options.apiKey;
  }
}
```

## Failure Modes & Mitigations

| Failure Mode | Root Cause | Mitigation |
| :--- | :--- | :--- |
| **Host Process RCE / Auth Bypass via Prototype Pollution** | Library deep-merges caller-supplied JSON options without filtering `__proto__` / `constructor`. | Filter `["__proto__", "constructor", "prototype"]` in all recursive merge/clone helpers or parse via strict schema. |
| **API Key Leaked in Host App Telemetry** | Host app serializes `sdkClient` instance using `JSON.stringify`, exposing `private apiKey`. | Store sensitive credentials in `#private` fields or WeakMaps. |
| **Host Event Loop DoS via Malformed Token/Input** | Library runs unbounded regex or recursive parser on multi-MB string input. | Check `if (input.length > maxLength) throw new SdkError("INPUT_TOO_LARGE")` before parsing. |
