export type ChapterId =
  | 'hero'
  | 'craft'
  | 'berry'
  | 'matcha'
  | 'yuzu'
  | 'starburst'
  | 'afterdark'
  | 'gallery'
  | 'configurator';

export interface ChapterDefinition {
  id: ChapterId;
  bgHex: string;
  textHex: string;
  flavorId: string;
}

export const CHAPTERS: ChapterDefinition[] = [
  { id: 'hero', bgHex: '#C84B17', textHex: '#FFFFFF', flavorId: 'valrhona' },
  { id: 'craft', bgHex: '#6E2B0E', textHex: '#FFF6EB', flavorId: 'valrhona' },
  { id: 'berry', bgHex: '#DF4B86', textHex: '#FFFFFF', flavorId: 'strawberry' },
  { id: 'matcha', bgHex: '#5B8A1E', textHex: '#FFFFFF', flavorId: 'matcha' },
  { id: 'yuzu', bgHex: '#0284C7', textHex: '#FFFFFF', flavorId: 'yuzu' },
  { id: 'starburst', bgHex: '#F6F4EF', textHex: '#141413', flavorId: 'valrhona' },
  { id: 'afterdark', bgHex: '#0A0A0C', textHex: '#F9F7F2', flavorId: 'sesame' },
  { id: 'gallery', bgHex: '#F6F4EF', textHex: '#141413', flavorId: 'valrhona' },
  { id: 'configurator', bgHex: '#161311', textHex: '#F9F7F2', flavorId: 'valrhona' },
];

export interface StagePose {
  chapterId: ChapterId;
  /** Target hero donut world position */
  donutX: number;
  donutY: number;
  donutZ: number;
  /** Target hero donut base euler angles (radians) */
  rotX: number;
  rotY: number;
  rotZ: number;
  /** Hero scale multiplier */
  scale: number;
  /** 0 = hidden, 1 = full radial 6-flavor ring */
  ringSpread: number;
  /** 0 = hidden, 1 = embossed bakery medallion macro view */
  medallionBlend: number;
  /** 0 = hidden, 1 = ambient glossy pearls visible */
  pearlsOpacity: number;
  /** Camera target Z distance */
  cameraZ: number;
  /** Camera Y offset */
  cameraY: number;
  /** 0 = transparent/hidden canvas stage (e.g., gallery reading band), 1 = fully active */
  stageVisibility: number;
  /** Spotlight mood intensity (0 = bright daylight studio, 1 = nocturnal rim spotlight) */
  nocturnalMood: number;
  /** Active flavor index during story mode */
  storyFlavorId: string;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smoothstep(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

const POSES: Record<ChapterId, Omit<StagePose, 'chapterId'>> = {
  hero: {
    donutX: 0,
    donutY: 0.08,
    donutZ: 0,
    rotX: 0.42,
    rotY: 0.25,
    rotZ: -0.18,
    scale: 1.18,
    ringSpread: 0,
    medallionBlend: 0,
    pearlsOpacity: 0.15,
    cameraZ: 5.4,
    cameraY: 0.1,
    stageVisibility: 1,
    nocturnalMood: 0,
    storyFlavorId: 'valrhona',
  },
  craft: {
    donutX: 1.18,
    donutY: -0.06,
    donutZ: 0.45,
    rotX: 0.78,
    rotY: 0.05,
    rotZ: 0.05,
    scale: 1.16,
    ringSpread: 0,
    medallionBlend: 1,
    pearlsOpacity: 0,
    cameraZ: 4.95,
    cameraY: 0.1,
    stageVisibility: 1,
    nocturnalMood: 0.15,
    storyFlavorId: 'valrhona',
  },
  berry: {
    donutX: 1.15,
    donutY: 0.04,
    donutZ: 0.15,
    rotX: 0.48,
    rotY: 0.5,
    rotZ: 0.2,
    scale: 1.04,
    ringSpread: 0,
    medallionBlend: 0,
    pearlsOpacity: 1,
    cameraZ: 5.55,
    cameraY: 0.05,
    stageVisibility: 1,
    nocturnalMood: 0,
    storyFlavorId: 'strawberry',
  },
  matcha: {
    donutX: -1.15,
    donutY: 0.04,
    donutZ: 0.18,
    rotX: 0.55,
    rotY: -0.45,
    rotZ: -0.22,
    scale: 1.04,
    ringSpread: 0,
    medallionBlend: 0,
    pearlsOpacity: 1,
    cameraZ: 5.55,
    cameraY: 0.05,
    stageVisibility: 1,
    nocturnalMood: 0,
    storyFlavorId: 'matcha',
  },
  yuzu: {
    donutX: 1.15,
    donutY: 0.06,
    donutZ: 0.12,
    rotX: 0.44,
    rotY: 0.25,
    rotZ: 0.16,
    scale: 1.04,
    ringSpread: 0,
    medallionBlend: 0,
    pearlsOpacity: 1,
    cameraZ: 5.55,
    cameraY: 0.08,
    stageVisibility: 1,
    nocturnalMood: 0,
    storyFlavorId: 'yuzu',
  },
  starburst: {
    donutX: 0,
    donutY: 0.0,
    donutZ: -0.35,
    rotX: 0.95,
    rotY: 0,
    rotZ: 0,
    scale: 0.52,
    ringSpread: 1,
    medallionBlend: 0,
    pearlsOpacity: 0,
    cameraZ: 7.4,
    cameraY: 0.0,
    stageVisibility: 1,
    nocturnalMood: 0,
    storyFlavorId: 'valrhona',
  },
  afterdark: {
    donutX: 1.18,
    donutY: 0.04,
    donutZ: 0.22,
    rotX: 0.62,
    rotY: -0.4,
    rotZ: -0.15,
    scale: 1.08,
    ringSpread: 0,
    medallionBlend: 0,
    pearlsOpacity: 0.25,
    cameraZ: 5.45,
    cameraY: 0.05,
    stageVisibility: 1,
    nocturnalMood: 1,
    storyFlavorId: 'sesame',
  },
  gallery: {
    donutX: 0,
    donutY: 2.2,
    donutZ: -1.5,
    rotX: 0.4,
    rotY: 0,
    rotZ: 0,
    scale: 0.65,
    ringSpread: 0,
    medallionBlend: 0,
    pearlsOpacity: 0,
    cameraZ: 6.0,
    cameraY: 0,
    stageVisibility: 0,
    nocturnalMood: 0,
    storyFlavorId: 'valrhona',
  },
  configurator: {
    donutX: -1.25,
    donutY: -0.12,
    donutZ: 0.1,
    rotX: 0.45,
    rotY: 0.3,
    rotZ: 0,
    scale: 0.98,
    ringSpread: 0,
    medallionBlend: 0,
    pearlsOpacity: 0,
    cameraZ: 5.35,
    cameraY: 0.05,
    stageVisibility: 1,
    nocturnalMood: 0.35,
    storyFlavorId: 'valrhona',
  },
};

export interface ScrollSample {
  chapterIndex: number;
  /** 0..1 progress between chapterIndex and chapterIndex + 1 */
  blend: number;
}

/**
 * Given section top offsets relative to viewport top and viewport height,
 * determines which chapter is active and the smooth transition blend [0,1].
 */
export function computeScrollSample(
  sectionRects: Array<{ top: number; height: number }>,
  viewportHeight: number,
): ScrollSample {
  if (sectionRects.length === 0) {
    return { chapterIndex: 0, blend: 0 };
  }

  const probeY = viewportHeight * 0.45;
  let active = 0;
  for (let i = 0; i < sectionRects.length; i++) {
    if (sectionRects[i].top <= probeY) {
      active = i;
    }
  }

  if (active >= sectionRects.length - 1) {
    return { chapterIndex: sectionRects.length - 1, blend: 0 };
  }

  const curr = sectionRects[active];
  const next = sectionRects[active + 1];
  const transitionZone = Math.max(120, Math.min(curr.height * 0.42, viewportHeight * 0.55));
  const distToNext = next.top - probeY;

  if (distToNext <= transitionZone && distToNext >= 0) {
    const raw = 1 - distToNext / transitionZone;
    return { chapterIndex: active, blend: smoothstep(raw) };
  }

  return { chapterIndex: active, blend: 0 };
}

export function evaluateStagePose(
  sample: ScrollSample,
  isNarrowViewport: boolean,
): StagePose {
  const idxA = Math.max(0, Math.min(CHAPTERS.length - 1, sample.chapterIndex));
  const idxB = Math.max(0, Math.min(CHAPTERS.length - 1, idxA + 1));
  const t = clamp01(sample.blend);

  const idA = CHAPTERS[idxA].id;
  const idB = CHAPTERS[idxB].id;
  const a = POSES[idA];
  const b = POSES[idB];

  // On mobile viewports, keep donuts centered horizontally
  const aDonutX = isNarrowViewport ? 0 : a.donutX;
  const bDonutX = isNarrowViewport ? 0 : b.donutX;
  const aDonutY = isNarrowViewport && idA === 'configurator' ? 0.52 : a.donutY;
  const bDonutY = isNarrowViewport && idB === 'configurator' ? 0.52 : b.donutY;
  const mobileScaleFactor = isNarrowViewport ? 0.78 : 1;

  return {
    chapterId: t > 0.5 ? idB : idA,
    donutX: lerp(aDonutX, bDonutX, t),
    donutY: lerp(aDonutY, bDonutY, t),
    donutZ: lerp(a.donutZ, b.donutZ, t),
    rotX: lerp(a.rotX, b.rotX, t),
    rotY: lerp(a.rotY, b.rotY, t),
    rotZ: lerp(a.rotZ, b.rotZ, t),
    scale: lerp(a.scale, b.scale, t) * mobileScaleFactor,
    ringSpread: lerp(a.ringSpread, b.ringSpread, t),
    medallionBlend: lerp(a.medallionBlend, b.medallionBlend, t),
    pearlsOpacity: lerp(a.pearlsOpacity, b.pearlsOpacity, t),
    cameraZ: lerp(a.cameraZ, b.cameraZ, t) + (isNarrowViewport ? 0.9 : 0),
    cameraY: lerp(a.cameraY, b.cameraY, t),
    stageVisibility: lerp(a.stageVisibility, b.stageVisibility, t),
    nocturnalMood: lerp(a.nocturnalMood, b.nocturnalMood, t),
    storyFlavorId: t > 0.5 ? b.storyFlavorId : a.storyFlavorId,
  };
}
