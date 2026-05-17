import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon.jsx';

const API = import.meta.env?.VITE_API_URL || 'http://localhost:3000';

// Page labels the AI uses as context
const PAGE_LABELS = {
  landing:   'Home / landing page',
  discovery: 'Discovery / marketplace search',
  submit:    'Submit a tool (seller flow)',
  dashboard: 'Seller dashboard',
};

function formatPrice(price, model) {
  const d = Math.round((price ?? 0) / 100);
  return model === 'royalty' ? `$${d}/mo` : (d === 0 ? 'Free' : `$${d}`);
}

// ── Lightweight markdown renderer ─────────────────────────────────────────────
function parseInline(str) {
  const parts = [];
  // matches **bold** or *italic*
  const re = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  let last = 0, m;
  while ((m = re.exec(str)) !== null) {
    if (m.index > last) parts.push(str.slice(last, m.index));
    if (m[1] != null) parts.push(<strong key={m.index}>{m[1]}</strong>);
    else               parts.push(<em key={m.index}>{m[2]}</em>);
    last = m.index + m[0].length;
  }
  if (last < str.length) parts.push(str.slice(last));
  return parts.length ? parts : [str];
}

function MarkdownText({ text }) {
  if (!text) return null;
  const lines = text.split('\n');
  const out = [];
  let listItems = [];
  let listType = null;

  function flushList() {
    if (!listItems.length) return;
    const Tag = listType;
    out.push(<Tag key={`list-${out.length}`} className="ai-md-list">{listItems}</Tag>);
    listItems = [];
    listType = null;
  }

  lines.forEach((line, i) => {
    const ul = line.match(/^[-*]\s+(.+)/);
    const ol = line.match(/^\d+\.\s+(.+)/);
    if (ul) {
      if (listType === 'ol') flushList();
      listType = 'ul';
      listItems.push(<li key={i}>{parseInline(ul[1])}</li>);
    } else if (ol) {
      if (listType === 'ul') flushList();
      listType = 'ol';
      listItems.push(<li key={i}>{parseInline(ol[1])}</li>);
    } else {
      flushList();
      if (line.trim() === '') {
        if (out.length && out[out.length - 1]?.type !== 'br')
          out.push(<br key={`br-${i}`} />);
      } else {
        out.push(<p key={i} className="ai-md-p">{parseInline(line)}</p>);
      }
    }
  });
  flushList();
  return <div className="ai-md">{out}</div>;
}

// ── Inline module card ─────────────────────────────────────────────────────────
function ModuleCard({ m, onOpen }) {
  return (
    <button className="ai-module-card" onClick={() => onOpen?.(m)}>
      <div className="ai-module-card-top">
        <span className="ai-module-card-name">{m.name}</span>
        <span className="ai-module-card-pill">{m.category}</span>
      </div>
      <div className="ai-module-card-desc">
        {m.description?.slice(0, 90)}{m.description?.length > 90 ? '…' : ''}
      </div>
      <div className="ai-module-card-footer">
        <span className="ai-module-card-price">{formatPrice(m.price, m.pricingModel)}</span>
        {m.rating != null && <span className="ai-module-card-rating">★ {m.rating.toFixed(1)}</span>}
        {m.techStack?.slice(0, 2).map((t) => (
          <span key={t} className="ai-module-card-tag">{t}</span>
        ))}
        <span className="ai-module-card-complexity">{m.complexity}</span>
      </div>
    </button>
  );
}

// ── Stats mini-card ────────────────────────────────────────────────────────────
function StatsCard({ stats }) {
  if (!stats) return null;
  return (
    <div className="ai-stats-card">
      {stats.map((s) => (
        <div key={s.label} className="ai-stats-item">
          <div className="ai-stats-value">{s.value}</div>
          <div className="ai-stats-label">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function AiChat({ go, route, messages, setMessages }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Voice
  const [recording, setRecording] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 120);
  }, [open]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  async function sendMessage(text) {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput('');

    // Include current page as implicit context in the last user message
    const pageCtx = PAGE_LABELS[route] ? ` [User is currently on: ${PAGE_LABELS[route]}]` : '';
    const userMsg = { role: 'user', content };
    const userMsgWithCtx = { role: 'user', content: content + pageCtx };

    const displayHistory = [...messages, userMsg];
    setMessages(displayHistory);
    setLoading(true);

    // Build the history we send to the API — inject page context only on the latest message
    const apiHistory = [
      ...messages.map((m) => ({ role: m.role, content: m.content })).filter((m) => m.role === 'user' || m.role === 'assistant'),
    ];
    // Replace last element with context-annotated version
    const apiMessages = [...apiHistory, userMsgWithCtx];

    try {
      const res = await fetch(`${API}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const assistantMsg = {
        role: 'assistant',
        content: data.reply,
        modules: data.modules,
        stats: data.stats,
        action: data.action,
      };
      setMessages([...displayHistory, assistantMsg]);

      if (data.action?.type === 'navigate' && go) {
        const page = data.action.page;
        setToast(`Taking you to ${page}…`);
        setTimeout(() => { go(page); setOpen(false); }, 900);
      }
    } catch {
      setMessages([...displayHistory, {
        role: 'assistant',
        content: "Sorry, I couldn't reach the server. Make sure the backend is running!",
      }]);
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  // ── Voice ──────────────────────────────────────────────────────────────────
  async function toggleRecording() {
    if (recording) { mediaRecorderRef.current?.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        setRecording(false);
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        if (!blob.size) return;
        setVoiceLoading(true);
        try {
          const base64 = await blobToBase64(blob);
          const res = await fetch(`${API}/api/voice`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audio: base64, mimeType: 'audio/webm' }),
          });
          if (!res.ok) throw new Error();
          const { text } = await res.json();
          if (text) sendMessage(text);
        } catch {
          setMessages((prev) => [...prev, {
            role: 'assistant',
            content: 'Voice transcription failed — add GROQ_API_KEY to backend .env to enable it.',
          }]);
        } finally {
          setVoiceLoading(false);
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setTimeout(() => { if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop(); }, 30000);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Microphone access was denied.' }]);
    }
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function clearChat() {
    setMessages([messages[0]]); // keep the welcome message
    setInput('');
  }

  const QUICK_ACTIONS = [
    { label: '🔍 Browse all tools', msg: 'Show me all available tools in the marketplace' },
    { label: '📊 Marketplace stats', msg: 'Give me the marketplace stats and overview' },
    { label: '🏗️ Recommend for my project', msg: "I'm building a new project and need API tools — can you help me figure out what I need?" },
    { label: '💰 Submit my tool', msg: 'How do I submit my project to Hackmarket and earn money?' },
  ];

  const showQuickActions = messages.length <= 1 && !loading;
  const unread = !open && messages.length > 1 && messages[messages.length - 1].role === 'assistant';

  return createPortal(
    <div className="ai-chat-widget">
      {/* Toast */}
      {toast && <div className="ai-chat-toast">{toast}</div>}

      {/* Panel — expands upward when open */}
      {open && (
        <div className="ai-chat-panel">
          {/* Header */}
          <div className="ai-chat-header">
            <div className="ai-chat-header-info">
              <div className="ai-chat-avatar"><Icon name="sparkle" size={14} color="white" /></div>
              <div>
                <div className="ai-chat-name">Hackmarket AI</div>
                <div className="ai-chat-status">
                  <span className="ai-chat-dot" />
                  Online · search · recommend · navigate
                </div>
              </div>
            </div>
            <div className="ai-chat-header-actions">
              <button className="ai-chat-clear" onClick={clearChat} title="Clear chat">
                <Icon name="refresh-cw" size={14} stroke={2} />
              </button>
              <button className="ai-chat-close" onClick={() => setOpen(false)} title="Close">
                <Icon name="x" size={16} stroke={2.2} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="ai-chat-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`ai-chat-msg ai-chat-msg--${msg.role}`}>
                {msg.role === 'assistant' && (
                  <div className="ai-chat-msg-avatar"><Icon name="sparkle" size={11} color="white" /></div>
                )}
                <div className="ai-chat-msg-col">
                  {msg.content && (
                    <div className="ai-chat-msg-bubble">
                      {msg.role === 'assistant'
                        ? <MarkdownText text={msg.content} />
                        : msg.content}
                    </div>
                  )}

                  {/* Inline stats */}
                  {msg.stats && <StatsCard stats={msg.stats} />}

                  {/* Inline module cards */}
                  {msg.modules?.length > 0 && (
                    <div className="ai-module-cards">
                      {msg.modules.map((m) => (
                        <ModuleCard
                          key={m.id}
                          m={m}
                          onOpen={() => { if (go) { go('discovery'); setOpen(false); } }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Navigation badge */}
                  {msg.action?.type === 'navigate' && (
                    <div className="ai-nav-badge">
                      <Icon name="arrow-right" size={12} stroke={2} />
                      Navigating to {msg.action.page}…
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {(loading || voiceLoading) && (
              <div className="ai-chat-msg ai-chat-msg--assistant">
                <div className="ai-chat-msg-avatar"><Icon name="sparkle" size={11} color="white" /></div>
                <div className="ai-chat-msg-bubble ai-chat-typing"><span /><span /><span /></div>
              </div>
            )}

            {/* Quick-action pills */}
            {showQuickActions && (
              <div className="ai-quick-actions">
                {QUICK_ACTIONS.map((a) => (
                  <button key={a.label} className="ai-quick-pill" onClick={() => sendMessage(a.msg)}>
                    {a.label}
                  </button>
                ))}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="ai-chat-input-row">
            <button
              className={`ai-chat-mic ${recording ? 'ai-chat-mic--active' : ''}`}
              onClick={toggleRecording}
              disabled={loading || voiceLoading}
              title={recording ? 'Stop recording' : 'Speak your message'}
            >
              {recording
                ? <Icon name="square" size={14} stroke={2.5} />
                : <Icon name="mic" size={16} stroke={2} />}
            </button>
            <textarea
              ref={inputRef}
              className="ai-chat-input"
              placeholder={recording ? 'Listening…' : 'Ask anything or describe your project…'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              disabled={recording}
            />
            <button
              className="ai-chat-send"
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
            >
              <Icon name="arrow-right" size={16} stroke={2} />
            </button>
          </div>
        </div>
      )}

      {/* Trigger bar — always visible at the bottom */}
      <button
        className={`ai-chat-bubble ${open ? 'ai-chat-bubble--open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close AI assistant' : 'Open AI assistant'}
      >
        <Icon name="sparkle" size={15} color={open ? 'var(--primary)' : 'white'} />
        <span className="ai-chat-bubble-label">{open ? 'AI Chat' : 'AI Chat'}</span>
        {!open && unread && <span className="ai-chat-unread" />}
        <Icon name={open ? 'chevron-down' : 'chevron-up'} size={14} stroke={2.2} color={open ? 'var(--ink-3)' : 'rgba(255,255,255,0.8)'} />
      </button>
    </div>,
    document.body
  );
}
