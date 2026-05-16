import { useState } from 'react';
import Nav from './components/Nav.jsx';
import { FullFooter, MiniFooter } from './components/Footers.jsx';
import Landing from './screens/Landing.jsx';
import Discovery from './screens/Discovery.jsx';
import Submit from './screens/Submit.jsx';
import Dashboard from './screens/Dashboard.jsx';

export default function App() {
  const [route, setRoute] = useState('landing');

  function go(r) {
    setRoute(r);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  let screen, screenLabel, footer;
  if (route === 'landing') {
    screen = <Landing go={go} />;
    screenLabel = '01 Landing';
    footer = <FullFooter />;
  } else if (route === 'discovery') {
    screen = <Discovery key="d" />;
    screenLabel = '02 Discovery';
    footer = <MiniFooter />;
  } else if (route === 'submit') {
    screen = <Submit go={go} />;
    screenLabel = '03 Submit';
    footer = <MiniFooter />;
  } else if (route === 'dashboard') {
    screen = <Dashboard go={go} />;
    screenLabel = '04 Dashboard';
    footer = null;
  }

  return (
    <div className="app" data-screen-label={screenLabel} key={route}>
      <Nav route={route} go={go} />
      {screen}
      {footer}
    </div>
  );
}
