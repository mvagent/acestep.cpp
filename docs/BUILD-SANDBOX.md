# Sandbox build notes

## Purpose

This document records containerized build findings for maintained-repo work. It is a durable place for sandbox-specific setup facts that are too detailed for `AGENTS.md` and too environment-specific for the main README.

## Current sandbox target

The current supported container target is CPU-only build validation with the provided script:

```bash
./buildcpu.sh
```

This is mainly for agent-side build checks inside the sandbox. Host macOS / Apple Silicon and future hosted CUDA builds are separate targets.

## Tool management

Prefer `mise` for build tools when practical. The repo-local `mise.toml` pins CMake.

Before relying on mise-managed tools in a fresh working copy or worktree, run:

```bash
mise trust
```

## System package fallbacks

CPU builds with `./buildcpu.sh` enable BLAS through GGML and require a BLAS development package in the container.

Known Debian/Ubuntu fallback:

```text
libopenblas-dev
```

Observed failure when absent:

```text
Could NOT find BLAS (missing: BLAS_LIBRARIES)
BLAS not found
```

`pkg-config` was already present in the sandbox when checked.

## Submodules

Builds require the patched `ggml` submodule contents. In a fresh worktree, run as needed:

```bash
git submodule update --init
```

If `ggml/` exists but lacks `CMakeLists.txt`, the submodule is not initialized.

## CPU validation result

The CPU build was validated in the sandbox after:

- installing `libopenblas-dev`
- initializing submodules
- trusting the repo-local mise config

The validated command was:

```bash
./buildcpu.sh
```

The build produced the expected binaries and GGML BLAS library, including:

- `ace-lm`
- `ace-synth`
- `ace-server`
- `ace-understand`
- `neural-codec`
- `mp3-codec`
- `quantize`
- `libggml-blas.so`

## CUDA feasibility result

CUDA build validation is deferred for this sandbox.

A CUDA feasibility subagent found that CUDA compile/link is not feasible in the current container because these prerequisites are absent:

- `nvcc`
- CUDA toolkit paths such as `/usr/local/cuda`
- CUDA toolkit headers and CMake metadata
- CUDA runtime and BLAS development libraries such as `cudart` and `cublas`
- CUDA driver library stub or development link target for `CUDA::cuda_driver`, unless configuring with `-DGGML_CUDA_NO_VMM=ON`
- a CUDA-compatible host compiler such as `g++-13`

The current default host compiler is GCC/G++ 14.2.0. The `g++-13` fallback mentioned by upstream docs was not present when checked.

The CUDA build script hardcodes:

```bash
-DGGML_CUDA=ON
-DCMAKE_CUDA_COMPILER=/usr/local/cuda/bin/nvcc
```

The feasibility subagent did not run `./buildcuda.sh` because it mutates `./build` and the required CUDA tooling was absent.

## Future CUDA retry notes

If CUDA sandbox builds become useful later, provision a CUDA toolkit/development package for the container architecture rather than a runtime-only package. Exact package names depend on the Docker base image and NVIDIA apt repository configuration.

Likely system additions include:

- vendor CUDA toolkit package, such as `cuda-toolkit-12-x` or equivalent for the base image and architecture
- `gcc-13`
- `g++-13`

Optional:

- `libnccl-dev` for NCCL multi-GPU support

A safe configure-only probe after prerequisites exist is:

```bash
cmake -S . -B /tmp/acestep-cuda-probe \
  -DGGML_CUDA=ON \
  -DCMAKE_CUDA_COMPILER=/usr/local/cuda/bin/nvcc \
  -DCMAKE_CUDA_HOST_COMPILER=/usr/bin/g++-13
```

Runtime GPU/model validation remains separate from compile/link validation and requires NVIDIA runtime access, GPU devices, and model files.
