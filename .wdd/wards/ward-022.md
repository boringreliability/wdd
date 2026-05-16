---
ward: 22
revision: null
name: "Ward Locking"
epic: "orchestration"
status: "planned"
dependencies: [20]
layer: "typescript"
estimated_tests: 7
created: "2026-05-16"
completed: null
---
# Ward 022: Ward Locking (claim/release)

## Scope
Simple file-based lock system so multiple agents can claim wards without stepping on each other. A claim records: which agent claimed, when, what paths the ward touches. `wdd parallel` integrates with locks to warn about active conflicts.

## Inputs
- Ward 20's `touches` frontmatter field
- Ward 18's glob matcher for touch-overlap checks

## Outputs
- `src/commands/lock.ts` exporting:
  - `claimWard(projectDir, wardId, agentName): LockRecord` — fails if conflicting active lock
  - `releaseWard(projectDir, wardId, agentName): void` — fails if not owner
  - `listLocks(projectDir): LockRecord[]`
  - `findConflictingLocks(touches, locks): LockRecord[]`
- `.wdd/locks/ward-{NNN}.lock` JSON files
- `wdd ward claim <id> --agent <name>` CLI
- `wdd ward release <id> --agent <name>` CLI
- `wdd locks` CLI

## Specification (sketch)

### Lock file format
```json
{
  "ward": "19",
  "agent": "claude-code",
  "touches": ["src/commands/**"],
  "created": "2026-05-16T14:23:00Z",
  "stale_after": "2026-05-16T18:23:00Z"
}
```

### Conflict detection
`findConflictingLocks` checks if any glob in candidate touches overlaps with any glob in any active lock's touches.

### Stale lock detection
Locks older than 4 hours flagged stale but NOT auto-removed. `wdd locks --prune-stale` for cleanup.

### Integration with `wdd parallel`
Reads active locks. Wards in proposed batch whose touches overlap an active lock are flagged with a warning.

## Tests

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | claim_creates_lock_file | `.wdd/locks/ward-019.lock` written with correct fields |
| 2 | claim_fails_if_conflict | Second agent claiming overlapping touches errors |
| 3 | release_removes_lock | Lock file deleted on release |
| 4 | release_rejects_wrong_owner | Agent A cannot release agent B's lock |
| 5 | list_locks_returns_active | listLocks enumerates all locks |
| 6 | conflict_detection_via_globs | `src/**` conflicts with `src/foo.ts` |
| 7 | stale_lock_flagged | Locks > 4h marked stale |

## Must NOT
- Do NOT auto-remove stale locks (data could be in-flight)
- Do NOT support read locks vs write locks — only exclusive
- Do NOT use OS-level file locking — file existence IS the lock

## Must DO
- Lock files are JSON, human-readable
- Locks live in `.wdd/locks/`
- All operations idempotent where possible

## Manual Smoke Test
### Setup
```bash
cd ~/kmddev/wdd
npm run build
```

### Steps
1. `wdd ward claim 19 --agent agent-a` — creates lock
2. `wdd ward claim 19 --agent agent-b` — expect error
3. `wdd locks` — list shows agent-a's claim
4. `wdd ward release 19 --agent agent-b` — expect error
5. `wdd ward release 19 --agent agent-a` — succeeds

### Pass criteria
- [ ] Lock file created with expected JSON
- [ ] Conflict detection works for overlapping touches
- [ ] Ownership enforced on release

## Verification
- All 7 tests pass
- Manual smoke test verifies CLI flow
- TypeScript compiles clean
