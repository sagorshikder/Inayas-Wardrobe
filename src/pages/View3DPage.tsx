import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ChevronDown, ChevronUp, DoorOpen, MessageCircle, RotateCcw } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import {
  buildWardrobeWhatsAppUrl,
  computeCustomWardrobeQuote,
  formatTaka,
} from '../utils/commerce';

interface FinishSpec {
  name: string;
  swatch: string;
  baseHex: string;
  grainHex: string;
  knotAlpha: number;
  fineGrain: boolean;
  roughness: number;
  clearcoat: number;
  interiorHex: number;
}

const FINISHES: FinishSpec[] = [
  {
    name: 'Walnut Brown',
    swatch: '#6b4a32',
    baseHex: '#623f27',
    grainHex: '#2e1a0e',
    knotAlpha: 0.17,
    fineGrain: false,
    roughness: 0.42,
    clearcoat: 0.22,
    interiorHex: 0x7e5a3e,
  },
  {
    name: 'Natural Oak',
    swatch: '#c49a62',
    baseHex: '#c99f67',
    grainHex: '#8d6234',
    knotAlpha: 0.14,
    fineGrain: false,
    roughness: 0.52,
    clearcoat: 0.1,
    interiorHex: 0xd4b282,
  },
  {
    name: 'Matte White',
    swatch: '#f1ede6',
    baseHex: '#f1ece3',
    grainHex: '#dcd4c8',
    knotAlpha: 0.04,
    fineGrain: true,
    roughness: 0.44,
    clearcoat: 0.16,
    interiorHex: 0xe7dfd2,
  },
  {
    name: 'Charcoal Grey',
    swatch: '#45484d',
    baseHex: '#42464c',
    grainHex: '#25282c',
    knotAlpha: 0.11,
    fineGrain: true,
    roughness: 0.48,
    clearcoat: 0.14,
    interiorHex: 0x56595f,
  },
];

function makeWoodMaps(spec: FinishSpec, maxAniso: number) {
  const size = 512;
  const colCanvas = document.createElement('canvas');
  colCanvas.width = colCanvas.height = size;
  const cCtx = colCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d')!;

  cCtx.fillStyle = spec.baseHex;
  cCtx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);

  const bands = spec.fineGrain ? 180 : 260;
  for (let i = 0; i < bands; i++) {
    const x = (i / bands) * size + Math.sin(i * 1.9) * 2.5;
    const w = (size / bands) * (0.45 + (i % 5) * 0.22);
    cCtx.fillStyle = spec.grainHex;
    cCtx.globalAlpha = spec.fineGrain ? 0.015 + (i % 7) * 0.004 : 0.04 + (i % 9) * 0.014;
    cCtx.fillRect(x, 0, w, size);

    const bVal = 112 + ((i * 37) % 36);
    bCtx.fillStyle = `rgb(${bVal},${bVal},${bVal})`;
    bCtx.globalAlpha = spec.fineGrain ? 0.22 : 0.45;
    bCtx.fillRect(x, 0, w, size);
  }

  cCtx.globalAlpha = spec.knotAlpha;
  cCtx.strokeStyle = spec.grainHex;
  bCtx.globalAlpha = 0.28;
  bCtx.strokeStyle = '#5c5c5c';
  const ringCount = spec.fineGrain ? 6 : 14;
  for (let r = 0; r < ringCount; r++) {
    const cx = ((r * 137) % (size - 80)) + 40;
    cCtx.lineWidth = 1.2 + (r % 3) * 0.7;
    bCtx.lineWidth = cCtx.lineWidth;
    cCtx.beginPath();
    bCtx.beginPath();
    for (let y = 0; y <= size; y += 16) {
      const wave = Math.sin((y / size) * Math.PI * 2 + r) * (8 + (r % 4) * 5);
      if (y === 0) {
        cCtx.moveTo(cx + wave, y);
        bCtx.moveTo(cx + wave, y);
      } else {
        cCtx.lineTo(cx + wave, y);
        bCtx.lineTo(cx + wave, y);
      }
    }
    cCtx.stroke();
    bCtx.stroke();
  }
  cCtx.globalAlpha = 1;
  bCtx.globalAlpha = 1;

  const map = new THREE.CanvasTexture(colCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = maxAniso;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.colorSpace = THREE.NoColorSpace;
  bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.anisotropy = maxAniso;

  return { map, bumpMap };
}

function makeContactShadowTexture() {
  const s = 256;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(s / 2, s / 2, s * 0.08, s / 2, s / 2, s * 0.48);
  grad.addColorStop(0, 'rgba(24, 14, 8, 0.44)');
  grad.addColorStop(0.55, 'rgba(24, 14, 8, 0.16)');
  grad.addColorStop(1, 'rgba(24, 14, 8, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makePlinthTexture(maxAniso: number) {
  const s = 512;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#e6dac8';
  ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 1400; i++) {
    const x = (i * 197) % s;
    const y = (i * 313) % s;
    ctx.fillStyle = i % 2 ? 'rgba(120, 96, 72, 0.05)' : 'rgba(255, 252, 246, 0.09)';
    ctx.fillRect(x, y, 2 + (i % 4), 1 + (i % 3));
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

export function View3DPage() {
  const { theme, siteText } = useStore();
  const stageRef = useRef<HTMLDivElement>(null);

  const [widthFt, setWidthFt] = useState(6);
  const [heightFt, setHeightFt] = useState(7);
  const [finishIdx, setFinishIdx] = useState(0);
  const [doorsOpen, setDoorsOpen] = useState(false);
  const [dockCollapsed, setDockCollapsed] = useState(false);

  // Refs synced with Three.js without re-creating renderer
  const configRef = useRef({ widthFt, heightFt, finishIdx, doorsOpen });
  configRef.current = { widthFt, heightFt, finishIdx, doorsOpen };

  const rebuildRef = useRef<(() => void) | null>(null);
  const finishApplyRef = useRef<((idx: number) => void) | null>(null);
  const resetCameraRef = useRef<(() => void) | null>(null);
  const triggerRenderRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const container = stageRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      try {
        const probe = document.createElement('canvas');
        const gl = probe.getContext('webgl2') || probe.getContext('webgl');
        if (!gl) return true;
        const dbg = gl.getExtension('WEBGL_debug_renderer_info');
        const param = dbg ? dbg.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param) || '');
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|mesa offscreen|WARP|VirtualBox/i.test(gpu);
      } catch {
        return false;
      }
    })();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    scene.environmentIntensity = 0.72;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 80);
    camera.position.set(3.2, 1.35, 7.1);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.22, 0);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.minDistance = 3.2;
    controls.maxDistance = 12.5;
    controls.minPolarAngle = 0.36;
    controls.maxPolarAngle = Math.PI * 0.485;
    controls.autoRotate = !isSoftwareGl;
    controls.autoRotateSpeed = 0.65;

    const hemiLight = new THREE.HemisphereLight(0xfff7ec, 0x7b624b, 0.75);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff2df, 2.05);
    keyLight.position.set(4.2, 6.2, 5.4);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 18;
      keyLight.shadow.camera.left = -4.5;
      keyLight.shadow.camera.right = 4.5;
      keyLight.shadow.camera.top = 4.5;
      keyLight.shadow.camera.bottom = -4.5;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xd9e5f5, 0.85);
    rimLight.position.set(-4.8, 3.6, -4.4);
    scene.add(rimLight);

    const interiorLed = new THREE.PointLight(0xffcf88, 0, 4.6, 1.7);
    scene.add(interiorLed);

    const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy() || 1);
    const finishMaps = FINISHES.map((f) => makeWoodMaps(f, maxAniso));
    const plinthTex = makePlinthTexture(maxAniso);
    const contactTex = makeContactShadowTexture();

    const woodMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: finishMaps[0].map,
      bumpMap: finishMaps[0].bumpMap,
      bumpScale: 0.008,
      roughness: FINISHES[0].roughness,
      metalness: 0.03,
      clearcoat: FINISHES[0].clearcoat,
      clearcoatRoughness: 0.32,
    });

    const interiorMat = new THREE.MeshStandardMaterial({
      color: FINISHES[0].interiorHex,
      bumpMap: finishMaps[0].bumpMap,
      bumpScale: 0.004,
      roughness: 0.62,
      metalness: 0.02,
    });

    const brassMat = new THREE.MeshPhysicalMaterial({
      color: 0xd2a84e,
      metalness: 0.92,
      roughness: 0.22,
      clearcoat: 0.25,
      clearcoatRoughness: 0.18,
    });

    const darkMetalMat = new THREE.MeshStandardMaterial({
      color: 0x26211e,
      metalness: 0.75,
      roughness: 0.35,
    });

    const mirrorMat = new THREE.MeshPhysicalMaterial({
      color: 0xdfd8ce,
      metalness: 0.94,
      roughness: 0.08,
      clearcoat: 0.65,
      clearcoatRoughness: 0.05,
    });

    const ledStripMat = new THREE.MeshStandardMaterial({
      color: 0xffe4b8,
      emissive: 0xffc675,
      emissiveIntensity: 0.35,
      roughness: 0.25,
    });

    const fabricMats = [
      new THREE.MeshStandardMaterial({ color: 0xeae1d3, roughness: 0.88 }),
      new THREE.MeshStandardMaterial({ color: 0x9b6b49, roughness: 0.88 }),
      new THREE.MeshStandardMaterial({ color: 0x3b4046, roughness: 0.88 }),
      new THREE.MeshStandardMaterial({ color: 0xc2aa8c, roughness: 0.88 }),
    ];

    const BASE_Y = -1.55;
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xeadfce,
      roughness: 0.92,
      metalness: 0,
    });
    const floor = new THREE.Mesh(new THREE.CircleGeometry(14, 64), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = BASE_Y;
    floor.receiveShadow = true;
    scene.add(floor);

    const plinthMat = new THREE.MeshStandardMaterial({
      map: plinthTex,
      roughness: 0.72,
      metalness: 0.04,
    });
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(3.35, 3.45, 0.08, 64), plinthMat);
    plinth.position.y = BASE_Y + 0.04;
    plinth.receiveShadow = true;
    scene.add(plinth);

    const plinthRing = new THREE.Mesh(new THREE.TorusGeometry(3.36, 0.012, 12, 72), brassMat);
    plinthRing.rotation.x = Math.PI / 2;
    plinthRing.position.y = BASE_Y + 0.078;
    scene.add(plinthRing);

    const contactShadowMat = new THREE.MeshBasicMaterial({
      map: contactTex,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });
    const contactShadow = new THREE.Mesh(new THREE.PlaneGeometry(5.8, 3.0), contactShadowMat);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = BASE_Y + 0.082;
    scene.add(contactShadow);

    const syncTheme = () => {
      const dark = document.documentElement.classList.contains('dark');
      const bgHex = dark ? 0x1e1611 : 0xf1e7da;
      const floorHex = dark ? 0x241a14 : 0xeadfce;
      const plinthHex = dark ? 0x403329 : 0xffffff;
      scene.background = new THREE.Color(bgHex);
      scene.fog = new THREE.FogExp2(bgHex, 0.042);
      floorMat.color.setHex(floorHex);
      plinthMat.color.setHex(plinthHex);
    };
    syncTheme();
    window.addEventListener('inaya-themechange', syncTheme);

    const wardrobe = new THREE.Group();
    scene.add(wardrobe);

    let doors: { pivot: THREE.Group; side: number }[] = [];
    let doorAnim = 0;

    const addPart = (
      parent: THREE.Object3D,
      w: number,
      h: number,
      d: number,
      x: number,
      y: number,
      z: number,
      mat: THREE.Material = woodMat,
      cast = true,
    ) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      m.castShadow = cast;
      m.receiveShadow = true;
      parent.add(m);
      return m;
    };

    const addFoldedStack = (
      parent: THREE.Object3D,
      x: number,
      y: number,
      z: number,
      width: number,
      count: number,
    ) => {
      for (let i = 0; i < count; i++) {
        const h = 0.055;
        const mat = fabricMats[(i + Math.round(x * 10)) % fabricMats.length];
        addPart(
          parent,
          width * (0.94 - i * 0.03),
          h,
          0.36,
          x,
          y + h / 2 + i * (h + 0.005),
          z,
          mat,
          true,
        );
      }
    };

    const addHanger = (
      parent: THREE.Object3D,
      x: number,
      rodY: number,
      z: number,
      fabricMat: THREE.Material,
    ) => {
      const hGrp = new THREE.Group();
      hGrp.position.set(x, rodY, z);

      const hook = new THREE.Mesh(
        new THREE.TorusGeometry(0.025, 0.005, 8, 16, Math.PI * 1.4),
        brassMat,
      );
      hook.position.y = -0.01;
      hook.rotation.y = Math.PI / 2;
      hGrp.add(hook);

      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.34, 8), woodMat);
      bar.rotation.z = Math.PI / 2;
      bar.rotation.y = Math.PI / 2;
      bar.position.y = -0.07;
      hGrp.add(bar);

      const shoulderL = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.18, 8), woodMat);
      shoulderL.rotation.x = 0.35;
      shoulderL.position.set(0, -0.048, -0.08);
      hGrp.add(shoulderL);

      const shoulderR = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.18, 8), woodMat);
      shoulderR.rotation.x = -0.35;
      shoulderR.position.set(0, -0.048, 0.08);
      hGrp.add(shoulderR);

      const garment = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.64, 0.31), fabricMat);
      garment.position.set(0, -0.39, 0);
      garment.castShadow = true;
      hGrp.add(garment);

      parent.add(hGrp);
    };

    const buildWardrobe = () => {
      while (wardrobe.children.length) {
        const child = wardrobe.children.pop()!;
        child.traverse((obj) => {
          if (obj instanceof THREE.Mesh && obj.geometry) obj.geometry.dispose();
        });
      }
      doors = [];

      const { widthFt: wFt, heightFt: hFt } = configRef.current;
      const W = wFt * 0.48;
      const H = hFt * 0.48;
      const D = 1.08;
      const t = 0.055;
      const plinthH = 0.11;
      const crownH = 0.065;
      const yFloor = BASE_Y + 0.08;
      const yBase = yFloor + plinthH;
      const innerH = H - plinthH - crownH;
      const innerW = W - t * 2;
      const bayW = (innerW - t) / 2;
      const leftCx = -bayW / 2 - t / 2;
      const rightCx = bayW / 2 + t / 2;

      addPart(
        wardrobe,
        W - 0.08,
        plinthH - 0.015,
        D - 0.07,
        0,
        yFloor + (plinthH - 0.015) / 2,
        -0.01,
        darkMetalMat,
      );
      addPart(wardrobe, W - 0.06, 0.015, D - 0.05, 0, yBase - 0.0075, -0.005, brassMat, false);

      addPart(wardrobe, W, t, D, 0, yBase + t / 2, 0, woodMat);
      addPart(wardrobe, W, t, D, 0, yBase + innerH - t / 2, 0, woodMat);
      addPart(wardrobe, t, innerH, D, -W / 2 + t / 2, yBase + innerH / 2, 0, woodMat);
      addPart(wardrobe, t, innerH, D, W / 2 - t / 2, yBase + innerH / 2, 0, woodMat);
      addPart(
        wardrobe,
        W - 0.02,
        innerH - 0.02,
        0.04,
        0,
        yBase + innerH / 2,
        -D / 2 + 0.02,
        interiorMat,
      );
      addPart(wardrobe, t * 0.85, innerH - t * 2, D - 0.08, 0, yBase + innerH / 2, -0.02, interiorMat);

      addPart(
        wardrobe,
        W + 0.07,
        crownH * 0.65,
        D + 0.06,
        0,
        yBase + innerH + crownH * 0.325,
        0.01,
        woodMat,
      );
      addPart(
        wardrobe,
        W + 0.11,
        crownH * 0.35,
        D + 0.09,
        0,
        yBase + innerH + crownH * 0.825,
        0.018,
        woodMat,
      );

      addPart(
        wardrobe,
        bayW - 0.08,
        0.018,
        0.035,
        leftCx,
        yBase + innerH - t - 0.01,
        D / 2 - 0.16,
        ledStripMat,
        false,
      );
      addPart(
        wardrobe,
        bayW - 0.08,
        0.018,
        0.035,
        rightCx,
        yBase + innerH - t - 0.01,
        D / 2 - 0.16,
        ledStripMat,
        false,
      );
      interiorLed.position.set(0, yBase + innerH - 0.25, 0.12);

      const drawerZoneH = Math.min(0.68, innerH * 0.28);
      const drawerH = (drawerZoneH - 0.06) / 2;
      for (let d = 0; d < 2; d++) {
        const dy = yBase + t + 0.015 + drawerH / 2 + d * (drawerH + 0.02);
        addPart(wardrobe, bayW - 0.03, drawerH, D - 0.14, leftCx, dy, -0.02, interiorMat);
        addPart(wardrobe, bayW - 0.02, drawerH - 0.008, 0.035, leftCx, dy, D / 2 - 0.08, woodMat);
        addPart(
          wardrobe,
          Math.min(0.32, bayW * 0.38),
          0.02,
          0.03,
          leftCx,
          dy,
          D / 2 - 0.05,
          brassMat,
          false,
        );
      }
      addPart(wardrobe, bayW, t * 0.85, D - 0.09, leftCx, yBase + t + drawerZoneH + t * 0.4, -0.01, interiorMat);

      const shelfTopY = yBase + innerH - t;
      const shelfBotY = yBase + t + drawerZoneH + t;
      const shelfSpan = shelfTopY - shelfBotY;
      for (let s = 1; s <= 2; s++) {
        const sy = shelfBotY + (shelfSpan * s) / 3;
        addPart(wardrobe, bayW, t * 0.8, D - 0.1, leftCx, sy, -0.01, interiorMat);
        addPart(wardrobe, bayW, t * 0.8, 0.025, leftCx, sy, D / 2 - 0.06, woodMat, false);
        if (bayW > 0.55) {
          addFoldedStack(wardrobe, leftCx - bayW * 0.2, sy + t * 0.4, 0.02, Math.min(0.32, bayW * 0.34), 3);
          addFoldedStack(wardrobe, leftCx + bayW * 0.2, sy + t * 0.4, 0.02, Math.min(0.3, bayW * 0.32), 2);
        } else {
          addFoldedStack(wardrobe, leftCx, sy + t * 0.4, 0.02, Math.min(0.32, bayW * 0.65), 3);
        }
      }

      const rodY = yBase + innerH - t - 0.26;
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, bayW, 18), brassMat);
      rod.rotation.z = Math.PI / 2;
      rod.position.set(rightCx, rodY, 0.02);
      rod.castShadow = true;
      wardrobe.add(rod);

      [-1, 1].forEach((side) => {
        const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.02, 16), brassMat);
        flange.rotation.z = Math.PI / 2;
        flange.position.set(rightCx + side * (bayW / 2 - 0.01), rodY, 0.02);
        wardrobe.add(flange);
      });

      const hangerCount = Math.max(2, Math.min(6, Math.floor(bayW / 0.28)));
      for (let h = 0; h < hangerCount; h++) {
        const frac = hangerCount === 1 ? 0 : h / (hangerCount - 1) - 0.5;
        const hx = rightCx + frac * (bayW - 0.26);
        addHanger(wardrobe, hx, rodY, 0.02, fabricMats[h % fabricMats.length]);
      }

      const shoeShelfY = yBase + t + 0.34;
      addPart(wardrobe, bayW, t * 0.8, D - 0.1, rightCx, shoeShelfY, -0.01, interiorMat);
      addPart(wardrobe, bayW, t * 0.8, 0.025, rightCx, shoeShelfY, D / 2 - 0.06, woodMat, false);

      const doorW = (W - 0.018) / 2;
      const doorH = innerH - 0.015;
      const doorZ = D / 2 + 0.025;
      const stileW = Math.min(0.14, doorW * 0.16);
      const railH = 0.16;

      [-1, 1].forEach((side) => {
        const pivot = new THREE.Group();
        pivot.position.set(side * (W / 2 - 0.01), yBase + innerH / 2, doorZ);

        const doorCenter = -side * (doorW / 2);
        const panelW = doorW - stileW * 2;
        const panelH = doorH - railH * 2;
        const isMirrorSide = side === 1 && doorW > 0.72;

        addPart(pivot, stileW, doorH, 0.048, doorCenter - doorW / 2 + stileW / 2, 0, 0, woodMat);
        addPart(pivot, stileW, doorH, 0.048, doorCenter + doorW / 2 - stileW / 2, 0, 0, woodMat);
        addPart(pivot, panelW, railH, 0.048, doorCenter, doorH / 2 - railH / 2, 0, woodMat);
        addPart(pivot, panelW, railH, 0.048, doorCenter, -doorH / 2 + railH / 2, 0, woodMat);

        addPart(pivot, panelW, panelH, 0.024, doorCenter, 0, -0.008, isMirrorSide ? mirrorMat : woodMat);
        addPart(
          pivot,
          0.012,
          doorH - 0.12,
          0.052,
          doorCenter + side * (doorW / 2 - stileW - 0.008),
          0,
          0.002,
          brassMat,
          false,
        );

        const handleX = doorCenter - side * (doorW / 2 - stileW * 0.55);
        const handleH = Math.min(0.95, doorH * 0.36);
        addPart(pivot, 0.024, handleH, 0.036, handleX, -0.04, 0.048, brassMat);
        addPart(pivot, 0.024, 0.026, 0.038, handleX, handleH / 2 - 0.08, 0.026, brassMat, false);
        addPart(pivot, 0.024, 0.026, 0.038, handleX, -handleH / 2, 0.026, brassMat, false);

        [-doorH * 0.36, 0, doorH * 0.36].forEach((hy) => {
          const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.075, 10), brassMat);
          hinge.position.set(0, hy, 0);
          pivot.add(hinge);
        });

        wardrobe.add(pivot);
        doors.push({ pivot, side });
      });

      contactShadow.scale.set(Math.max(0.75, W / 2.88), 1, 1);
    };

    const applyFinish = (idx: number) => {
      const f = FINISHES[idx];
      const tex = finishMaps[idx];
      woodMat.map = tex.map;
      woodMat.bumpMap = tex.bumpMap;
      woodMat.roughness = f.roughness;
      woodMat.clearcoat = f.clearcoat;
      woodMat.needsUpdate = true;

      interiorMat.color.setHex(f.interiorHex);
      interiorMat.bumpMap = tex.bumpMap;
      interiorMat.needsUpdate = true;
    };

    rebuildRef.current = () => {
      buildWardrobe();
      requestRender();
    };
    finishApplyRef.current = (idx: number) => {
      applyFinish(idx);
      requestRender();
    };
    resetCameraRef.current = () => {
      camera.position.set(3.2, 1.35, 7.1);
      controls.target.set(0, 0.22, 0);
      controls.update();
      requestRender();
    };

    const resize = () => {
      const w = Math.max(1, container.clientWidth);
      const h = Math.max(1, container.clientHeight);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      requestRender();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let lastTime = performance.now();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const status = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
        if (status === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function requestRender() {
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame((now) => {
        renderDirty = false;
        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;

        const targetDoor = configRef.current.doorsOpen ? 1 : 0;
        const prevDoor = doorAnim;
        doorAnim = THREE.MathUtils.damp(doorAnim, targetDoor, 6.5, dt || 0.016);

        for (let i = 0; i < doors.length; i++) {
          const d = doors[i];
          d.pivot.rotation.y = d.side * doorAnim * 1.72;
        }
        interiorLed.intensity = doorAnim * 2.15;
        ledStripMat.emissiveIntensity = 0.25 + doorAnim * 1.65;

        controls.update();
        renderer.render(scene, camera);

        const settled = Math.abs(targetDoor - doorAnim) < 0.004 && Math.abs(prevDoor - doorAnim) < 0.004;
        const shouldContinue = !settled || (!isSoftwareGl && controls.autoRotate);

        const done = () => {
          renderBusy = false;
          if (renderDirty || shouldContinue) {
            requestRender();
          }
        };

        if (isSoftwareGl) {
          afterDraw(done);
        } else {
          done();
        }
      });
    }

    triggerRenderRef.current = requestRender;

    controls.addEventListener('change', requestRender);
    controls.addEventListener('start', () => {
      controls.autoRotate = false;
    });

    buildWardrobe();
    resize();
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }
    requestRender();

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      ro.disconnect();
      window.removeEventListener('inaya-themechange', syncTheme);
      controls.dispose();
      finishMaps.forEach((m) => {
        m.map.dispose();
        m.bumpMap.dispose();
      });
      plinthTex.dispose();
      contactTex.dispose();
      envTex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    triggerRenderRef.current?.();
  }, [theme]);

  useEffect(() => {
    rebuildRef.current?.();
  }, [widthFt, heightFt]);

  useEffect(() => {
    finishApplyRef.current?.(finishIdx);
  }, [finishIdx]);

  useEffect(() => {
    triggerRenderRef.current?.();
  }, [doorsOpen]);

  const estimatedQuote = computeCustomWardrobeQuote({
    widthFt,
    heightFt,
    depthFt: 2,
    ratePerSqFt: 1650,
    doorMultiplier: 1.0,
  });

  const activeFinish = FINISHES[finishIdx];
  const whatsappUrl = buildWardrobeWhatsAppUrl({
    widthFt,
    heightFt,
    finishName: activeFinish.name,
    estimatedTaka: estimatedQuote,
    waNumber: siteText.wa,
  });

  return (
    <main className="relative w-full h-[calc(100vh-116px)] min-h-[540px] overflow-hidden bg-[#f1e7da] dark:bg-[#1e1611]">
      {/* Dedicated WebGL Mount Container */}
      <div
        ref={stageRef}
        data-testid="wardrobe-3d-canvas"
        data-doors-open={String(doorsOpen)}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Minimal Top-Left Spec Badge (No backdrop-blur over WebGL!) */}
      <div className="absolute top-4 left-4 z-10 rounded-xl bg-[#fcf8f2]/95 dark:bg-[#241a14]/95 border border-[#cf9a3e]/40 px-4 py-3 shadow-lg max-w-[300px]">
        <h1 className="font-display text-lg leading-tight">3D Wardrobe Studio</h1>
        <p className="text-xs text-[#6a584b] dark:text-[#b8a898] mt-1 tabular-price">
          {widthFt} ft × {heightFt} ft · {activeFinish.name}
        </p>
        <p className="text-sm font-bold text-[#86570f] dark:text-[#e5a362] mt-1 tabular-price">
          Est. Quote: {formatTaka(estimatedQuote)}
        </p>
      </div>

      {/* Collapsible Unified Bottom Control Dock */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 w-[min(920px,calc(100%-24px))] flex flex-col items-center">
        <button
          type="button"
          onClick={() => setDockCollapsed((c) => !c)}
          className="mb-1.5 px-3.5 py-1 rounded-full bg-[#22140d] text-[#f6efe2] text-xs font-semibold flex items-center gap-1.5 shadow-md cursor-pointer"
        >
          {dockCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span>{dockCollapsed ? 'Show Controls' : 'Hide Controls'}</span>
        </button>

        {!dockCollapsed && (
          <div className="w-full rounded-2xl bg-[#fcf8f2]/95 dark:bg-[#241a14]/95 border border-[#cf9a3e]/40 px-5 py-4 shadow-xl grid grid-cols-1 md:grid-cols-[1fr_1fr_auto_auto] gap-4 items-center">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1 tabular-price">
                <label htmlFor="wSlider">Width</label>
                <span>{widthFt} ft</span>
              </div>
              <input
                id="wSlider"
                type="range"
                min={3}
                max={10}
                step={0.5}
                value={widthFt}
                onChange={(e) => setWidthFt(Number(e.target.value))}
                className="w-full accent-[#cf9a3e]"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1 tabular-price">
                <label htmlFor="hSlider">Height</label>
                <span>{heightFt} ft</span>
              </div>
              <input
                id="hSlider"
                type="range"
                min={5}
                max={9}
                step={0.5}
                value={heightFt}
                onChange={(e) => setHeightFt(Number(e.target.value))}
                className="w-full accent-[#cf9a3e]"
              />
            </div>

            <div className="flex items-center gap-2">
              {FINISHES.map((fin, idx) => (
                <button
                  key={fin.name}
                  type="button"
                  title={fin.name}
                  aria-label={`Select ${fin.name} finish`}
                  onClick={() => setFinishIdx(idx)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${
                    finishIdx === idx
                      ? 'border-[#cf9a3e] scale-115 ring-2 ring-[#cf9a3e]/40'
                      : 'border-[#dccfbe] dark:border-[#3d2f25]'
                  }`}
                  style={{ backgroundColor: fin.swatch }}
                />
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setDoorsOpen((o) => !o)}
                className="px-3.5 py-2 rounded-lg border border-[#dccfbe] dark:border-[#3d2f25] bg-white dark:bg-[#2d221a] text-xs font-semibold flex items-center gap-1.5 hover:border-[#cf9a3e] cursor-pointer"
              >
                <DoorOpen className="w-4 h-4" />
                <span>{doorsOpen ? 'Close Doors' : 'Open Doors'}</span>
              </button>

              <button
                type="button"
                aria-label="Reset camera view"
                onClick={() => resetCameraRef.current?.()}
                className="p-2 rounded-lg border border-[#dccfbe] dark:border-[#3d2f25] bg-white dark:bg-[#2d221a] hover:border-[#cf9a3e] cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-lg bg-[#cf9a3e] text-[#22140d] text-xs font-bold flex items-center gap-1.5 hover:brightness-105"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Order on WhatsApp</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
