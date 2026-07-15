# Pi trademark and identity policy

Status: mandatory pre-release policy

Primary source: `pi-trademark-guidelines`

Last reviewed: 2026-07-15

## Repository rule

This repository does not bundle, redraw, trace, transform, or approximate the official Pi Network logo. It also does not bundle third-party blockchain logos. Protocol names in research text identify study subjects only.

The official Pi logo must remain intact. Its shape, proportions, colors, spacing, and elements must not be modified, combined with the Rush Pi orb, recolored, cropped, animated destructively, or used to make a substitute mark. Public use may require authorization or a trademark license.

The name “Rush Pi” requires a documented license and trademark review before public branding is approved. Until that review is complete, no screen, asset, or description may imply that Rush Pi is produced, endorsed, sponsored, certified, or operated by Pi Network.

Official Pi brand colors must not be copied into a look-alike system that creates confusion. Rush Pi development assets use an original, generic visual language and must remain distinguishable from Pi's official identity.

Third-party protocol identities require separate review under each owner's terms. Permission concerning Pi does not grant permission for Bitcoin, Ethereum, Stellar, or any other third-party logo.

## Prototype identity mode

The safe prototype mode uses:

- an original Rush Pi orb shell;
- a transparent central runtime slot;
- an optional plain Greek `π` text glyph rendered at runtime as mathematical notation;
- no official Pi logo file;
- no imitation of Pi Network's mark, proportions, palette, or lockup;
- a visible “independent educational prototype” statement where confusion is plausible.

The Greek glyph is not described as the Pi Network logo. It remains separate from the shell asset so the repository contains no combined or altered mark.

## Future authorized identity mode

An authorized future mode may be designed only as an inactive integration slot. Activation requires explicit written approval and review of the exact asset, territory, channel, duration, and product name.

If approved, the implementation must:

- load the exact official licensed asset from an independent location;
- preserve its proportions, form, colors, and clear space;
- keep it visually independent from the Rush Pi orb rather than fusing paths or effects;
- prevent shields, magnets, charge effects, particles, masks, or crops from modifying the mark;
- include attribution or legal copy required by the license;
- support immediate deactivation without changing gameplay;
- record the approval owner and expiry date outside player content data.

No placeholder should look like the expected official mark. The inactive slot is a neutral rectangle or transparent region labeled only in development documentation.

## Player-orb shell requirements

`public/assets/rushpi/mechanics/player/player-orb-shell.svg` is an original generic shell. It must contain only:

- an outer orb and non-branded effects;
- a transparent central area;
- separate animation-ready groups for base shell, Shield, Magnet, and Charge;
- no symbol, text, word, logo, protocol color lockup, or protocol-specific silhouette.

Gameplay code may place a generic runtime glyph or player-selected neutral symbol in the transparent slot. That content is not baked into the SVG and cannot be used to reconstruct an official logo.

## Release gate

Before any public release, a human reviewer must answer and record:

1. Is the product name licensed or otherwise cleared for the intended use?
2. Does any visual resemble an official Pi or third-party mark?
3. Are official colors, spacing, and identity rules respected where licensed material appears?
4. Is affiliation described accurately and non-confusingly?
5. Can every official asset be removed without affecting mechanics?
6. Are notices, attributions, regions, and expiry terms implemented?

Automated validation can detect committed logos, suspicious filenames, and prohibited wording. It cannot grant a license or replace legal review.
