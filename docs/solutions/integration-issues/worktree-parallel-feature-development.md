---
title: "Git worktrees for parallel feature development"
category: integration-issues
date: 2026-03-13
tags: [git, worktree, parallel-development, env-files]
---

# Git Worktrees for Parallel Feature Development

## Problem

Running two feature branches simultaneously in the same working directory caused changes to collide — files from one issue bled into the other, branches got tangled, and linter hooks reverted changes unexpectedly.

## Root Cause

A single working directory can only have one branch checked out. Attempting to work on two issues (PR #5: transaction memory, PR #6: receipt scanner) by switching branches in the same directory mixed uncommitted changes across features.

## Solution

Use **git worktrees** to create isolated copies of the repo, each on its own branch:

```bash
# From the main project directory (on master):
git worktree add ../budget-tracker-issue-3 -b feature/smart-transaction-memory
git worktree add ../budget-tracker-issue-4 -b feature/receipt-scanner
```

Each worktree gets its own directory, branch, and working tree. Run separate terminal sessions in each.

**After merging, clean up:**
```bash
git worktree remove ../budget-tracker-issue-3
git branch -d feature/smart-transaction-memory
```

**Before starting work on a worktree created before another PR merged**, rebase onto the updated master:
```bash
cd <worktree>
git stash push -u -m "WIP"
git rebase master
git stash pop
```

## Critical Gotcha: .env Files

`.env` is gitignored, so it does NOT carry over to worktrees. The app will fail (server errors on login, missing API keys) without it.

**Always copy after creating a worktree:**
```bash
cp ../budget-tracker/.env <new-worktree>/.env
```

## Prevention

- Always use worktrees (not branch switching) when working on multiple features
- Copy `.env` immediately after creating a worktree
- Keep master as "home base" — never work directly on it
- Update worktree branches before starting work if other PRs have merged
