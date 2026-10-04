import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Check, ChevronDown, Copy, LogOut, RefreshCw, Wallet } from 'lucide-react';
import { useTerminalWallet } from './terminal-wallet';
import { IDENTITY } from './identity';

const short = (a) => a.slice(0, 6) + '…' + a.slice(-4);
const units = (raw, decimals = 18) => (raw == null ? null : Number(BigInt(raw)) / 10 ** decimals);
const usd = (v) => (v == null ? '—' : '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const amt = (v) => (v == null ? '—' : v >= 1000 ? v.toLocaleString('en-US', { maximumFractionDigits: 0 }) : v.toLocaleString('en-US', { maximumSignificantDigits: 4 }));

/** The connected wallet's ETH and Robinhood Chain coins, read on chain through the terminal API (one Multicall). */
function useBalances(account) {
  const [data, setData] = useState({ state: 'idle' });
  const read = useCallback(async () => {
    if (!account) { setData({ state: 'idle' }); return; }
    setData((d) => ({ ...d, state: d.eth == null ? 'loading' : 'refresh' }));
    try {
      const [b, l] = await Promise.all([
        fetch('/api/terminal?action=balances&account=' + account, { signal: AbortSignal.timeout(20000) }).then((r) => (r.ok ? r.json() : Promise.reject(Error('balances')))),
        fetch('/api/terminal?action=list', { signal: AbortSignal.timeout(20000) }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);
      const coins = new Map([...(l?.memes || []), ...(l?.stocks || [])].map((c) => [c.address, c]));
      const ethPrice = l?.majors?.find((m) => m.symbol === 'ETH')?.priceUsd ?? null;
      const eth = units(b.eth);
      const holdings = (b.items || []).map((i) => { const c = coins.get(i.address); if (!c || c.decimals == null) return null; const a = units(i.raw, c.decimals); return { ...c, amount: a, usd: c.priceUsd != null ? a * c.priceUsd : null }; })
        .filter((h) => h && h.amount > 0).sort((x, y) => (y.usd ?? 0) - (x.usd ?? 0));
      const ethUsd = eth != null && ethPrice ? eth * ethPrice : null;
      const total = (ethUsd ?? 0) + holdings.reduce((s, h) => s + (h.usd ?? 0), 0);
      setData({ state: 'ready', eth, ethUsd, holdings, total, at: b.at });
    } catch { setData((d) => ({ ...d, state: 'error' })); }
  }, [account]);
  useEffect(() => { void read(); if (!account) return; const t = setInterval(() => { if (!document.hidden) void read(); }, 30000); return () => clearInterval(t); }, [account, read]);
  return [data, read];
}

/** One wallet key for the site. Connected, it shows the ETH balance and opens a sheet with every holding. */
export default function DockWallet() {
  const wallet = useTerminalWallet();
  const [open, setOpen] = useState(false), [copied, setCopied] = useState(false);
  const [bal, refresh] = useBalances(wallet.account);
  const box = useRef(null);
  useEffect(() => {
    if (!open) return;
    const away = (e) => { if (!box.current?.contains(e.target)) setOpen(false); };
    const key = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', away); document.addEventListener('keydown', key);
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', key); };
  }, [open]);

  if (!wallet.account) return <button type="button" className="dock-wallet" onClick={() => wallet.connect()} disabled={wallet.busy} aria-label="Connect wallet">
    <span className="dw-label">{wallet.busy ? 'Waiting for wallet' : 'Connect wallet'}</span><span className="dw-cell"><Wallet size={16} /></span>
  </button>;

  const copy = async () => { try { await navigator.clipboard.writeText(wallet.account); setCopied(true); setTimeout(() => setCopied(false), 1400); } catch { /* clipboard blocked */ } };
  return <div className="dw" ref={box}>
    <button type="button" className="dock-wallet on" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="dialog">
      <span className="dw-label"><b>{bal.eth != null ? amt(bal.eth) : bal.state === 'error' ? '—' : '···'}</b><small>ETH</small><i>{short(wallet.account)}</i></span>
      <span className="dw-cell"><ChevronDown size={16} /></span>
    </button>
    {open && <div className="dw-sheet" role="dialog" aria-label="Your wallet">
      <div className="dw-top">
        <span className={'dw-net' + (wallet.onChain ? ' ok' : '')}><i />{wallet.onChain ? 'Robinhood Chain' : 'Wrong network'}</span>
        <button type="button" className="dw-icon" onClick={() => refresh()} aria-label="Refresh balances" data-spin={bal.state === 'loading' || bal.state === 'refresh' ? '' : undefined}><RefreshCw size={14} /></button>
      </div>
      {!wallet.onChain && <button type="button" className="dw-switch" onClick={() => wallet.switchChain?.()}>Switch to Robinhood Chain<ArrowUpRight size={14} /></button>}
      <div className="dw-total"><span>Total on Robinhood Chain</span><b>{bal.state === 'ready' ? usd(bal.total) : bal.state === 'error' ? 'Could not read' : 'Reading'}</b></div>
      <ul className="dw-list">
        <li><em>Ξ</em><b>ETH</b><span>{amt(bal.eth)}</span><small>{usd(bal.ethUsd)}</small></li>
        {bal.holdings?.map((h) => <li key={h.address}><Link to={'/terminal/' + h.address} onClick={() => setOpen(false)}>
          {h.image ? <img src={h.image} alt="" width="20" height="20" referrerPolicy="no-referrer" /> : <em>{h.symbol.slice(0, 1)}</em>}
          <b>{h.symbol}</b><span>{amt(h.amount)}</span><small>{usd(h.usd)}</small></Link></li>)}
        {bal.state === 'ready' && !bal.holdings?.length && <li className="dw-empty">No Robinhood Chain coins from the board in this wallet</li>}
        <li className="dw-own"><b>{IDENTITY.ticker}</b><span>{IDENTITY.contract ? short(IDENTITY.contract) : 'Contract TBA'}</span></li>
      </ul>
      <div className="dw-actions">
        <button type="button" onClick={copy}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Copied' : short(wallet.account)}</button>
        <Link to="/terminal" onClick={() => setOpen(false)}>Terminal<ArrowUpRight size={14} /></Link>
        <button type="button" onClick={() => { setOpen(false); wallet.disconnect(); }}><LogOut size={14} />Disconnect</button>
      </div>
      <p className="dw-note">Read on chain, never signed. {bal.at ? 'Updated ' + new Date(bal.at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''}</p>
    </div>}
  </div>;
}
