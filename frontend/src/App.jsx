import { useState } from 'react';
import Nav from './components/Nav.jsx';
import { FullFooter, MiniFooter } from './components/Footers.jsx';
import Landing from './screens/Landing.jsx';
import Discovery from './screens/Discovery.jsx';
import Submit from './screens/Submit.jsx';
import Dashboard from './screens/Dashboard.jsx';
import AiChat from './components/AiChat.jsx';

const WELCOME_MSG = {
  role: 'assistant',
  content: "Hey! I'm the Hackmarket Assistant 👋 Tell me what you're building and I'll search the marketplace, pull up module details, recommend tools for your stack, or take you anywhere in the app — just ask.",
};

export default function App() {
  const [route, setRoute] = useState('landing');
  // Chat state lives here so it survives page navigation
  const [chatMessages, setChatMessages] = useState([WELCOME_MSG]);

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
    // No key here — AiChat must NOT remount on navigation
    <div className="app" data-screen-label={screenLabel}>
      <Nav route={route} go={go} />
      {/* key only on the screen content so each page resets its own state */}
      <div key={route} style={{ display: 'contents' }}>
        {screen}
        {footer}
      </div>
      <AiChat
        go={go}
        route={route}
        messages={chatMessages}
        setMessages={setChatMessages}
      />
    </div>
  );
}
