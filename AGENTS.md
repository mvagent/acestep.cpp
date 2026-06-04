# acestep.cpp agent guidance

## Agent notes for acestep.cpp build setup

### Scope

This worktree is for getting the sandbox build process working and capturing the resulting durable setup guidance.

### Dependency-management aim

Prefer managing build tools with `mise` when practical. Fall back to system packages only for dependencies that are not reasonably available through `mise`, and document each fallback when it becomes part of the build path.

Current `mise` state:

- `mise.toml` pins CMake.
- Trust a working copy or worktree with `mise trust` before using its mise-managed tools.
- After trust, normal repo commands can use the pinned tools without `mise exec -- ...`.

### Known system fallback

CPU builds with the provided script require BLAS:

- Debian/Ubuntu package: `libopenblas-dev`
- Failure mode when absent: CMake reports `Could NOT find BLAS (missing: BLAS_LIBRARIES)` from `ggml/src/ggml-blas/CMakeLists.txt`.

`pkg-config` was already present in the sandbox when checked.

### Submodules

Builds require the `ggml` submodule contents. In a fresh worktree, run as needed:

```bash
git submodule update --init
```

If `ggml/` exists but lacks `CMakeLists.txt`, the submodule is not initialized.

### CPU build validation

Use the provided script where possible after `mise trust`:

```bash
./buildcpu.sh
```

The CPU build has been validated in this worktree after installing `libopenblas-dev` and initializing submodules.
