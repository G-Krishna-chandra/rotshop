import { useEffect, useState } from 'react';
import Icon from '../components/Icon.jsx';
import Composer from '../components/Composer.jsx';
import IntegrationDetail from '../components/IntegrationDetail.jsx';
import {
  matchModules, projectDescriptor, segmentsToText, tokenize,
  formatPrice, Stars,
} from '../data/modules.jsx';

const EXAMPLES = [
  'SaaS analytics dashboard with user auth, subscription billing, and email alerts',
  'Data pipeline to ingest CSVs, validate schemas, and store embeddings for search',
  'Task manager with scheduled reminders, custom form builder, and error tracking',
];

const THINK_STEPS = [
  'Understanding your stack...',
  'Identifying infrastructure gaps...',
  'Scanning 342 verified modules...',
  'Scoring integration fit...',
  'Generating integration plan...',
];

export default function Discovery() {
  const [phase, setPhase] = useState('input');
  const [seedSegments, setSeedSegments] = useState(null);
  const [submittedSegments, setSubmittedSegments] = useState([]);
  const [step, setStep] = useState(-1);
  const [matched, setMatched] = useState([]);
  const [selected, setSelected] = useState(null);

  function submit(segs) {
    if (!segs || segs.length === 0) return;
    setSubmittedSegments(segs);
    const m = matchModules(segs);
    const promptText = segmentsToText(segs);
    const proj = projectDescriptor(promptText);
    const matchedWithFit = m.map((row) => {
      const fitText = row.fallback
        ? `Popular pick — a strong default for ${proj}.`
        : row.m.fit(proj, row.hits || []);
      return { ...row, fit: fitText };
    });
    setMatched(matchedWithFit);
    setStep(0);
    setPhase('thinking');
  }

  useEffect(() => {
    if (phase !== 'thinking') return;
    if (step >= THINK_STEPS.length) {
      const tt = setTimeout(() => setPhase('results'), 280);
      return () => clearTimeout(tt);
    }
    const tt = setTimeout(() => setStep(step + 1), 580);
    return () => clearTimeout(tt);
  }, [phase, step]);

  function refine() {
    setSeedSegments(submittedSegments);
    setPhase('input');
    setStep(-1);
    setSelected(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function startFresh() {
    setSeedSegments([]);
    setSubmittedSegments([]);
    setPhase('input');
    setStep(-1);
    setSelected(null);
  }

  function pickExample(s) {
    const segs = tokenize(s);
    setSeedSegments(segs);
    setTimeout(() => submit(segs), 220);
  }

  function openDetail(m) {
    setSelected(m);
    setPhase('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function backToResults() {
    setSelected(null);
    setPhase('results');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <main className="v2-discovery fade-in">
      <div className="container" style={{ maxWidth: 920 }}>
        {phase === 'input' && (
          <div className="slide-in">
            <h1 style={{ fontSize: 52, marginTop: 24, letterSpacing: '-0.03em', lineHeight: 1.05 }}>
              What are you building?
            </h1>
            <div style={{ marginTop: 36 }}>
              <Composer initialSegments={seedSegments} onSubmit={submit} />
            </div>

            <div className="v3-examples">
              <div className="v3-mono-label" style={{ marginBottom: 4 }}>Try one</div>
              {EXAMPLES.map((s) => (
                <button key={s} className="v3-example" onClick={() => pickExample(s)}>
                  <span className="v3-example-label">Example</span>
                  <span>{s}</span>
                  <span className="ex-arrow"><Icon name="arrow-right" size={14} /></span>
                </button>
              ))}
            </div>
          </div>
        )}

        {(phase === 'thinking' || phase === 'results') && (
          <div className="v3-think-shell slide-in">
            <div className="v3-think-prompt">
              <div className="between">
                <div className="v3-think-prompt-label">Your query</div>
                {phase === 'results' && (
                  <button className="btn-link" style={{ fontSize: 13 }} onClick={startFresh}>
                    <Icon name="x" size={12} stroke={2.4} /> &nbsp;New search
                  </button>
                )}
              </div>
              <div className="v3-think-prompt-body">
                {submittedSegments.map((seg, i) => {
                  if (seg.type === 'text') return <span key={i}>{seg.value}</span>;
                  return (
                    <span key={i} className="v3-tag">
                      <span className="v3-tag-cat">{seg.cat}</span>
                      <span>{seg.value}</span>
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="v3-think-card">
              <div className="v3-think-head">
                <div className="v3-think-title">
                  {phase === 'thinking' ? 'Analyzing' : 'Analysis complete'}
                </div>
                <div className="v3-think-count">
                  {phase === 'thinking'
                    ? `${Math.min(step, THINK_STEPS.length)}/${THINK_STEPS.length}`
                    : `${THINK_STEPS.length}/${THINK_STEPS.length}`}
                </div>
              </div>
              <div className="v3-progress">
                <div
                  className="v3-progress-bar"
                  style={{
                    width: (phase === 'results'
                      ? 100
                      : (Math.min(step, THINK_STEPS.length) / THINK_STEPS.length) * 100) + '%',
                  }}
                />
              </div>
              <div>
                {THINK_STEPS.map((s, i) => {
                  const done = phase === 'results' || i < step;
                  const active = phase === 'thinking' && i === step;
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

            {phase === 'results' && (
              <div>
                <div className="between" style={{ padding: '20px 4px 8px' }}>
                  <div className="v3-mono-label">
                    {matched.length} {matched.length === 1 ? 'module' : 'modules'} matched
                    {matched[0]?.fallback && ' · top picks'}
                  </div>
                  <div className="v3-mono-label">Ranked by integration fit</div>
                </div>
                <div className="v3-results">
                  {matched.map((row, i) => (
                    <ResultCard key={row.m.id} row={row} delay={i * 110} onClick={() => openDetail(row.m)} />
                  ))}
                </div>
                <div style={{
                  marginTop: 28, padding: 22,
                  border: '1px dashed var(--line)', borderRadius: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20,
                  background: 'var(--bg-card)',
                }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16 }}>Not quite right?</div>
                    <div className="muted" style={{ fontSize: 14, marginTop: 4 }}>Edit your query and we&rsquo;ll re-rank.</div>
                  </div>
                  <button className="btn btn-ghost" onClick={refine}>Refine search <Icon name="arrow-right" size={14} /></button>
                </div>
              </div>
            )}
          </div>
        )}

        {phase === 'detail' && selected && (
          <IntegrationDetail module={selected} onBack={backToResults} />
        )}
      </div>
    </main>
  );
}

function ResultCard({ row, delay, onClick }) {
  const { m, fit, fallback } = row;
  return (
    <button className="v3-result-card" style={{ animationDelay: delay + 'ms' }} onClick={onClick}>
      <div className="v3-result-main">
        <div className="v3-result-head">
          <div className="v3-result-name">{m.name}</div>
          <span className="pill pill-primary">{m.category}</span>
          {!fallback && <span className="pill pill-good"><Icon name="check" size={11} stroke={2.4} /> Verified</span>}
          {fallback && <span className="pill">Popular</span>}
        </div>
        <div className="v3-result-desc">{m.tagline}</div>
        <div className="v3-result-fit">
          <span className="icon"><Icon name="sparkle" size={14} color="var(--primary)" /></span>
          <span>{fit}</span>
        </div>
        <div className="v3-result-pills">
          {m.stack.map((s) => <span key={s} className="pill pill-line">{s}</span>)}
        </div>
      </div>
      <div className="v3-result-side">
        <div className="v3-result-price">{formatPrice(m.pricing)}</div>
        <div className="v3-result-meta">
          <Stars rating={m.rating} />
          <span>{m.rating}</span>
          <span className="muted">·</span>
          <span>{m.integrations}</span>
        </div>
        <div className="v3-result-chev"><Icon name="arrow-right" size={14} /></div>
      </div>
    </button>
  );
}
