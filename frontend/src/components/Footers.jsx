export function FullFooter() {
  return (
    <footer className="footer">
      <div className="container">
        <div>
          <div className="brand" style={{ color: '#fff' }}>
            <span className="brand-mark"><span>R</span></span>
            rotshop
          </div>
          <p style={{ color: '#94a3b8', fontSize: 14, marginTop: 14, maxWidth: 320, lineHeight: 1.6 }}>
            Production modules from people who built them at a hackathon. Verified by humans, integrated in minutes.
          </p>
        </div>
        <div>
          <h5>Startups</h5>
          <ul>
            <li><a>Start building</a></li>
            <li><a>Integration guide</a></li>
            <li><a>API reference</a></li>
            <li><a>Support</a></li>
          </ul>
        </div>
        <div>
          <h5>Hackers</h5>
          <ul>
            <li><a>Submit your build</a></li>
            <li><a>Review process</a></li>
            <li><a>Payouts</a></li>
            <li><a>Dashboard</a></li>
          </ul>
        </div>
        <div>
          <h5>Company</h5>
          <ul>
            <li><a>About</a></li>
            <li><a>Partner hackathons</a></li>
            <li><a>Trust &amp; safety</a></li>
            <li><a>Contact</a></li>
          </ul>
        </div>
        <div className="copy">© 2026 Rotshop, Inc. — Hackathon to production, one weekend at a time.</div>
      </div>
    </footer>
  );
}

export function MiniFooter() {
  return <div className="v4-mini-footer">© 2026 Rotshop</div>;
}
