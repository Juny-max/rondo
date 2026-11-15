import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { DonutFlavor, DrizzleStyle, ToppingStyle } from '../data/donuts';
import { ProceduralTextureSet } from './textures';

export interface GlbSnappedSurfaceAssets {
  geometry: THREE.BufferGeometry;
  flavorMaterials: Record<string, THREE.MeshPhysicalMaterial>;
  drizzleRibbonGeo: THREE.BufferGeometry;
  drizzleCrossGeo: THREE.BufferGeometry;
  sprinkleMatrices: THREE.Matrix4[];
  pistachioMatrices: THREE.Matrix4[];
  goldMatrices: THREE.Matrix4[];
  medallionPos: THREE.Vector3;
  dispose: () => void;
}

export interface DonutRig {
  group: THREE.Group;
  doughMesh: THREE.Mesh;
  glazeMesh: THREE.Mesh;
  glbMesh: THREE.Mesh | null;
  glbFlavorMaterials: Record<string, THREE.MeshPhysicalMaterial>;
  doughMat: THREE.MeshStandardMaterial;
  glazeMat: THREE.MeshPhysicalMaterial;
  drizzleMat: THREE.MeshPhysicalMaterial;
  drizzleRibbonMesh: THREE.Mesh;
  drizzleCrossMesh: THREE.Mesh;
  sprinklesMesh: THREE.InstancedMesh;
  pistachioMesh: THREE.InstancedMesh;
  goldMesh: THREE.InstancedMesh;
  medallionGroup: THREE.Group;
  attachGlbSurfaceAssets: (assets: GlbSnappedSurfaceAssets) => void;
  dispose: () => void;
}

const SPRINKLE_COUNT = 190;
const PISTACHIO_COUNT = 68;
const GOLD_COUNT = 48;

function pseudoRand(seed: number): number {
  const x = Math.sin(seed * 91.3458) * 47453.5453;
  return x - Math.floor(x);
}

/**
 * Creates an organic hand-proofed brioche torus geometry lying flat in XZ (+Y up)
 * as the instant procedural fallback before /donuts.glb finishes streaming.
 */
function createBriocheDoughGeometry(): THREE.BufferGeometry {
  const geo = new THREE.TorusGeometry(0.92, 0.36, 36, 72);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const angle = Math.atan2(z, x);

    const puff =
      1 +
      0.025 * Math.sin(angle * 3.0 + 0.4) +
      0.015 * Math.cos(angle * 5.0 - 0.8);
    const yScale = y < 0 ? 0.92 : 1.03;
    pos.setXYZ(i, x * puff, y * yScale, z * puff);
  }
  geo.computeVertexNormals();
  return geo;
}

function createGlazeCapGeometry(): THREE.BufferGeometry {
  const radialSegs = 80;
  const tubeSegs = 26;
  const R = 0.92;
  const rBase = 0.375;

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= radialSegs; i++) {
    const u = (i / radialSegs) * Math.PI * 2;
    const cosU = Math.cos(u);
    const sinU = Math.sin(u);

    const dripWave =
      0.22 * Math.sin(u * 6.0 + 0.3) +
      0.14 * Math.cos(u * 11.0 - 0.7) +
      0.08 * Math.sin(u * 17.0);

    const vStart = -0.15 + dripWave * 0.28;
    const vEnd = Math.PI + 0.22 + dripWave * 0.55;

    for (let j = 0; j <= tubeSegs; j++) {
      const t = j / tubeSegs;
      const v = vStart + (vEnd - vStart) * t;
      const edgeTaper = Math.sin(t * Math.PI);
      const r = rBase + 0.016 * Math.pow(edgeTaper, 0.45);

      const puff =
        1 +
        0.025 * Math.sin(u * 3.0 + 0.4) +
        0.015 * Math.cos(u * 5.0 - 0.8);

      const radialDist = (R + r * Math.cos(v)) * puff;
      const x = radialDist * cosU;
      const z = radialDist * sinU;
      const y = r * Math.sin(v) * 1.03 + 0.012;

      positions.push(x, y, z);
      uvs.push(i / radialSegs, t);
    }
  }

  const rowStride = tubeSegs + 1;
  for (let i = 0; i < radialSegs; i++) {
    for (let j = 0; j < tubeSegs; j++) {
      const a = i * rowStride + j;
      const b = (i + 1) * rowStride + j;
      const c = (i + 1) * rowStride + (j + 1);
      const d = i * rowStride + (j + 1);
      indices.push(a, d, b);
      indices.push(b, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function createDrizzleGeometry(phaseOffset: number, frequency: number): THREE.BufferGeometry {
  const points: THREE.Vector3[] = [];
  const steps = 180;
  const R = 0.92;
  const rTube = 0.39;

  for (let i = 0; i <= steps; i++) {
    const u = (i / steps) * Math.PI * 2;
    const wave = Math.sin(u * frequency + phaseOffset) * 0.65;
    const v = Math.PI * 0.5 + wave;

    const puff =
      1 +
      0.025 * Math.sin(u * 3.0 + 0.4) +
      0.015 * Math.cos(u * 5.0 - 0.8);

    const radialDist = (R + rTube * Math.cos(v)) * puff;
    const x = radialDist * Math.cos(u);
    const z = radialDist * Math.sin(u);
    const y = rTube * Math.sin(v) * 1.03 + 0.016;
    points.push(new THREE.Vector3(x, y, z));
  }

  const curve = new THREE.CatmullRomCurve3(points, true);
  return new THREE.TubeGeometry(curve, 140, 0.018, 8, true);
}

/**
 * Generates an organic back-and-forth diagonal baker's icing drizzle (like hand-piped
 * ganache glaze photography), keeping passes cleanly on top of the donut ring with
 * rounded piping ends and natural U-turn sweeps around the rim.
 */
function buildDiagonalBakerDrizzle(
  angleRad: number,
  sampleTop: (x: number, z: number) => { y: number; normal: THREE.Vector3 },
): THREE.BufferGeometry {
  const cosA = Math.cos(angleRad);
  const sinA = Math.sin(angleRad);
  const rOuter = 1.24;
  const rHole = 0.47;

  const toWorld = (p: number, q: number): [number, number] => [
    p * cosA - q * sinA,
    p * sinA + q * cosA,
  ];

  const strokes: Array<Array<[number, number]>> = [];
  const pOffsets = [-1.06, -0.84, -0.62, -0.4, -0.18, 0.04, 0.26, 0.48, 0.7, 0.92, 1.1];

  const collectChords = (p: number): Array<[number, number]> => {
    if (Math.abs(p) >= rOuter - 0.04) return [];
    const qMax = Math.sqrt(rOuter * rOuter - p * p);
    if (Math.abs(p) >= rHole) {
      return [[-qMax, qMax]];
    }
    const qHole = Math.sqrt(rHole * rHole - p * p);
    return [
      [-qMax, -qHole],
      [qHole, qMax],
    ];
  };

  // Build alternating diagonal strokes with rounded U-turn fillets between adjacent outer chords
  const upperGroup: Array<{ p: number; q0: number; q1: number }> = [];
  const lowerGroup: Array<{ p: number; q0: number; q1: number }> = [];

  for (const p of pOffsets) {
    const chords = collectChords(p);
    if (chords.length === 1) {
      upperGroup.push({ p, q0: chords[0][0], q1: chords[0][1] });
    } else if (chords.length === 2) {
      upperGroup.push({ p, q0: chords[0][0], q1: chords[0][1] });
      lowerGroup.push({ p, q0: chords[1][0], q1: chords[1][1] });
    }
  }

  const addZigZagPasses = (passes: Array<{ p: number; q0: number; q1: number }>) => {
    if (passes.length === 0) return;
    const continuous: Array<[number, number]> = [];
    for (let idx = 0; idx < passes.length; idx++) {
      const seg = passes[idx];
      const forward = idx % 2 === 0;
      const startQ = forward ? seg.q0 : seg.q1;
      const endQ = forward ? seg.q1 : seg.q0;
      const steps = 16;
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const q = startQ + (endQ - startQ) * t;
        const wobble = Math.sin(q * 3.5 + seg.p * 4.8) * 0.011;
        continuous.push([seg.p + wobble, q]);
      }

      const next = passes[idx + 1];
      if (next) {
        const nextStartQ = (idx + 1) % 2 === 0 ? next.q0 : next.q1;
        const gap = Math.hypot(endQ - nextStartQ, seg.p - next.p);
        if (gap < 0.45) {
          // Smooth rounded semicircular U-turn connecting adjacent passes
          const dir = endQ >= 0 ? 1 : -1;
          for (let a = 1; a <= 4; a++) {
            const u = a / 5;
            const arcP = seg.p + (next.p - seg.p) * u;
            const arcQ =
              endQ +
              (nextStartQ - endQ) * u +
              dir * Math.sin(u * Math.PI) * 0.095;
            continuous.push([arcP, arcQ]);
          }
        } else {
          strokes.push([...continuous]);
          continuous.length = 0;
        }
      }
    }
    if (continuous.length >= 2) {
      strokes.push(continuous);
    }
  };

  addZigZagPasses(upperGroup);
  addZigZagPasses(lowerGroup);

  // Merge adjacent connected strokes or turn each stroke into a clean raycasted tube
  const parts: THREE.BufferGeometry[] = [];
  const capGeo = new THREE.SphereGeometry(0.0185, 8, 6);

  for (const stroke of strokes) {
    if (stroke.length < 2) continue;
    const pts3D: THREE.Vector3[] = [];
    for (const [p, q] of stroke) {
      const [wx, wz] = toWorld(p, q);
      const { y } = sampleTop(wx, wz);
      pts3D.push(new THREE.Vector3(wx, y + 0.01, wz));
    }
    const curve = new THREE.CatmullRomCurve3(pts3D, false, 'catmullrom', 0.45);
    const tubeSegs = Math.max(16, pts3D.length * 2);
    const tube = new THREE.TubeGeometry(curve, tubeSegs, 0.0185, 8, false);
    parts.push(tube);

    // Rounded icing start & end beads so piping ends look soft & creamy
    const startCap = capGeo.clone();
    startCap.translate(pts3D[0].x, pts3D[0].y, pts3D[0].z);
    parts.push(startCap);

    const last = pts3D[pts3D.length - 1];
    const endCap = capGeo.clone();
    endCap.translate(last.x, last.y, last.z);
    parts.push(endCap);
  }

  capGeo.dispose();

  if (parts.length === 0) {
    return createDrizzleGeometry(0, 9);
  }
  const merged = mergeGeometries(parts, false);
  parts.forEach((g) => g.dispose());
  return merged ?? createDrizzleGeometry(0, 9);
}

/**
 * Raycasts downward onto the normalized GLB mesh so diagonal baker's drizzle ribbons,
 * dense pastel sprinkles, pistachios, gold leaf, and the medallion sit flush on the glaze.
 */
export function buildGlbSnappedSurfaceAssets(
  geometry: THREE.BufferGeometry,
  flavorMaterials: Record<string, THREE.MeshPhysicalMaterial>,
): GlbSnappedSurfaceAssets {
  const probeMat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const probeMesh = new THREE.Mesh(geometry, probeMat);
  const raycaster = new THREE.Raycaster();
  const origin = new THREE.Vector3();
  const down = new THREE.Vector3(0, -1, 0);

  const sampleTop = (x: number, z: number): { y: number; normal: THREE.Vector3 } => {
    origin.set(x, 2.0, z);
    raycaster.set(origin, down);
    const hits = raycaster.intersectObject(probeMesh, false);
    if (hits.length > 0) {
      const hit = hits[0];
      const n = hit.face
        ? hit.face.normal.clone().normalize()
        : new THREE.Vector3(0, 1, 0);
      if (n.y < 0) n.negate();
      return { y: hit.point.y, normal: n };
    }
    return { y: 0.28, normal: new THREE.Vector3(0, 1, 0) };
  };

  const makeSnappedMatrices = (
    count: number,
    scaleRange: [number, number],
    lift: number,
    seedOffset: number,
    radialSpread = 0.64,
  ): THREE.Matrix4[] => {
    const out: THREE.Matrix4[] = [];
    const dummy = new THREE.Object3D();
    const up = new THREE.Vector3(0, 1, 0);

    for (let i = 0; i < count; i++) {
      const u = pseudoRand(i + seedOffset) * Math.PI * 2;
      const radialT = pseudoRand(i + seedOffset + 200) - 0.5;
      const r = 0.895 + radialT * radialSpread;
      const x = r * Math.cos(u);
      const z = r * Math.sin(u);

      const { y, normal } = sampleTop(x, z);
      dummy.position.set(x, y + lift, z);

      const tangent = new THREE.Vector3(-Math.sin(u), 0, Math.cos(u))
        .projectOnPlane(normal)
        .normalize();
      const spin = pseudoRand(i + seedOffset + 500) * Math.PI * 2;
      tangent.applyAxisAngle(normal, spin);

      dummy.quaternion.setFromUnitVectors(up, tangent);
      const s =
        scaleRange[0] +
        pseudoRand(i + seedOffset + 800) * (scaleRange[1] - scaleRange[0]);
      dummy.scale.set(s, s * (0.85 + pseudoRand(i + 900) * 0.35), s);
      dummy.updateMatrix();
      out.push(dummy.matrix.clone());
    }
    return out;
  };

  // Classic Ribbon = authentic -35° diagonal baker's piping; Cross adds +55° secondary sweep
  const drizzleRibbonGeo = buildDiagonalBakerDrizzle(-0.61, sampleTop);
  const drizzleCrossGeo = buildDiagonalBakerDrizzle(0.96, sampleTop);
  const sprinkleMatrices = makeSnappedMatrices(SPRINKLE_COUNT, [0.88, 1.22], 0.011, 11, 0.68);
  const pistachioMatrices = makeSnappedMatrices(PISTACHIO_COUNT, [0.75, 1.25], 0.01, 303, 0.64);
  const goldMatrices = makeSnappedMatrices(GOLD_COUNT, [0.75, 1.3], 0.008, 707, 0.62);

  const medHit = sampleTop(0, 0.9);
  const medallionPos = new THREE.Vector3(0, medHit.y + 0.035, 0.9);

  probeMat.dispose();

  return {
    geometry,
    flavorMaterials,
    drizzleRibbonGeo,
    drizzleCrossGeo,
    sprinkleMatrices,
    pistachioMatrices,
    goldMatrices,
    medallionPos,
    dispose: () => {
      drizzleRibbonGeo.dispose();
      drizzleCrossGeo.dispose();
      geometry.dispose();
      Object.values(flavorMaterials).forEach((m) => m.dispose());
    },
  };
}

function populateTopSurfaceInstances(
  mesh: THREE.InstancedMesh,
  count: number,
  scaleRange: [number, number],
  yOffset: number,
  seedOffset: number,
  palette: string[],
) {
  const dummy = new THREE.Object3D();
  const up = new THREE.Vector3(0, 1, 0);
  const normal = new THREE.Vector3();
  const color = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const u = pseudoRand(i + seedOffset) * Math.PI * 2;
    const v = Math.PI * 0.5 + (pseudoRand(i + seedOffset + 200) - 0.5) * 1.25;
    const R = 0.92;
    const r = 0.39 + yOffset;
    const puff =
      1 +
      0.025 * Math.sin(u * 3.0 + 0.4) +
      0.015 * Math.cos(u * 5.0 - 0.8);

    const radialDist = (R + r * Math.cos(v)) * puff;
    const x = radialDist * Math.cos(u);
    const z = radialDist * Math.sin(u);
    const y = r * Math.sin(v) * 1.03 + 0.012;

    dummy.position.set(x, y, z);

    normal
      .set(Math.cos(v) * Math.cos(u), Math.sin(v), Math.cos(v) * Math.sin(u))
      .normalize();

    const tangent = new THREE.Vector3(-Math.sin(u), 0, Math.cos(u)).normalize();
    const spin = pseudoRand(i + seedOffset + 500) * Math.PI * 2;
    tangent.applyAxisAngle(normal, spin);

    dummy.quaternion.setFromUnitVectors(up, tangent);
    const s =
      scaleRange[0] +
      pseudoRand(i + seedOffset + 800) * (scaleRange[1] - scaleRange[0]);
    dummy.scale.set(s, s * (0.85 + pseudoRand(i + 900) * 0.35), s);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);

    color.set(palette[i % palette.length]);
    mesh.setColorAt(i, color);
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
}

export function createDonutRig(
  textures: ProceduralTextureSet,
  initialFlavor: DonutFlavor,
): DonutRig {
  const group = new THREE.Group();

  // 1. Procedural Fallback Dough & Glaze (hidden automatically once GLB loads)
  const doughGeo = createBriocheDoughGeometry();
  const doughMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#ffffff'),
    map: textures.doughMap,
    bumpMap: textures.doughBump,
    bumpScale: 0.024,
    roughness: 0.85,
    metalness: 0.0,
  });
  const doughMesh = new THREE.Mesh(doughGeo, doughMat);
  doughMesh.castShadow = true;
  doughMesh.receiveShadow = true;
  group.add(doughMesh);

  const glazeGeo = createGlazeCapGeometry();
  const glazeMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(initialFlavor.glazeHex),
    bumpMap: textures.glazeBump,
    bumpScale: 0.008,
    roughness: initialFlavor.glazeRoughness,
    metalness: 0.02,
    clearcoat: initialFlavor.glazeClearcoat,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1.4,
  });
  const glazeMesh = new THREE.Mesh(glazeGeo, glazeMat);
  glazeMesh.castShadow = true;
  glazeMesh.receiveShadow = true;
  group.add(glazeMesh);

  // 2. Artisanal Piped Icing Drizzle Ribbons
  const drizzleMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(initialFlavor.drizzleHex),
    roughness: 0.16,
    metalness: 0.0,
    clearcoat: 0.92,
    clearcoatRoughness: 0.09,
    envMapIntensity: 1.35,
  });
  const fallbackRibbonGeo = createDrizzleGeometry(0, 9);
  const fallbackCrossGeo = createDrizzleGeometry(Math.PI / 2, 8);
  const drizzleRibbonMesh = new THREE.Mesh(fallbackRibbonGeo, drizzleMat);
  const drizzleCrossMesh = new THREE.Mesh(fallbackCrossGeo, drizzleMat);
  group.add(drizzleRibbonMesh);
  group.add(drizzleCrossMesh);

  // 3. Plump Bakery Sprinkles, Pistachios & 24K Gold Leaf
  const sprinkleGeo = new THREE.CapsuleGeometry(0.0135, 0.048, 5, 8);
  const sprinkleMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.24,
    clearcoat: 0.65,
    clearcoatRoughness: 0.15,
  });
  const sprinklesMesh = new THREE.InstancedMesh(sprinkleGeo, sprinkleMat, SPRINKLE_COUNT);
  populateTopSurfaceInstances(
    sprinklesMesh,
    SPRINKLE_COUNT,
    [0.88, 1.22],
    0.013,
    11,
    initialFlavor.sprinkleColors,
  );
  group.add(sprinklesMesh);

  const pistGeo = new THREE.DodecahedronGeometry(0.024, 0);
  const pistMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.78,
    metalness: 0.02,
  });
  const pistachioMesh = new THREE.InstancedMesh(pistGeo, pistMat, PISTACHIO_COUNT);
  populateTopSurfaceInstances(
    pistachioMesh,
    PISTACHIO_COUNT,
    [0.75, 1.25],
    0.01,
    303,
    ['#84A93C', '#6A8E2B', '#A3C45B', '#C2B280'],
  );
  group.add(pistachioMesh);

  const goldGeo = new THREE.CylinderGeometry(0.028, 0.021, 0.005, 5);
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.16,
    metalness: 0.94,
    envMapIntensity: 1.65,
  });
  const goldMesh = new THREE.InstancedMesh(goldGeo, goldMat, GOLD_COUNT);
  populateTopSurfaceInstances(
    goldMesh,
    GOLD_COUNT,
    [0.75, 1.3],
    0.008,
    707,
    ['#F5C542', '#E2AC2B', '#FCE07B'],
  );
  group.add(goldMesh);

  // 4. Embossed Bakery Crest Medallion (visible during macro Craft chapter)
  const medallionGroup = new THREE.Group();
  const discGeo = new THREE.CylinderGeometry(0.38, 0.4, 0.075, 48);
  const discMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.medallionMap,
    bumpMap: textures.medallionBump,
    bumpScale: 0.025,
    roughness: 0.34,
    metalness: 0.15,
  });
  const discMesh = new THREE.Mesh(discGeo, discMat);

  const rimGeo = new THREE.TorusGeometry(0.39, 0.024, 16, 48);
  rimGeo.rotateX(Math.PI / 2);
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0xe2b857,
    roughness: 0.22,
    metalness: 0.88,
  });
  const rimMesh = new THREE.Mesh(rimGeo, rimMat);
  rimMesh.position.y = 0.03;

  medallionGroup.add(discMesh);
  medallionGroup.add(rimMesh);
  medallionGroup.position.set(0, 0.36, 0.9);
  medallionGroup.rotation.set(0.35, 0, 0);
  medallionGroup.scale.setScalar(0.001);
  medallionGroup.visible = false;
  group.add(medallionGroup);

  const rig: DonutRig = {
    group,
    doughMesh,
    glazeMesh,
    glbMesh: null,
    glbFlavorMaterials: {},
    doughMat,
    glazeMat,
    drizzleMat,
    drizzleRibbonMesh,
    drizzleCrossMesh,
    sprinklesMesh,
    pistachioMesh,
    goldMesh,
    medallionGroup,
    attachGlbSurfaceAssets: (assets) => {
      rig.glbFlavorMaterials = assets.flavorMaterials;

      const defaultMat =
        assets.flavorMaterials[initialFlavor.id] ??
        Object.values(assets.flavorMaterials)[0];

      if (!rig.glbMesh && defaultMat) {
        rig.glbMesh = new THREE.Mesh(assets.geometry, defaultMat);
        rig.glbMesh.castShadow = true;
        rig.glbMesh.receiveShadow = true;
        group.add(rig.glbMesh);
      } else if (rig.glbMesh && defaultMat) {
        rig.glbMesh.geometry = assets.geometry;
        rig.glbMesh.material = defaultMat;
      }

      drizzleRibbonMesh.geometry = assets.drizzleRibbonGeo;
      drizzleCrossMesh.geometry = assets.drizzleCrossGeo;

      assets.sprinkleMatrices.forEach((m, i) => {
        if (i < sprinklesMesh.count) sprinklesMesh.setMatrixAt(i, m);
      });
      sprinklesMesh.instanceMatrix.needsUpdate = true;
      sprinklesMesh.computeBoundingSphere();

      assets.pistachioMatrices.forEach((m, i) => {
        if (i < pistachioMesh.count) pistachioMesh.setMatrixAt(i, m);
      });
      pistachioMesh.instanceMatrix.needsUpdate = true;
      pistachioMesh.computeBoundingSphere();

      assets.goldMatrices.forEach((m, i) => {
        if (i < goldMesh.count) goldMesh.setMatrixAt(i, m);
      });
      goldMesh.instanceMatrix.needsUpdate = true;
      goldMesh.computeBoundingSphere();

      medallionGroup.position.copy(assets.medallionPos);

      doughMesh.visible = false;
      glazeMesh.visible = false;
    },
    dispose: () => {
      doughGeo.dispose();
      doughMat.dispose();
      glazeGeo.dispose();
      glazeMat.dispose();
      fallbackRibbonGeo.dispose();
      fallbackCrossGeo.dispose();
      drizzleMat.dispose();
      sprinkleGeo.dispose();
      sprinkleMat.dispose();
      pistGeo.dispose();
      pistMat.dispose();
      goldGeo.dispose();
      goldMat.dispose();
      discGeo.dispose();
      discMat.dispose();
      rimGeo.dispose();
      rimMat.dispose();
    },
  };

  applyDonutAppearance(
    rig,
    initialFlavor,
    initialFlavor.defaultDrizzle,
    initialFlavor.defaultTopping,
  );
  return rig;
}

export function applyDonutAppearance(
  rig: DonutRig,
  flavor: DonutFlavor,
  drizzleStyle: DrizzleStyle,
  toppingStyle: ToppingStyle,
): void {
  rig.glazeMat.color.set(flavor.glazeHex);
  rig.glazeMat.roughness = flavor.glazeRoughness;
  rig.glazeMat.clearcoat = flavor.glazeClearcoat;

  if (rig.glbMesh) {
    const mat =
      rig.glbFlavorMaterials[flavor.id] ??
      Object.values(rig.glbFlavorMaterials)[0];
    if (mat) {
      rig.glbMesh.material = mat;
    }
  }

  rig.drizzleMat.color.set(flavor.drizzleHex);
  rig.drizzleRibbonMesh.visible = drizzleStyle === 'ribbon' || drizzleStyle === 'cross';
  rig.drizzleCrossMesh.visible = drizzleStyle === 'cross';

  rig.sprinklesMesh.visible = toppingStyle === 'sprinkles';
  rig.pistachioMesh.visible = toppingStyle === 'pistachio';
  rig.goldMesh.visible = toppingStyle === 'gold';

  if (toppingStyle === 'sprinkles') {
    const c = new THREE.Color();
    for (let i = 0; i < rig.sprinklesMesh.count; i++) {
      c.set(flavor.sprinkleColors[i % flavor.sprinkleColors.length]);
      rig.sprinklesMesh.setColorAt(i, c);
    }
    if (rig.sprinklesMesh.instanceColor) {
      rig.sprinklesMesh.instanceColor.needsUpdate = true;
    }
  }
}
