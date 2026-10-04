import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import Field from './field/Field';
import CoinTape from './CoinTape';
import Key from './Key';
import { GATED, HOLDER_MIN_USD, IDENTITY } from './identity';
import ContractTag from './ContractTag';
import { activation, progressOf, stateAt } from './flight';
import { usePoolLive, fmt } from './pool-live';

// the chrome belongs to the first section only: full on the hero, gone by the next stop
const CHROME = [1, 0, 0, 0, 0, 0, 0, 0, 0];
const steps = [
  ['Connect', 'Reads your public ETH balance on Robinhood Chain. No signature and no transfer.'],
  ['Unlock', 'Sign one fixed message to derive your private account. The signature stays in this tab.'],
  ['Prove', 'A separate browser worker builds the proof from the pinned circuit files.'],
  ['Review', 'Amount, recipient and fees on one screen before your wallet or the relay is asked anything.'],
];
const GLYPHS = '░▒▓█·:/';
const scramble = (n, seed) => Array.from({ length: n }, (_, i) => GLYPHS[(i * 7 + seed * 13 + ((i * seed) % 5)) % GLYPHS.length]).join('');
const updates = [
  ['Oct 3, 2026', 'Tate402 opens: the private pools, the file vault, the terminal and the agent, in black and white, around one field of grain drawn from the logo.'],
  ['Oct 3, 2026', 'The gate speaks HTTP: once the token and its holder bar exist, the private tools answer 402 Payment Required to wallets below the bar. Until then they are open to signed-in wallets, with limits.'],
  ['Oct 3, 2026', 'Robinhood Chain reads go through a dedicated RPC on the server, with the public endpoints as fallback.'],
];
const faq = [
  ['What does 402 mean here?', `HTTP 402 is Payment Required, a status code reserved in 1997 and left unfinished. Tate402 uses it as its door: ${GATED ? `wallets below $${HOLDER_MIN_USD} of ${IDENTITY.ticker} get a 402 from the private tools.` : `once ${IDENTITY.ticker} and its holder bar exist, wallets below the bar get a 402 from the private tools. Until then they are open to any signed-in wallet, with limits.`}`],
  ['Does Tate402 hold my funds?', 'No custodial balance. Funds go into external Privacy Cash pool contracts, which carry their own contract and service risks.'],
  ['Is my wallet connection private?', 'No. Your wallet address and every deposit and withdrawal are public on chain. RPC, indexer and relay providers can see network metadata.'],
  ['How do I recover a private balance?', 'Sign the same fixed unlock message with the same wallet and signing method. A different signature can derive a different private account. Never share it.'],
  ['Has a funded deposit been tested?', 'Not yet. Amount, approval, recipient and relay guards are tested with fixtures. This integration is unaudited.'],
  [`Where do ${IDENTITY.ticker} fees go?`, 'The token, its fees and their split are TBA. They will be posted on the docs page the day they exist.'],
];

/** Unannounced chapters keep their titles in shifting grain until they ship. */
function Glyphs({ n }) {
  const [seed, setSeed] = useState(1);
  useEffect(() => { if (matchMedia('(prefers-reduced-motion: reduce)').matches) return; const t = setInterval(() => setSeed((s) => (s % 97) + 1), 900); return () => clearInterval(t); }, []);
  return <span className="glyphs" aria-hidden="true">{scramble(n, seed)}</span>;
}

/** The status line a request gets at the door, written like a response. */
function Door() {
  return <pre className="door" aria-label="How the gate answers">
    <span className="door-req">GET /agent</span>
    <span className="door-code">{GATED ? '402 Payment Required' : '200 OK, with limits'}</span>
    <span className="door-why">{GATED ? `hold $${HOLDER_MIN_USD} of ${IDENTITY.ticker} to open it` : `402 starts when ${IDENTITY.ticker} and its bar exist`}</span>
  </pre>;
}

/** A live plate of the terminal board: the first coins with price and 24h, read from the same API as the terminal. */
function MiniBoard() {
  const [coins, setCoins] = useState(null);
  useEffect(() => {
    let stop = false;
    fetch('/api/terminal?action=list', { signal: AbortSignal.timeout(20000) }).then((r) => (r.ok ? r.json() : null)).then((d) => { if (!stop && d?.memes) setCoins(d.memes.filter((c) => c.priceUsd != null).slice(0, 6)); }).catch(() => {});
    return () => { stop = true; };
  }, []);
  const px = (p) => (p >= 1 ? '$' + p.toFixed(2) : '$' + p.toLocaleString('en-US', { maximumSignificantDigits: 3 }));
  return <div className="mini-board" aria-label="Terminal board, live">
    <div className="mini-head"><span>Memes on Robinhood Chain</span><span>Price · 24h</span></div>
    {coins ? coins.map((c) => <Link key={c.address} to={'/terminal/' + c.address} className="mini-row">
      {c.image ? <img src={c.image} alt="" width="22" height="22" referrerPolicy="no-referrer" /> : <em>{c.symbol.slice(0, 1)}</em>}
      <b>{c.symbol}</b><span>{px(c.priceUsd)}</span>
      <i data-dir={c.change24h > 0 ? 'up' : c.change24h < 0 ? 'down' : undefined}>{c.change24h == null ? '—' : (c.change24h > 0 ? '+' : '') + c.change24h.toFixed(1) + '%'}</i>
    </Link>) : Array.from({ length: 6 }, (_, i) => <span key={i} className="mini-skel" />)}
  </div>;
}

/** Reveals blocks after the flight as they enter the view: they rise slowly out of a blur. */
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]');
    const io = new IntersectionObserver((list) => list.forEach((e) => { if (e.isIntersecting) { e.target.setAttribute('data-in', ''); io.unobserve(e.target); } }), { rootMargin: '0px 0px -12% 0px' });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

export default function Home() {
  const live = usePoolLive();
  const track = useRef(null), chapters = useRef([]), stage = useRef(null), smooth = useRef(0);
  const [gl, setGl] = useState(true);
  const cfg = live.limits?.config;
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  useReveal();

  // the field reads the scroll every frame, eased a little more on top of the slow page scroll
  const drive = useCallback(() => {
    const target = progressOf(track.current);
    smooth.current += (target - smooth.current) * (reduce ? 1 : 0.07);
    const st = stateAt(smooth.current, reduce);
    chapters.current.forEach((c, i) => {
      if (!c) return;
      const a = activation(st.f, i, st.snap);
      c.style.setProperty('--a', a.toFixed(3));
      c.toggleAttribute('data-on', a > 0.01);
    });
    stage.current?.style.setProperty('--f', st.f.toFixed(3));
    const i = Math.min(CHROME.length - 2, Math.floor(st.f)), u = st.f - i;
    return { seg: st.seg, k: st.k, scatter: 1, noise: 6, chrome: CHROME[i] + (CHROME[i + 1] - CHROME[i]) * u };
  }, [reduce]);
  const onReady = useCallback((ok) => setGl(ok), []);
  useEffect(() => { if (gl) return; let raf = 0; const loop = () => { drive(); raf = requestAnimationFrame(loop); }; loop(); return () => cancelAnimationFrame(raf); }, [gl, drive]);
  const ch = (i) => (el) => { chapters.current[i] = el; };

  return <main className="home">
    <section className="flight" ref={track} aria-label="How Tate402 works">
      <div className="stage" ref={stage} data-gl={gl ? 'on' : 'off'}>
        <Field drive={drive} onReady={onReady} />
        {!gl && <img className="field-fallback" src="/brand/tate-mark.png" alt="" />}

        <article className="ch ch-hero" ref={ch(0)}>
          <h1 className="sr-only">Tate402</h1>
          <div className="hero-copy">
            <p className="hero-line">Everything private answers <em>402</em></p>
            <p className="hero-sub">Private pools, a file vault, a terminal and an agent on Robinhood Chain</p>
            <div className="keys"><Key to="/privacy">Open the workspace</Key><Key to="/terminal" tone="ghost">Open terminal</Key></div>
            <p className="ticker-line"><b>{IDENTITY.ticker}</b><span>CA</span><ContractTag full /></p>
          </div>
          <CoinTape />
        </article>

        {/* 402: a wide title over the number, the response in the lower right */}
        <article className="ch ch-code" ref={ch(1)}>
          <h2 className="wide-title">Payment <em>Required</em></h2>
          <p className="corner-left">A status code the web reserved in 1997 and never finished. Tate402 finishes it: the private tools answer it below the holder bar and open above it.</p>
          <Door />
        </article>

        {/* the public ledger: the title centred above the band, the live numbers in a row below */}
        <article className="ch ch-public" ref={ch(2)}>
          <div className="center-head"><h2>Every transfer is <em>public</em></h2><p>Your address, the amount and the time go into a block anyone can read.</p></div>
          <dl className="figures-row">
            <div><dt>Latest block</dt><dd>{fmt(live.block, 0)}</dd></div>
            <div><dt>ETH in the pool</dt><dd>{fmt(live.eth)}</dd></div>
            <div><dt>USDG in the pool</dt><dd>{fmt(live.usdg, 0)}</dd></div>
            <div><dt>Protocol fee</dt><dd>{cfg ? fmt(cfg.fee_rate / 100) + '%' : '—'}</dd></div>
          </dl>
        </article>

        {/* deposit: the two halves of the title on either side of the gate */}
        <article className="ch ch-flank" ref={ch(3)}>
          <h2 className="flank-left">Deposit<br /><em>from</em></h2>
          <h2 className="flank-right"><em>your</em><br />wallet</h2>
          <p className="flank-note">Pick ETH or USDG and an amount. Your wallet shows the chain, the pool contract and the amount before you sign. Nothing moves until you do.</p>
        </article>

        {/* inside: the note centred, four steps along the bottom */}
        <article className="ch ch-note" ref={ch(4)}>
          <div className="center-head"><h2>Inside, it becomes <em>a note</em></h2></div>
          <ol className="steps-row">{steps.map(([t, d], i) => <li key={t}><span>0{i + 1}</span><b>{t}</b><p>{d}</p></li>)}</ol>
        </article>

        {/* withdraw: the stream comes in from the left, the words wait on the right */}
        <article className="ch ch-right" ref={ch(5)}>
          <h2>Withdraw to <em>any address</em></h2>
          <p>Your browser builds the withdrawal proof. After you confirm it, the external relay submits it. Fees come out of the amount.</p>
          <dl className="figures">
            <div><dt>Min withdrawal</dt><dd>{cfg ? fmt(cfg.minimum_withdrawal?.eth, 4) : '—'}<small>ETH</small></dd></div>
            <div><dt>Flat fee</dt><dd>{cfg ? fmt(cfg.rent_fees?.eth, 5) : '—'}<small>ETH</small></dd></div>
          </dl>
        </article>

        {/* the vault: the title split above and below the lock */}
        <article className="ch ch-split" ref={ch(6)}>
          <h2 className="split-top">Files that</h2>
          <h2 className="split-bottom"><em>stay yours</em></h2>
          <div className="split-side"><p>The vault encrypts a file in this browser with a passphrase only you know. The file never leaves the page.</p><Key to="/vault" tone="ghost" small>Seal a file</Key></div>
        </article>

        {/* terminal: the chart on the left, the live board as a real plate on the right */}
        <article className="ch ch-board" ref={ch(7)}>
          <div className="board-copy"><h2>A terminal and <em>an agent</em></h2><p>Buy with ETH from your own wallet, dry-run before it opens, no fee added. The agent reads the same board and never signs.</p>
            <div className="keys"><Key to="/terminal">Open terminal</Key><Key to="/agent" tone="ghost">Ask the agent</Key></div></div>
          <MiniBoard />
        </article>

        <article className="ch ch-close" ref={ch(8)}>
          <p className="hero-line">Your private side <em>starts here</em></p>
          <div className="keys"><Key to="/privacy">Open the workspace</Key><Key to="/terminal" tone="ghost">Open terminal</Key></div>
          <p className="close-note">Keep the same wallet and signing method for recovery. Tate402 cannot reset a signature or a passphrase.</p>
        </article>
      </div>
    </section>

    <section className="after" aria-labelledby="chapters-title">
      <div className="wrap">
        <div className="after-head" data-reveal><h2 id="chapters-title">The <em>chapters</em></h2><p>What is open today, what comes with the token, and what is not announced yet.</p></div>
        <ol className="chapter-cards">
          <li data-reveal><span className="n">01</span><small className="state on">Live</small><b>The private side</b><p>Pools, vault, terminal and agent, open today.</p></li>
          <li data-reveal><span className="n">02</span><small className="state">With the token</small><b>The 402 gate</b><p>The private tools answer 402 below the holder bar.</p></li>
          <li data-reveal><span className="n">03</span><small className="state">Not announced</small><b><Glyphs n={12} /></b><p><Glyphs n={20} /></p></li>
        </ol>
      </div>

      <div className="wrap updates-wrap">
        <div className="after-head" data-reveal><h2>Closer, <em>with every update</em></h2><p>What is new on Tate402, dated.</p></div>
        <ol className="timeline">{updates.map(([d, t], i) => <li key={i} data-reveal><time>{d}</time><p>{t}</p></li>)}</ol>
      </div>

      <div className="wrap faq-wrap">
        <div className="after-head center" data-reveal><h2>Before you <em>deposit</em></h2></div>
        <div className="faq-list">{faq.map(([q, a]) => <details key={q} data-reveal><summary>{q}<Plus size={18} /></summary><p>{a}</p></details>)}</div>
      </div>
    </section>
  </main>;
}
