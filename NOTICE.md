# NOTICE

## Ownership of included material

This repository is an **unofficial archive**. It is not affiliated with, endorsed by, or
sponsored by Anthropic.

### Animation artwork — © Anthropic

Everything under `assets/`, `frames/`, `evidence/`, and the animation data in
`original/cf2613ee5-ChHJeJxJ.js` and `original/cfdbc338b-DzLBZ8y5.webp` is animation
artwork produced by **Anthropic PBC**, extracted from a locally licensed copy of
Claude Desktop for interoperability and preservation purposes.

That artwork is **not** covered by the MIT license in [LICENSE](LICENSE).
Copyright in the artwork remains with Anthropic. Do not redistribute these directories
publicly without permission.

### Upstream code

`original/*.js` contains minified JavaScript as shipped inside Claude Desktop's
`ion-dist.asar`. It is included **as archival reference only**, so that the frame data
and sprite layout can be verified against the original rather than trusted on faith.
It is not ours to license.

### Original work in this repository

`tools/extract-asar.py`, `tools/rebuild.mjs`, `claude-spark.html` (the generated page's
own markup and styling), and the documentation are original work and are MIT licensed.

## Trademarks

"Claude" and "Claude Code" are trademarks of Anthropic PBC. Used here descriptively, to
identify the software the material came from.

## If you intend to make this repository public

Delete these four directories first:

```
original/   assets/   frames/   evidence/
```

What remains — `tools/`, `README.md`, `LICENSE`, `NOTICE.md` — contains no Anthropic
artwork. `tools/rebuild.mjs` regenerates every frame from the user's own installation,
so nothing of value is lost. This keeps the method public and the artwork out of it.
