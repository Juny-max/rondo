import * as THREE from 'three';

export interface ProceduralTextureSet {
  doughMap: THREE.CanvasTexture;
  doughBump: THREE.CanvasTexture;
  glazeBump: THREE.CanvasTexture;
  medallionMap: THREE.CanvasTexture;
  medallionBump: THREE.CanvasTexture;
  contactShadowMap: THREE.CanvasTexture;
  dispose: () => void;
}

function seededNoise(x: number, y: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTextureSet {
  const aniso = Math.max(1, Math.min(8, maxAnisotropy));

  // 1. Fried Brioche Dough Albedo (with authentic pale golden proof-ring equator)
  const doughCanvas = document.createElement('canvas');
  doughCanvas.width = 512;
  doughCanvas.height = 512;
  const dCtx = doughCanvas.getContext('2d')!;

  const grad = dCtx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.0, '#C77A34');
  grad.addColorStop(0.28, '#DF994E');
  grad.addColorStop(0.46, '#F4D19B'); // pale proof equator line
  grad.addColorStop(0.54, '#F4D19B');
  grad.addColorStop(0.72, '#DF994E');
  grad.addColorStop(1.0, '#B96B27');
  dCtx.fillStyle = grad;
  dCtx.fillRect(0, 0, 512, 512);

  // Organic fried crumb pores
  for (let i = 0; i < 3600; i++) {
    const px = seededNoise(i, 1) * 512;
    const py = seededNoise(i, 2) * 512;
    const r = 0.8 + seededNoise(i, 3) * 2.1;
    const dark = seededNoise(i, 4) > 0.45;
    dCtx.fillStyle = dark ? 'rgba(110, 56, 16, 0.12)' : 'rgba(255, 238, 208, 0.14)';
    dCtx.beginPath();
    dCtx.arc(px, py, r, 0, Math.PI * 2);
    dCtx.fill();
  }

  const doughMap = new THREE.CanvasTexture(doughCanvas);
  doughMap.colorSpace = THREE.SRGBColorSpace;
  doughMap.wrapS = THREE.RepeatWrapping;
  doughMap.wrapT = THREE.RepeatWrapping;
  doughMap.anisotropy = aniso;

  // 2. Dough Micro-Porous Bump Map
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = 256;
  bumpCanvas.height = 256;
  const bCtx = bumpCanvas.getContext('2d')!;
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2400; i++) {
    const px = seededNoise(i, 10) * 256;
    const py = seededNoise(i, 20) * 256;
    const r = 0.7 + seededNoise(i, 30) * 1.8;
    const shade = Math.floor(85 + seededNoise(i, 40) * 90);
    bCtx.fillStyle = `rgb(${shade},${shade},${shade})`;
    bCtx.beginPath();
    bCtx.arc(px, py, r, 0, Math.PI * 2);
    bCtx.fill();
  }
  const doughBump = new THREE.CanvasTexture(bumpCanvas);
  doughBump.wrapS = THREE.RepeatWrapping;
  doughBump.wrapT = THREE.RepeatWrapping;
  doughBump.repeat.set(3, 2);

  // 3. Soft Glaze Wave Bump Map
  const glazeCanvas = document.createElement('canvas');
  glazeCanvas.width = 256;
  glazeCanvas.height = 256;
  const gCtx = glazeCanvas.getContext('2d')!;
  gCtx.fillStyle = '#808080';
  gCtx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 2) {
    for (let x = 0; x < 256; x += 2) {
      const wave =
        Math.sin(x * 0.08 + Math.cos(y * 0.06) * 1.4) * 14 +
        Math.cos(y * 0.09) * 10;
      const v = Math.max(0, Math.min(255, Math.round(128 + wave)));
      gCtx.fillStyle = `rgb(${v},${v},${v})`;
      gCtx.fillRect(x, y, 2, 2);
    }
  }
  const glazeBump = new THREE.CanvasTexture(glazeCanvas);
  glazeBump.wrapS = THREE.RepeatWrapping;
  glazeBump.wrapT = THREE.RepeatWrapping;

  // 4. Embossed Bakery Seal Medallion Texture
  const medCanvas = document.createElement('canvas');
  medCanvas.width = 512;
  medCanvas.height = 512;
  const mCtx = medCanvas.getContext('2d')!;
  const radGrad = mCtx.createRadialGradient(256, 256, 24, 256, 256, 256);
  radGrad.addColorStop(0, '#3D2014');
  radGrad.addColorStop(0.7, '#28130B');
  radGrad.addColorStop(1, '#1B0C07');
  mCtx.fillStyle = radGrad;
  mCtx.fillRect(0, 0, 512, 512);

  // Gold foil concentric stamp rings
  mCtx.strokeStyle = '#E5BE67';
  mCtx.lineWidth = 8;
  mCtx.beginPath();
  mCtx.arc(256, 256, 214, 0, Math.PI * 2);
  mCtx.stroke();

  mCtx.lineWidth = 3;
  mCtx.beginPath();
  mCtx.arc(256, 256, 192, 0, Math.PI * 2);
  mCtx.stroke();

  // Concentric baker's torus emblem in center
  mCtx.strokeStyle = '#F3D68C';
  mCtx.lineWidth = 14;
  mCtx.beginPath();
  mCtx.arc(256, 230, 56, 0, Math.PI * 2);
  mCtx.stroke();

  mCtx.fillStyle = '#F7DF9C';
  mCtx.textAlign = 'center';
  mCtx.font = '800 54px Outfit, sans-serif';
  mCtx.fillText('rondo', 256, 354);
  mCtx.font = '600 21px Plus Jakarta Sans, sans-serif';
  mCtx.fillStyle = '#D9B15F';
  mCtx.fillText('48H BRIOCHE · HAND DIPPED', 256, 392);

  const medallionMap = new THREE.CanvasTexture(medCanvas);
  medallionMap.colorSpace = THREE.SRGBColorSpace;
  medallionMap.anisotropy = aniso;

  const medBumpCanvas = document.createElement('canvas');
  medBumpCanvas.width = 512;
  medBumpCanvas.height = 512;
  const mbCtx = medBumpCanvas.getContext('2d')!;
  mbCtx.fillStyle = '#707070';
  mbCtx.fillRect(0, 0, 512, 512);
  mbCtx.strokeStyle = '#E0E0E0';
  mbCtx.lineWidth = 10;
  mbCtx.beginPath();
  mbCtx.arc(256, 256, 214, 0, Math.PI * 2);
  mbCtx.stroke();
  mbCtx.lineWidth = 16;
  mbCtx.beginPath();
  mbCtx.arc(256, 230, 56, 0, Math.PI * 2);
  mbCtx.stroke();
  mbCtx.fillStyle = '#E8E8E8';
  mbCtx.textAlign = 'center';
  mbCtx.font = '800 54px Outfit, sans-serif';
  mbCtx.fillText('rondo', 256, 354);
  const medallionBump = new THREE.CanvasTexture(medBumpCanvas);

  // 5. Radial Contact Shadow
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 256;
  shadowCanvas.height = 256;
  const sCtx = shadowCanvas.getContext('2d')!;
  const sGrad = sCtx.createRadialGradient(128, 128, 22, 128, 128, 124);
  sGrad.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
  sGrad.addColorStop(0.55, 'rgba(0, 0, 0, 0.22)');
  sGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  sCtx.fillStyle = sGrad;
  sCtx.fillRect(0, 0, 256, 256);
  const contactShadowMap = new THREE.CanvasTexture(shadowCanvas);

  return {
    doughMap,
    doughBump,
    glazeBump,
    medallionMap,
    medallionBump,
    contactShadowMap,
    dispose: () => {
      doughMap.dispose();
      doughBump.dispose();
      glazeBump.dispose();
      medallionMap.dispose();
      medallionBump.dispose();
      contactShadowMap.dispose();
    },
  };
}
