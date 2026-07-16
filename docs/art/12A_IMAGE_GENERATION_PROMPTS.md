# Phase 12A-0A — Image generation prompts

Statut : prompts de production préparés, aucune image générée.

Langue d’exécution : anglais.

Principe : chaque prompt est autonome et ne dépend d’aucune image précédente.

## 1. Home Background

### Primary Prompt

> Create a premium portrait mobile game home background, 828 by 1472 pixels, opaque sRGB, for an arcade blockchain neon adventure. Show a deep nocturnal digital environment with a compact glowing horizon near 16 percent of the image height, layered abstract architecture on the far left and far right, subtle data conduits and chain-like structural rhythms, and strong depth through large clean planes. Keep the central 46 percent of the width calm, dark, low-frequency and free of focal objects so translucent interface cards remain readable while the screen scrolls vertically. Use black aubergine and midnight violet for at least 70 percent of the image, neon violet as the main identity light, cyan as a secondary signal, and only rare gold and orange accents. The top must remain quiet behind a logo and connection control, the lower area must support scrolling content, and the sides may be richer without entering the central safe zone. Crisp stylized geometry, refined dark glass and anodized metal feeling, controlled volumetric glow, no embedded interface.

### Variant A — Calm

> Create a calm premium portrait mobile game home background, 828 by 1472 pixels, opaque sRGB. Use a deep black-aubergine digital night, a small violet-gold horizon near 16 percent height, very restrained side architecture, broad dark planes and minimal particles. Preserve an uninterrupted calm central 46 percent width from the top safe area through the lower scroll region. Violet and lavender provide gentle identity, cyan appears only as a few distant signals, and gold-orange accents are extremely rare. The result must remain interesting behind translucent cards without competing with text or buttons, with no explicit playable road and no dominant portal.

### Variant B — Spectacular

> Create a more spectacular but still interface-safe portrait mobile game home background, 828 by 1472 pixels, opaque sRGB. Build a deep digital night with layered violet crystal architecture and partial warm arches confined to the outer 27 percent on each side, a luminous horizon near 16 percent height, subtle upward energy and controlled cyan-gold highlights. Preserve the entire central 46 percent as a dark readable corridor and keep the header area quiet. Increase depth, scale and lateral richness rather than central brightness. The scene must feel premium and energetic, never noisy, never like an active race track, and never place a large focal object behind interface cards.

### Negative Prompt

> text, typography, letters, numbers, logos, currency symbols, official emblems, coins, tokens, circular collectibles, trading interface, price chart, candlesticks, ticker, casino imagery, slot machine lighting, human, face, character, mascot, photorealism, childish cartoon, dirty futuristic clutter, graffiti, dense stars, micro-detail noise, high-frequency texture, central portal, central vehicle, explicit three-lane road, obstacle, giant object behind buttons, white burned-out center, uniform bright background, heavy fog covering the center, asymmetrical crop of essential elements, watermark, signature

### Required Output

- one opaque sRGB image exactly 828×1472 px;
- no alpha requirement;
- no embedded text or UI;
- composition valid after reduction to 414×736 and crop review at 375×667.

### Composition Reminder

- horizon y=221–265 px;
- central safe zone x=223–605 px;
- no essential detail in the top 88 px or bottom 68 px;
- architecture remains in the outer 27 % on each side;
- at least 70 % dark values.

### Do Not Include

Playable track, portal, token, logo, price information, human figure, bright center, fine noisy texture.

### Review Notes

Primary selection should combine the balanced depth of `home-main`, the value discipline of `home-calm`, and limited lateral richness inspired by crystal or arc variants. Reject a result that is attractive without UI but fails behind translucent cards.

## 2. Daily Market Tunnel

### Primary Prompt

> Create a premium portrait mobile game background, 828 by 1472 pixels, opaque sRGB, showing a monumental abstract data tunnel for a fast three-lane arcade run. Place the vanishing horizon near 16 percent of the image height. Build strong depth with distant concentric infrastructure, large dark side structures, abstract blockchain blocks moving only along the periphery, and small network nodes far from the playable corridor. Keep the central track-shaped region darker and more stable than the sides, with no object placed on any lane and no strong line that could be mistaken for a lane boundary. Protect the lower player area from major light sources. Use black aubergine and midnight violet as the base, analytical cyan and electric blue for technology, rare gold and amber for reward signals, and subtle orange for speed. Represent market activity only as abstract luminous weather and distant data flow, never as readable financial information. Crisp stylized geometry, large shapes, controlled volumetric depth, mobile readability first.

### Variant A — Cyan

> Create a cool analytical portrait data tunnel background for a three-lane mobile arcade game, 828 by 1472 pixels, opaque sRGB. Use a deep violet-black environment, cyan and electric-blue side infrastructure, distant concentric rings and sparse node signals around a horizon near 16 percent height. The playable central trapezoid and the entire lower player zone must remain dark, low-detail and free of circular objects, diamonds and strong converging lines. Keep cyan concentrated on side panels and distant infrastructure, with only tiny gold reward accents. The image must feel fast and technological without becoming uniformly bright or resembling a financial dashboard.

### Variant B — Amber

> Create a warm reward-accented portrait data tunnel background for a three-lane mobile arcade game, 828 by 1472 pixels, opaque sRGB. Build a deep black-aubergine and violet tunnel with large dark side structures, a compact horizon near 16 percent height, restrained amber-gold nodes and orange energy channels only at the periphery. Preserve a dark stable central trapezoid and a quiet lower player area. Add depth through layered architecture and distant blocks in transit, not through bright lane-like rails. Keep cyan as a small technical counterpoint. The result must remain premium, readable and clearly different from a calm home screen.

### Negative Prompt

> text, numbers, ticker, stock chart, price chart, candlesticks, exchange interface, trading terminal, financial dashboard, logo, currency symbol, crypto symbol, coin, circular token, round collectible, central sphere, central diamond, obstacle, shield pickup, life orb, human, face, character, vehicle, readable lane markings, extra road, false lane boundary, bright object on a lane, burned white center, giant portal, uniform cyan wash, uniform orange wash, casino, slot machine, photorealism, childish cartoon, dirty futuristic clutter, dense particles, micro-detail noise, watermark, signature

### Required Output

- one opaque sRGB image exactly 828×1472 px;
- no alpha;
- no financial data or embedded interface;
- playable corridor preserved at 414×736 and 375×667.

### Composition Reminder

- horizon y=220–270 px;
- protected trapezoid `(230,236) (598,236) (780,1280) (48,1280)`;
- no major light in y=1080–1280;
- side activity only outside the protected corridor;
- background lines must not duplicate Phaser lane lines.

### Do Not Include

Circular tokens, coins, diamonds, obstacles, central portal, chart, ticker, price, exchange UI, bright player zone.

### Review Notes

The main result should preserve the depth of `daily-market-tunnel-main`, the clean cyan separation of `daily-market-tunnel-cyan`, and rare warm accents from `daily-market-tunnel-amber`. Test with the procedural track and particles, not in isolation only.

## 3. Chain Block

### Primary Prompt

> Create a single isolated game collectible on a transparent background, 512 by 512 pixels, sRGB PNG, centered orthographic or slightly isometric view. Design a compact angular blockchain-inspired polyhedral block with a strong non-circular silhouette, a thick violet outer body, a refined gold reward rim, a simple warm luminous core, and two or three abstract connection elements integrated into the facets. Use only three visual detail levels: bold silhouette, readable core, and a few large facet or connection shapes. Keep the object recognizable at 32 pixels, with no line that would become thinner than about 2 pixels at the target size. Leave 12 to 16 percent clean transparent margin on every side, keep the pivot at the exact center, use a moderate contained halo, and provide clean straight alpha. No floor, no environment, no text, no logo, no currency symbol, no coin shape.

### Variant A — Prism

> Create a single isolated transparent-background mobile game collectible, 512 by 512 pixels, sRGB PNG, centered and slightly isometric. Use a compact six-sided violet polyhedron with a gold outer rim, a small warm luminous core, and three broad internal prism facets using restrained lavender and cyan reflections. Preserve an unmistakably angular block silhouette at 32 pixels and keep all secondary details large and sacrificial. Include two abstract chain-like connection points without creating a circular outline. Maintain 14 percent transparent margin, clean straight alpha, no floor, no environment, no text, no logo, no currency symbol and no coin shape.

### Variant B — Core

> Create a single isolated transparent-background mobile game collectible, 512 by 512 pixels, sRGB PNG, centered orthographic view. Design a compact angular violet block with a thick gold contour and a bright but contained warm core visible through a few large dark-glass facets. Add two or three simple abstract connections that imply linked data blocks. The core must remain readable at 32 pixels, while the silhouette stays more important than the glow. Use restrained orange and optional tiny cyan reflections, clean straight alpha and 12 to 16 percent transparent margin. No floor, no environment, no text, no logo, no currency symbol, no coin shape.

### Negative Prompt

> background, floor, platform, pedestal, environment, rectangular canvas shadow, opaque backdrop, coin, circular token, medallion, currency symbol, letter, number, logo, official emblem, Greek letter, shield icon, lightning symbol, plus sign, heart, face, character, eye, sharp danger diamond, aggressive spikes, coral-red dominant palette, green dominant palette, large circular aura, orbit rings, excessive bloom, glow clipped by image edge, tiny engraving, thin wires, more than three detail levels, photorealism, childish cartoon, dirty texture, watermark, signature

### Required Output

- one transparent sRGB PNG exactly 512×512 px;
- straight alpha, no floor or environment;
- 12–16 % alpha margin;
- centered pivot `(0.5,0.5)`;
- silhouette valid at 128, 64 and 32 px.

### Composition Reminder

- object bounds ideally x/y=72–440 px;
- core within x/y=174–338 px;
- compact angular polyhedron, not a disk;
- only three levels of detail;
- contained halo.

### Do Not Include

Coin, circle, danger diamond, shield, life symbol, player glyph, text, logo, floor, environment, clipped glow.

### Review Notes

The preferred result combines `chain-block-base-md` identity, `chain-block-base-sm` simplification, limited prism facets and a restrained luminous core. Evaluate silhouette in grayscale before color approval.

## 4. Finish Portal

### Primary Prompt

> Create a single isolated vertical finish portal for a portrait mobile arcade game, 512 by 768 pixels, transparent sRGB PNG with clean straight alpha. Design a dark elegant open arch with a large clearly traversable transparent center, refined gold and neon-violet structural rims, upward-moving light energy, a restrained violet halo behind the structure and a few small cyan accents. Keep the structure inside the central 64 percent of the canvas width, preserve at least 34 percent clear opening width and at least 56 percent clear opening height, and leave enough transparent margin so no glow is clipped. The logical pivot is at 50 percent width and 88 percent height. Make the lower base light and open so it cannot hide a player orb. The portal must read clearly at 256 by 384 pixels and remain complete without animation. No floor, no environment, no text.

### Variant A — Technological

> Create a single isolated transparent-background finish portal, 512 by 768 pixels, sRGB PNG, for a premium mobile arcade game. Use a tall open dark-metal arch made of a few large modular segments, gold-violet energy channels, restrained cyan verification nodes and subtle upward streaks. Keep a wide empty center for traversal, a soft separate-looking halo behind the ring, and a lightweight base around the pivot at 50 percent width and 88 percent height. Favor clean technology and large readable shapes over circuitry or tiny details. No floor, no scene, no text, no logo, and no closed door.

### Variant B — Monumental

> Create a monumental but mobile-readable isolated finish portal, 512 by 768 pixels, transparent sRGB PNG. Build a tall open arch with broad dark structural shoulders, luminous gold inner edges, violet outer energy and a compact bright crown that suggests upward success. Preserve a large transparent central opening and keep the base narrow enough for a player orb to pass visibly. Add a controlled violet halo and only a few cyan-white sparks, all contained inside generous transparent margins. The portal must remain elegant and readable at 256 by 384 pixels, with the logical pivot at 50 percent width and 88 percent height. No environment and no text.

### Negative Prompt

> FINISH text, any text, letters, numbers, logo, official emblem, flag, checkered flag, closed door, solid gate, opaque center, wall, road, full environment, floor plane, pedestal, massive base, object covering the player, coin, token, currency symbol, face, human, character, vehicle, obstacle diamond, aggressive spikes, red danger portal, white burned-out opening, excessive particles, dense circuitry, thin unreadable lines, glow clipped by canvas edge, rectangular shadow, black background baked into alpha, watermark, signature

### Required Output

- one transparent sRGB PNG exactly 512×768 px;
- straight alpha and no baked background;
- opening at least 164×430 px in the master;
- pivot `(0.50,0.88)` = `(256,676)`;
- readable derivative at 256×384.

### Composition Reminder

- structure x=92–420 px;
- opening x=174–338 px, y=154–584 px;
- glow contained inside x=40–472, y=24–704;
- lightweight open base;
- maximum 2–4 secondary sparks.

### Do Not Include

Text, flag, closed door, floor, road, opaque center, massive base, official logo, obstacle silhouette, clipped glow.

### Review Notes

The preferred result uses `portal-finish` for architecture, `portal-success` for upward light and `fx-portal-halo` as a separable glow reference. Runtime text remains procedural and must never be painted into the image.
