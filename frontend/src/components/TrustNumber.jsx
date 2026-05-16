import { useEffect, useRef, useState } from 'react';

function useCountUp(target, durationMs = 1500) {
  const [value, setValue] = useState(0);
  const targetRef = useRef(target);
  useEffect(() => {
    targetRef.current = target;
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(targetRef.current * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return value;
}

export default function TrustNumber({ target, prefix = '', suffix = '' }) {
  const v = useCountUp(target);
  return (
    <span className="num">
      <span className="v4-count">{prefix}{v.toLocaleString()}{suffix}</span>
    </span>
  );
}
