import { Wallet, Lock } from 'lucide-react';
import Key from './Key';

// A hidden page with every control state, for review only (not linked anywhere).
export default function Kit() {
  return <main className="page kit">
    <div className="page-heading"><h1>Kit</h1><p>Every control state on the ground it sits on.</p></div>
    <section className="kit-row"><Key>Open the workspace</Key><Key tone="ghost">Open terminal</Key><Key small>Seal a file</Key><Key tone="ghost" small>Check again</Key></section>
    <section className="kit-row"><Key icon={<Wallet size={18} />}>Connect wallet</Key><Key busy>Waiting for wallet</Key><Key disabled>Not available yet</Key><Key tone="ghost" icon={<Lock size={18} />}>Unlock</Key></section>
    <section className="kit-row"><button className="button">Inherited button<Lock /></button><button className="button paper">Inherited paper<Lock /></button><button className="t-key primary">Terminal primary</button><button className="t-key">Terminal key</button><button className="privacy-button">Privacy button</button><button className="privacy-button secondary">Privacy secondary</button></section>
    <section className="kit-row"><label className="field-label">Passphrase<input placeholder="At least 12 characters" /></label><label className="field-label">Filled<input defaultValue="0.05" /></label><button className="dock-wallet"><Wallet size={16} />Connect wallet</button></section>
  </main>;
}
