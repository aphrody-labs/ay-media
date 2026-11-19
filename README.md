# ay-media

Fork mirror of the media upstreams (FFmpeg, `yt-dlp`, `hyperframe`, `hls.js`, `dav1d`, `rav1e`, `SVT-AV1`) under `aphrody-labs`. The `ay-media-*` crates, docs and config live in [`aphrody-labs/ay`](https://github.com/aphrody-labs/ay) (`crates/ay-media-core`, `crates/ay-media-hls`, `docs/imported/ay-media`).

## Install

```sh
git clone --recursive https://github.com/aphrody-labs/ay-media.git
cd ay-media
just check
```

## Documentation

- [Forks Manifest](forks.toml)

## Development

The forks, submodules and sync tools are owned by `aphrody-labs/ay-vercel`: set `AY_VERCEL` to a checkout of it (CI checks it out).

- `just check` runs the privacy gate, `forks.toml` parity and submodule pin checks.

## License

Apache-2.0 - see [LICENSE](LICENSE).
