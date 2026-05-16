import { useEffect, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { CATEGORIES } from '../data/modules.jsx';

const SUBMIT_STEPS = [
  'Cloning repository...',
  'Reading project structure...',
  'Analyzing dependencies and stack...',
  'Identifying inputs and outputs...',
  'Generating module listing...',
];

const AUTO_LISTING = {
  name: 'CacheLayer',
  description:
    'In-memory caching middleware with TTL management and automatic cache invalidation hooks. Drop in as an Express middleware or call directly from your service layer — supports Redis or in-process backends with the same API.',
  category: 'DevOps',
  stack: ['Node.js', 'Redis', 'TypeScript'],
  inputs: 'Cache key, value (any serializable), TTL in seconds, optional invalidation tags.',
  outputs: 'Hit/miss status, cached value on hit, eviction events on TTL or tag invalidation.',
};

export default function Submit({ go }) {
  const [phase, setPhase] = useState('input');
  const [url, setUrl] = useState('');
  const [focused, setFocused] = useState(false);
  const [step, setStep] = useState(-1);

  const [listing, setListing] = useState(null);
  const [stackInput, setStackInput] = useState('');
  const [pricingModel, setPricingModel] = useState('buy');
  const [amount, setAmount] = useState('');

  function analyze() {
    if (!url.trim()) return;
    setPhase('analyzing');
    setStep(0);
  }

  useEffect(() => {
    if (phase !== 'analyzing') return;
    if (step >= SUBMIT_STEPS.length) {
      const tt = setTimeout(() => {
        setListing({ ...AUTO_LISTING });
        setPhase('review');
      }, 320);
      return () => clearTimeout(tt);
    }
    const tt = setTimeout(() => setStep(step + 1), 600);
    return () => clearTimeout(tt);
  }, [phase, step]);

  function patch(p) { setListing((l) => ({ ...l, ...p })); }

  function addStack() {
    const v = stackInput.trim().replace(/,$/, '');
    if (!v || listing.stack.includes(v)) return;
    patch({ stack: [...listing.stack, v] });
    setStackInput('');
  }
  function removeStack(s) { patch({ stack: listing.stack.filter((x) => x !== s) }); }

  if (phase === 'done') {
    return (
      <main className="fade-in">
        <div className="container-narrow" style={{ paddingTop: 80, paddingBottom: 120, textAlign: 'center' }}>
          <div style={{
            width: 72, height: 72, borderRadius: 50,
            background: 'var(--good-bg)', color: 'var(--good)',
            display: 'grid', placeItems: 'center', margin: '0 auto 24px',
          }}>
            <Icon name="check" size={32} stroke={2.6} />
          </div>
          <h2>{listing?.name || 'Your build'} is in the queue.</h2>
          <p className="muted" style={{ fontSize: 17, marginTop: 14, maxWidth: 540, marginLeft: 'auto', marginRight: 'auto' }}>
            We&rsquo;ll do a manual review pass within 48 hours. You&rsquo;ll get an email when the listing goes live.
          </p>
          <div className="row" style={{ justifyContent: 'center', gap: 10, marginTop: 32 }}>
            <button className="btn btn-primary btn-lg" onClick={() => go('dashboard')}>View dashboard</button>
            <button
              className="btn btn-ghost btn-lg"
              onClick={() => { setPhase('input'); setUrl(''); setStep(-1); setListing(null); }}
            >
              Submit another
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="fade-in v3-submit-shell">
      <div className="container-narrow" style={{ maxWidth: 860 }}>
        <div style={{ marginBottom: 28 }}>
          <div className="v3-mono-label" style={{ color: 'var(--primary-700)' }}>Submit a build</div>
          <h2 style={{ marginTop: 14 }}>Submit your build.</h2>
        </div>

        {phase === 'input' && (
          <div className="slide-in">
            <div className="v3-mono-label" style={{ marginBottom: 8 }}>Paste your GitHub repo URL</div>
            <div className={`v3-submit-input-row ${focused ? 'focused' : ''}`}>
              <div className="gh-icon"><Icon name="github" size={22} /></div>
              <input
                placeholder="https://github.com/you/your-hack"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onKeyDown={(e) => { if (e.key === 'Enter') analyze(); }}
              />
              <button className="analyze-btn" disabled={!url.trim()} onClick={analyze}>
                Analyze repo <Icon name="arrow-right" size={14} />
              </button>
            </div>
            <p className="muted" style={{ fontSize: 14, marginTop: 16, lineHeight: 1.55 }}>
              That&rsquo;s the whole submission. We&rsquo;ll read the repo, detect the stack, write the description, and draft your I/O contract. You just review and pick how you want to get paid.
            </p>

            <div style={{ marginTop: 36 }}>
              <div className="v3-mono-label" style={{ marginBottom: 12 }}>What we do</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {[
                  { i: 'code', t: 'Read the code', d: 'Stack detection, structure, and tests.' },
                  { i: 'box', t: 'Draft the listing', d: 'Description, category, I/O contract.' },
                  { i: 'shield', t: 'Manual review', d: 'A Rotshop engineer signs off the listing.' },
                ].map((f) => (
                  <div key={f.t} style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 12, padding: 18 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--bg-soft)', display: 'grid', placeItems: 'center' }}>
                      <Icon name={f.i} size={14} />
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, marginTop: 12 }}>{f.t}</div>
                    <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4, lineHeight: 1.5 }}>{f.d}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {phase === 'analyzing' && (
          <div className="v3-think-shell slide-in">
            <div className="v3-think-prompt">
              <div className="v3-think-prompt-label">Repository</div>
              <div className="v3-mono" style={{ fontSize: 14, color: 'var(--ink)', marginTop: 4 }}>{url}</div>
            </div>
            <div className="v3-think-card">
              <div className="v3-think-head">
                <div className="v3-think-title">Analyzing your repo</div>
                <div className="v3-think-count">{Math.min(step, SUBMIT_STEPS.length)}/{SUBMIT_STEPS.length}</div>
              </div>
              <div className="v3-progress">
                <div
                  className="v3-progress-bar"
                  style={{ width: (Math.min(step, SUBMIT_STEPS.length) / SUBMIT_STEPS.length) * 100 + '%' }}
                />
              </div>
              {SUBMIT_STEPS.map((s, i) => {
                const done = i < step;
                const active = i === step;
                return (
                  <div key={s} className={`v3-think-step ${active ? 'active' : ''} ${done ? 'done' : ''}`}>
                    <div className="step-icon">
                      {done
                        ? <span className="step-check"><Icon name="check" size={11} stroke={2.8} /></span>
                        : active ? <span className="spinner" />
                        : <span className="step-pending" />}
                    </div>
                    <div className="step-text">{s}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {phase === 'review' && listing && (
          <div className="slide-in">
            <div style={{
              background: 'var(--primary-50)',
              border: '1px solid color-mix(in oklab, var(--primary) 25%, transparent)',
              borderRadius: 12, padding: 16, display: 'flex', gap: 14, marginBottom: 24,
            }}>
              <div style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 7, background: 'var(--primary)', color: '#fff', display: 'grid', placeItems: 'center' }}>
                <Icon name="sparkle" size={14} />
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: 'var(--primary-700)' }}>
                  Listing auto-generated from your repo
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 4, lineHeight: 1.55 }}>
                  We&rsquo;ve filled everything in. Edit anything we got wrong. The only thing you have to decide is pricing.
                </div>
              </div>
            </div>

            <div className="v3-review-grid">
              <div className="v3-review-card">
                <div className="field-label">Project name <span className="v3-auto-pill"><Icon name="sparkle" size={9} /> auto</span></div>
                <input className="input" value={listing.name} onChange={(e) => patch({ name: e.target.value })} />
              </div>

              <div className="v3-review-card">
                <div className="field-label">Description <span className="v3-auto-pill"><Icon name="sparkle" size={9} /> from your README</span></div>
                <textarea
                  className="textarea"
                  rows={3}
                  value={listing.description}
                  onChange={(e) => patch({ description: e.target.value })}
                />
                <div className="helper" style={{ marginTop: 6, fontSize: 12, color: 'var(--ink-3)' }}>
                  We wrote this from your README. Edit it to be accurate.
                </div>
              </div>

              <div className="v3-review-card">
                <div className="field-label">Category <span className="v3-auto-pill"><Icon name="sparkle" size={9} /> detected</span></div>
                <div className="v3-cat-pills">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={`v3-cat-pill ${listing.category === c.id ? 'active' : ''}`}
                      onClick={() => patch({ category: c.id })}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="v3-review-card">
                <div className="field-label">Tech stack <span className="v3-auto-pill"><Icon name="sparkle" size={9} /> from package.json</span></div>
                <div className="v3-stack-tag-input">
                  {listing.stack.map((s) => (
                    <span key={s} className="v3-stack-tag">
                      {s}{' '}
                      <span className="x" onClick={() => removeStack(s)}>
                        <Icon name="x" size={10} stroke={2.6} />
                      </span>
                    </span>
                  ))}
                  <input
                    value={stackInput}
                    onChange={(e) => setStackInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addStack(); }
                      else if (e.key === 'Backspace' && !stackInput && listing.stack.length) {
                        removeStack(listing.stack[listing.stack.length - 1]);
                      }
                    }}
                    placeholder={listing.stack.length ? 'Add another…' : 'Add a tag…'}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                <div className="v3-review-card">
                  <div className="field-label">Inputs <span className="v3-auto-pill"><Icon name="sparkle" size={9} /> auto</span></div>
                  <textarea className="textarea" rows={4} value={listing.inputs} onChange={(e) => patch({ inputs: e.target.value })} />
                </div>
                <div className="v3-review-card">
                  <div className="field-label">Outputs <span className="v3-auto-pill"><Icon name="sparkle" size={9} /> auto</span></div>
                  <textarea className="textarea" rows={4} value={listing.outputs} onChange={(e) => patch({ outputs: e.target.value })} />
                </div>
              </div>

              <div className="v3-review-card">
                <div className="field-label">Pricing — your call</div>
                <div className="v3-pricing-grid" style={{ marginTop: 6 }}>
                  <div className={`pricing-option ${pricingModel === 'buy' ? 'selected' : ''}`} onClick={() => setPricingModel('buy')}>
                    <div className="pricing-option-head">
                      <div className="pricing-option-title">Lump sum</div>
                      <div className="radio-mark" />
                    </div>
                    <div className="pricing-option-desc">Sell the code outright. One payment, walk away.</div>
                  </div>
                  <div className={`pricing-option ${pricingModel === 'royalty' ? 'selected' : ''}`} onClick={() => setPricingModel('royalty')}>
                    <div className="pricing-option-head">
                      <div className="pricing-option-title">Royalty</div>
                      <div className="radio-mark" />
                    </div>
                    <div className="pricing-option-desc">Earn per integration each month. You commit to maintenance.</div>
                  </div>
                </div>
                <div style={{ marginTop: 16 }}>
                  <div className="row" style={{ gap: 0 }}>
                    <div style={{
                      padding: '11px 14px', border: '1px solid var(--line)', borderRight: 0,
                      borderRadius: '9px 0 0 9px', background: 'var(--bg-soft)',
                      color: 'var(--ink-3)', fontSize: 14,
                    }}>$</div>
                    <input
                      className="input"
                      type="number"
                      style={{ borderRadius: '0 9px 9px 0' }}
                      placeholder={pricingModel === 'buy' ? '1200' : '45'}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                    {pricingModel === 'royalty' && (
                      <div style={{
                        padding: '11px 14px', border: '1px solid var(--line)', borderLeft: 0,
                        borderRadius: '0 9px 9px 0', background: 'var(--bg-soft)',
                        color: 'var(--ink-3)', fontSize: 14,
                      }}>/ month</div>
                    )}
                  </div>
                  <div className="helper" style={{ marginTop: 6, fontSize: 12, color: 'var(--ink-3)' }}>
                    You earn 80%. Typical: {pricingModel === 'buy' ? '$300 — $2,500' : '$20 — $80 / month'}.
                  </div>
                </div>
              </div>
            </div>

            <div className="row" style={{ justifyContent: 'space-between', marginTop: 28 }}>
              <button className="btn btn-ghost" onClick={() => { setPhase('input'); setStep(-1); setListing(null); }}>
                <Icon name="arrow-left" size={14} /> Start over
              </button>
              <button
                className="btn btn-vermillion btn-lg"
                onClick={() => setPhase('done')}
                style={{
                  opacity: amount && Number(amount) > 0 ? 1 : 0.4,
                  pointerEvents: amount && Number(amount) > 0 ? 'auto' : 'none',
                }}
              >
                Submit for review <Icon name="arrow-right" size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
