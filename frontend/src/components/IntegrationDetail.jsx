import { Fragment, useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { Stars } from '../data/modules.jsx';

const STAGES = ['Analyzing module', 'Mapping I/O', 'Generating integration code', 'Ready'];

export default function IntegrationDetail({ module: m, onBack }) {
  const [stage, setStage] = useState(0);
  const [revealIO, setRevealIO] = useState(false);
  const [revealCode, setRevealCode] = useState(false);
  const [revealCTAs, setRevealCTAs] = useState(false);
  const [typed, setTyped] = useState('');
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  useEffect(() => {
    const timers = [];
    timers.push(setTimeout(() => setStage(1), 800));
    timers.push(setTimeout(() => { setStage(2); setRevealIO(true); }, 1600));
    timers.push(setTimeout(() => { setStage(3); setRevealCode(true); }, 2400));
    timers.push(setTimeout(() => { setStage(4); setRevealCTAs(true); }, 3500));
    return () => timers.forEach(clearTimeout);
  }, [m.id]);

  useEffect(() => {
    if (!revealCode) return;
    setTyped('');
    const code = m.snippet;
    let i = 0;
    const tick = setInterval(() => {
      i += Math.max(1, Math.round(code.length / 280));
      if (i >= code.length) { setTyped(code); clearInterval(tick); }
      else setTyped(code.slice(0, i));
    }, 18);
    return () => clearInterval(tick);
  }, [revealCode, m.snippet]);

  function trigger(t) {
    setToast(t);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  }

  return (
    <div className="slide-in">
      <div className="v3-int-back">
        <button className="btn btn-ghost btn-sm" onClick={onBack}>
          <Icon name="arrow-left" size={13} /> Back to results
        </button>
      </div>

      <div className="v3-int-head">
        <div>
          <div className="v3-int-pills">
            <span className="pill pill-primary">{m.category}</span>
            <span className={`pill ${m.complexity === 'Easy' ? 'pill-good' : (m.complexity === 'Medium' ? 'pill-warn' : 'pill-info')}`}>
              {m.complexity} integration
            </span>
            <span className="pill pill-good"><Icon name="check" size={11} stroke={2.4} /> Verified</span>
            <span className="pill">From {m.hackathon}</span>
          </div>
          <h1 className="v3-int-title">{m.name}</h1>
          <p className="v3-int-desc">{m.tagline}</p>
          <div className="v3-int-meta">
            <div><Stars rating={m.rating} /> &nbsp;<b>{m.rating}</b></div>
            <div><b>{m.integrations}</b> active integrations</div>
            <div>Stack: <b>{m.stack.join(' · ')}</b></div>
          </div>
        </div>
        <div className="v3-int-price-block">
          <div className="v3-int-price-label">{m.pricing.model === 'buy' ? 'One-time price' : 'Monthly royalty'}</div>
          <div className="v3-int-price">
            {m.pricing.model === 'buy'
              ? '$' + m.pricing.amount.toLocaleString()
              : <>${m.pricing.amount}<span className="per"> / mo</span></>}
          </div>
        </div>
      </div>

      <div className="v3-int-progress">
        {STAGES.map((label, i) => {
          const done = stage > i;
          const active = stage === i;
          return (
            <Fragment key={label}>
              <div className={`v3-int-prog-step ${active ? 'active' : ''} ${done ? 'done' : ''}`}>
                <div className="v3-int-prog-icon">
                  {done
                    ? <span className="check"><Icon name="check" size={11} stroke={2.8} /></span>
                    : active ? <span className="spinner" />
                    : <span className="dot" />}
                </div>
                <div className="v3-int-prog-label">{label}</div>
              </div>
              {i < STAGES.length - 1 && (
                <div className={`v3-int-prog-bar ${stage > i ? 'done' : ''}`} />
              )}
            </Fragment>
          );
        })}
      </div>

      <div className={`v3-section ${revealIO ? 'visible' : ''}`} style={{ marginBottom: 28 }}>
        <div className="v3-section-eyebrow">I/O Contract</div>
        <div className="v3-io-grid">
          <div className="v3-io-card">
            <h4><span className="v3-io-tag in">Input</span> What it accepts</h4>
            <div className="v3-io-body">{m.inputs}</div>
          </div>
          <div className="v3-io-card">
            <h4><span className="v3-io-tag out">Output</span> What it returns</h4>
            <div className="v3-io-body">{m.outputs}</div>
          </div>
        </div>
      </div>

      <div className={`v3-section ${revealCode ? 'visible' : ''}`} style={{ marginBottom: 28 }}>
        <div className="v3-section-eyebrow">Integration code</div>
        <div className="v3-code-block">
          <div className="v3-code-bar">
            <div className="lights">
              <span className="light" /><span className="light" /><span className="light" />
            </div>
            <div>{m.snippet.startsWith('curl') ? 'shell · curl' : 'javascript · fetch'}</div>
            <button
              onClick={() => { navigator.clipboard?.writeText(m.snippet); trigger('Copied to clipboard.'); }}
              style={{ color: '#a1a1ab', fontFamily: 'var(--v3-mono)', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}
            >
              Copy
            </button>
          </div>
          <pre className="v3-code-pre">
            <code>{typed}</code>
            {typed.length < m.snippet.length && <span className="cursor" />}
          </pre>
        </div>
      </div>

      <div className={`v3-section ${revealCTAs ? 'visible' : ''}`}>
        <div className="v3-int-ctas">
          <button className="btn btn-vermillion btn-lg" onClick={() => trigger('Module added to your workspace.')}>
            Get this module <Icon name="arrow-right" size={14} />
          </button>
          <button className="btn btn-ghost btn-lg" onClick={() => trigger('Integration support requested.')}>
            Request integration support
          </button>
        </div>
        <div className="row" style={{ marginTop: 14, gap: 8, fontSize: 13, color: 'var(--ink-3)' }}>
          <Icon name="shield" size={13} /> Reviewed by Rotshop · 14-day money-back guarantee
        </div>
      </div>

      {toast && (
        <div className="toast">
          <Icon name="check-circle" size={16} color="#22c55e" />
          {toast}
        </div>
      )}
    </div>
  );
}
