export default function Nav({ route, go }) {
  const links = [
    { id: 'landing', label: 'Home' },
    { id: 'discovery', label: 'Start Building' },
    { id: 'submit', label: 'Submit' },
    { id: 'dashboard', label: 'Dashboard' },
  ];
  return (
    <nav className="nav">
      <div className="nav-inner">
        <button className="brand" onClick={() => go('landing')}>
          <span className="brand-mark"><span>R</span></span>
          rotshop
        </button>
        <div className="nav-links">
          {links.map((l) => (
            <button
              key={l.id}
              className={`nav-link ${route === l.id ? 'active' : ''}`}
              onClick={() => go(l.id)}
            >
              {l.label}
            </button>
          ))}
        </div>
        <div className="nav-right">
          <button className="btn btn-ghost btn-sm">Sign in</button>
          <button className="btn btn-vermillion btn-sm" onClick={() => go('discovery')}>
            Start building
          </button>
        </div>
      </div>
    </nav>
  );
}
