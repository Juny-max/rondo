import { useRef, type ReactNode } from 'react';
import { motion, useInView } from 'motion/react';

const EDITORIAL_EASE = [0.22, 1, 0.36, 1] as const;

interface EditorialBlockProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  reducedMotion?: boolean;
  /** Set true for Hero elements that animate on introDone rather than IntersectionObserver */
  immediate?: boolean;
  active?: boolean;
  /** Keep visible once revealed (recommended for interactive forms/cards) */
  once?: boolean;
}

export function MaskedLineRise({
  children,
  delay = 0,
  className = '',
  reducedMotion = false,
  immediate = false,
  active = true,
  once = false,
}: EditorialBlockProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inView = useInView(containerRef, { once, amount: 0.01 });
  const visible = immediate ? active : inView;

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div ref={containerRef} className={`overflow-hidden pr-1 ${className}`}>
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={visible ? { y: '0%', opacity: 1 } : { y: '100%', opacity: 0 }}
        transition={{ duration: 0.6, delay, ease: EDITORIAL_EASE }}
      >
        {children}
      </motion.div>
    </div>
  );
}

export function EditorialReveal({
  children,
  delay = 0,
  className = '',
  reducedMotion = false,
  immediate = false,
  active = true,
  once = false,
}: EditorialBlockProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inView = useInView(containerRef, { once, amount: 0.01 });
  const visible = immediate ? active : inView;

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div ref={containerRef} className={className}>
      <motion.div
        initial={{ y: 18, opacity: 0 }}
        animate={visible ? { y: 0, opacity: 1 } : { y: 18, opacity: 0 }}
        transition={{ duration: 0.52, delay, ease: EDITORIAL_EASE }}
      >
        {children}
      </motion.div>
    </div>
  );
}

interface EditorialRuleProps {
  className?: string;
  align?: 'left' | 'right' | 'center';
  delay?: number;
  reducedMotion?: boolean;
  immediate?: boolean;
  active?: boolean;
  once?: boolean;
}

export function EditorialRule({
  className = 'bg-white/25',
  align = 'left',
  delay = 0.08,
  reducedMotion = false,
  immediate = false,
  active = true,
  once = false,
}: EditorialRuleProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inView = useInView(containerRef, { once, amount: 0.01 });
  const visible = immediate ? active : inView;

  const originClass =
    align === 'right'
      ? 'origin-right'
      : align === 'center'
        ? 'origin-center'
        : 'origin-left';

  if (reducedMotion) {
    return <div className={`h-px w-full ${className}`} />;
  }

  return (
    <div ref={containerRef} className="w-full overflow-hidden">
      <motion.div
        className={`h-px w-full ${originClass} ${className}`}
        initial={{ scaleX: 0, opacity: 0.35 }}
        animate={visible ? { scaleX: 1, opacity: 1 } : { scaleX: 0, opacity: 0.35 }}
        transition={{ duration: 0.6, delay, ease: EDITORIAL_EASE }}
      />
    </div>
  );
}
