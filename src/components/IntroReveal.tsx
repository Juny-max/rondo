import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';

interface IntroRevealProps {
  skipImmediately: boolean;
  onExitStart?: () => void;
  onComplete: () => void;
}

const LETTERS = ['r', 'o', 'n', 'd', 'o'];
const LUXURY_EASE = [0.16, 1, 0.3, 1] as const;

export function IntroReveal({
  skipImmediately,
  onExitStart,
  onComplete,
}: IntroRevealProps) {
  const [phase, setPhase] = useState<'reveal' | 'exit' | 'done'>(
    skipImmediately ? 'done' : 'reveal',
  );
  const onExitStartRef = useRef(onExitStart);
  onExitStartRef.current = onExitStart;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const counterRef = useRef<HTMLSpanElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const exitingRef = useRef(false);
  const finishedRef = useRef(false);

  const startExit = () => {
    if (exitingRef.current || finishedRef.current) return;
    exitingRef.current = true;
    setPhase('exit');
    onExitStartRef.current?.();
  };

  const finishOnce = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (!exitingRef.current) {
      exitingRef.current = true;
      onExitStartRef.current?.();
    }
    setPhase('done');
    onCompleteRef.current();
  };

  useEffect(() => {
    if (skipImmediately) {
      finishOnce();
      return;
    }

    // Use clamped rAF-accumulated time so initial page/GPU load never burns through the preloader unseen
    const durationMs = 1500;
    let accumulatedMs = 0;
    let lastTs = performance.now();
    let rafId = 0;
    let exitScheduled = false;

    const tickProgress = (now: number) => {
      const frameDelta = Math.min(Math.max(now - lastTs, 0), 42);
      lastTs = now;
      accumulatedMs = Math.min(durationMs, accumulatedMs + frameDelta);

      const raw = accumulatedMs / durationMs;
      const eased = 1 - Math.pow(1 - raw, 3);
      const pct = Math.round(eased * 100);

      if (counterRef.current) {
        counterRef.current.textContent = `${String(pct).padStart(2, '0')}%`;
      }
      if (barRef.current) {
        barRef.current.style.transform = `scaleX(${eased})`;
      }

      if (accumulatedMs < durationMs) {
        rafId = requestAnimationFrame(tickProgress);
      } else if (!exitScheduled) {
        exitScheduled = true;
        startExit();
      }
    };

    rafId = requestAnimationFrame(tickProgress);

    // Safety fallback so preloader can never get stuck if tab is backgrounded
    const safetyTimer = window.setTimeout(() => startExit(), 3200);

    return () => {
      cancelAnimationFrame(rafId);
      window.clearTimeout(safetyTimer);
    };
  }, [skipImmediately]);

  useEffect(() => {
    if (phase !== 'exit') return;
    const tDone = window.setTimeout(() => finishOnce(), 620);
    return () => window.clearTimeout(tDone);
  }, [phase]);

  if (phase === 'done') return null;

  return (
    <motion.div
      data-testid="intro-preloader"
      initial={{ y: '0%' }}
      animate={phase === 'exit' ? { y: '-100%' } : { y: '0%' }}
      transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#F6F4EF] text-[#141413] px-6 select-none will-change-transform"
      aria-label="Loading rondo showcase"
    >
      <div className="flex flex-col items-center gap-6">
        {/* Dual-ring glazed torus emblem (pure CSS keyframe spin + GPU scale) */}
        <motion.div
          initial={{ scale: 0.72, opacity: 0 }}
          animate={
            phase === 'exit'
              ? { scale: 0.86, opacity: 0 }
              : { scale: 1, opacity: 1 }
          }
          transition={{ duration: 0.45, ease: LUXURY_EASE }}
          className="relative w-12 h-12 flex items-center justify-center will-change-transform"
          aria-hidden="true"
        >
          <div className="absolute inset-0 rounded-full border-[3px] border-[#141413]/10" />
          <div
            className="absolute inset-0 rounded-full border-[5px] border-transparent border-t-[#C84B17] border-r-[#C84B17]/75 animate-spin will-change-transform"
            style={{ animationDuration: '1.1s' }}
          />
          <div className="w-3.5 h-3.5 rounded-full bg-[#141413]/15" />
        </motion.div>

        {/* Staggered baseline-masked kinetic rondo wordmark */}
        <motion.div
          className="flex items-baseline overflow-hidden py-1"
          animate={
            phase === 'exit'
              ? { y: -12, opacity: 0 }
              : { y: 0, opacity: 1 }
          }
          transition={{ duration: 0.34, ease: LUXURY_EASE }}
        >
          {LETTERS.map((char, idx) => (
            <motion.span
              key={`${char}-${idx}`}
              initial={{ y: '115%', opacity: 0 }}
              animate={{ y: '0%', opacity: 1 }}
              transition={{
                duration: 0.58,
                delay: 0.04 + idx * 0.055,
                ease: LUXURY_EASE,
              }}
              className={`font-display font-black text-5xl sm:text-7xl leading-none inline-block will-change-transform ${
                idx === 1 ? 'text-[#C84B17]' : 'text-[#141413]'
              }`}
            >
              {char}
            </motion.span>
          ))}
        </motion.div>

        {/* Smooth rAF-driven progress hairline + counter */}
        <motion.div
          className="w-52 sm:w-60 space-y-2.5 flex flex-col items-center"
          animate={phase === 'exit' ? { opacity: 0 } : { opacity: 1 }}
          transition={{ duration: 0.25 }}
        >
          <div className="w-full h-[2px] bg-[#141413]/12 rounded-full overflow-hidden">
            <div
              ref={barRef}
              className="h-full w-full bg-[#C84B17] origin-left will-change-transform"
              style={{ transform: 'scaleX(0)' }}
            />
          </div>
          <div className="w-full flex items-center justify-between text-[11px] font-semibold tracking-wider uppercase text-[#141413]/60">
            <span>48h Artisanal Brioche</span>
            <span ref={counterRef} className="font-mono-tabular text-[#141413]/80">
              00%
            </span>
          </div>
        </motion.div>
      </div>

      <motion.button
        type="button"
        initial={{ opacity: 0, y: 8 }}
        animate={phase === 'exit' ? { opacity: 0 } : { opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.35, ease: LUXURY_EASE }}
        onClick={startExit}
        className="mt-10 px-5 py-2.5 text-xs font-semibold text-[#141413]/75 hover:text-[#141413] border border-[#141413]/15 hover:border-[#141413]/35 rounded-xl cursor-pointer transition-colors"
      >
        Enter Bakery
      </motion.button>
    </motion.div>
  );
}
