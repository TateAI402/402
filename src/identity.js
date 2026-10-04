// Tate402's identity. Null until the owner gives it: never invent a contract, a holder bar, socials or a domain.
// Ticker confirmed by the owner on 2026-10-03.
export const IDENTITY = Object.freeze({ name: 'Tate402', ticker: '$TATE402', contract: null, repo: 'https://github.com/TateAI402/402', site: 'https://tate402.xyz', x: null, telegram: null });
// The private side answers 402 to wallets holding less than this much of the token, in US dollars. Null until set.
export const HOLDER_MIN_USD = null;
// The gate only closes when both exist; until then the tools are open to any signed-in wallet, with limits.
export const GATED = Boolean(IDENTITY.contract && HOLDER_MIN_USD);
