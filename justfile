set windows-shell := ["pwsh", "-NoLogo", "-NoProfile", "-Command"]

export CARGO_TARGET_X86_64_PC_WINDOWS_MSVC_RUSTFLAGS := "-C target-cpu=native"

# Run all local verification gates
check: private-gate forks-check submodules-check rust-check

# Verify forks.toml schema and upstream/fork parity
forks-check:
    bun tools/forks.ts --check

# Ensure every upstream in forks.toml has a fork in aphrody-labs
forks-ensure:
    bun tools/forks.ts --ensure

# Sync forks with upstreams and update submodules
sync:
    bun tools/sync.ts --apply

# Verify all gitmodules are pinned and clean
submodules-check:
    bun tools/submodules.ts --check

# Format, lint, and test Rust + C + NASM workspace
rust-check:
    cargo fmt --all -- --check
    cargo clippy --workspace --all-targets -- -D warnings
    cargo test --workspace

# Scan tracked files for private IPs, IDs, or secrets
private-gate:
    bun tools/private-gate.ts
