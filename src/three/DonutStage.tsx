import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  CAMERA_PRESETS,
  CameraPresetId,
  DONUT_FLAVORS,
  DrizzleStyle,
  ToppingStyle,
  getFlavorById,
} from '../data/donuts';
import { StagePose } from '../utils/choreography';
import {
  DonutRig,
  GlbSnappedSurfaceAssets,
  applyDonutAppearance,
  buildGlbSnappedSurfaceAssets,
  createDonutRig,
} from './donutMesh';
import { loadDonutAndCloudGlbs } from './glbAssets';
import { createProceduralTextures } from './textures';

export interface DonutStageProps {
  poseRef: React.MutableRefObject<StagePose>;
  configFlavorId: string;
  configDrizzle: DrizzleStyle;
  configTopping: ToppingStyle;
  cameraPreset: CameraPresetId;
  dragDeltaRef: React.MutableRefObject<{ yaw: number; pitch: number }>;
  reducedMotion: boolean;
  pauseRender?: boolean;
}

const _glazeTarget = new THREE.Color();
const _drizzleTarget = new THREE.Color();
const _pearlColor = new THREE.Color();

function detectSoftwareWebGL(): boolean {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export function DonutStage({
  poseRef,
  configFlavorId,
  configDrizzle,
  configTopping,
  cameraPreset,
  dragDeltaRef,
  reducedMotion,
  pauseRender = false,
}: DonutStageProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webglFailed, setWebglFailed] = useState(false);

  const liveConfigRef = useRef({
    configFlavorId,
    configDrizzle,
    configTopping,
    cameraPreset,
    reducedMotion,
    pauseRender,
  });
  liveConfigRef.current = {
    configFlavorId,
    configDrizzle,
    configTopping,
    cameraPreset,
    reducedMotion,
    pauseRender,
  };

  const [stageReady, setStageReady] = useState(!pauseRender);

  useEffect(() => {
    if (!pauseRender) {
      setStageReady(true);
      return;
    }
    const timer = window.setTimeout(() => setStageReady(true), 450);
    return () => window.clearTimeout(timer);
  }, [pauseRender]);

  useEffect(() => {
    if (!stageReady) return;
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglFailed(true);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    const onContextLost = (e: Event) => {
      e.preventDefault();
    };
    const onContextRestored = () => {
      setWebglFailed(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    pmrem.dispose();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 45);
    camera.position.set(0, 0.1, 5.4);

    // Warm bakery food-photography lighting + table bounce fill
    const hemiLight = new THREE.HemisphereLight(0xfff4e6, 0x8a4b21, 1.05);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff3e0, 2.45);
    keyLight.position.set(4.5, 6.2, 5.5);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 20;
      keyLight.shadow.camera.left = -4;
      keyLight.shadow.camera.right = 4;
      keyLight.shadow.camera.top = 4;
      keyLight.shadow.camera.bottom = -4;
      keyLight.shadow.bias = -0.0005;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xffd280, 1.35);
    rimLight.position.set(-4.5, 3.0, -4.5);
    scene.add(rimLight);

    const bounceLight = new THREE.DirectionalLight(0xffcf96, 0.72);
    bounceLight.position.set(-2.5, -3.5, 4.0);
    scene.add(bounceLight);

    const textures = createProceduralTextures(renderer.capabilities.getMaxAnisotropy());

    // Hero Interactive Donut
    const heroRig = createDonutRig(textures, DONUT_FLAVORS[0]);
    scene.add(heroRig.group);

    // Soft contact shadow disc beneath hero donut
    const shadowGeo = new THREE.PlaneGeometry(3.2, 3.2);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: textures.contactShadowMap,
      transparent: true,
      depthWrite: false,
      opacity: 0.35,
    });
    const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
    contactShadow.position.set(0, -1.05, 0);
    scene.add(contactShadow);

    // 6-Flavor Radial Starburst Ring
    const ringGroup = new THREE.Group();
    const ringRigs: DonutRig[] = DONUT_FLAVORS.map((flavor) => {
      const rig = createDonutRig(textures, flavor);
      ringGroup.add(rig.group);
      return rig;
    });
    ringGroup.visible = false;
    scene.add(ringGroup);

    // Ambient Culinary Parallax Motifs (Glazed rondo mini-rings, sprinkles & 24K gold shards)
    const pearlsGroup = new THREE.Group();
    const miniRingGeo = new THREE.TorusGeometry(0.66, 0.25, 14, 28);
    const curlGeo = new THREE.CapsuleGeometry(0.16, 0.72, 6, 10);
    const flakeGeo = new THREE.OctahedronGeometry(0.32, 0);

    const pearlMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.18,
      clearcoat: 0.92,
      clearcoatRoughness: 0.08,
      transparent: true,
      opacity: 0.88,
    });
    const sprinkleAccentMat = new THREE.MeshPhysicalMaterial({
      color: 0xfaf4eb,
      roughness: 0.24,
      clearcoat: 0.7,
      transparent: true,
      opacity: 0.9,
    });
    const goldShardMat = new THREE.MeshStandardMaterial({
      color: 0xf5c542,
      roughness: 0.2,
      metalness: 0.92,
      envMapIntensity: 1.6,
      transparent: true,
      opacity: 0.92,
    });

    type MotifKind = 'ring' | 'curl' | 'gold';
    const pearlDefs: Array<{
      kind: MotifKind;
      x: number;
      y: number;
      z: number;
      r: number;
      speed: number;
      rx: number;
      ry: number;
      spinX: number;
      spinY: number;
    }> = [
      { kind: 'ring', x: -2.65, y: 1.08, z: -1.65, r: 0.21, speed: 0.75, rx: 0.7, ry: 0.4, spinX: 0.35, spinY: 0.45 },
      { kind: 'ring', x: 2.55, y: 1.18, z: -1.45, r: 0.24, speed: 0.9, rx: -0.6, ry: 0.8, spinX: -0.3, spinY: 0.4 },
      { kind: 'ring', x: 2.35, y: -1.05, z: -1.85, r: 0.19, speed: 0.68, rx: 0.9, ry: -0.5, spinX: 0.25, spinY: -0.35 },
      { kind: 'curl', x: -2.95, y: -0.15, z: -1.9, r: 0.18, speed: 1.05, rx: 0.4, ry: 0.9, spinX: 0.5, spinY: 0.3 },
      { kind: 'curl', x: 2.95, y: 0.22, z: -1.7, r: 0.16, speed: 1.15, rx: -0.5, ry: 0.3, spinX: -0.45, spinY: 0.55 },
      { kind: 'curl', x: -1.55, y: -1.32, z: -1.4, r: 0.14, speed: 1.25, rx: 0.8, ry: -0.4, spinX: 0.4, spinY: -0.5 },
      { kind: 'gold', x: 1.25, y: 1.48, z: -1.75, r: 0.18, speed: 0.95, rx: 0.3, ry: 0.6, spinX: 0.45, spinY: 0.6 },
      { kind: 'gold', x: -0.85, y: 1.56, z: -1.65, r: 0.15, speed: 1.1, rx: -0.4, ry: 0.2, spinX: -0.4, spinY: 0.5 },
      { kind: 'gold', x: 1.25, y: -1.46, z: -1.35, r: 0.16, speed: 0.85, rx: 0.6, ry: -0.7, spinX: 0.35, spinY: -0.45 },
    ];

    const pearlMeshes = pearlDefs.map((def) => {
      const geo =
        def.kind === 'ring' ? miniRingGeo : def.kind === 'curl' ? curlGeo : flakeGeo;
      const mat =
        def.kind === 'ring'
          ? pearlMat
          : def.kind === 'curl'
            ? sprinkleAccentMat
            : goldShardMat;
      const m = new THREE.Mesh(geo, mat);
      m.position.set(def.x, def.y, def.z);
      m.rotation.set(def.rx, def.ry, 0);
      if (def.kind === 'gold') {
        m.scale.set(def.r, def.r * 0.24, def.r);
      } else {
        m.scale.setScalar(def.r);
      }
      pearlsGroup.add(m);
      return m;
    });
    scene.add(pearlsGroup);

    // Volumetric 3D Clouds Group (populated when /cloud_test.glb finishes loading)
    const cloudsGroup = new THREE.Group();
    cloudsGroup.visible = false;
    scene.add(cloudsGroup);
    const cloudSlots = [
      { baseX: 1.85, y: 0.88, z: -2.55, scale: 1.45, rotY: 0.25, speed: 0.14, phase: 0.4 },
      { baseX: -1.65, y: 0.92, z: -2.95, scale: 1.28, rotY: -0.45, speed: 0.11, phase: 2.1 },
      { baseX: 1.15, y: -0.92, z: -2.45, scale: 1.42, rotY: 0.85, speed: 0.16, phase: 4.0 },
      { baseX: 2.65, y: -0.15, z: -3.25, scale: 1.48, rotY: 1.5, speed: 0.09, phase: 1.2 },
      { baseX: -0.1, y: 1.15, z: -3.55, scale: 1.5, rotY: -1.25, speed: 0.12, phase: 3.3 },
    ];
    let cloudInstances: THREE.Object3D[] = [];
    let glbSurfaceAssets: GlbSnappedSurfaceAssets | null = null;
    let glbExtraVariants: Array<{
      geometry: THREE.BufferGeometry;
      material: THREE.MeshPhysicalMaterial;
    }> = [];

    loadDonutAndCloudGlbs(renderer.capabilities.getMaxAnisotropy()).then(
      ({ donutVariants, flavorMaterials, sharedGeometry, cloudScene }) => {
        if (disposed) {
          donutVariants.forEach((v) => {
            v.geometry.dispose();
            v.material.dispose();
          });
          Object.values(flavorMaterials).forEach((m) => m.dispose());
          return;
        }

        if (sharedGeometry && Object.keys(flavorMaterials).length > 0) {
          glbExtraVariants = donutVariants;
          glbSurfaceAssets = buildGlbSnappedSurfaceAssets(
            sharedGeometry,
            flavorMaterials,
          );
          heroRig.attachGlbSurfaceAssets(glbSurfaceAssets);
          ringRigs.forEach((r, idx) => {
            r.attachGlbSurfaceAssets(glbSurfaceAssets!);
            const f = DONUT_FLAVORS[idx];
            applyDonutAppearance(r, f, f.defaultDrizzle, f.defaultTopping);
          });
          // Force immediate refresh on next frame
          lastStoryFlavor = '';
          lastCfgSignature = '';
        }

        if (cloudScene) {
          cloudInstances = cloudSlots.map((slot) => {
            const clone = cloudScene.clone();
            clone.position.set(slot.baseX, slot.y, slot.z);
            clone.rotation.set(0, slot.rotY, 0);
            clone.scale.setScalar(slot.scale);
            cloudsGroup.add(clone);
            return clone;
          });
        }
      },
    );

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // Smooth runtime state variables
    let curX = 0;
    let curY = 0.08;
    let curZ = 0;
    let curRotX = 0.42;
    let curRotY = 0.25;
    let curRotZ = -0.18;
    let curScale = 1.18;
    let curCamZ = 5.4;
    let curCamY = 0.1;
    let curRingSpread = 0;
    let curMedallion = 0;
    let curPearls = 0.15;
    let curNocturnal = 0;
    let curPresetPitch = 0;
    let curPresetYaw = 0;
    let curPresetZoom = 1;
    let lastStoryFlavor = '';
    let lastCfgSignature = '';

    const startMs = performance.now();
    let prevMs = startMs;
    let frameId = 0;
    let disposed = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (gl && typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (disposed) return;
          const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        frameId = window.setTimeout(cb, 80);
      }
    }

    let hasRenderedWarmFrame = false;

    function tick() {
      if (disposed) return;

      const nowMs = performance.now();
      const dt = Math.min(Math.max((nowMs - prevMs) / 1000, 0.001), 0.25);
      prevMs = nowMs;
      const elapsed = (nowMs - startMs) / 1000;
      const pose = poseRef.current;
      const cfg = liveConfigRef.current;

      // While preloader covers the viewport, skip WebGL draws after the warm frame so UI stays 60fps
      if (cfg.pauseRender && hasRenderedWarmFrame) {
        frameId = window.setTimeout(tick, 90);
        return;
      }

      const isConfigurator = pose.chapterId === 'configurator';
      const activeFlavorId = isConfigurator ? cfg.configFlavorId : pose.storyFlavorId;
      const activeFlavor = getFlavorById(activeFlavorId);

      // Update hero donut materials & garnishes when flavor/config changes
      if (isConfigurator) {
        const sig = `cfg_${cfg.configFlavorId}_${cfg.configDrizzle}_${cfg.configTopping}`;
        if (sig !== lastCfgSignature) {
          lastCfgSignature = sig;
          lastStoryFlavor = '';
          applyDonutAppearance(heroRig, activeFlavor, cfg.configDrizzle, cfg.configTopping);
        }
      } else if (lastStoryFlavor !== activeFlavor.id) {
        lastStoryFlavor = activeFlavor.id;
        lastCfgSignature = '';
        applyDonutAppearance(
          heroRig,
          activeFlavor,
          activeFlavor.defaultDrizzle,
          activeFlavor.defaultTopping,
        );
      }

      // Smoothly damp glaze & drizzle colors during story transitions
      _glazeTarget.set(activeFlavor.glazeHex);
      _drizzleTarget.set(activeFlavor.drizzleHex);
      heroRig.glazeMat.color.lerp(_glazeTarget, 1 - Math.exp(-9 * dt));
      heroRig.drizzleMat.color.lerp(_drizzleTarget, 1 - Math.exp(-9 * dt));

      // Camera preset offsets when in configurator
      const preset =
        CAMERA_PRESETS.find((p) => p.id === cfg.cameraPreset) ?? CAMERA_PRESETS[0];
      const targetPresetPitch = isConfigurator ? preset.pitch - 0.45 : 0;
      const targetPresetYaw = isConfigurator ? preset.yaw - 0.3 : 0;
      const targetPresetZoom = isConfigurator ? preset.zoom : 1;

      const lambda = 9.5;
      curX = THREE.MathUtils.damp(curX, pose.donutX, lambda, dt);
      curY = THREE.MathUtils.damp(curY, pose.donutY, lambda, dt);
      curZ = THREE.MathUtils.damp(curZ, pose.donutZ, lambda, dt);
      curRotX = THREE.MathUtils.damp(curRotX, pose.rotX, lambda, dt);
      curRotY = THREE.MathUtils.damp(curRotY, pose.rotY, lambda, dt);
      curRotZ = THREE.MathUtils.damp(curRotZ, pose.rotZ, lambda, dt);
      curScale = THREE.MathUtils.damp(curScale, pose.scale, lambda, dt);
      curCamZ = THREE.MathUtils.damp(curCamZ, pose.cameraZ, lambda, dt);
      curCamY = THREE.MathUtils.damp(curCamY, pose.cameraY, lambda, dt);
      curRingSpread = THREE.MathUtils.damp(curRingSpread, pose.ringSpread, 11, dt);
      curMedallion = THREE.MathUtils.damp(curMedallion, pose.medallionBlend, 10, dt);
      curPearls = THREE.MathUtils.damp(curPearls, pose.pearlsOpacity, 8, dt);
      curNocturnal = THREE.MathUtils.damp(curNocturnal, pose.nocturnalMood, 8, dt);
      curPresetPitch = THREE.MathUtils.damp(curPresetPitch, targetPresetPitch, 9, dt);
      curPresetYaw = THREE.MathUtils.damp(curPresetYaw, targetPresetYaw, 9, dt);
      curPresetZoom = THREE.MathUtils.damp(curPresetZoom, targetPresetZoom, 9, dt);

      // Gentle alive hover & turntable spin (respecting reduced motion)
      const motionMul = cfg.reducedMotion ? 0 : 1;
      const bobY = Math.sin(elapsed * 1.45) * 0.055 * motionMul;
      const idleSpinY =
        (isConfigurator ? elapsed * 0.22 : elapsed * 0.32) * motionMul;

      const drag = dragDeltaRef.current;
      // Gently decay drag outside hero/configurator
      if (pose.chapterId !== 'hero' && pose.chapterId !== 'configurator') {
        drag.yaw = THREE.MathUtils.damp(drag.yaw, 0, 6, dt);
        drag.pitch = THREE.MathUtils.damp(drag.pitch, 0, 6, dt);
      }

      heroRig.group.position.set(curX, curY + bobY, curZ);
      heroRig.group.rotation.set(
        curRotX + curPresetPitch + drag.pitch,
        curRotY + curPresetYaw + idleSpinY + drag.yaw,
        curRotZ,
      );
      const heroRingFade = Math.max(0, 1 - curRingSpread * 1.6);
      heroRig.group.scale.setScalar(Math.max(0.001, curScale * heroRingFade));
      heroRig.group.visible = pose.stageVisibility > 0.02 && heroRingFade > 0.03;

      // Embossed bakery medallion reveal in Craft chapter
      heroRig.medallionGroup.visible = curMedallion > 0.02;
      if (heroRig.medallionGroup.visible) {
        heroRig.medallionGroup.scale.setScalar(0.01 + curMedallion * 0.99);
      }

      // 6-Flavor Radial Starburst Pinwheel (all donuts glaze-side facing camera!)
      ringGroup.visible = curRingSpread > 0.03 && pose.stageVisibility > 0.02;
      if (ringGroup.visible) {
        const radius = 1.54 * curRingSpread;
        const spin = elapsed * 0.24 * motionMul;
        ringGroup.position.set(0, curY, -0.35);
        ringGroup.rotation.set(0, 0, 0);

        for (let i = 0; i < ringRigs.length; i++) {
          const angle = (i / ringRigs.length) * Math.PI * 2 + spin;
          const rRig = ringRigs[i];
          rRig.group.position.set(
            Math.cos(angle) * radius,
            Math.sin(angle) * radius,
            Math.sin(angle * 2 + elapsed) * 0.1 * motionMul,
          );
          // Tilt +Y glaze face directly toward +Z camera (~72 deg) with subtle lively tilt
          rRig.group.rotation.set(
            1.22 + Math.sin(elapsed * 1.1 + i) * 0.12 * motionMul,
            Math.cos(elapsed * 0.9 + i) * 0.18 * motionMul,
            Math.sin(angle) * 0.15,
          );
          rRig.group.scale.setScalar(0.42 * curRingSpread * (curScale / 0.52));
        }
      }

      // Floating Culinary Garnish Motifs (Glazed mini-rings, sprinkles & gold leaf)
      pearlsGroup.visible = curPearls > 0.02 && pose.stageVisibility > 0.02;
      if (pearlsGroup.visible) {
        _pearlColor.set(activeFlavor.glazeHex);
        pearlMat.color.lerp(_pearlColor, 1 - Math.exp(-6 * dt));
        pearlMat.opacity = curPearls * 0.88;

        _drizzleTarget.set(activeFlavor.sprinkleColors[0] ?? activeFlavor.drizzleHex);
        sprinkleAccentMat.color.lerp(_drizzleTarget, 1 - Math.exp(-6 * dt));
        sprinkleAccentMat.opacity = curPearls * 0.9;
        goldShardMat.opacity = curPearls * 0.92;

        for (let i = 0; i < pearlMeshes.length; i++) {
          const def = pearlDefs[i];
          const pm = pearlMeshes[i];
          pm.position.y =
            def.y + Math.sin(elapsed * def.speed + i * 1.1) * 0.16 * motionMul;
          pm.rotation.set(
            def.rx + elapsed * def.spinX * motionMul,
            def.ry + elapsed * def.spinY * motionMul,
            Math.sin(elapsed * 0.4 + i) * 0.25 * motionMul,
          );
          const s = def.r * (0.45 + curPearls * 0.55);
          if (def.kind === 'gold') {
            pm.scale.set(s, s * 0.24, s);
          } else {
            pm.scale.setScalar(s);
          }
        }
      }

      // 3D Volumetric Clouds (/cloud_test.glb) visible across bright daytime chapters
      const showClouds =
        cloudInstances.length > 0 &&
        pose.stageVisibility > 0.1 &&
        pose.ringSpread < 0.08 &&
        (pose.chapterId === 'yuzu' ||
          pose.chapterId === 'hero' ||
          pose.chapterId === 'berry' ||
          pose.chapterId === 'matcha');
      cloudsGroup.visible = showClouds;
      if (showClouds) {
        const cloudWeight = pose.chapterId === 'yuzu' ? 1.15 : pose.chapterId === 'hero' ? 1.05 : 0.96;
        cloudsGroup.position.x = curX * 0.32;
        for (let i = 0; i < cloudInstances.length; i++) {
          const slot = cloudSlots[i];
          const cObj = cloudInstances[i];
          cObj.position.x =
            slot.baseX + Math.sin(elapsed * slot.speed + slot.phase) * 0.42 * motionMul;
          cObj.position.y =
            slot.y + Math.cos(elapsed * (slot.speed * 1.25) + slot.phase) * 0.16 * motionMul;
          cObj.rotation.y =
            slot.rotY + Math.sin(elapsed * 0.08 + slot.phase) * 0.12 * motionMul;
          cObj.scale.setScalar(slot.scale * cloudWeight);
        }
      }

      // Contact shadow visible primarily in Hero & Configurator
      contactShadow.visible =
        pose.stageVisibility > 0.2 && curRingSpread < 0.2 && curMedallion < 0.3;
      contactShadow.position.set(curX, curY - 0.92, curZ);
      shadowMat.opacity = 0.32 * pose.stageVisibility * (1 - curRingSpread);

      // Nocturnal rim lighting intensity modulation for After Dark
      hemiLight.intensity = THREE.MathUtils.lerp(1.05, 0.34, curNocturnal);
      keyLight.intensity = THREE.MathUtils.lerp(2.45, 1.4, curNocturnal);
      rimLight.intensity = THREE.MathUtils.lerp(1.35, 3.3, curNocturnal);
      bounceLight.intensity = THREE.MathUtils.lerp(0.72, 0.18, curNocturnal);

      camera.position.set(0, curCamY, curCamZ / curPresetZoom);
      camera.lookAt(0, 0, 0);

      renderer.domElement.style.opacity = String(pose.stageVisibility);
      renderer.render(scene, camera);
      hasRenderedWarmFrame = true;

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    if (isSoftwareGl) {
      // Draw initial frame cleanly via rAF then pace with afterDraw
      frameId = requestAnimationFrame(tick);
    } else {
      frameId = requestAnimationFrame(tick);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);

      heroRig.dispose();
      ringRigs.forEach((r) => r.dispose());
      if (glbSurfaceAssets) {
        glbSurfaceAssets.dispose();
      }
      glbExtraVariants.forEach((v) => {
        v.geometry.dispose();
        v.material.dispose();
      });
      shadowGeo.dispose();
      shadowMat.dispose();
      miniRingGeo.dispose();
      curlGeo.dispose();
      flakeGeo.dispose();
      pearlMat.dispose();
      sprinkleAccentMat.dispose();
      goldShardMat.dispose();
      textures.dispose();
      envTarget.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [dragDeltaRef, poseRef, stageReady]);

  if (webglFailed) {
    return (
      <div
        className="fixed inset-0 pointer-events-none flex items-center justify-center z-10"
        data-testid="webgl-fallback"
      >
        <div className="w-64 h-64 rounded-full border-8 border-white/25 bg-black/20 flex items-center justify-center text-white/80 text-sm font-medium">
          3D Showcase Preview
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      data-testid="donut-3d-canvas"
      className="fixed inset-0 pointer-events-none z-10"
      aria-hidden="true"
    />
  );
}
