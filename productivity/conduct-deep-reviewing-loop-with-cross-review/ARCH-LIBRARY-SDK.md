# Library, SDK, and Reusable Package Architecture

Audits public API surface minimalization, zero import-time side effects, programmatic error taxonomies, and host-controlled lifecycle seams for libraries, SDKs, and shared packages.

## Domain Audit Checklist

### 1. Minimal Public API Surface & Facade Entrypoints
- [ ] **Explicit Public Boundary**: Expose a minimal, intentional set of public functions, classes, and DTO types through explicit root or subpath entrypoints (`index.ts`, `pkg/core`, `pkg/adapters/*`).
- [ ] **No Internal Type Leakage**: Confirm public method signatures and return types never expose private internal helper structs, raw third-party vendor SDK types, or internal persistence models.

### 2. Zero Import-Time Side Effects (`sideEffects: false`)
- [ ] **Pure Module Evaluation**: Importing the library MUST NOT execute network/disk I/O, spawn background timers/workers, register global listeners, or mutate `globalThis`/`window`.
- [ ] **Explicit Configuration Injection over Ambient `process.env`**: Reject reading `process.env` or global config files implicitly inside library modules. Require callers to pass configuration explicitly via constructor or factory parameters (`new SdkClient({ apiKey, timeoutMs })`), optionally offering an explicit opt-in helper (`SdkClient.fromEnv()`) at the outer facade.

### 3. Programmatic Error Taxonomy (No `process.exit` or String-Only Errors)
- [ ] **Typed Error Hierarchy & Error Codes**: Export a base library error class (`class SdkError extends Error`) with a deterministic, machine-readable `readonly code: SdkErrorCode` discriminant, `cause` chaining, and structured metadata so host applications can branch on `err.code` without regex-matching `err.message`.
- [ ] **Ban Process Termination**: Library code MUST NEVER call `process.exit()`, `std::process::exit()`, or `panic!()` on runtime or validation failures; always return or throw typed errors to the host caller.

### 4. Pluggable Host Seams & Tree-Shakable Subpaths
- [ ] **Bring-Your-Own Infrastructure Seams**: Allow host applications to inject custom transport (`fetch` implementation), custom storage/cache adapters, custom clock/timers, and `AbortSignal` rather than hardcoding concrete runtime singletons.
- [ ] **Optional Adapter Subpath Isolation**: Isolate heavy optional integrations (e.g. Redis adapter, Postgres adapter, OpenTelemetry bridge) into dedicated subpath entrypoints (`my-lib/redis`) so consumers importing the core package do not pull unused transitive dependencies.

## Concrete Anti-Patterns

### Anti-Pattern 1: Import-Time Side Effects, Ambient `process.env`, and Untyped Errors

```typescript
// BAD: Reads process.env and opens socket at import time; throws generic Error strings; calls process.exit
const API_KEY = process.env.VENDOR_API_KEY;
if (!API_KEY) {
  console.error("Missing VENDOR_API_KEY");
  process.exit(1); // Crashes host application on import!
}
const globalPoller = setInterval(() => pingServer(API_KEY), 10000); // Import-time side effect leaks timer

export async function chargeCustomer(amountCents: bigint) {
  const res = await fetch("https://api.vendor.com/charge", { body: String(amountCents) });
  if (!res.ok) throw new Error(`Charge failed with status ${res.status}`); // Caller forced to regex-match string
}

// GOOD: Pure module evaluation, explicit config injection, pluggable fetch seam, and typed error codes
export type BillingErrorCode = "AUTH_INVALID" | "RATE_LIMITED" | "UPSTREAM_UNAVAILABLE";

export class BillingSdkError extends Error {
  constructor(
    public readonly code: BillingErrorCode,
    message: string,
    public readonly status?: number,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = "BillingSdkError";
  }
}

export interface BillingClientOptions {
  readonly apiKey: string;
  readonly fetchImpl?: typeof fetch;
}

export class BillingClient {
  private readonly fetchFn: typeof fetch;
  constructor(private readonly options: BillingClientOptions) {
    if (!options.apiKey) throw new BillingSdkError("AUTH_INVALID", "apiKey is required");
    this.fetchFn = options.fetchImpl ?? globalThis.fetch;
  }

  async chargeCustomer(amountCents: bigint, signal?: AbortSignal): Promise<{ transactionId: string }> {
    const res = await this.fetchFn("https://api.vendor.com/charge", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.options.apiKey}` },
      body: JSON.stringify({ amountCents: amountCents.toString() }),
      signal
    });
    if (res.status === 429) throw new BillingSdkError("RATE_LIMITED", "Rate limit exceeded", 429);
    if (!res.ok) throw new BillingSdkError("UPSTREAM_UNAVAILABLE", "Vendor error", res.status);
    return res.json();
  }
}
```

## Failure Modes & Mitigations

| Failure Mode | Root Cause | Mitigation |
| :--- | :--- | :--- |
| **Host App Crash or Hang on `import`** | Library executes `process.exit()`, `setInterval`, or network I/O at top-level module scope. | Move all initialization and validation inside explicit class constructors or `createClient()` factories. |
| **Brittle Caller Error Handling** | Library throws plain `new Error("...")` with varying message text. | Export a typed `SdkError` subclass with a union `code` property and preserve `cause`. |
| **Bundle Bloat in Consumer Apps** | Root `index.ts` re-exports all optional database/cloud adapters. | Split optional adapters into separate subpath exports (`pkg/adapters/postgres`) and mark `"sideEffects": false`. |
