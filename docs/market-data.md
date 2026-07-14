# Rush Pi — Market Data Foundation (Phase 11A)

Base de données de marché sécurisée pour les futures phases (Daily Token Rush,
tokens avec logos, Campaign blockchain). **Aucun gameplay n'utilise encore ces
données.**

## Architecture

- **Whitelist serveur** : `api/_lib/tokenCatalog.ts` (36 IDs CoinGecko validés).
  Les endpoints n'acceptent AUCUN id fourni par le client (pas de proxy ouvert).
- **Client CoinGecko serveur** : `api/_lib/coingecko.ts` — une seule requête
  `/coins/markets` pour tout le catalogue, timeout 7s, gestion 401/429/5xx,
  normalisation + validation stricte (prix fini ≥ 0, image HTTPS, timestamps),
  entrées invalides ignorées. La clé n'apparaît jamais dans les logs/erreurs.
- **`GET /api/market/coins`** : données live avec cache CDN
  `s-maxage=300, stale-while-revalidate=900` + cache mémoire 5 min (lambda
  chaude). Statuts: `live | cached | stale | fallback`.
- **`GET /api/market/daily`** : snapshot **immuable** par jour UTC, persisté
  dans Supabase (`daily_market_snapshots`, contrainte unique
  `challenge_date+currency+version`). Créé au premier appel du jour ; les
  appels concurrents relisent la ligne gagnante. Fallback: dernier snapshot
  (stale) puis fallback local. Le Daily Run classé n'utilise PAS encore ce
  snapshot.
- **Client frontend** : `src/market/marketClient.ts` (endpoints Rush Pi
  uniquement, timeout 8s, validation, aucune clé).
- **Fallback local** : 6 tokens, prix inconnus (`currentPriceUsd: 0`,
  `status: "fallback"`) — l'UI affiche « Price unavailable », jamais `$0.00`.

## Configuration

1. Créer une clé **CoinGecko Demo** (dashboard développeur CoinGecko).
2. Local : la mettre dans `.env.local` → `COINGECKO_DEMO_API_KEY=...`
   (utilisé par `vercel dev`).
3. Vercel : Settings → Environment Variables → `COINGECKO_DEMO_API_KEY`
   (Production + Preview), puis **Redeploy**.
4. **Jamais** de préfixe `VITE_` (la clé ne doit pas atteindre le navigateur).
5. Appliquer la migration Supabase : exécuter
   `supabase/migration_11a.sql` dans le SQL Editor Supabase.

## Attribution

Plan Demo ⇒ attribution obligatoire : « Market data by CoinGecko »
(constante `MARKET_DATA_ATTRIBUTION`), affichée dans le Market Data Preview du
profil et à réutiliser sur les futurs écrans.
