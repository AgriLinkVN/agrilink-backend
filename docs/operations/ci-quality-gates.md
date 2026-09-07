# CI Quality Gate

The `Backend Quality Gate` workflow runs for every pull request and for pushes to `develop` and `main`.

It installs the locked dependency set with `npm ci`, verifies that lint fixes would not change committed files, runs all unit and E2E tests, then builds the NestJS application.

After this workflow is merged, an organization administrator must enable the merge gate in GitHub:

1. Open `Settings` > `Branches` (or `Rules`) for `develop` and `main`.
2. Require a pull request before merging.
3. Require status checks to pass before merging.
4. Select `Backend Quality Gate / Lint, test, and build`.

Without the branch rule, GitHub displays CI results but still permits a manual merge after a failed run.
