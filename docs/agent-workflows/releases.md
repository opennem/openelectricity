# Releases

Production deployments are triggered by a `v*` tag. `main` powers production;
`dev` powers staging.

Use this procedure only when the user explicitly asks to release, deploy, ship,
or cut a version.

1. Ask whether the release is `patch`, `minor`, or `major` if it was not given.
2. Confirm the branch is `main`, the working tree is clean, and `main` is not
   behind `origin/main`. Show the commits that will ship.
3. Before tagging, run the release-candidate checks:

   ```sh
   doppler run -- pnpm run test:unit
   pnpm run doppler-build
   pnpm run check
   ```

   The first two must pass. `check` has a known baseline and blocks only newly
   introduced diagnostics in files changed by the release.

4. Run `pnpm version patch`, `pnpm version minor`, or `pnpm version major`.
   Never edit the package version manually or disable git tags/hooks.
5. Push the version commit, then push the exact new tag. Never force-push.
6. Check the latest `deploy.yml` GitHub Actions run. It confirms the Cloudflare
   deploy hook was called; the actual Cloudflare build runs separately.
7. Fast-forward `dev` to `main` with `pnpm run dev-sync`. Stop if the branches
   have diverged.

Never amend or rewrite an already released commit or tag.
