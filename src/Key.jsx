import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

/**
 * Tate402's key: the label on the left, the arrow in its own cell on the right. Paper face for the main action,
 * ghost for the second. Hover passes a band of grain across the face and fills the arrow cell with the opposite tone
 * while the arrow loops out and back; press sinks it.
 */
export default function Key({ to, href, onClick, children, tone = 'paper', icon, disabled, busy, type = 'button', small, ...rest }) {
  const cls = 'key ' + tone + (small ? ' small' : '') + (busy ? ' busy' : '');
  const inner = <><span className="key-grain" aria-hidden="true" /><span className="key-label">{children}</span><span className="key-cell" aria-hidden="true">{icon ?? <ArrowUpRight size={18} strokeWidth={1.75} />}</span></>;
  if (to && !disabled) return <Link className={cls} to={to} {...rest}>{inner}</Link>;
  if (href && !disabled) return <a className={cls} href={href} target="_blank" rel="noreferrer" {...rest}>{inner}</a>;
  return <button className={cls} type={type} onClick={onClick} disabled={disabled || busy} aria-busy={busy || undefined} {...rest}>{inner}</button>;
}
