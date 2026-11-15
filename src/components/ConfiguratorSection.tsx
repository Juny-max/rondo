import { RotateCcw, ShoppingBag } from 'lucide-react';
import {
  BOX_SIZES,
  BoxSizeId,
  CAMERA_PRESETS,
  CameraPresetId,
  DONUT_FLAVORS,
  DRIZZLE_OPTIONS,
  DrizzleStyle,
  TOPPING_OPTIONS,
  ToppingStyle,
  getFlavorById,
} from '../data/donuts';
import { computeConfiguredUnitPrice, formatCurrency } from '../utils/cart';

const SWATCH_SHORT_LABELS: Record<string, string> = {
  valrhona: 'Cocoa',
  strawberry: 'Berry',
  matcha: 'Matcha',
  yuzu: 'Yuzu',
  blueberry: 'Blueberry',
  sesame: 'Sesame',
};

interface ConfiguratorSectionProps {
  flavorId: string;
  drizzle: DrizzleStyle;
  topping: ToppingStyle;
  boxSize: BoxSizeId;
  cameraPreset: CameraPresetId;
  onSelectFlavor: (id: string) => void;
  onSelectDrizzle: (d: DrizzleStyle) => void;
  onSelectTopping: (t: ToppingStyle) => void;
  onSelectBoxSize: (b: BoxSizeId) => void;
  onSelectCameraPreset: (p: CameraPresetId) => void;
  onResetDrag: () => void;
  onAddToBox: () => void;
  onStagePointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
}

export function ConfiguratorSection({
  flavorId,
  drizzle,
  topping,
  boxSize,
  cameraPreset,
  onSelectFlavor,
  onSelectDrizzle,
  onSelectTopping,
  onSelectBoxSize,
  onSelectCameraPreset,
  onResetDrag,
  onAddToBox,
  onStagePointerDown,
}: ConfiguratorSectionProps) {
  const activeFlavor = getFlavorById(flavorId);
  const computedPrice = computeConfiguredUnitPrice(flavorId, topping, boxSize);

  return (
    <section
      id="configurator"
      data-chapter="configurator"
      className="relative z-20 min-h-screen flex items-center py-24 px-5 sm:px-8"
    >
      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left: Unobstructed 3D Drag & Camera Dock Stage */}
        <div
          className="lg:col-span-6 relative min-h-[360px] sm:min-h-[460px] lg:min-h-[580px] flex flex-col justify-between cursor-grab active:cursor-grabbing select-none"
          onPointerDown={onStagePointerDown}
        >
          <h2 className="pointer-events-none font-display font-black text-3xl sm:text-5xl text-white text-balance leading-[0.95]">
            build your box.
          </h2>

          {/* Bottom Camera Dock inside the 3D Stage */}
          <div className="mt-auto pt-4 flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#1F1A17] border border-white/10">
              {CAMERA_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onSelectCameraPreset(preset.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    cameraPreset === preset.id
                      ? 'bg-white text-[#141413]'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onResetDrag}
              aria-label="Reset 3D rotation"
              className="p-2.5 rounded-xl bg-[#1F1A17] border border-white/10 text-white/75 hover:text-white transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Right: Redesigned Architectural Pastry Studio Form */}
        <div className="lg:col-span-6">
          <div className="bg-[#1B1715] border border-white/12 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          {/* Flavor Summary Header */}
          <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
            <div className="flex items-start gap-3.5 min-w-0">
              <div
                className="w-11 h-11 rounded-2xl shrink-0 border border-white/25 relative overflow-hidden mt-0.5"
                style={{
                  backgroundColor: activeFlavor.glazeHex,
                  boxShadow: 'inset 0 2px 6px rgba(255,255,255,0.28)',
                }}
                aria-hidden="true"
              />
              <div className="space-y-1 min-w-0">
                <h3 className="font-display font-extrabold text-xl sm:text-2xl text-white leading-tight">
                  {activeFlavor.name}
                </h3>
                <p className="text-sm text-white/65 leading-relaxed">
                  {activeFlavor.tastingNotes} ·{' '}
                  <span className="font-mono-tabular text-white/80">
                    {activeFlavor.calories} kcal
                  </span>
                </p>
              </div>
            </div>
            <span
              className="font-mono-tabular font-bold text-2xl sm:text-[26px] text-white shrink-0 tracking-tight"
              data-testid="configurator-price"
            >
              {formatCurrency(computedPrice)}
            </span>
          </div>

          {/* Glaze Swatches */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold tracking-wide text-white/85">Glaze</span>
              <span className="text-white/55">{activeFlavor.shortName}</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {DONUT_FLAVORS.map((f) => {
                const selected = f.id === flavorId;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => onSelectFlavor(f.id)}
                    aria-label={`Select ${f.name}`}
                    aria-pressed={selected}
                    className={`group flex flex-col items-center gap-2 py-2.5 px-2 rounded-2xl border transition-all cursor-pointer ${
                      selected
                        ? 'border-white bg-white/[0.11] shadow-sm'
                        : 'border-white/10 bg-white/[0.025] hover:border-white/30 hover:bg-white/[0.05]'
                    }`}
                  >
                    <span
                      className={`w-7 h-7 rounded-full border transition-transform group-hover:scale-105 ${
                        selected ? 'border-white ring-2 ring-white/25' : 'border-white/25'
                      }`}
                      style={{
                        backgroundColor: f.glazeHex,
                        boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.28)',
                      }}
                      aria-hidden="true"
                    />
                    <span
                      className={`text-[11px] font-semibold truncate w-full text-center ${
                        selected ? 'text-white' : 'text-white/70'
                      }`}
                    >
                      {SWATCH_SHORT_LABELS[f.id] ?? f.shortName}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Icing Drizzle Segmented Tray */}
          <div className="space-y-2.5">
            <span className="block text-xs font-semibold tracking-wide text-white/85">
              Icing Drizzle
            </span>
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-black/30 border border-white/10">
              {DRIZZLE_OPTIONS.map((opt) => {
                const active = drizzle === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onSelectDrizzle(opt.id)}
                    aria-pressed={active}
                    className={`py-2.5 px-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      active
                        ? 'bg-white text-[#141413] shadow-sm'
                        : 'text-white/70 hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Artisan Garnish */}
          <div className="space-y-2.5">
            <span className="block text-xs font-semibold tracking-wide text-white/85">
              Artisan Garnish
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {TOPPING_OPTIONS.map((opt) => {
                const active = topping === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onSelectTopping(opt.id)}
                    aria-pressed={active}
                    className={`py-2.5 px-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                      active
                        ? 'bg-white text-[#141413] border-white shadow-sm'
                        : 'bg-white/[0.03] text-white/75 border-white/10 hover:border-white/30 hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Box Size Cards */}
          <div className="space-y-2.5">
            <span className="block text-xs font-semibold tracking-wide text-white/85">
              Box Size
            </span>
            <div className="grid grid-cols-3 gap-2.5">
              {BOX_SIZES.map((b) => {
                const active = boxSize === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => onSelectBoxSize(b.id)}
                    aria-pressed={active}
                    className={`py-3 px-3.5 rounded-2xl text-left border transition-all cursor-pointer ${
                      active
                        ? 'bg-white text-[#141413] border-white shadow-sm'
                        : 'bg-white/[0.03] text-white border-white/10 hover:border-white/30 hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="text-xs font-bold">{b.label}</div>
                    <div
                      className={`text-[11px] font-mono-tabular mt-0.5 ${
                        active ? 'text-[#141413]/70' : 'text-white/55'
                      }`}
                    >
                      {b.savingsLabel}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Primary Add CTA */}
          <button
            type="button"
            onClick={onAddToBox}
            data-testid="add-to-box-button"
            className="w-full py-4 px-6 rounded-2xl bg-[#EA580C] hover:bg-[#F97316] active:scale-[0.99] text-white font-bold text-sm inline-flex items-center justify-center gap-2.5 transition-all cursor-pointer min-h-[50px] shadow-lg shadow-[#EA580C]/20"
          >
            <ShoppingBag className="w-4 h-4" aria-hidden="true" />
            <span>Add to Pastry Box · {formatCurrency(computedPrice)}</span>
          </button>
          </div>
        </div>
      </div>
    </section>
  );
}
