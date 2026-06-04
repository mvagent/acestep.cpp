# acestep.cpp agent guidance

## Build setup guidance

Prefer managing build tools with `mise` when practical. Trust the working copy or worktree with `mise trust` before relying on mise-managed tools.

Use provided build scripts where possible. For CPU validation in the sandbox, use `./buildcpu.sh` after prerequisites are present.

Builds require the patched `ggml` submodule. In a fresh worktree, run:

```bash
git submodule update --init
```

For sandbox-specific prerequisites, known system-package fallbacks, CPU validation status, and deferred CUDA findings, read `docs/BUILD-SANDBOX.md`.
