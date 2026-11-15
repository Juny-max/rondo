import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowUpRight, Check } from 'lucide-react';
import morningBoxImg from '../assets/images/bakery_morning_box_1794703673315.jpg';
import kitchenGlazeImg from '../assets/images/bakery_kitchen_glaze_1794703673876.jpg';
import nightEspressoImg from '../assets/images/bakery_night_espresso_1794703673058.jpg';

const GALLERY_EASE = [0.22, 1, 0.36, 1] as const;

interface GalleryAndFooterProps {
  onSelectPresetFlavor: (flavorId: string) => void;
  onNavigate: (sectionId: string) => void;
}

const GALLERY_STORIES = [
  {
    id: 'morning-box',
    index: '01 / Morning Tasting Box',
    title: 'Six warm brioche rounds, boxed at dawn.',
    caption: 'Matcha pistachio, dark ganache, and toasted hazelnut packed warm from the 7 AM fry.',
    image: morningBoxImg,
    alt: 'Open cream pastry box with six pistachio and chocolate glazed donuts beside an espresso cup',
    flavorId: 'matcha',
  },
  {
    id: 'kitchen-glaze',
    index: '02 / Hand-Dipped Daily',
    title: 'Tempered couverture, never extruded.',
    caption: 'Every donut is hand-dipped while still warm so the cocoa glaze sets with a crisp mirror sheen.',
    image: kitchenGlazeImg,
    alt: 'Pastry chef hand-dipping a golden fried brioche donut into dark chocolate ganache',
    flavorId: 'valrhona',
  },
  {
    id: 'night-espresso',
    index: '03 / After Dark Pairing',
    title: 'Black sesame & 24K gold after eight.',
    caption: 'Paired with single-origin cortados at our evening espresso counter until 11 PM.',
    image: nightEspressoImg,
    alt: 'Dark chocolate and edible gold flake donut on ceramic plate beside a cortado',
    flavorId: 'sesame',
  },
];

export function GalleryAndFooter({
  onSelectPresetFlavor,
  onNavigate,
}: GalleryAndFooterProps) {
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  return (
    <>
      {/* Editorial Bakery Moments Gallery */}
      <section
        id="gallery"
        data-chapter="gallery"
        className="relative z-20 bg-[#F6F4EF] text-[#141413] py-24 sm:py-32 px-5 sm:px-8"
      >
        <div className="max-w-7xl mx-auto space-y-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.05 }}
            transition={{ duration: 0.55, ease: GALLERY_EASE }}
            className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#141413]/15 pb-8"
          >
            <div className="max-w-xl">
              <h2 className="font-display font-black text-3xl sm:text-5xl leading-[0.94] text-balance">
                fresh from the fryer.
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('configurator')}
              className="self-start md:self-auto px-5 py-3 rounded-xl bg-[#141413] text-white text-sm font-semibold hover:bg-[#2a2926] transition-colors cursor-pointer whitespace-nowrap min-h-[44px]"
            >
              Customize Your Box
            </button>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
            {GALLERY_STORIES.map((story, idx) => (
              <motion.article
                key={story.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.05 }}
                transition={{
                  duration: 0.55,
                  delay: idx * 0.07,
                  ease: GALLERY_EASE,
                }}
                className="group flex flex-col"
              >
                <div className="aspect-[4/3] w-full rounded-2xl overflow-hidden bg-[#E5E0D5] relative">
                  {!imgErrors[story.id] ? (
                    <img
                      src={story.image}
                      alt={story.alt}
                      referrerPolicy="no-referrer"
                      onError={() =>
                        setImgErrors((prev) => ({ ...prev, [story.id]: true }))
                      }
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-6 text-center bg-gradient-to-br from-[#EDE8DC] to-[#D9D0BF] text-[#141413]/70 text-sm font-medium">
                      {story.title}
                    </div>
                  )}
                </div>
                <div className="pt-4 space-y-2 flex-1 flex flex-col">
                  <h3 className="font-display font-bold text-lg text-[#141413] leading-snug">
                    {story.title}
                  </h3>
                  <p className="text-sm text-[#141413]/70 leading-relaxed flex-1">
                    {story.caption}
                  </p>
                  <button
                    type="button"
                    onClick={() => onSelectPresetFlavor(story.flavorId)}
                    className="pt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#141413] hover:text-[#C84B17] transition-colors cursor-pointer self-start"
                  >
                    <span>Load flavor in 3D studio</span>
                    <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

export function BakeryFooter({
  onNavigate,
}: {
  onNavigate: (sectionId: string) => void;
}) {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [subscribedEmail, setSubscribedEmail] = useState<string | null>(null);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError('Enter a valid email address for batch drop alerts.');
      return;
    }
    setEmailError('');
    setSubscribedEmail(trimmed);
    setEmail('');
  };

  return (
    <footer className="relative z-20 bg-[#F6F4EF] text-[#141413] pt-20 pb-12 px-5 sm:px-8 border-t border-[#141413]/10">
      <div className="max-w-7xl mx-auto space-y-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-end">
          <div className="md:col-span-6 space-y-4">
            <h2 className="font-display font-black text-2xl sm:text-4xl text-balance">
              Get first dibs on fresh batches.
            </h2>
            {subscribedEmail ? (
              <div
                className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-900/10 text-emerald-900 text-sm font-medium"
                data-testid="waitlist-confirmation"
              >
                <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Batch alerts active for {subscribedEmail}</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} noValidate className="max-w-md space-y-2">
                <div className="flex gap-2">
                  <label htmlFor="batch-email" className="sr-only">
                    Email address
                  </label>
                  <input
                    id="batch-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@domain.com"
                    className="flex-1 min-w-0 px-4 py-3 rounded-xl bg-white border border-[#141413]/15 text-sm text-[#141413] placeholder:text-[#141413]/40 focus:outline-none focus:border-[#141413]"
                  />
                  <button
                    type="submit"
                    className="px-5 py-3 rounded-xl bg-[#141413] text-white text-sm font-semibold hover:bg-[#2a2926] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Notify Me
                  </button>
                </div>
                {emailError && (
                  <p className="text-xs text-rose-700" role="alert">
                    {emailError}
                  </p>
                )}
              </form>
            )}
          </div>

          <div className="md:col-span-6 flex flex-wrap md:justify-end gap-x-10 gap-y-4 text-sm text-[#141413]/75">
            <div>
              <p className="font-semibold text-[#141413]">Accra Bakery</p>
              <p>Oxford Street, Osu · Accra, Ghana · Daily 7 AM – 11 PM</p>
            </div>
            <div className="flex items-center gap-5">
              <button
                type="button"
                onClick={() => onNavigate('hero')}
                className="hover:text-[#141413] transition-colors cursor-pointer"
              >
                Top
              </button>
              <button
                type="button"
                onClick={() => onNavigate('starburst')}
                className="hover:text-[#141413] transition-colors cursor-pointer"
              >
                All 6 Glazes
              </button>
              <button
                type="button"
                onClick={() => onNavigate('configurator')}
                className="hover:text-[#141413] transition-colors cursor-pointer"
              >
                Order Box
              </button>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-[#141413]/10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <span className="font-display font-black text-5xl sm:text-7xl leading-none select-none">
            rondo
          </span>
          <p className="text-xs text-[#141413]/55">
            © 2026 rondo Artisanal Brioche House · 3D Donuts by Steph (CC-BY-NC-4.0) · Cloud by Andrey Martyanov (CC-BY-4.0)
          </p>
        </div>
      </div>
    </footer>
  );
}
