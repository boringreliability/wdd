# Epic 01: Core CLI

## Goal
Implement the core WDD CLI commands: init, ward create, ward status, ward reopen, and complete.

## Wards
| Ward | Name | Status |
|------|------|--------|
| 1 | Project Scaffold + Init | 📋 Planned |
| 2 | Ward Creation | 📋 Planned |
| 3 | Ward Status Transitions | 📋 Planned |
| 4 | Ward Reopen | 📋 Planned |
| 5 | Ward Complete | 📋 Planned |

## Integration Points
These commands form the core workflow loop. Ward status transitions (Ward 3) depend on Ward creation (Ward 2). Complete (Ward 5) depends on status transitions.

## Completion Criteria
All 5 core commands work end-to-end with valid state transitions.
