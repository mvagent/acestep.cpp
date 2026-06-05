# acestep.cpp agent guidance

## Fork and branch management

Treat the acestep.cpp source, maintained, and sandbox forks as participating in the full fork and branch management strategy defined by the active branching skill.

Before branch, worktree, sync, PR, or cleanup work, apply that skill's repository-role, remote-role, branch-lineage, series, agent-branch, source-selection, ownership, and safety rules.

## Build setup guidance

Prefer managing build tools with `mise` when practical. Trust the working copy or worktree with `mise trust` before relying on mise-managed tools.

Use provided build scripts where possible. For CPU validation in the sandbox, use `./buildcpu.sh` after prerequisites are present.

Builds require the patched `ggml` submodule. In a fresh worktree, run:

```bash
git submodule update --init
```

For sandbox-specific prerequisites, known system-package fallbacks, CPU validation status, and deferred CUDA findings, read `docs/BUILD-SANDBOX.md`.

## Embedded web UI commit guidance

When changing `tools/webui/src/**`, keep source changes and the generated `tools/public/index.html.gz` artifact in separate commits.

Use this sequence:

1. Prepare and validate the source changes.
2. With current or prior user authorization to commit, commit the reviewed source changes.
3. Run `cd tools/webui && npm run build` from that source commit.
4. Verify the rebuilt `tools/public/index.html.gz` includes the expected UI change and embeds the source commit version.
5. With current or prior user authorization to commit, commit `tools/public/index.html.gz` separately.

The web UI build embeds the current git version into the generated artifact, so the artifact commit should be built from the already-committed source state. Do not include `tools/public/index.html.gz` in the same commit as the source changes that produced it.
