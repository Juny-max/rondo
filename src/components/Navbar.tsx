import { ShoppingBag } from 'lucide-react';

interface NavbarProps {
  isLightSurface: boolean;
  cartCount: number;
  onOpenCart: () => void;
  onNavigate: (sectionId: string) => void;
}

const NAV_LINKS = [
  { id: 'craft', label: 'Craft' },
  { id: 'berry', label: 'Flavors' },
  { id: 'afterdark', label: 'After Dark' },
  { id: 'configurator', label: 'Box Builder' },
];

export function Navbar({
  isLightSurface,
  cartCount,
  onOpenCart,
  onNavigate,
}: NavbarProps) {
  const inkClass = isLightSurface ? 'text-[#141413]' : 'text-white';
  const mutedInkClass = isLightSurface
    ? 'text-[#141413]/75 hover:text-[#141413]'
    : 'text-white/80 hover:text-white';
  const buttonClass = isLightSurface
    ? 'bg-[#141413] text-white hover:bg-[#292926]'
    : 'bg-white text-[#141413] hover:bg-white/90';

  return (
    <header
      className="fixed top-0 inset-x-0 z-40 transition-colors duration-300"
      style={{
        backgroundColor: isLightSurface
          ? 'rgba(246, 244, 239, 0.88)'
          : 'rgba(12, 10, 9, 0.28)',
      }}
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#hero"
          onClick={(e) => {
            e.preventDefault();
            onNavigate('hero');
          }}
          className={`font-display font-black text-2xl tracking-tight whitespace-nowrap shrink-0 transition-colors ${inkClass}`}
        >
          rondo
        </a>

        {/* Zone 2: 4 concise single-line nav links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              onClick={(e) => {
                e.preventDefault();
                onNavigate(link.id);
              }}
              className={`whitespace-nowrap shrink-0 py-1 border-b border-transparent hover:border-current transition-colors ${mutedInkClass}`}
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onOpenCart}
            data-testid="open-cart-button"
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer min-h-[40px] ${buttonClass}`}
          >
            <ShoppingBag className="w-4 h-4" aria-hidden="true" />
            <span>
              Order Box
              {cartCount > 0 && (
                <span className="ml-1 font-mono-tabular">({cartCount})</span>
              )}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
