<p align="center"><img src="public/brand/tate-512.png" width="120" alt="Tate402"></p>

<h1 align="center">Tate402</h1>

<p align="center">A private side for your wallet on Robinhood Chain. Everything private answers 402 until you hold.</p>

<p align="center"><a href="https://tate402.vercel.app">tate402.vercel.app</a></p>

<p align="center"><a href="https://github.com/TateAI402/402/actions/workflows/ci.yml"><img src="https://github.com/TateAI402/402/actions/workflows/ci.yml/badge.svg" alt="Checks"></a></p>

---

Tate402 is a web app for Robinhood Chain. A public wallet shows every transfer, amount and counterparty to anyone who pastes its address. Tate402 adds a private side next to it: private pools for ETH and USDG, a file vault that seals files in the browser, a terminal for the public side, and an agent that reads but never signs.

The name is the HTTP status code 402 Payment Required, reserved in 1997 and never finished. Tate402 uses it as its door. Once `$TATE402` and its holder bar exist, the private tools answer `402` to wallets below the bar and open above it. Until then they are open to every wallet, with limits.

**$TATE402 contract:** not published yet. The address will appear on the home page, the docs and this README at the same moment. Anything trading as Tate402 before that is not this project.

## Pages

| Route | What it does |
| --- | --- |
| `/` | One pinned flight through a field of grain drawn from the logo: the field holds the logo, 402, the public ledger, the deposit gate, the note, the withdrawal stream, the lock and the chart, with live pool numbers on the way |
| `/privacy` | The privacy workspace: deposit ETH or USDG into the pool, see the private balance, withdraw to any address |
| `/vault` | Seal a file in the browser with a passphrase and get a `.tate402` file back, or open one |
| `/terminal`, `/terminal/:address` | Robinhood Chain memes, tokenized stocks and majors with live prices and charts, and a buy with ETH from your own wallet |
| `/agent` | Chat over read-only tools: the board, a coin report, a buy quote, your own holdings, the pools and a withdrawal check |
| `/docs` | The 402 gate, each tool, the contracts it calls, sources, limits and a dated changelog |

The header reads the connected wallet's ETH and every board coin it holds, with dollar values, from one Multicall, refreshed every 30 seconds.

## The private pools

Deposits and withdrawals go through the Privacy Cash EVM SDK 1.3.3 pools for ETH and USDG. Your wallet shows the chain, the pool contract and the amount before you sign. Inside the pool a deposit becomes a note that only your private account can spend; that account is derived from one fixed message signed once, and the same wallet and signing method give the same account back.

A withdrawal proof is built by a worker in your browser from the pinned circuit files (copied from the installed SDK at build time and checked by hash in the tests). An external relay submits it, so the receiving address never has to touch the depositing wallet. Fees come out of the amount, and the review screen lists every one before anything is sent. Tate402 never holds the funds.

The pool integration has not been audited and a funded deposit has not been tested end to end. Start small.

## The vault

AES-GCM with a key derived from your passphrase through PBKDF2-SHA-256 at 600,000 iterations, a unique salt and nonce per file, in the browser tab. The file and its original name never leave the page. Lose the passphrase and nobody can open the file, including Tate402. Source: [`src/vault-crypto.js`](src/vault-crypto.js).

## How a buy works

The server finds the route (Uniswap V3, Uniswap V4 or the Pons curve) and builds the call. The browser re-encodes it and compares it byte for byte, the exact call is dry run from the connected account, and only then does the wallet open. No fee is added. Wallets are found through EIP-6963 and switched to Robinhood Chain on connect.

## The 402 gate

`GATED` is on only when both the contract and the holder bar are set in [`src/identity.js`](src/identity.js). Then the server reads the wallet's `$TATE402` balance and price and answers HTTP `402 Payment Required` to the private tools below the bar. A price it cannot read is reported as unknown, never as a pass or a zero.

## Contracts read or called

All on Robinhood Chain. Tate402 deploys no contract of its own.

| Contract | Address |
| --- | --- |
| Privacy pool, ETH | `0xEC5266c9e44631e1ba22FD6377C38130c1F3B738` |
| Privacy pool, USDG | `0xBB0C7F576B7bdAa8f2a119cb295076aCD0C9013f` |
| Pons V2 factory | `0x7ed598bcef8bd9edd8c97a195c6d13f40801ec7e` |
| Uniswap V3 factory | `0x1f7d7550b1b028f7571e69a784071f0205fd2efa` |
| Uniswap V3 QuoterV2 | `0x33e885ed0ec9bf04ecfb19341582aadcb4c8a9e7` |
| Uniswap SwapRouter02 | `0xcaf681a66d020601342297493863e78c959e5cb2` |
| Uniswap V4 PoolManager | `0x8366a39cc670b4001a1121b8f6a443a643e40951` |
| Uniswap V4 Quoter | `0x8dc178efb8111bb0973dd9d722ebeff267c98f94` |
| Uniswap Universal Router | `0x8876789976decbfcbbbe364623c63652db8c0904` |
| WETH | `0x0bd7d308f8e1639fab988df18a8011f41eacad73` |
| USDG | `0x5fc5360d0400a0fd4f2af552add042d716f1d168` |
| Multicall3 | `0xca11bde05977b3631167028862be2a173976ca11` |

Sources: [`src/terminal-addresses.js`](src/terminal-addresses.js), [`src/privacy-config.ts`](src/privacy-config.ts).

## Run it locally

Node 22.14 or newer and pnpm 10.

```bash
pnpm install
pnpm dev        # http://localhost:5606, API routes served by the same dev server
pnpm test       # node:test suites in tests/
pnpm build      # static site in dist/
pnpm check      # browser audit at desktop and phone sizes; BASE_URL=<site> to audit a deployment
```

Server environment variables. All are server only; none is read by the browser bundle.

| Variable | Used for |
| --- | --- |
| `ROBINHOOD_RPC_URL` | A dedicated Robinhood Chain RPC; public endpoints are used when it is unset |
| `AGENT_API_URL`, `AGENT_API_KEY`, `AGENT_MODEL` | Any OpenAI compatible chat endpoint with tool calls; the key also signs agent sessions, and the agent page says it is not switched on while they are unset |
| `AGENT_REASONING` | Optional reasoning setting passed to the agent model |

## Layout

```
api/        Vercel functions: terminal, privacy pool config, agent
server/     board, quotes and routes, balances, holder check, agent loop and tools
src/        React app: header and wallet, home flight, field of grain, privacy workspace, vault, terminal, agent, docs
tests/      node:test suites (privacy, vault, terminal routes, agent, artifact integrity)
scripts/    Playwright audits used before each deploy
public/     brand files
```

## Boundaries

- Never holds funds, keys, passphrases or seed phrases. Every transaction is built in the open, dry run, and signed in your own wallet.
- The wallet address and every deposit and withdrawal are public on chain. RPC, indexer and relay providers can see network metadata.
- An unknown value shows as a dash, never as zero.
- The agent has read-only tools. It can quote a buy and hand over the link; it cannot send anything.

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for the software and names this project relies on. No open-source license has been selected yet.
