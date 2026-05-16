import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import Icon from '../components/Icon.jsx';
import TrustNumber from '../components/TrustNumber.jsx';
import HeroPipeline from '../components/HeroPipeline.jsx';
import { PARTNERS } from '../data/modules.jsx';

const STARTUP_STEPS = [
  { t: 'Describe your idea', d: "Tell us what you're building in your own words." },
  { t: 'We surface matching modules', d: 'With a specific explanation of how each fits your project.' },
  { t: 'Read the I/O contract', d: 'Inputs, outputs, side effects — in plain English.' },
  { t: 'Integrate via API', d: 'One key, one endpoint, one call.' },
];

const HACKER_STEPS = [
  { t: 'Paste your GitHub link', d: "That's the whole submission. We do the rest." },
  { t: 'We analyze the repo', d: 'Stack, structure, I/O contract — auto-generated from your code.' },
  { t: 'Review your listing', d: 'Edit anything we got wrong. Most hackers ship in 90 seconds.' },
  { t: 'Pick your payout', d: 'Lump sum or royalty. You keep 80% on every sale.' },
];

const heroContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

const heroItem = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.2, 0.7, 0.2, 1] },
  },
};

const vizItem = {
  hidden: { opacity: 0, x: 32 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.7, ease: [0.2, 0.7, 0.2, 1], delay: 0.4 },
  },
};

export default function Landing({ go }) {
  return (
    <main className="fade-in">
      <section className="v4-hero-shell hero-shell-split">
        <div className="hero-grid">
          <motion.div
            className="hero-col-text"
            initial="hidden"
            animate="visible"
            variants={heroContainer}
          >
            <motion.h1 className="hero-h1" variants={heroItem}>
              The modules your<br />
              startup needs<br />
              <strong>already exist.</strong><br />
              Someone built them<br />
              last weekend.
            </motion.h1>

            <motion.div className="hero-ctas" variants={heroItem}>
              <button className="v4-btn-primary" onClick={() => go('discovery')}>
                <span className="v4-shimmer" aria-hidden="true" />
                <span className="v4-btn-label">
                  Start building <ArrowRight size={16} strokeWidth={2} />
                </span>
              </button>
              <button className="v4-btn-ghost" onClick={() => go('submit')}>
                Submit your build
              </button>
            </motion.div>

            <motion.div className="hero-stats" variants={heroItem}>
              <div><TrustNumber target={342} />&nbsp;&nbsp;modules listed</div>
              <div><TrustNumber target={89} />&nbsp;&nbsp;startups served</div>
              <div><TrustNumber target={127} prefix="$" suffix="K" />&nbsp;&nbsp;paid to builders</div>
            </motion.div>
          </motion.div>

          <motion.div
            className="hero-col-viz"
            initial="hidden"
            animate="visible"
            variants={vizItem}
          >
            <HeroPipeline />
          </motion.div>
        </div>
      </section>

      <div className="v5-logos">
        <span className="label">Sourced from</span>
        {PARTNERS.map((p) => (
          <div key={p} className="v5-logo">{p}</div>
        ))}
      </div>

      <section className="v4-section v5-section-stagger">
        <div className="v4-section-head">
          <div className="v4-eyebrow">How it works</div>
          <h2>Two sides. Same workflow.</h2>
        </div>

        <div className="v4-hiw-grid">
          <div className="v4-hiw-card">
            <div className="v4-eyebrow">For startups</div>
            <h3>Stop rebuilding the same module.</h3>
            <div className="v4-hiw-steps">
              {STARTUP_STEPS.map((s, i) => (
                <div className="v4-hiw-step" key={s.t}>
                  <div className="v4-hiw-num">{i + 1}</div>
                  <div>
                    <div className="v4-hiw-title">{s.t}</div>
                    <div className="v4-hiw-desc">{s.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="v4-hiw-card dark">
            <div className="v4-eyebrow">For hackers</div>
            <h3>Stop letting your hacks rot.</h3>
            <div className="v4-hiw-steps">
              {HACKER_STEPS.map((s, i) => (
                <div className="v4-hiw-step" key={s.t}>
                  <div className="v4-hiw-num">{i + 1}</div>
                  <div>
                    <div className="v4-hiw-title" style={{ color: '#fff' }}>{s.t}</div>
                    <div className="v4-hiw-desc">{s.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="v4-bottom-cta">
          <button className="v4-btn-primary" onClick={() => go('discovery')}>
            <span className="v4-shimmer" aria-hidden="true" />
            <span className="v4-btn-label">
              Try it now <Icon name="arrow-right" size={16} />
            </span>
          </button>
          <div className="muted">Describe your idea and see matched modules in 4 seconds.</div>
        </div>
      </section>

      <div className="v5-pre-footer" />
    </main>
  );
}
