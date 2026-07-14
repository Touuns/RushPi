import { useState } from "react";
import type { MarketResponse } from "../market/types";
import { MARKET_DATA_ATTRIBUTION } from "../market/types";
import { fetchMarketCoins } from "../market/marketClient";

/**
 * Compact market-data preview (Phase 11A) — a collapsed <details> in the
 * Profile used to verify the foundation. One fetch on first open (no polling,
 * no auto-refresh), max 6 tokens, lazy images with a clean placeholder.
 * Gameplay/Home/Phaser are untouched.
 */

type LoadState = "idle" | "loading" | "loaded" | "error";

function formatPrice(price: number): string {
  if (price >= 1) {
    return `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `$${price.toLocaleString("en-US", { maximumSignificantDigits: 4 })}`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString();
}

export default function MarketDataPreview() {
  const [state, setState] = useState<LoadState>("idle");
  const [data, setData] = useState<MarketResponse | null>(null);
  const [broken, setBroken] = useState<Record<string, boolean>>({});

  const load = async () => {
    setState("loading");
    try {
      const res = await fetchMarketCoins();
      setData(res);
      setState("loaded");
    } catch {
      setState("error");
    }
  };

  const handleToggle = (e: React.SyntheticEvent<HTMLDetailsElement>) => {
    if (e.currentTarget.open && state === "idle") void load();
  };

  const isFallback = data?.status === "fallback";

  return (
    <details className="market-preview" onToggle={handleToggle}>
      <summary>Market Data</summary>

      {state === "loading" && <p className="market-preview__hint">Loading…</p>}

      {state === "error" && (
        <div className="market-preview__error">
          <p className="market-preview__hint">Market data unavailable.</p>
          <button className="btn btn--secondary btn--small" type="button" onClick={load}>
            Retry
          </button>
        </div>
      )}

      {state === "loaded" && data && (
        <>
          <p className="market-preview__meta">
            <span className={`market-preview__status is-${data.status}`}>{data.status}</span>
            {" · "}
            {formatTime(data.fetchedAt)}
          </p>
          <div className="market-preview__list">
            {data.coins.slice(0, 6).map((c) => (
              <div key={c.id} className="market-row">
                {c.imageUrl && !broken[c.id] ? (
                  <img
                    className="market-row__logo"
                    src={c.imageUrl}
                    alt=""
                    loading="lazy"
                    width={22}
                    height={22}
                    onError={() => setBroken((b) => ({ ...b, [c.id]: true }))}
                  />
                ) : (
                  <span className="market-row__logo market-row__logo--placeholder">◌</span>
                )}
                <span className="market-row__symbol">{c.symbol}</span>
                <span className="market-row__price">
                  {isFallback && c.currentPriceUsd === 0
                    ? "Price unavailable"
                    : formatPrice(c.currentPriceUsd)}
                </span>
                {c.priceChange24h !== null && (
                  <span
                    className={`market-row__change ${c.priceChange24h >= 0 ? "is-up" : "is-down"}`}
                  >
                    {c.priceChange24h >= 0 ? "+" : ""}
                    {c.priceChange24h.toFixed(2)}%
                  </span>
                )}
              </div>
            ))}
          </div>
          <p className="market-preview__attribution">{MARKET_DATA_ATTRIBUTION}</p>
        </>
      )}
    </details>
  );
}
