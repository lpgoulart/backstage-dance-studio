import { useEffect, useRef, useState } from 'react';
import { motion, useInView, animate, useReducedMotion } from 'framer-motion';

const EASE = [0.22, 1, 0.36, 1];

/** Fade-up on scroll into view */
export function Reveal({ children, delay = 0, y = 28, as = 'div', className, ...rest }) {
  const M = motion[as];
  return (
    <M
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.9, ease: EASE, delay }}
      {...rest}
    >
      {children}
    </M>
  );
}

/** Staggers its direct <Reveal.Item> children */
export function Stagger({ children, className, gap = 0.08, as = 'div' }) {
  const M = motion[as];
  return (
    <M className={className} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: gap } } }}>
      {children}
    </M>
  );
}
export const itemVariants = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } },
};

/**
 * Word-by-word masked reveal. Words wrapped in *asterisks* render in italic gold.
 */
export function SplitHeading({ text, as = 'h1', className, delay = 0 }) {
  const M = motion[as];
  const words = text.split(' ');
  return (
    <M className={className} initial="hidden" animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.075, delayChildren: delay } } }} aria-label={text.replace(/\*/g, '')}>
      {words.map((w, i) => {
        const em = w.startsWith('*');
        const clean = w.replace(/\*/g, '');
        return (
          <span className="word-mask" key={i} aria-hidden="true">
            <motion.span variants={{ hidden: { y: '110%', rotate: 4 }, show: { y: '0%', rotate: 0, transition: { duration: 1, ease: EASE } } }}>
              {em ? <em>{clean}</em> : clean}
            </motion.span>
            {i < words.length - 1 ? ' ' : ''}
          </span>
        );
      })}
    </M>
  );
}

/** Counts up from 0 when visible */
export function Counter({ value, duration = 1.8 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const reduce = useReducedMotion();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    if (reduce) { setN(value); return; }
    const c = animate(0, value, { duration, ease: EASE, onUpdate: (v) => setN(Math.round(v)) });
    return () => c.stop();
  }, [inView, value, duration, reduce]);
  return <span ref={ref}>{n.toLocaleString('pt-BR')}</span>;
}

/** Tracks the pointer inside an element and writes --x/--y CSS vars (spotlight effect) */
export function useSpotlight() {
  return (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--x', `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty('--y', `${e.clientY - r.top}px`);
  };
}
