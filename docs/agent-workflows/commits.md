# Commits, simplification, and pushing

Use this workflow only when the user explicitly asks for a commit.

## Simplify first

Simplify means reviewing the proposed diff before committing it, then making any
safe improvements needed to:

- remove duplication and unnecessary complexity;
- follow the project's established patterns and naming;
- apply Svelte 5 reactivity conventions; and
- add or adjust focused tests for new pure behaviour.

It is not a particular vendor tool. Do it with ordinary code review, nearby
examples, tests, and the Svelte review guide. Do not expand the task into an
unrelated refactor; surface larger opportunities to the user instead.

## Commit procedure

1. Inspect `git status --short`, the current branch, and recent commit messages.
2. Stop for secrets, an empty diff, or ambiguity about the intended files.
3. Simplify the diff and run `pnpm run test:unit` plus `pnpm run check`.
   Tests block a commit unless the user explicitly accepts the failure. The
   known `check` baseline blocks only new diagnostics in touched files.
4. Review nearby documentation and add co-located tests when a public helper,
   component contract, or documented behaviour changed.
5. Tell the user the exact files that will be included, then stage by filename.
   Never use broad `git add` commands.
6. Use an imperative title under 70 characters and a UK-English bullet body.
   Do not add conventional-commit prefixes, `Co-Authored-By`, or tool
   attribution.
7. Confirm the new commit, clean status, and commits ahead of `origin/main`.

Do not push after committing unless the user separately asks to push.
