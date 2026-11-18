# ay-media

Unified Rust, C, and low-level NASM x86_64 media monorepo for `aphrody-labs`, consolidating FFmpeg, `yt-dlp`, `hyperframe`, `hls.js`, `dav1d`, `rav1e`, and `SVT-AV1` forks under `aphrody-labs`.

## Why

Legacy Node.js and Python media pipelines incur interpreter overhead and fragmented native bindings. `ay-media` unifies upstream media codecs and streaming specs into a single `Cargo` workspace with pure-Rust safe parsers (`#![forbid(unsafe_code)]` in `ay-media-hls`) and low-level C + NASM x86_64 kernels (`ay-media-core`).

## Install

```sh
git clone --recursive https://github.com/aphrody-labs/ay-media.git
cd ay-media
just check
```

## Usage

```sh
cargo test --workspace
```

## Documentation

- [Documentation Index](docs/index.md)
- [Forks Manifest](forks.toml)

## Development

- Rust toolchain pinned in `rust-toolchain.toml` (`1.100.0`).
- NASM (`nasm`) + C compiler (`cc`) required for `x86_64` assembly kernels in `crates/ay-media-core`.
- Run `just check` before pushing.

## License

Apache-2.0 — see [LICENSE](LICENSE).
