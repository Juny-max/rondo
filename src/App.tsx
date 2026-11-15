import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowDown, ArrowRight } from 'lucide-react';
import { ConfiguratorSection } from './components/ConfiguratorSection';
import {
  EditorialReveal,
  EditorialRule,
  MaskedLineRise,
} from './components/EditorialMotion';
import { BakeryFooter, GalleryAndFooter } from './components/GalleryAndFooter';
import { IntroReveal } from './components/IntroReveal';
import { Navbar } from './components/Navbar';
import { OrderDrawer } from './components/OrderDrawer';
import {
  BoxSizeId,
  CameraPresetId,
  DrizzleStyle,
  ToppingStyle,
  getFlavorById,
} from './data/donuts';
import { DonutStage } from './three/DonutStage';
import {
  CartItem,
  addCartItem,
  calculateOrderTotal,
  updateCartQuantity,
} from './utils/cart';
import {
  CHAPTERS,
  ChapterId,
  StagePose,
  computeScrollSample,
  evaluateStagePose,
} from './utils/choreography';

export default function App() {
  const skipIntro =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('autostart') === '1';

  const [reducedMotion, setReducedMotion] = useState(false);
  const [heroEntered, setHeroEntered] = useState(skipIntro);
  const [introDone, setIntroDone] = useState(skipIntro);
  const [activeChapterId, setActiveChapterId] = useState<ChapterId>('hero');
  const [activeBgHex, setActiveBgHex] = useState(CHAPTERS[0].bgHex);

  // Configurator state
  const [configFlavorId, setConfigFlavorId] = useState<string>('valrhona');
  const [configDrizzle, setConfigDrizzle] = useState<DrizzleStyle>('ribbon');
  const [configTopping, setConfigTopping] = useState<ToppingStyle>('none');
  const [configBoxSize, setConfigBoxSize] = useState<BoxSizeId>('half');
  const [cameraPreset, setCameraPreset] = useState<CameraPresetId>('hero');

  // Cart & Order Drawer state
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Mutable 3D pose & drag refs so scroll/drag never trigger canvas teardown
  const poseRef = useRef<StagePose>(
    evaluateStagePose({ chapterIndex: 0, blend: 0 }, false),
  );
  const dragDeltaRef = useRef({ yaw: 0, pitch: 0 });
  const sectionRefs = useRef<Array<HTMLElement | null>>([]);
  const activeChapterRef = useRef<ChapterId>('hero');

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Scroll choreography observer
  useEffect(() => {
    const updateFromScroll = () => {
      const elements = sectionRefs.current;
      const rects = CHAPTERS.map((_, i) => {
        const el = elements[i];
        if (!el) return { top: i * window.innerHeight, height: window.innerHeight };
        const r = el.getBoundingClientRect();
        return { top: r.top, height: r.height };
      });

      const sample = computeScrollSample(rects, window.innerHeight || 900);
      const isNarrow = window.innerWidth < 1024;
      const pose = evaluateStagePose(sample, isNarrow);
      poseRef.current = pose;

      const chapterDef = CHAPTERS[sample.chapterIndex] ?? CHAPTERS[0];
      const nextChapterId = pose.chapterId;

      if (activeChapterRef.current !== nextChapterId) {
        activeChapterRef.current = nextChapterId;
        setActiveChapterId(nextChapterId);
        document.body.dataset.chapter = nextChapterId;
      }

      const activeDef = CHAPTERS.find((c) => c.id === nextChapterId) ?? chapterDef;
      setActiveBgHex(activeDef.bgHex);
    };

    updateFromScroll();
    window.addEventListener('scroll', updateFromScroll, { passive: true });
    window.addEventListener('resize', updateFromScroll);
    return () => {
      window.removeEventListener('scroll', updateFromScroll);
      window.removeEventListener('resize', updateFromScroll);
    };
  }, []);

  const handleNavigate = useCallback((sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const handleSelectFlavor = useCallback((id: string) => {
    const flavor = getFlavorById(id);
    setConfigFlavorId(id);
    setConfigDrizzle(flavor.defaultDrizzle);
    setConfigTopping(flavor.defaultTopping);
  }, []);

  const handleJumpWithFlavor = useCallback(
    (flavorId: string) => {
      handleSelectFlavor(flavorId);
      handleNavigate('configurator');
    },
    [handleNavigate, handleSelectFlavor],
  );

  const handleStagePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest('button, a, input, select')) return;
      let lastX = e.clientX;
      let lastY = e.clientY;

      const onMove = (ev: PointerEvent) => {
        const dx = ev.clientX - lastX;
        const dy = ev.clientY - lastY;
        lastX = ev.clientX;
        lastY = ev.clientY;
        dragDeltaRef.current.yaw += dx * 0.008;
        dragDeltaRef.current.pitch = Math.max(
          -0.8,
          Math.min(0.8, dragDeltaRef.current.pitch + dy * 0.006),
        );
      };

      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [],
  );

  const handleAddToBox = useCallback(() => {
    setCartItems((prev) =>
      addCartItem(prev, {
        flavorId: configFlavorId,
        drizzle: configDrizzle,
        topping: configTopping,
        boxSize: configBoxSize,
      }),
    );
    setIsDrawerOpen(true);
  }, [configBoxSize, configDrizzle, configFlavorId, configTopping]);

  const handleUpdateQty = useCallback((key: string, delta: number) => {
    setCartItems((prev) => updateCartQuantity(prev, key, delta));
  }, []);

  const { totalCount } = calculateOrderTotal(cartItems, 'pickup');
  const isLightSurface =
    activeChapterId === 'starburst' || activeChapterId === 'gallery';

  const handleIntroExitStart = useCallback(() => {
    setHeroEntered(true);
  }, []);

  const handleIntroComplete = useCallback(() => {
    setHeroEntered(true);
    setIntroDone(true);
  }, []);

  const registerSection = (index: number) => (el: HTMLElement | null) => {
    sectionRefs.current[index] = el;
  };

  return (
    <div
      className="min-h-screen transition-colors duration-500 ease-out relative"
      style={{ backgroundColor: activeBgHex }}
      data-active-chapter={activeChapterId}
      data-intro-done={introDone ? 'true' : 'false'}
    >
      {!introDone && (
        <IntroReveal
          skipImmediately={skipIntro || reducedMotion}
          onExitStart={handleIntroExitStart}
          onComplete={handleIntroComplete}
        />
      )}

      <Navbar
        isLightSurface={isLightSurface}
        cartCount={totalCount}
        onOpenCart={() => setIsDrawerOpen(true)}
        onNavigate={handleNavigate}
      />

      {/* Persistent Fixed WebGL 3D Donut Stage */}
      <DonutStage
        poseRef={poseRef}
        configFlavorId={configFlavorId}
        configDrizzle={configDrizzle}
        configTopping={configTopping}
        cameraPreset={cameraPreset}
        dragDeltaRef={dragDeltaRef}
        reducedMotion={reducedMotion}
        pauseRender={!heroEntered}
      />

      <main>
        {/* Chapter 0: Hero */}
        <section
          id="hero"
          ref={registerSection(0)}
          data-chapter="hero"
          onPointerDown={handleStagePointerDown}
          className="relative z-20 min-h-screen flex flex-col justify-between pt-24 pb-10 px-5 sm:px-8 cursor-grab active:cursor-grabbing"
        >
          <div className="max-w-7xl mx-auto w-full space-y-4">
            <h1
              aria-label="glazed."
              className="font-display font-black text-[clamp(3.15rem,9.2vw,7.5rem)] leading-[0.86] text-white select-none pt-1 flex overflow-hidden pr-2"
            >
              {['g', 'l', 'a', 'z', 'e', 'd', '.'].map((glyph, idx) =>
                reducedMotion ? (
                  <span key={`${glyph}-${idx}`} className="inline-block">
                    {glyph}
                  </span>
                ) : (
                  <motion.span
                    key={`${glyph}-${idx}`}
                    initial={{ y: '115%', opacity: 0, rotate: 6 }}
                    animate={
                      heroEntered
                        ? { y: '0%', opacity: 1, rotate: 0 }
                        : { y: '115%', opacity: 0, rotate: 6 }
                    }
                    transition={{
                      duration: 0.72,
                      delay: (skipIntro ? 0.04 : 0.16) + idx * 0.045,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="inline-block will-change-transform origin-bottom-left"
                  >
                    {glyph}
                  </motion.span>
                ),
              )}
            </h1>
          </div>

          <div className="max-w-7xl mx-auto w-full flex flex-col sm:flex-row sm:items-end justify-between gap-6 pt-44">
            <div className="max-w-md space-y-5">
              {reducedMotion ? (
                <p className="text-base sm:text-[17px] text-white/95 leading-relaxed font-medium drop-shadow-[0_1px_10px_rgba(0,0,0,0.28)]">
                  Hand-proofed sourdough brioche dipped warm in single-origin Valrhona ganache, Kyoto matcha, and whipped berry cream.
                </p>
              ) : (
                <div className="overflow-hidden">
                  <motion.p
                    initial={{ y: 28, opacity: 0, filter: 'blur(6px)' }}
                    animate={
                      heroEntered
                        ? { y: 0, opacity: 1, filter: 'blur(0px)' }
                        : { y: 28, opacity: 0, filter: 'blur(6px)' }
                    }
                    transition={{
                      duration: 0.72,
                      delay: skipIntro ? 0.18 : 0.38,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="text-base sm:text-[17px] text-white/95 leading-relaxed font-medium drop-shadow-[0_1px_10px_rgba(0,0,0,0.28)] will-change-transform"
                  >
                    Hand-proofed sourdough brioche dipped warm in single-origin Valrhona ganache, Kyoto matcha, and whipped berry cream.
                  </motion.p>
                </div>
              )}

              <EditorialReveal
                immediate
                active={heroEntered}
                reducedMotion={reducedMotion}
                delay={skipIntro ? 0.3 : 0.56}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleNavigate('configurator')}
                    className="group px-6 py-3.5 rounded-xl bg-white text-[#141413] text-sm font-bold hover:bg-white/90 transition-colors cursor-pointer inline-flex items-center gap-2 min-h-[44px]"
                  >
                    <span>Build Your Box</span>
                    <ArrowRight
                      className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNavigate('starburst')}
                    className="px-6 py-3.5 rounded-xl border border-white/35 text-white text-sm font-semibold hover:bg-white/10 transition-colors cursor-pointer min-h-[44px]"
                  >
                    See All 6 Flavors
                  </button>
                </div>
              </EditorialReveal>
            </div>

            <EditorialReveal
              immediate
              active={heroEntered}
              reducedMotion={reducedMotion}
              delay={skipIntro ? 0.38 : 0.66}
              className="self-start sm:self-end"
            >
              <button
                type="button"
                onClick={() => handleNavigate('craft')}
                className="inline-flex items-center gap-2.5 text-[11px] font-mono-tabular uppercase tracking-[0.18em] text-white/80 hover:text-white transition-colors cursor-pointer py-2"
              >
                <span>Drag 3D or scroll</span>
                <ArrowDown className="w-4 h-4 animate-bounce" aria-hidden="true" />
              </button>
            </EditorialReveal>
          </div>
        </section>

        {/* Chapter 1: Craft Macro (Embossed Bakery Medallion & Proof Crumb) */}
        <section
          id="craft"
          ref={registerSection(1)}
          data-chapter="craft"
          className="relative z-20 min-h-screen flex items-center py-24 px-5 sm:px-8"
        >
          <div className="max-w-7xl mx-auto w-full">
            <div className="max-w-[410px] space-y-6">
              <div className="space-y-1">
                <MaskedLineRise reducedMotion={reducedMotion} delay={0.06}>
                  <h2 className="font-display font-black text-4xl sm:text-[52px] leading-[0.92] text-white">
                    made of
                  </h2>
                </MaskedLineRise>
                <MaskedLineRise reducedMotion={reducedMotion} delay={0.14}>
                  <span className="block font-display font-black text-4xl sm:text-[52px] leading-[0.92] text-[#FDE68A]">
                    slow brioche.
                  </span>
                </MaskedLineRise>
              </div>

              <EditorialRule reducedMotion={reducedMotion} delay={0.18} className="bg-white/25" />

              <EditorialReveal reducedMotion={reducedMotion} delay={0.22}>
                <p className="text-base sm:text-[17px] text-white/85 leading-relaxed">
                  Every batch rests 48 hours on cultured Normandy butter before meeting high-oleic oil—raising a cloud-light interior and pale golden proof equator.
                </p>
              </EditorialReveal>
            </div>
          </div>
        </section>

        {/* Chapter 2: Strawberry Milk Sprinkle */}
        <section
          id="berry"
          ref={registerSection(2)}
          data-chapter="berry"
          className="relative z-20 min-h-screen flex items-center py-24 px-5 sm:px-8"
        >
          <div className="max-w-7xl mx-auto w-full">
            <div className="max-w-[410px] space-y-6">
              <div className="space-y-1">
                <MaskedLineRise reducedMotion={reducedMotion} delay={0.06}>
                  <h2 className="font-display font-black text-4xl sm:text-[52px] leading-[0.92] text-white">
                    strawberry
                  </h2>
                </MaskedLineRise>
                <MaskedLineRise reducedMotion={reducedMotion} delay={0.14}>
                  <span className="block font-display font-black text-4xl sm:text-[52px] leading-[0.92] text-white/90">
                    milk glaze.
                  </span>
                </MaskedLineRise>
              </div>

              <EditorialRule reducedMotion={reducedMotion} delay={0.18} className="bg-white/30" />

              <EditorialReveal reducedMotion={reducedMotion} delay={0.22}>
                <p className="text-base sm:text-[17px] text-white/95 leading-relaxed drop-shadow-[0_1px_10px_rgba(0,0,0,0.28)]">
                  Whipped condensed milk steeped with freeze-dried Albion berries and showered in crisp pastel confetti sprinkles straight off the cooling rack.
                </p>
              </EditorialReveal>

              <EditorialReveal reducedMotion={reducedMotion} delay={0.28}>
                <button
                  type="button"
                  onClick={() => handleJumpWithFlavor('strawberry')}
                  className="group px-5 py-3.5 rounded-xl bg-white text-[#141413] text-sm font-bold hover:bg-white/90 transition-colors cursor-pointer inline-flex items-center gap-2 min-h-[44px]"
                >
                  <span>Customize Strawberry Milk</span>
                  <ArrowRight
                    className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </button>
              </EditorialReveal>
            </div>
          </div>
        </section>

        {/* Chapter 3: Uji Matcha Cloud (Right Column opposite Left Donut) */}
        <section
          id="matcha"
          ref={registerSection(3)}
          data-chapter="matcha"
          className="relative z-20 min-h-screen flex items-center py-24 px-5 sm:px-8"
        >
          <div className="max-w-7xl mx-auto w-full flex justify-end">
            <div className="max-w-[410px] w-full flex flex-col items-end text-right space-y-6">
              <div className="space-y-1 w-full">
                <MaskedLineRise reducedMotion={reducedMotion} delay={0.06}>
                  <h2 className="font-display font-black text-4xl sm:text-[52px] leading-[0.92] text-white">
                    uji
                  </h2>
                </MaskedLineRise>
                <MaskedLineRise reducedMotion={reducedMotion} delay={0.14}>
                  <span className="block font-display font-black text-4xl sm:text-[52px] leading-[0.92] text-[#ECFCCB]">
                    matcha.
                  </span>
                </MaskedLineRise>
              </div>

              <EditorialRule
                align="right"
                reducedMotion={reducedMotion}
                delay={0.18}
                className="bg-white/30"
              />

              <EditorialReveal reducedMotion={reducedMotion} delay={0.22}>
                <p className="text-base sm:text-[17px] text-white/95 leading-relaxed drop-shadow-[0_1px_12px_rgba(18,34,4,0.45)]">
                  Stone-milled Kyoto green tea whisked into silky ivory cocoa butter and finished with roasted Sicilian pistachio crumble.
                </p>
              </EditorialReveal>

              <EditorialReveal reducedMotion={reducedMotion} delay={0.28}>
                <button
                  type="button"
                  onClick={() => handleJumpWithFlavor('matcha')}
                  className="group px-5 py-3.5 rounded-xl bg-white text-[#141413] text-sm font-bold hover:bg-white/90 transition-colors cursor-pointer inline-flex items-center gap-2 min-h-[44px]"
                >
                  <span>Customize Uji Matcha</span>
                  <ArrowRight
                    className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </button>
              </EditorialReveal>
            </div>
          </div>
        </section>

        {/* Chapter 4: Salted Yuzu Gold (Sky Azure Chapter) */}
        <section
          id="yuzu"
          ref={registerSection(4)}
          data-chapter="yuzu"
          className="relative z-20 min-h-screen flex items-center py-24 px-5 sm:px-8"
        >
          <div className="max-w-7xl mx-auto w-full">
            <div className="max-w-[410px] space-y-6">
              <div className="space-y-1">
                <MaskedLineRise reducedMotion={reducedMotion} delay={0.06}>
                  <h2 className="font-display font-black text-4xl sm:text-[52px] leading-[0.92] text-white">
                    sky
                  </h2>
                </MaskedLineRise>
                <MaskedLineRise reducedMotion={reducedMotion} delay={0.14}>
                  <span className="block font-display font-black text-4xl sm:text-[52px] leading-[0.92] text-[#FEF08A]">
                    yuzu gold.
                  </span>
                </MaskedLineRise>
              </div>

              <EditorialRule reducedMotion={reducedMotion} delay={0.18} className="bg-white/30" />

              <EditorialReveal reducedMotion={reducedMotion} delay={0.22}>
                <p className="text-base sm:text-[17px] text-white/95 leading-relaxed drop-shadow-[0_1px_10px_rgba(0,0,0,0.3)]">
                  Bright Kochi yuzu reduction cut with flaky Maldon sea salt and hand-piped ribbons of browned Normandy butter vanilla.
                </p>
              </EditorialReveal>

              <EditorialReveal reducedMotion={reducedMotion} delay={0.28}>
                <button
                  type="button"
                  onClick={() => handleJumpWithFlavor('yuzu')}
                  className="group px-5 py-3.5 rounded-xl bg-white text-[#141413] text-sm font-bold hover:bg-white/90 transition-colors cursor-pointer inline-flex items-center gap-2 min-h-[44px]"
                >
                  <span>Customize Salted Yuzu</span>
                  <ArrowRight
                    className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </button>
              </EditorialReveal>
            </div>
          </div>
        </section>

        {/* Chapter 5: Six Glazes Radial Starburst */}
        <section
          id="starburst"
          ref={registerSection(5)}
          data-chapter="starburst"
          className="relative z-20 min-h-screen flex flex-col justify-between pt-20 pb-8 px-5 sm:px-8 text-[#141413]"
        >
          <div className="max-w-4xl mx-auto text-center">
            <MaskedLineRise reducedMotion={reducedMotion} delay={0.08}>
              <h2 className="font-display font-black text-3xl sm:text-5xl leading-[0.94] text-balance">
                six glazes. one dough.
              </h2>
            </MaskedLineRise>
          </div>

          <EditorialReveal
            reducedMotion={reducedMotion}
            delay={0.16}
            className="max-w-3xl mx-auto text-center space-y-3"
          >
            <p className="text-[11px] sm:text-xs font-mono-tabular uppercase tracking-[0.16em] text-[#141413]/70">
              Valrhona · Strawberry · Matcha · Yuzu · Blueberry · Midnight Sesame
            </p>
            <button
              type="button"
              onClick={() => handleNavigate('configurator')}
              className="group px-6 py-3 rounded-xl bg-[#141413] text-white text-sm font-bold hover:bg-[#2a2926] transition-colors cursor-pointer inline-flex items-center gap-2 min-h-[44px]"
            >
              <span>Mix Any Box of 6</span>
              <ArrowRight
                className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </button>
          </EditorialReveal>
        </section>

        {/* Chapter 6: After Dark */}
        <section
          id="afterdark"
          ref={registerSection(6)}
          data-chapter="afterdark"
          className="relative z-20 min-h-screen flex items-center py-24 px-5 sm:px-8"
        >
          <div className="max-w-7xl mx-auto w-full">
            <div className="max-w-[410px] space-y-6">
              <div className="space-y-1">
                <MaskedLineRise reducedMotion={reducedMotion} delay={0.06}>
                  <h2 className="font-display font-black text-4xl sm:text-[52px] leading-[0.92] text-white">
                    after
                  </h2>
                </MaskedLineRise>
                <MaskedLineRise reducedMotion={reducedMotion} delay={0.14}>
                  <span className="block font-display font-black text-4xl sm:text-[52px] leading-[0.92] text-[#EAB308]">
                    dark.
                  </span>
                </MaskedLineRise>
              </div>

              <EditorialRule reducedMotion={reducedMotion} delay={0.18} className="bg-white/20" />

              <EditorialReveal reducedMotion={reducedMotion} delay={0.22}>
                <p className="text-base sm:text-[17px] text-white/80 leading-relaxed">
                  Roasted black sesame paste folded into dark couverture, veined with white chocolate ribbons and 24K gold leaf for late espresso counters.
                </p>
              </EditorialReveal>

              <EditorialReveal reducedMotion={reducedMotion} delay={0.28}>
                <button
                  type="button"
                  onClick={() => handleJumpWithFlavor('sesame')}
                  className="group px-6 py-3.5 rounded-xl bg-[#EAB308] text-[#141413] text-sm font-bold hover:bg-[#FACC15] transition-colors cursor-pointer inline-flex items-center gap-2 min-h-[44px]"
                >
                  <span>Order Midnight Sesame</span>
                  <ArrowRight
                    className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </button>
              </EditorialReveal>
            </div>
          </div>
        </section>

        {/* Chapter 7: Gallery */}
        <div ref={registerSection(7)}>
          <GalleryAndFooter
            onSelectPresetFlavor={handleJumpWithFlavor}
            onNavigate={handleNavigate}
          />
        </div>

        {/* Chapter 8: Interactive 3D Configurator */}
        <div ref={registerSection(8)}>
          <ConfiguratorSection
            flavorId={configFlavorId}
            drizzle={configDrizzle}
            topping={configTopping}
            boxSize={configBoxSize}
            cameraPreset={cameraPreset}
            onSelectFlavor={handleSelectFlavor}
            onSelectDrizzle={setConfigDrizzle}
            onSelectTopping={setConfigTopping}
            onSelectBoxSize={setConfigBoxSize}
            onSelectCameraPreset={(p) => {
              dragDeltaRef.current = { yaw: 0, pitch: 0 };
              setCameraPreset(p);
            }}
            onResetDrag={() => {
              dragDeltaRef.current = { yaw: 0, pitch: 0 };
              setCameraPreset('hero');
            }}
            onAddToBox={handleAddToBox}
            onStagePointerDown={handleStagePointerDown}
          />
        </div>
      </main>

      <BakeryFooter onNavigate={handleNavigate} />

      <OrderDrawer
        isOpen={isDrawerOpen}
        items={cartItems}
        onClose={() => setIsDrawerOpen(false)}
        onUpdateQuantity={handleUpdateQty}
        onClearCart={() => setCartItems([])}
        onJumpToConfigurator={() => handleNavigate('configurator')}
      />
    </div>
  );
}
