import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export interface LoadedGlbDonutVariant {
  name: string;
  geometry: THREE.BufferGeometry;
  material: THREE.MeshPhysicalMaterial;
}

export interface LoadedGlbAssets {
  donutVariants: LoadedGlbDonutVariant[];
  flavorMaterials: Record<string, THREE.MeshPhysicalMaterial>;
  sharedGeometry: THREE.BufferGeometry | null;
  cloudScene: THREE.Group | null;
}

function createConfiguredGltfLoader(): GLTFLoader {
  const loader = new GLTFLoader();

  // Support legacy KHR_materials_pbrSpecularGlossiness used by donuts.glb
  loader.register((parser) => ({
    name: 'KHR_materials_pbrSpecularGlossiness',
    getMaterialType: (materialIndex: number) => {
      const def = parser.json.materials?.[materialIndex];
      if (def?.extensions?.KHR_materials_pbrSpecularGlossiness) {
        return THREE.MeshPhysicalMaterial;
      }
      return null;
    },
    extendMaterialParams: (
      materialIndex: number,
      materialParams: Record<string, unknown>,
    ) => {
      const def = parser.json.materials?.[materialIndex];
      const ext = def?.extensions?.KHR_materials_pbrSpecularGlossiness;
      if (!ext) return Promise.resolve();

      const pending: Promise<unknown>[] = [];
      if (Array.isArray(ext.diffuseFactor)) {
        materialParams.color = new THREE.Color().fromArray(ext.diffuseFactor);
      }
      if (ext.diffuseTexture !== undefined) {
        pending.push(
          parser.assignTexture(
            materialParams,
            'map',
            ext.diffuseTexture,
            THREE.SRGBColorSpace,
          ),
        );
      }

      const gloss =
        typeof ext.glossinessFactor === 'number' ? ext.glossinessFactor : 0.7;
      materialParams.roughness = Math.max(0.18, 1 - gloss * 0.68);
      materialParams.metalness = 0.04;
      materialParams.clearcoat = 0.62;
      materialParams.clearcoatRoughness = 0.16;
      return Promise.all(pending);
    },
  }));

  return loader;
}

function loadGltfAsync(loader: GLTFLoader, url: string) {
  return new Promise<import('three/addons/loaders/GLTFLoader.js').GLTF>(
    (resolve, reject) => {
      loader.load(url, resolve, undefined, reject);
    },
  );
}

function hash2D(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

function smoothNoise2D(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2D(ix, iy);
  const b = hash2D(ix + 1, iy);
  const c = hash2D(ix, iy + 1);
  const d = hash2D(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function fbmCrumb(x: number, y: number): number {
  let v = 0;
  v += 0.55 * smoothNoise2D(x * 0.24, y * 0.24);
  v += 0.3 * smoothNoise2D(x * 0.65, y * 0.65);
  v += 0.15 * hash2D(x, y);
  return v;
}

interface BakedAtlasResult {
  bumpMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  clearcoatMap: THREE.CanvasTexture;
  flavorMaps: Record<string, THREE.CanvasTexture>;
}

/**
 * Generates photorealistic PBR maps (albedo, crumb bump, roughness, and glaze-only clearcoat)
 * from the donuts.glb UV atlas. Dough gets warm caramelized golden fry crust, a pale butter
 * proof equator, micro-pore bump relief, and matte baked roughness; glaze gets lush icing
 * pigments, cooled ganache micro-ripples, and glossy clearcoat sheen.
 */
function yieldToMainThread(): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, 0));
}

async function bakePhotorealisticPbrAtlases(
  sourceTexture: THREE.Texture,
  specs: Array<{ id: string; glazeHex: string; glazeHighlightHex: string }>,
  anisotropy: number,
): Promise<BakedAtlasResult | null> {
  const img = sourceTexture.image as
    | HTMLImageElement
    | HTMLCanvasElement
    | ImageBitmap
    | undefined;
  if (!img || typeof document === 'undefined') return null;

  const srcW = (img as HTMLImageElement).naturalWidth || img.width || 512;
  const srcH = (img as HTMLImageElement).naturalHeight || img.height || 512;
  if (!srcW || !srcH) return null;

  const size = 512;
  const baseCanvas = document.createElement('canvas');
  baseCanvas.width = size;
  baseCanvas.height = size;
  const baseCtx = baseCanvas.getContext('2d');
  if (!baseCtx) return null;

  baseCtx.drawImage(img as CanvasImageSource, 0, 0, size, size);
  const srcData = baseCtx.getImageData(0, 0, size, size).data;

  const totalPixels = size * size;
  // 0 = black padding, 1 = glaze island, 2 = fried dough island
  const regionMask = new Uint8Array(totalPixels);
  const doughProofFactor = new Float32Array(totalPixels);
  const doughCrumbVal = new Float32Array(totalPixels);
  const glazeRippleVal = new Float32Array(totalPixels);

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bumpCtx = bumpCanvas.getContext('2d')!;
  const bumpImg = bumpCtx.createImageData(size, size);

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const roughCtx = roughCanvas.getContext('2d')!;
  const roughImg = roughCtx.createImageData(size, size);

  const coatCanvas = document.createElement('canvas');
  coatCanvas.width = size;
  coatCanvas.height = size;
  const coatCtx = coatCanvas.getContext('2d')!;
  const coatImg = coatCtx.createImageData(size, size);

  const glazeBoundaryX = Math.floor(size * 0.59);

  // Warm bakery fry colors matching photographic brioche references
  const fryDarkR = 152;
  const fryDarkG = 82;
  const fryDarkB = 28;
  const fryMidR = 204;
  const fryMidG = 128;
  const fryMidB = 56;
  const proofR = 236;
  const proofG = 198;
  const proofB = 138;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const p = y * size + x;
      const i = p * 4;
      const r = srcData[i];
      const g = srcData[i + 1];
      const b = srcData[i + 2];
      const a = srcData[i + 3];

      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      const isGoldenDoughPixel = r > g + 22 && g > b + 35 && r > 110;
      const isGlaze = x < glazeBoundaryX && !isGoldenDoughPixel && a > 10 && r + g + b > 24;
      const isDough = !isGlaze && a > 10 && (isGoldenDoughPixel || (x >= size * 0.5 && lum > 0.25));

      if (isGlaze) {
        regionMask[p] = 1;
        // Organic cooled-chocolate / thick icing micro-undulations
        const wave =
          0.5 * smoothNoise2D(x * 0.048, y * 0.048) +
          0.32 * smoothNoise2D(x * 0.11 + 19, y * 0.11 + 7) +
          0.18 * Math.sin(x * 0.035 + y * 0.025);
        glazeRippleVal[p] = wave;

        const bumpV = Math.max(0, Math.min(255, Math.round(118 + wave * 30)));
        bumpImg.data[i] = bumpV;
        bumpImg.data[i + 1] = bumpV;
        bumpImg.data[i + 2] = bumpV;
        bumpImg.data[i + 3] = 255;

        // Smooth wet icing roughness (~0.13 - 0.20)
        const roughV = Math.round(32 + wave * 20);
        roughImg.data[i] = roughV;
        roughImg.data[i + 1] = roughV;
        roughImg.data[i + 2] = roughV;
        roughImg.data[i + 3] = 255;

        // Clearcoat ONLY on glaze
        coatImg.data[i] = 250;
        coatImg.data[i + 1] = 250;
        coatImg.data[i + 2] = 250;
        coatImg.data[i + 3] = 255;
      } else if (isDough) {
        regionMask[p] = 2;
        // Preserve the baked proof ring band present in the UV circle
        const proof = Math.max(0, Math.min(1, (lum - 0.54) / 0.2));
        doughProofFactor[p] = proof;

        const crumb = fbmCrumb(x, y);
        const finePore = smoothNoise2D(x * 0.42, y * 0.42);
        const poreDip = finePore < 0.32 ? (0.32 - finePore) * 1.45 : 0;
        const microRelief = crumb - poreDip * 0.55;
        doughCrumbVal[p] = microRelief;

        const bumpV = Math.max(0, Math.min(255, Math.round(80 + microRelief * 155)));
        bumpImg.data[i] = bumpV;
        bumpImg.data[i + 1] = bumpV;
        bumpImg.data[i + 2] = bumpV;
        bumpImg.data[i + 3] = 255;

        // Matte fried brioche crumb (~0.84 - 0.96)
        const roughV = Math.min(250, Math.round(212 + (1 - microRelief) * 34));
        roughImg.data[i] = roughV;
        roughImg.data[i + 1] = roughV;
        roughImg.data[i + 2] = roughV;
        roughImg.data[i + 3] = 255;

        // Zero clearcoat on fried bread
        coatImg.data[i] = 0;
        coatImg.data[i + 1] = 0;
        coatImg.data[i + 2] = 0;
        coatImg.data[i + 3] = 255;
      } else {
        // Warm base padding so UV seams never show black halos
        bumpImg.data[i] = 128;
        bumpImg.data[i + 1] = 128;
        bumpImg.data[i + 2] = 128;
        bumpImg.data[i + 3] = 255;

        roughImg.data[i] = 180;
        roughImg.data[i + 1] = 180;
        roughImg.data[i + 2] = 180;
        roughImg.data[i + 3] = 255;

        coatImg.data[i] = 0;
        coatImg.data[i + 1] = 0;
        coatImg.data[i + 2] = 0;
        coatImg.data[i + 3] = 255;
      }
    }
  }

  bumpCtx.putImageData(bumpImg, 0, 0);
  roughCtx.putImageData(roughImg, 0, 0);
  coatCtx.putImageData(coatImg, 0, 0);

  await yieldToMainThread();

  const makeSharedTex = (canvas: HTMLCanvasElement) => {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.NoColorSpace;
    t.flipY = sourceTexture.flipY;
    t.wrapS = sourceTexture.wrapS;
    t.wrapT = sourceTexture.wrapT;
    t.anisotropy = anisotropy;
    t.needsUpdate = true;
    return t;
  };

  const bumpMap = makeSharedTex(bumpCanvas);
  const roughnessMap = makeSharedTex(roughCanvas);
  const clearcoatMap = makeSharedTex(coatCanvas);

  // Pre-bake shared dough RGB once so we stamp 6 flavors quickly
  const doughRgb = new Uint8ClampedArray(totalPixels * 3);
  for (let p = 0; p < totalPixels; p++) {
    if (regionMask[p] !== 2) continue;
    const proof = doughProofFactor[p];
    const crumb = doughCrumbVal[p];
    const crustShade = Math.max(0.62, Math.min(1.14, 0.78 + crumb * 0.42));

    // Blend toasted golden fry -> bright creamy proof ring
    const baseR = fryDarkR + (fryMidR - fryDarkR) * Math.min(1, crumb * 1.15);
    const baseG = fryDarkG + (fryMidG - fryDarkG) * Math.min(1, crumb * 1.15);
    const baseB = fryDarkB + (fryMidB - fryDarkB) * Math.min(1, crumb * 1.15);

    const r = (baseR + (proofR - baseR) * proof) * crustShade;
    const g = (baseG + (proofG - baseG) * proof) * crustShade;
    const b = (baseB + (proofB - baseB) * proof) * crustShade;

    doughRgb[p * 3] = Math.min(255, Math.round(r));
    doughRgb[p * 3 + 1] = Math.min(255, Math.round(g));
    doughRgb[p * 3 + 2] = Math.min(255, Math.round(b));
  }

  const flavorMaps: Record<string, THREE.CanvasTexture> = {};
  const baseC = new THREE.Color();
  const hiC = new THREE.Color();

  for (let sIdx = 0; sIdx < specs.length; sIdx++) {
    const spec = specs[sIdx];
    if (sIdx > 0 && sIdx % 2 === 0) {
      await yieldToMainThread();
    }
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d')!;
    const out = ctx.createImageData(size, size);
    const d = out.data;

    baseC.set(spec.glazeHex);
    hiC.set(spec.glazeHighlightHex);
    const bR = baseC.r * 255;
    const bG = baseC.g * 255;
    const bB = baseC.b * 255;
    const hR = hiC.r * 255;
    const hG = hiC.g * 255;
    const hB = hiC.b * 255;

    for (let p = 0; p < totalPixels; p++) {
      const i = p * 4;
      const mask = regionMask[p];
      if (mask === 1) {
        const wv = Math.max(0, Math.min(1, glazeRippleVal[p]));
        d[i] = Math.min(255, Math.round(bR + (hR - bR) * wv * 0.55));
        d[i + 1] = Math.min(255, Math.round(bG + (hG - bG) * wv * 0.55));
        d[i + 2] = Math.min(255, Math.round(bB + (hB - bB) * wv * 0.55));
        d[i + 3] = 255;
      } else if (mask === 2) {
        d[i] = doughRgb[p * 3];
        d[i + 1] = doughRgb[p * 3 + 1];
        d[i + 2] = doughRgb[p * 3 + 2];
        d[i + 3] = 255;
      } else {
        // Match border padding cleanly to glaze color so UV seams never show dark halos
        d[i] = Math.round(bR);
        d[i + 1] = Math.round(bG);
        d[i + 2] = Math.round(bB);
        d[i + 3] = 255;
      }
    }

    ctx.putImageData(out, 0, 0);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.flipY = sourceTexture.flipY;
    tex.wrapS = sourceTexture.wrapS;
    tex.wrapT = sourceTexture.wrapT;
    tex.anisotropy = anisotropy;
    tex.needsUpdate = true;
    flavorMaps[spec.id] = tex;
  }

  return { bumpMap, roughnessMap, clearcoatMap, flavorMaps };
}

/**
 * Loads /donuts.glb and /cloud_test.glb, normalizes geometry (+Y up, 2.84 diameter),
 * and bakes photorealistic PBR brioche + ganache/glaze maps matched to bakery reference photos.
 */
export async function loadDonutAndCloudGlbs(
  maxAnisotropy: number,
): Promise<LoadedGlbAssets> {
  const loader = createConfiguredGltfLoader();
  const aniso = Math.max(1, Math.min(8, maxAnisotropy));

  const [donutsResult, cloudResult] = await Promise.allSettled([
    loadGltfAsync(loader, '/donuts.glb'),
    loadGltfAsync(loader, '/cloud_test.glb'),
  ]);

  const donutVariants: LoadedGlbDonutVariant[] = [];
  const flavorMaterials: Record<string, THREE.MeshPhysicalMaterial> = {};
  let sharedGeometry: THREE.BufferGeometry | null = null;

  if (donutsResult.status === 'fulfilled') {
    const meshes: THREE.Mesh[] = [];
    donutsResult.value.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        meshes.push(obj as THREE.Mesh);
      }
    });

    for (const mesh of meshes) {
      const geo = mesh.geometry.clone();
      geo.center();
      geo.rotateX(-Math.PI / 2);
      geo.computeBoundingBox();

      const size = new THREE.Vector3();
      geo.boundingBox?.getSize(size);
      const maxHorizontal = Math.max(size.x, size.z, 0.001);
      const scaleFactor = 2.84 / maxHorizontal;
      geo.scale(scaleFactor, scaleFactor, scaleFactor);
      geo.computeVertexNormals();
      geo.computeBoundingSphere();

      if (!sharedGeometry) {
        sharedGeometry = geo;
      }

      const srcMat = Array.isArray(mesh.material)
        ? mesh.material[0]
        : mesh.material;

      let map: THREE.Texture | null = null;
      if (srcMat && 'map' in srcMat && srcMat.map) {
        map = srcMat.map as THREE.Texture;
        map.colorSpace = THREE.SRGBColorSpace;
        map.anisotropy = aniso;
        map.needsUpdate = true;
      }

      const mat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(0xffffff),
        map,
        roughness: 0.24,
        metalness: 0.03,
        clearcoat: 0.72,
        clearcoatRoughness: 0.13,
        envMapIntensity: 1.3,
      });

      donutVariants.push({
        name: mesh.name,
        geometry: geo,
        material: mat,
      });
    }

    // Use Torus.001_0 (white glaze + clean dough mask) as our high-detail PBR atlas template
    const atlasTemplateVar = donutVariants[1] ?? donutVariants[0];
    const templateMap = atlasTemplateVar?.material.map;

    if (templateMap) {
      const specs = [
        { id: 'valrhona', glazeHex: '#4E2312', glazeHighlightHex: '#70381F' },
        { id: 'strawberry', glazeHex: '#EC9CB2', glazeHighlightHex: '#F7BED0' },
        { id: 'matcha', glazeHex: '#508526', glazeHighlightHex: '#6EA63E' },
        { id: 'yuzu', glazeHex: '#F2B224', glazeHighlightHex: '#FAD15E' },
        { id: 'blueberry', glazeHex: '#433296', glazeHighlightHex: '#5D4BC2' },
        { id: 'sesame', glazeHex: '#18181E', glazeHighlightHex: '#2C2C36' },
      ];

      const baked = await bakePhotorealisticPbrAtlases(templateMap, specs, aniso);
      if (baked) {
        for (const spec of specs) {
          const isMatcha = spec.id === 'matcha';
          flavorMaterials[spec.id] = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color(0xffffff),
            map: baked.flavorMaps[spec.id],
            bumpMap: baked.bumpMap,
            bumpScale: 0.018,
            roughness: 1.0, // Modulated cleanly by roughnessMap (0.13 glaze vs 0.88 dough)
            roughnessMap: baked.roughnessMap,
            metalness: 0.02,
            clearcoat: isMatcha ? 0.65 : 1.0,
            clearcoatMap: baked.clearcoatMap,
            clearcoatRoughness: isMatcha ? 0.18 : 0.07,
            envMapIntensity: 1.45,
          });
        }
      }
    }

    // Fallback to raw GLB materials only if canvas baking failed
    if (Object.keys(flavorMaterials).length === 0 && donutVariants[0]) {
      flavorMaterials.valrhona = donutVariants[0].material.clone();
    }
  }

  let cloudScene: THREE.Group | null = null;
  if (cloudResult.status === 'fulfilled') {
    const root = cloudResult.value.scene;
    const box = new THREE.Box3().setFromObject(root);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 0.001);
    const normScale = 2.9 / maxDim;

    root.position.sub(center).multiplyScalar(normScale);
    root.scale.setScalar(normScale);

    const wrapper = new THREE.Group();
    wrapper.add(root);

    wrapper.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const m = obj as THREE.Mesh;
        m.castShadow = false;
        m.receiveShadow = false;
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        mats.forEach((mat) => {
          if (
            mat instanceof THREE.MeshStandardMaterial ||
            mat instanceof THREE.MeshBasicMaterial
          ) {
            mat.transparent = true;
            mat.depthWrite = false;
            mat.side = THREE.DoubleSide;
            mat.opacity = Math.max(0.4, Math.min(0.72, mat.opacity * 4.4));
            if ('emissive' in mat) {
              mat.emissive = new THREE.Color('#ffffff');
              mat.emissiveIntensity = 0.48;
            }
          }
        });
      }
    });

    cloudScene = wrapper;
  }

  return { donutVariants, flavorMaterials, sharedGeometry, cloudScene };
}
