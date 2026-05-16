import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { CATEGORIES, tokenize } from '../data/modules.jsx';

export default function Composer({ initialSegments, onSubmit }) {
  const [segments, setSegments] = useState(initialSegments || []);
  const [buffer, setBuffer] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (initialSegments) {
      setSegments(initialSegments);
      setBuffer('');
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [initialSegments]);

  function commitFromBuffer(nextBuffer) {
    const m = nextBuffer.match(/^(.*[\s,.;])(.*)$/s);
    if (!m) {
      setBuffer(nextBuffer);
      return;
    }
    const toCommit = m[1];
    const rest = m[2];
    const newTokens = tokenize(toCommit);
    setSegments((prev) => {
      const merged = [...prev];
      for (const seg of newTokens) {
        if (seg.type === 'text' && merged.length && merged[merged.length - 1].type === 'text') {
          merged[merged.length - 1] = { type: 'text', value: merged[merged.length - 1].value + seg.value };
        } else {
          merged.push(seg);
        }
      }
      return merged;
    });
    setBuffer(rest);
  }

  function onInputChange(e) {
    commitFromBuffer(e.target.value);
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
      return;
    }
    if (e.key === 'Backspace' && buffer === '' && segments.length > 0) {
      e.preventDefault();
      const last = segments[segments.length - 1];
      if (last.type === 'text' && last.value.length > 1) {
        const next = [...segments];
        next[next.length - 1] = { type: 'text', value: last.value.slice(0, -1) };
        setSegments(next);
      } else {
        setSegments(segments.slice(0, -1));
      }
    }
  }

  function removeTag(idx) {
    const next = segments.filter((_, i) => i !== idx);
    const merged = [];
    for (const s of next) {
      if (s.type === 'text' && merged.length && merged[merged.length - 1].type === 'text') {
        merged[merged.length - 1] = { type: 'text', value: merged[merged.length - 1].value + s.value };
      } else {
        merged.push(s);
      }
    }
    setSegments(merged);
    inputRef.current?.focus();
  }

  function addCategoryTag(cat) {
    const tag = { type: 'tag', value: cat, cat };
    const needsLeadingSpace =
      segments.length > 0 &&
      !(segments[segments.length - 1].type === 'text' && /\s$/.test(segments[segments.length - 1].value));
    setSegments((prev) => {
      const out = [...prev];
      if (needsLeadingSpace) out.push({ type: 'text', value: ' ' });
      out.push(tag);
      out.push({ type: 'text', value: ' ' });
      return out;
    });
    inputRef.current?.focus();
  }

  const hasContent = segments.length > 0 || buffer.trim().length > 0;
  const activeCats = new Set(segments.filter((s) => s.type === 'tag').map((s) => s.cat));

  function submit() {
    if (!hasContent) return;
    let finalSegs = segments;
    if (buffer.length > 0) {
      const tokens = tokenize(buffer);
      const merged = [...segments];
      for (const seg of tokens) {
        if (seg.type === 'text' && merged.length && merged[merged.length - 1].type === 'text') {
          merged[merged.length - 1] = { type: 'text', value: merged[merged.length - 1].value + seg.value };
        } else {
          merged.push(seg);
        }
      }
      finalSegs = merged;
    }
    onSubmit?.(finalSegs);
  }

  return (
    <div>
      <div
        ref={wrapRef}
        className={`v3-composer-wrap ${focused ? 'focused' : ''}`}
        onClick={() => inputRef.current?.focus()}
      >
        <div className="v3-composer-inline">
          {segments.map((seg, i) => {
            if (seg.type === 'text') {
              return <span key={i} className="v3-composer-text">{seg.value}</span>;
            }
            return (
              <span key={i} className="v3-tag">
                <span className="v3-tag-cat">{seg.cat}</span>
                <span>{seg.value}</span>
                <span
                  className="v3-tag-x"
                  onClick={(e) => { e.stopPropagation(); removeTag(i); }}
                  title="Remove"
                >
                  <Icon name="x" size={10} stroke={2.6} />
                </span>
              </span>
            );
          })}
          <input
            ref={inputRef}
            className="v3-composer-input"
            value={buffer}
            placeholder={segments.length === 0 ? "I'm building a…" : ''}
            onChange={onInputChange}
            onKeyDown={onKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={{ width: Math.max(120, (buffer.length + 1) * 9) + 'px' }}
          />
        </div>
        <button className="v3-composer-submit" disabled={!hasContent} onClick={submit}>
          Find modules <Icon name="arrow-right" size={14} />
        </button>
      </div>

      <div className="v3-chip-row">
        <span className="v3-chip-label">Add a category</span>
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            className={`v3-chip ${activeCats.has(c.id) ? 'active' : ''}`}
            onClick={() => addCategoryTag(c.id)}
            disabled={activeCats.has(c.id)}
            style={activeCats.has(c.id) ? { pointerEvents: 'none' } : {}}
          >
            <span className="plus">+</span> {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}
