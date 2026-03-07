# Branching

Short reference for branch strategy. Full workflow (including when to create branches and how CI runs) is in [WORKFLOW.md](WORKFLOW.md) Section 2.2 and Section 3.

- **main**: Default branch; protect it. All production-ready code lands here (directly or via develop).
- **develop** (optional): Integration branch for merging feature branches before they go to main.
- **Feature branches**: Use the pattern `feature/<slice-id>-<short-name>`, e.g. `feature/s1-auth-users`. Create from `main` (or `develop` if you use it). Work and commit only on this branch for the slice; open a PR when ready.

CI runs on push to `main` and on pull requests targeting `main` or `develop`. See [WORKFLOW.md](WORKFLOW.md) Section 3 for the CI checklist.
