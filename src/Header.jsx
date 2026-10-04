import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { GATED, IDENTITY } from './identity';
import DockWallet from './DockWallet';
import { GitKey } from './GithubMark';

const ROUTES = [['/terminal', 'Terminal'], ['/privacy', 'Workspace'], ['/vault', 'Vault'], ['/agent', 'Agent'], ['/docs', 'Docs']];

/** The routes in one framed strip; a white plate slides under the pointer and settles back on the page you are on. */
function NavStrip() {
  const strip = useRef(null), plate = useRef(null), location = useLocation();
  const [hover, setHover] = useState(null);
  const place = (el) => {
    const p = plate.current, s = strip.current;
    if (!p || !s) return;
    if (!el) { p.style.opacity = '0'; return; }
    const a = el.getBoundingClientRect(), b = s.getBoundingClientRect();
    p.style.opacity = '1'; p.style.width = a.width + 'px'; p.style.transform = `translateX(${a.left - b.left}px)`;
  };
  useLayoutEffect(() => { place(hover ?? strip.current?.querySelector('a.active')); }, [hover, location.pathname]);
  useEffect(() => { const r = () => place(strip.current?.querySelector('a.active')); addEventListener('resize', r); return () => removeEventListener('resize', r); }, []);
  return <nav className="nav-strip" ref={strip} aria-label="Main navigation" onPointerLeave={() => setHover(null)}>
    <i className="nav-plate" ref={plate} aria-hidden="true" />
    {ROUTES.map(([to, label]) => <NavLink key={to} to={to} onPointerEnter={(e) => setHover(e.currentTarget)} onFocus={(e) => setHover(e.currentTarget)} onBlur={() => setHover(null)}
      className={({ isActive }) => (isActive ? 'active' : '') + (hover && hover.getAttribute('href') === to ? ' hot' : '')}>{label}</NavLink>)}
  </nav>;
}

/** The header: the grain mark, the route strip, the gate's live status, the wallet. It condenses after the first screen. */
export default function Header() {
  const location = useLocation();
  const [menu, setMenu] = useState(false), [scrolled, setScrolled] = useState(false);
  useEffect(() => { setMenu(false); }, [location.pathname]);
  useEffect(() => { const on = () => setScrolled(scrollY > 40); on(); addEventListener('scroll', on, { passive: true }); return () => removeEventListener('scroll', on); }, []);
  useEffect(() => { const key = (e) => { if (e.key === 'Escape') setMenu(false); }; document.addEventListener('keydown', key); return () => document.removeEventListener('keydown', key); }, []);
  useEffect(() => { document.documentElement.toggleAttribute('data-menu', menu); }, [menu]);
  return <>
    <header className={'dock' + (scrolled ? ' scrolled' : '') + (location.pathname === '/' ? ' over-stage' : '')}>
      <Link to="/" className="brand" aria-label="Tate402 home">
        <span className="brand-grain"><img src="/brand/tate-mark-alpha.png" alt="" width="190" height="87" /></span>
        <span className="brand-code">402</span>
      </Link>
      <NavStrip />
      <div className="dock-end">
        <Link to="/docs#fees" className={'gate-chip' + (GATED ? ' closed' : '')} title={GATED ? 'The private tools answer 402 below the holder bar' : 'Open to signed-in wallets until the token and its holder bar exist'}>
          <i />{GATED ? '402 gate' : '200 open'}
        </Link>
        {IDENTITY.repo && <GitKey href={IDENTITY.repo} />}
        <DockWallet />
        <button className="menu-toggle" aria-label={menu ? 'Close menu' : 'Open menu'} aria-expanded={menu} onClick={() => setMenu(!menu)}>{menu ? <X size={20} /> : <Menu size={20} />}</button>
      </div>
      <span className="dock-seam" aria-hidden="true" />
    </header>
    {menu && <div className="menu-sheet" role="dialog" aria-label="Menu">
      <nav>{[['/', 'Home'], ...ROUTES].map(([to, label], i) => <NavLink key={to} to={to} end={to === '/'} style={{ '--i': i }}>{label}<ArrowUpRight size={22} /></NavLink>)}</nav>
      <p><b>{IDENTITY.ticker}</b> {IDENTITY.contract ? IDENTITY.contract : 'contract TBA'}</p>
      {IDENTITY.repo && <GitKey href={IDENTITY.repo} wide label="Source on GitHub" />}
    </div>}
  </>;
}
