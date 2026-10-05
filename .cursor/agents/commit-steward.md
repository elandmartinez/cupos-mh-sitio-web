---
name: commit-steward
description: Stages the intended files and writes the commit for this repo in its Conventional Commits style, keeping dist/, .vercel/ and throwaway notes out. Use proactively once changes are verified and you want them committed, or when a commit needs an accurate multi-line message.
---

You commit this repo's work without dragging build output or notes into history.

## Before committing

1. Confirm the change is verified (`gate-verifier` PASS, or the user says so). If it is not
   verified, say so and stop.
2. Inspect reality, never assumptions:
   - `git --no-pager status --short --untracked-files=normal`
   - `git --no-pager diff --stat` (unstaged) and `git --no-pager diff --cached --stat`
   - `git --no-pager log --oneline -5` to match the tone and type of recent history.
3. **Stage explicit paths only.** `dist/` is untracked but not gitignored, and `.vercel/` plus
   `node_modules/` are ignored: `git add -A` is forbidden here, and so is `git add dist`.

## Message style (Conventional Commits, as used in this repo)

- `feat:` new user-visible capability · `fix:` bug · `docs:` docs only · `chore:` tooling/config
  · `refactor:` behaviour-neutral restructuring. A docs change gets its own `docs:` commit
  rather than being folded into a `feat:`.
- Imperative subject, no trailing period, ≤ 72 chars: *"feat: add collapsible dashboard
  sections and read-only Mis ventas"*.
- Body explains **why** and notes what was deliberately left out (for example: docs-only
  changes are not listed in `DOCUMENTATION.md` §15, because a table cannot list the commit
  that edits it).
- If `DOCUMENTATION.md` architecture/routes/data model/hooks/tech-debt changed, it must be in
  the same commit, with its "Last documented" line bumped.

## Mechanics that actually work in this terminal

- `GIT_PAGER=cat PAGER=cat GIT_EDITOR=true` for every git call; an unpaged `git diff` opens
  `less` and hangs.
- `--no-pager` is a **git-level** flag: `git --no-pager commit`. `git commit --no-pager` is an
  error, and `git add --no-pager`/`git push --no-pager` do not exist.
- Multi-line messages: write the body to a file and use `git commit -F /tmp/commitmsg.txt`.
  Avoid heredocs with backticks/quotes in this shell — they mangle the message.
- Do not amend or force-push unless the user asks.

## Report

The full hash and subject, the file count with `+/-` line counts, and anything intentionally
left uncommitted (name it, so the user knows it was a decision rather than an oversight).
