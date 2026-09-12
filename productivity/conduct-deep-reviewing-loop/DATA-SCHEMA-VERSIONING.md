# DataMigration Subdocument: Local JSON & Embedded Schema Versioning

## Domain Audit Checklist

### 1. Version Anchoring & Progression
- [ ] Explicit Version Register: Verify persistent storage declares an explicit monotonic integer version (`schemaVersion: int` in JSON root envelopes; `PRAGMA user_version` in SQLite). Reject unversioned data stores.
- [ ] Linear Monotonic Progression: Confirm migrations execute sequentially ($M_{0 \to 1} \to M_{1 \to 2} \to \dots \to M_{N-1 \to N}$) via an isolated runner loop. Reject shape-guessing branches or multi-version heuristics.

### 2. Storage Lifecycle & Read Path Cleanliness
- [ ] Startup Lifecycle Isolation: Verify migration runners execute exclusively during storage initialization at application bootstrap, before domain services, IPC handlers, or UI components mount.
- [ ] Canonical Read Invariant: Ensure domain loaders, repositories, and UI view models consume only the target canonical schema version ($V_N$), with zero conditional checks for legacy property names.
- [ ] Ban Ambient Runtime Fallbacks: Reject directive artifacts that introduce heuristic property checks (`if ('legacyKey' in data)`), transient config flags (`config.customOrderMigrated`), or migration logic inside UI lifecycles.

### 3. Atomic Mutation & Crash Invariance
- [ ] Atomic File Replacement (JSON): Confirm file-based migrations write transformed content to a temporary sibling file, flush to physical disk (`fsync`), and atomically replace target file via OS rename (`renameSync`).
- [ ] Transactional Atomic DDL (SQLite): Ensure schema alterations, backfills, and version increments execute inside a single `BEGIN IMMEDIATE` or `EXCLUSIVE` transaction block.
- [ ] Crash Idempotency: Verify that an interrupted migration leaves original storage intact on disk, allowing safe recovery on subsequent startup attempts.

---

## Concrete Anti-Patterns

### Anti-Pattern 1: Heuristic Property Sniffing in Loaders

```typescript
// BAD: Loader checks multiple historical property variants at runtime.
// Causes combinatorial branch bloat, silent data corruption, and race hazards.
export function loadItem(raw: any): Item {
  if (raw.targetUri) return raw;
  if (raw.canonicalPath) return { id: raw.id, targetUri: `file://${raw.canonicalPath}` };
  if (raw.gameKey) return { id: raw.id, targetUri: `file://${resolveKey(raw.gameKey)}` };
  throw new Error('Unrecognized data shape');
}

// GOOD: Isolated sequential migration runner at storage boot; loader stays pristine.
const MIGRATIONS: Record<number, (data: any) => any> = {
  1: (d) => ({ ...d, schemaVersion: 1, gameKey: d.gameKey || 'default' }),
  2: (d) => ({ id: d.id, schemaVersion: 2, canonicalPath: resolveKey(d.gameKey) }),
  3: (d) => ({ id: d.id, schemaVersion: 3, targetUri: `file://${d.canonicalPath}` })
};

export function migrateStorage(data: any, targetVersion: number): any {
  let cur = data.schemaVersion ?? 0;
  while (cur < targetVersion) {
    const next = cur + 1;
    data = MIGRATIONS[next](data);
    data.schemaVersion = next;
    cur = next;
  }
  return data;
}

// Loader consumes exclusively canonical schema
export function loadItem(canonicalData: ItemV3): ItemV3 {
  return canonicalData;
}
```

### Anti-Pattern 2: Ad-Hoc Migration Flags in Application Configuration

```typescript
// BAD: Transient migration flags polluted across general application settings.
if (!settings.customOrderMigrated) {
  await migrateCustomOrder();
  settings.customOrderMigrated = true;
  await saveSettings(settings); // Partial crash desynchronizes db and settings!
}

// GOOD: Storage version encapsulated within storage boundary.
// In SQLite:
db.exec(`
  BEGIN EXCLUSIVE;
  ALTER TABLE items ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
  PRAGMA user_version = 2;
  COMMIT;
`);
```

---

## Failure Modes & Mitigations

- **Combinatorial Fallback Explosion**: If $K$ unversioned fields evolve independently, heuristic loaders require up to $2^K$ permutation branches. Enforce monotonic linear integer versioning ($N$ migrations).
- **Ambiguity Hazards & Data Loss**: When partially written legacy records contain competing fields, heuristic loaders produce nondeterministic precedence bugs. Enforce discrete, one-way forward transformations at startup.
- **Split-Brain Concurrent Writes**: Executing migration logic inside UI components or multiple renderer windows causes concurrent competing writes. Enforce storage lifecycle barriers in the main host process prior to window creation.
