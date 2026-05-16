import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GitBranch, Shield, Check, Zap, Users, Star } from 'lucide-react';

// One full cycle: enter → scan → morph → fan-out → pause → next module
const PHASES = [
  { name: 'enter',  ms: 1600 },
  { name: 'scan',   ms: 2400 },
  { name: 'morph',  ms: 2000 },
  { name: 'fanout', ms: 2000 },
  { name: 'pause',  ms: 600 },
];

const MODULES = [
  {
    repo: 'auth-module',
    api: 'POST /v1/authforge/login',
    lang: 'Python',
    langColor: '#3776AB',
    tags: ['Python', 'FastAPI'],
    stars: 247,
    integrations: 67,
  },
  {
    repo: 'pay-engine',
    api: 'POST /v1/paypipe/charge',
    lang: 'TypeScript',
    langColor: '#3178C6',
    tags: ['TypeScript', 'Node'],
    stars: 182,
    integrations: 43,
  },
  {
    repo: 'notify-hub',
    api: 'POST /v1/notifystack/send',
    lang: 'Go',
    langColor: '#00ADD8',
    tags: ['Go', 'Redis'],
    stars: 314,
    integrations: 89,
  },
];

const CHECKS = ['I/O verified', 'Tests passed', 'Docs generated'];

// Endpoints for phase-3 fan-out (relative to the card's right anchor)
const FANOUT = [
  { dx: 150, dy: -110 },
  { dx: 170, dy: -38 },
  { dx: 170, dy: 38 },
  { dx: 150, dy: 110 },
];

export default function HeroPipeline() {
  const [cycle, setCycle] = useState(0);
  const [phaseIdx, setPhaseIdx] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      if (phaseIdx === PHASES.length - 1) {
        setPhaseIdx(0);
        setCycle((c) => (c + 1) % MODULES.length);
      } else {
        setPhaseIdx((p) => p + 1);
      }
    }, PHASES[phaseIdx].ms);
    return () => clearTimeout(t);
  }, [phaseIdx, cycle]);

  const phase = PHASES[phaseIdx].name;
  const m = MODULES[cycle];
  const showApi = phase === 'morph' || phase === 'fanout';
  const cardVisible = phase !== 'pause';

  return (
    <div className="hero-pipeline" aria-hidden="true">
      {/* SVG canvas for fan-out lines */}
      <svg className="hp-canvas" viewBox="0 0 500 500" fill="none">
        <AnimatePresence>
          {phase === 'fanout' &&
            FANOUT.map((p, i) => (
              <motion.path
                key={`line-${cycle}-${i}`}
                d={`M 340 250 Q ${340 + p.dx * 0.5} ${250 + p.dy * 0.3}, ${340 + p.dx} ${250 + p.dy}`}
                stroke="var(--primary)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeDasharray="0 1"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.55 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.08 + i * 0.12, duration: 0.55, ease: 'easeOut' }}
                fill="none"
              />
            ))}
        </AnimatePresence>
      </svg>

      {/* Fan-out endpoint dots + "+1" badges */}
      <AnimatePresence>
        {phase === 'fanout' &&
          FANOUT.map((p, i) => (
            <motion.div
              key={`dot-${cycle}-${i}`}
              className="hp-endpoint"
              style={{ left: 340 + p.dx, top: 250 + p.dy }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ delay: 0.4 + i * 0.12, type: 'spring', stiffness: 300, damping: 18 }}
            >
              <span className="hp-endpoint-dot" />
              <motion.span
                className="hp-plus-one"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 + i * 0.12, duration: 0.35 }}
              >
                +1
              </motion.span>
            </motion.div>
          ))}
      </AnimatePresence>

      {/* The morphing card */}
      <AnimatePresence>
        {cardVisible && (
          <motion.div
            key={`card-${cycle}`}
            className="hp-card"
            layout
            initial={{ x: -260, opacity: 0, scale: 0.92 }}
            animate={{
              x: 0,
              opacity: 1,
              scale: 1,
              width: showApi ? 280 : 220,
            }}
            exit={{ x: 40, opacity: 0, scale: 0.96, transition: { duration: 0.4 } }}
            transition={{
              type: 'spring',
              stiffness: 140,
              damping: 18,
              opacity: { duration: 0.4 },
              width: { type: 'spring', stiffness: 200, damping: 22 },
            }}
          >
            {/* Scan overlay (only during scan phase) */}
            <AnimatePresence>
              {phase === 'scan' && (
                <motion.div
                  className="hp-scan"
                  initial={{ y: -8, opacity: 0 }}
                  animate={{ y: '100%', opacity: [0, 1, 1, 0] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.6, ease: 'easeInOut', times: [0, 0.15, 0.85, 1] }}
                />
              )}
            </AnimatePresence>

            {/* Card content morphs between repo and api */}
            <AnimatePresence mode="wait" initial={false}>
              {!showApi ? (
                <motion.div
                  key="repo"
                  className="hp-card-inner"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.22 }}
                >
                  <div className="hp-row">
                    <GitBranch size={14} strokeWidth={1.8} color="var(--ink-3)" />
                    <span className="hp-mono hp-name">{m.repo}</span>
                  </div>
                  <div className="hp-pills">
                    <span className="hp-pill">
                      <span className="hp-lang-dot" style={{ background: m.langColor }} />
                      {m.tags[0]}
                    </span>
                    <span className="hp-pill">{m.tags[1]}</span>
                  </div>
                  <div className="hp-row hp-foot">
                    <Star size={11} strokeWidth={2} fill="#F59E0B" color="#F59E0B" />
                    <span>{m.stars}</span>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="api"
                  className="hp-card-inner hp-card-api"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.22 }}
                >
                  <div className="hp-row hp-row-between">
                    <span className="hp-live">
                      <span className="hp-live-dot" />
                      LIVE
                    </span>
                    <Zap size={13} strokeWidth={2} color="var(--primary)" fill="var(--primary)" />
                  </div>
                  <div className="hp-endpoint-row">
                    <span className="hp-method">POST</span>
                    <code className="hp-mono">{m.api.replace(/^POST\s+/, '')}</code>
                  </div>
                  <div className="hp-row hp-foot">
                    <Users size={11} strokeWidth={1.8} color="var(--ink-3)" />
                    <span>{m.integrations} integrations</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Verification checkmarks during scan phase */}
      <div className="hp-checks">
        <AnimatePresence>
          {phase === 'scan' &&
            CHECKS.map((label, i) => (
              <motion.div
                key={`${cycle}-${label}`}
                className="hp-check"
                initial={{ opacity: 0, scale: 0, x: -6 }}
                animate={{ opacity: 1, scale: [0, 1.15, 1], x: 0 }}
                exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.25 } }}
                transition={{
                  delay: 0.4 + i * 0.5,
                  duration: 0.45,
                  ease: 'easeOut',
                  scale: { times: [0, 0.6, 1] },
                }}
              >
                <span className="hp-check-icon">
                  <Check size={11} strokeWidth={3} />
                </span>
                <span>{label}</span>
              </motion.div>
            ))}
        </AnimatePresence>
      </div>

      {/* "Reviewed" marker that pops in during scan */}
      <AnimatePresence>
        {phase === 'scan' && (
          <motion.div
            key={`shield-${cycle}`}
            className="hp-shield-tag"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6, transition: { duration: 0.25 } }}
            transition={{ delay: 0.2, duration: 0.35 }}
          >
            <Shield size={11} strokeWidth={2} color="var(--primary)" />
            <span>Reviewing</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
