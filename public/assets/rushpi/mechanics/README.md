# Rush Pi mechanic asset workspace

This tree reserves original, protocol-neutral asset families for future implementation. It contains only lightweight SVG templates and tracked placeholders; no official Pi Network or third-party blockchain logo is present.

## Naming

Use lowercase kebab case:

`family-object-state[-variant].svg`

Examples: `quorum-node-vote.svg`, `gas-gauge-warning.svg`, `interoperability-message-rejected.svg`.

Keep state names consistent with `public/data/blockchain/visual-mechanics.json`. SVG groups use semantic IDs for animation targets. Runtime code owns localized text, numbers, mathematical glyphs, and state labels; none are baked into templates.

## Asset rules

- Preserve a generic geometric silhouette.
- Do not trace or approximate protocol logos, palettes, mascots, or brand lockups.
- Provide transparent backgrounds.
- Keep essential state redundant with shape, border, pattern, icon, and runtime text.
- Do not require animation to understand the result.
- Use `currentColor` where practical so accessible runtime themes can override color.
- Optimize final assets, but retain readable group IDs.

The player shell intentionally has a transparent central slot. The optional runtime Greek mathematical glyph is not part of the file.
