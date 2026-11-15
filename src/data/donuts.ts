export type DrizzleStyle = 'ribbon' | 'cross' | 'none';
export type ToppingStyle = 'sprinkles' | 'pistachio' | 'gold' | 'none';
export type BoxSizeId = 'single' | 'half' | 'dozen';
export type CameraPresetId = 'hero' | 'top' | 'side' | 'macro';

export interface DonutFlavor {
  id: string;
  name: string;
  shortName: string;
  kicker: string;
  description: string;
  tastingNotes: string;
  calories: number;
  unitPrice: number;
  bgHex: string;
  textHex: string;
  accentHex: string;
  glazeHex: string;
  glazeRoughness: number;
  glazeClearcoat: number;
  doughHex: string;
  drizzleHex: string;
  defaultDrizzle: DrizzleStyle;
  defaultTopping: ToppingStyle;
  sprinkleColors: string[];
}

export interface BoxSizeOption {
  id: BoxSizeId;
  label: string;
  count: number;
  price: number;
  savingsLabel: string;
}

export interface CameraPreset {
  id: CameraPresetId;
  label: string;
  pitch: number;
  yaw: number;
  zoom: number;
}

export const DONUT_FLAVORS: DonutFlavor[] = [
  {
    id: 'valrhona',
    name: 'Valrhona Cocoa Drizzle',
    shortName: 'Valrhona Cocoa',
    kicker: 'Signature Glaze · 70% Guanaja',
    description:
      'Hand-proofed 48-hour sourdough brioche dipped in mirror-gloss 70% dark chocolate ganache and finished with Madagascar vanilla bean cream.',
    tastingNotes: 'Roasted cacao, warm butter, toasted vanilla',
    calories: 340,
    unitPrice: 5.5,
    bgHex: '#C84B17',
    textHex: '#FFFFFF',
    accentHex: '#FFF3E6',
    glazeHex: '#2B1510',
    glazeRoughness: 0.14,
    glazeClearcoat: 0.96,
    doughHex: '#D9914A',
    drizzleHex: '#FAF4EB',
    defaultDrizzle: 'ribbon',
    defaultTopping: 'none',
    sprinkleColors: ['#FAF4EB', '#8C583A', '#D4A373'],
  },
  {
    id: 'strawberry',
    name: 'Strawberry Milk Sprinkle',
    shortName: 'Strawberry Milk',
    kicker: 'Berry Batch · Freeze-Dried Fruit',
    description:
      'Velvet organic strawberry cream glaze whipped with condensed milk and crowned with crisp pastel confetti sprinkles.',
    tastingNotes: 'Ripe summer berry, sweet cream, crisp sugar',
    calories: 325,
    unitPrice: 5.5,
    bgHex: '#DF4B86',
    textHex: '#FFFFFF',
    accentHex: '#FFF0F6',
    glazeHex: '#F38EB5',
    glazeRoughness: 0.18,
    glazeClearcoat: 0.9,
    doughHex: '#DC954E',
    drizzleHex: '#FFF5F8',
    defaultDrizzle: 'none',
    defaultTopping: 'sprinkles',
    sprinkleColors: ['#FFE680', '#5EB2F7', '#F47296', '#7BE0A0', '#FCA55A', '#FFFFFF'],
  },
  {
    id: 'matcha',
    name: 'Uji Matcha Cloud',
    shortName: 'Uji Matcha',
    kicker: 'Kyoto Harvest · First Flush',
    description:
      'Stone-milled Uji ceremonial matcha folded into a silky white-cocoa glaze with roasted Sicilian pistachio nibs.',
    tastingNotes: 'Umami green tea, sweet cream, toasted pistachio',
    calories: 315,
    unitPrice: 6.0,
    bgHex: '#5B8A1E',
    textHex: '#FFFFFF',
    accentHex: '#F4FCE3',
    glazeHex: '#6EA832',
    glazeRoughness: 0.22,
    glazeClearcoat: 0.85,
    doughHex: '#D8924C',
    drizzleHex: '#F3EFE0',
    defaultDrizzle: 'ribbon',
    defaultTopping: 'pistachio',
    sprinkleColors: ['#95B848', '#4F772D', '#ECF39E'],
  },
  {
    id: 'yuzu',
    name: 'Salted Yuzu Gold',
    shortName: 'Salted Yuzu',
    kicker: 'Sky Batch · Kochi Citrus',
    description:
      'Bright Kochi yuzu curd glaze balanced with flaky sea salt and ribbons of caramelized brown-butter icing.',
    tastingNotes: 'Fragrant yuzu peel, sea salt, caramelized butter',
    calories: 310,
    unitPrice: 5.75,
    bgHex: '#0284C7',
    textHex: '#FFFFFF',
    accentHex: '#E0F2FE',
    glazeHex: '#F5B82E',
    glazeRoughness: 0.15,
    glazeClearcoat: 0.94,
    doughHex: '#DF9B54',
    drizzleHex: '#FFF8E1',
    defaultDrizzle: 'ribbon',
    defaultTopping: 'none',
    sprinkleColors: ['#FDE68A', '#F59E0B', '#FEF3C7'],
  },
  {
    id: 'blueberry',
    name: 'Wild Blueberry Velvet',
    shortName: 'Wild Blueberry',
    kicker: 'Orchard Glaze · Crushed Berry',
    description:
      'Wild Maine blueberry reduction folded into glossy mascarpone glaze with delicate violet-berry aromatics.',
    tastingNotes: 'Wild blueberry jam, cultured cream, brioche crumb',
    calories: 330,
    unitPrice: 5.75,
    bgHex: '#2563EB',
    textHex: '#FFFFFF',
    accentHex: '#DBEAFE',
    glazeHex: '#4338CA',
    glazeRoughness: 0.16,
    glazeClearcoat: 0.92,
    doughHex: '#D68E48',
    drizzleHex: '#EEF2FF',
    defaultDrizzle: 'cross',
    defaultTopping: 'none',
    sprinkleColors: ['#A5B4FC', '#6366F1', '#E0E7FF'],
  },
  {
    id: 'sesame',
    name: 'Midnight Black Sesame',
    shortName: 'Black Sesame',
    kicker: 'After Dark · Limited Batch',
    description:
      'Slow-roasted Kyoto black sesame paste tempered with dark couverture chocolate and dusted with 24K edible gold leaf.',
    tastingNotes: 'Toasted nutty sesame, dark cocoa, warm sea salt',
    calories: 350,
    unitPrice: 6.5,
    bgHex: '#0A0A0C',
    textHex: '#F9F7F2',
    accentHex: '#EAB308',
    glazeHex: '#18171C',
    glazeRoughness: 0.24,
    glazeClearcoat: 0.88,
    doughHex: '#CC823E',
    drizzleHex: '#D4AF37',
    defaultDrizzle: 'ribbon',
    defaultTopping: 'gold',
    sprinkleColors: ['#FBBF24', '#D4AF37', '#FDE047'],
  },
];

export const DRIZZLE_OPTIONS: { id: DrizzleStyle; label: string; colorHex: string }[] = [
  { id: 'ribbon', label: 'Classic Ribbon', colorHex: '#FAF4EB' },
  { id: 'cross', label: 'Double Criss-Cross', colorHex: '#E5D3B3' },
  { id: 'none', label: 'Pure Glaze', colorHex: 'transparent' },
];

export const TOPPING_OPTIONS: { id: ToppingStyle; label: string; priceDelta: number }[] = [
  { id: 'none', label: 'None', priceDelta: 0 },
  { id: 'sprinkles', label: 'Confetti Sprinkles', priceDelta: 0.5 },
  { id: 'pistachio', label: 'Roasted Pistachio', priceDelta: 0.75 },
  { id: 'gold', label: '24K Gold Flake', priceDelta: 1.5 },
];

export const BOX_SIZES: BoxSizeOption[] = [
  { id: 'single', label: 'Single', count: 1, price: 5.5, savingsLabel: 'Individual' },
  { id: 'half', label: 'Box of 6', count: 6, price: 29.0, savingsLabel: 'Save $4' },
  { id: 'dozen', label: 'Dozen', count: 12, price: 54.0, savingsLabel: 'Save $12' },
];

export const CAMERA_PRESETS: CameraPreset[] = [
  { id: 'hero', label: 'Hero 3/4', pitch: 0.45, yaw: 0.3, zoom: 1.0 },
  { id: 'top', label: 'Top Glaze', pitch: 1.32, yaw: 0.0, zoom: 1.05 },
  { id: 'side', label: 'Proof Ring', pitch: 0.06, yaw: 0.85, zoom: 1.1 },
  { id: 'macro', label: 'Macro Drizzle', pitch: 0.65, yaw: -0.4, zoom: 1.38 },
];

export function getFlavorById(id: string): DonutFlavor {
  return DONUT_FLAVORS.find((f) => f.id === id) ?? DONUT_FLAVORS[0];
}
