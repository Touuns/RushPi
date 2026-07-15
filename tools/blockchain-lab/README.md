# Rush Pi Blockchain Design Lab

This dependency-free local lab turns the blockchain design datasets into a reviewable interface. It is a design and learning prototype, not a wallet, node, financial product, or production game client.

## Run

From the repository root:

```powershell
node tools/blockchain-lab/server.mjs
```

Open `http://127.0.0.1:4177`. Set `PORT` or pass a port as the first argument when 4177 is unavailable.

## Review path

1. Compare the five game modes in **Mode Map**.
2. Search and filter all 40 mechanics in **Primitive Explorer**.
3. Walk through all five stages of a **Pi Lab** module.
4. Compare first-view, repeat-view, and reduced-motion **Survival Briefings**.
5. Filter the varied **Campaign** chapter templates.
6. Play both **Chain Maze** levels using arrows, WASD, swipe, or the on-screen controls. Test reset, debug coordinates, a winning path, and an invalid or out-of-resource path.
7. Inspect the local evidence IDs and review dates in **Sources & Accuracy**.

The intended four-command route for each included maze is `Up → Right → Up → Right`. The route `Up → Right → Right` demonstrates a spent-output failure in Bitcoin and a contract revert in Ethereum; repeatedly taking costly Ethereum routes can also demonstrate gas exhaustion.

## Validation

```powershell
node tools/blockchain/validate-blockchain-data.mjs
node --check tools/blockchain-lab/lab.js
node --check tools/blockchain-lab/server.mjs
```

The validator checks counts, identifiers, references, accuracy statuses, source provenance, Campaign variety, maze reachability, visual-state completeness, and the committed SVG constraints. It complements human review of educational wording and interaction quality.

## Scope and safety

- All content and images are served locally from `public/`.
- External links appear only as explicit official-source links.
- The server accepts only `GET` and `HEAD`, disables caching, restricts exposed paths, and applies a strict Content Security Policy.
- No keys, wallet operations, payments, live prices, investment language, or official chain logos are used.
- Pi Network names and protocol references are descriptive only; consult the repository trademark policy before any public release.
