---
description: Initialize project with ARCHITECTURE.md and CODE_STYLE.md
allowed-tools: Glob, Grep, Read, Write, Edit
---

## Context

You are initializing project documentation for this codebase.

## Your Task

1. Analyze the project structure using Glob and Grep tools
2. Detect tech stack, frameworks, and patterns
3. Generate the following files if they don't exist:
   - **ARCHITECTURE.md** - Project structure and conventions
   - **CODE_STYLE.md** - Coding standards and patterns
4. Create `thoughts/` directory structure for session continuity

## Architecture Template

```markdown
# {Project Name} Architecture

## Overview
{Brief description of what this project does}

## Tech Stack
- Language: {language}
- Framework: {framework}
- Database: {database}
- Testing: {test framework}

## Directory Structure
{project-root}/
├── src/
├── tests/
└── docs/

## Key Components
- {Component}: {Description}

## Configuration
{Environment variables, config files}
```

## Code Style Template

```markdown
# {Project Name} Code Style

## Naming Conventions
- Files: kebab-case
- Classes: PascalCase
- Functions: camelCase
- Constants: UPPER_SNAKE_CASE

## Code Patterns
- Error handling: try/catch with specific messages
- Testing: Write tests first (TDD)

## Anti-patterns
- Don't use `any` type
- Don't skip tests
```

## Rules

- Analyze existing code first
- Match existing patterns
- Be concise but useful
- Focus on what's unique to this project
