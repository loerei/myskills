# DataMigration Subdocument: NoSQL Schemas, Event Stores & Stream Evolution

## Domain Audit Checklist

### 1. Document Schema Flexibility & Upgrades
- [ ] Isolated Document Upgrades via Migration Adapter: Verify that document schema evolution executes through discrete migration adapters at storage retrieval barriers or batch runners, NOT ambient defaults or version branching in domain models.
- [ ] Version Discriminators: Confirm all document payloads contain an explicit `schema_version` integer field.

### 2. Event Store Append Safety
- [ ] Optimistic Concurrency Control: Ensure event appends pass expected stream version tags to prevent concurrent overwrite race conditions.
- [ ] Event Stream Immutability: Confirm existing historical events are never deleted or updated in place; field modifications require new compensative events.

### 3. Backfill Pagination & Heat Controls
- [ ] Partition Key Hot-Spotting: Verify key generation strategies prevent monotonically increasing keys (e.g., raw timestamps) that route writes to single database partitions.
- [ ] Throttle-Aware Backfills: Ensure backfill workers respect database provisioned throughput constraints and use exponential backoff on HTTP 429 / write throttles.

## Concrete Anti-Patterns

### Anti-Pattern 1: Direct Schema Mutation without Versioning

```python
# BAD: Code assumes all MongoDB documents contain 'full_name' field.
# Old documents with 'first_name' and 'last_name' throw NullPointer / KeyError exceptions.
def process_user(doc):
    name = doc['full_name'] # CRASHES on legacy records!

# GOOD: Document adapter normalizes to canonical schema before calling domain logic.
def upgrade_user_doc(doc: dict) -> dict:
    version = doc.get('schema_version', 1)
    if version == 1:
        return {
            'id': doc['id'],
            'full_name': f"{doc.get('first_name', '')} {doc.get('last_name', '')}".strip(),
            'schema_version': 2
        }
    return doc

# Business logic consumes exclusively canonical schema
def process_user(doc: dict):
    clean_doc = upgrade_user_doc(doc)
    return clean_doc['full_name']
```

## Failure Modes & Mitigations

- Database Partition Throttling: Hash primary keys before storage or prepend key namespaces with random prefixes to distribute write load.
- Memory Exhaustion During Mass Migration: Force batch cursor iterations to use fixed limit limits with explicit garbage collection points.
