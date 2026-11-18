# ay-media Agent Guidelines

- Use `just check` (`private-gate`, `forks-check`, `submodules-check`, `rust-check`).
- Never use `.unwrap()` or `.expect()` in non-test Rust code.
- Keep `ay-media-hls` `#![forbid(unsafe_code)]`; document `// SAFETY:` on every `unsafe` FFI call in `ay-media-core`.
- Never commit private IPs, IDs, or machine paths.
