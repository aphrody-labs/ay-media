set windows-shell := ["pwsh", "-NoLogo", "-NoProfile", "-Command"]

# Checkout of aphrody-labs/ay-vercel: it owns the forks, submodules and sync tools (export AY_VERCEL)
ay_vercel := env_var("AY_VERCEL")

# Run all local verification gates
check: private-gate forks-check submodules-check

# Verify forks.toml schema and upstream/fork parity
forks-check:
    bun {{ ay_vercel }}/tools/forks.ts --check

# Ensure every upstream in forks.toml has a fork in aphrody-labs
forks-ensure:
    bun {{ ay_vercel }}/tools/forks.ts --ensure

# Sync forks with upstreams and update submodules
sync:
    bun {{ ay_vercel }}/tools/sync.ts --apply

# Verify all gitmodules are pinned and clean
submodules-check:
    bun {{ ay_vercel }}/tools/submodules.ts --check

# Scan tracked files for private IPs, IDs, or secrets
private-gate:
    bun tools/private-gate.ts
