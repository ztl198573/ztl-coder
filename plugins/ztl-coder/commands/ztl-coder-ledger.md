---
description: Create or update continuity ledger for session state
allowed-tools: Read, Write, Edit, Glob
---

## Context

You are creating or updating a session continuity ledger to preserve context.

## Output Location

`thoughts/ledgers/CONTINUITY_{session-name}.md`

## Ledger Template

```markdown
# Session Continuity Ledger
**Session:** {session-name}
**Updated:** {timestamp}
**Context Usage:** {percentage}%

## Goal
{The core objective being pursued}

## Progress
### Completed
- [x] {What was done}

### In Progress
- [ ] {What's currently being worked on}

### Blocked
- {Any blockers and why}

## Key Decisions
- **{Decision}**: {Rationale}

## Technical Context
### Files Modified
- {path}: {what changed}

### Files Read
- {path}: {why it was read}

## Next Steps
1. {Immediate next action}
2. {Following action}

## Notes for Next Session
{Important context that would help continue work seamlessly}
```

## Your Task

1. Review the current conversation and work done
2. Create or update the ledger file in `thoughts/ledgers/`
3. Capture all important context, decisions, and progress
4. List next steps for continuation

## Rules

- Preserve exact file paths and function names
- Focus on what's needed to continue
- Be specific about what was done
- Include any error messages or issues encountered
