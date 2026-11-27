import * as THREE from './vendor/three.module.js';

/* ============================================================
   달빛 운세 · 산사 마당 — 3D 캐릭터 걷기 미리보기
   ============================================================ */
const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (dt, lambda) => 1 - Math.exp(-lambda * dt);
const angleLerp = (a, b, t) => {
  let d = ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI;
  return a + d * t;
};
const shortAngle = (a, b) => ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI;

/* ---------- 캔버스 텍스처 ---------- */
function canvasTex(w, h, draw, rx = 1, ry = 1) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const glowTex = canvasTex(128, 128, (g, w, h) => {
  const grd = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.25, 'rgba(255,236,190,0.75)');
  grd.addColorStop(0.55, 'rgba(255,200,120,0.25)');
  grd.addColorStop(1, 'rgba(255,180,90,0)');
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
});

const groundTex = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#2b3341'; g.fillRect(0, 0, w, h);
  // 흙·이끼 얼룩
  for (let i = 0; i < 260; i++) {
    const x = Math.random() * w, y = Math.random() * h, r = rand(8, 62);
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    const greenish = Math.random() < 0.45;
    grd.addColorStop(0, greenish ? 'rgba(52,74,52,0.30)' : 'rgba(120,130,150,0.16)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  // 자갈
  for (let i = 0; i < 1600; i++) {
    const x = Math.random() * w, y = Math.random() * h, r = rand(0.6, 2.6);
    g.fillStyle = `rgba(${170 + Math.random() * 60 | 0},${175 + Math.random() * 55 | 0},${190 + Math.random() * 45 | 0},${rand(0.02, 0.09)})`;
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
}, 12, 12);

const roofTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#39404e'; g.fillRect(0, 0, w, h);
  const col = w / 8, row = h / 6;
  for (let y = 0; y < 6; y++) {
    for (let x = 0; x < 8; x++) {
      const px = x * col, py = y * row;
      const grd = g.createLinearGradient(px, 0, px + col, 0);
      grd.addColorStop(0, '#2b323e');
      grd.addColorStop(0.30, '#4d5666');
      grd.addColorStop(0.55, '#586273');
      grd.addColorStop(1, '#2f3744');
      g.fillStyle = grd;
      g.beginPath();
      g.moveTo(px, py + row + 6);
      g.quadraticCurveTo(px + col / 2, py - 7, px + col, py + row + 6);
      g.lineTo(px + col, py + row); 
      g.quadraticCurveTo(px + col / 2, py - 1, px, py + row);
      g.closePath(); g.fill();
    }
    g.fillStyle = 'rgba(12,16,24,0.55)';
    g.fillRect(0, y * row + row - 4, w, 4);
  }
}, 5, 4);

const hanjiTex = canvasTex(128, 160, (g, w, h) => {
  const grd = g.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(0, '#ffe3ae'); grd.addColorStop(0.55, '#ffd08a'); grd.addColorStop(1, '#e9a860');
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(96,58,30,0.55)'; g.lineWidth = 3;
  for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(i * w / 4, 0); g.lineTo(i * w / 4, h); g.stroke(); }
  for (let i = 1; i < 8; i++) { g.beginPath(); g.moveTo(0, i * h / 8); g.lineTo(w, i * h / 8); g.stroke(); }
});

const plaqueTex = canvasTex(512, 200, (g, w, h) => {
  g.fillStyle = '#221a14'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#c9a45c'; g.lineWidth = 8; g.strokeRect(10, 10, w - 20, h - 20);
  g.fillStyle = '#f6d9a0';
  g.font = 'bold 118px "Apple SD Gothic Neo","Malgun Gothic",serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('달 빛 암', w / 2, h / 2 + 6);
});

/* ---------- 렌더러 / 씬 ---------- */
const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.outputColorSpace = THREE.SRGBColorSpace;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0b1223, 0.019);

const camera = new THREE.PerspectiveCamera(46, innerWidth / innerHeight, 0.1, 900);

/* ---------- 하늘 · 달 · 별 ---------- */
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(420, 32, 20),
  new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      cTop: { value: new THREE.Color(0x04060e) },
      cMid: { value: new THREE.Color(0x0a1226) },
      cBot: { value: new THREE.Color(0x16223c) },
    },
    vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `varying vec3 vP; uniform vec3 cTop; uniform vec3 cMid; uniform vec3 cBot;
      void main(){ float h = normalize(vP).y;
        vec3 c = mix(cBot, cMid, smoothstep(-0.06, 0.34, h));
        c = mix(c, cTop, smoothstep(0.28, 0.95, h));
        gl_FragColor = vec4(c, 1.0); }`,
  })
);
scene.add(sky);

const moon = new THREE.Group();
moon.position.set(-38, 19, -108);
const moonBody = new THREE.Mesh(
  new THREE.SphereGeometry(9, 32, 24),
  new THREE.MeshBasicMaterial({ color: 0xfff6dd, fog: false })
);
moon.add(moonBody);
const moonHalo = new THREE.Sprite(new THREE.SpriteMaterial({
  map: glowTex, color: 0xffe9b8, transparent: true, opacity: 0.85,
  blending: THREE.AdditiveBlending, depthWrite: false, fog: false
}));
moonHalo.scale.set(56, 56, 1);
moon.add(moonHalo);
scene.add(moon);

const starGeo = new THREE.BufferGeometry();
{
  const N = 1400, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), sz = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const th = Math.random() * TAU;
    const ph = Math.acos(rand(0.02, 1));
    const r = 340;
    pos[i * 3] = Math.sin(ph) * Math.cos(th) * r;
    pos[i * 3 + 1] = Math.cos(ph) * r;
    pos[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * r;
    const tint = Math.random();
    const c = new THREE.Color().setHSL(0.58 - tint * 0.1, 0.25, rand(0.62, 0.95));
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    sz[i] = rand(0.9, 3.4);
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  starGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  starGeo.setAttribute('size', new THREE.BufferAttribute(sz, 1));
}
const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
  size: 1.7, sizeAttenuation: false, vertexColors: true, transparent: true,
  opacity: 0.9, depthWrite: false, fog: false, blending: THREE.AdditiveBlending,
}));
scene.add(stars);

/* ---------- 조명 ---------- */
scene.add(new THREE.HemisphereLight(0x3b5590, 0x0d0f18, 1.15));

const moonLight = new THREE.DirectionalLight(0xc2d6ff, 2.3);
moonLight.position.set(-30, 38, -20);
moonLight.castShadow = true;
moonLight.shadow.mapSize.set(2048, 2048);
Object.assign(moonLight.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 110 });
moonLight.shadow.camera.updateProjectionMatrix();
moonLight.shadow.bias = -0.0006;
moonLight.shadow.normalBias = 0.04;
scene.add(moonLight);
scene.add(new THREE.AmbientLight(0x263252, 0.5));

const fillLight = new THREE.DirectionalLight(0xffc48c, 0.85);
fillLight.position.set(6, 8, 16);
scene.add(fillLight);

/* ---------- 바닥 ---------- */
const ground = new THREE.Mesh(
  new THREE.CircleGeometry(70, 72),
  new THREE.MeshStandardMaterial({ map: groundTex, color: 0x9aa4bb, roughness: 0.98, metalness: 0 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

/* ---------- 돌길 ---------- */
const PATH_POINTS = [
  new THREE.Vector3(0, 0, 12.5),
  new THREE.Vector3(-6.2, 0, 9.6),
  new THREE.Vector3(-9.8, 0, 3.2),
  new THREE.Vector3(-8.4, 0, -3.6),
  new THREE.Vector3(-3.2, 0, -7.9),
  new THREE.Vector3(3.2, 0, -7.9),
  new THREE.Vector3(8.4, 0, -3.6),
  new THREE.Vector3(9.8, 0, 3.2),
  new THREE.Vector3(6.2, 0, 9.6),
];
const pathCurve = new THREE.CatmullRomCurve3(PATH_POINTS, true, 'catmullrom', 0.5);
const pathLength = pathCurve.getLength();

{
  const count = Math.floor(pathLength / 1.05);
  const slabGeo = new THREE.BoxGeometry(1.42, 0.09, 1.05);
  const slabMat = new THREE.MeshStandardMaterial({ color: 0x6d7382, roughness: 0.95, metalness: 0.02 });
  const slabs = new THREE.InstancedMesh(slabGeo, slabMat, count);
  slabs.castShadow = false; slabs.receiveShadow = true;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    const t = i / count;
    const pt = pathCurve.getPointAt(t);
    const tan = pathCurve.getTangentAt(t);
    p.set(pt.x + rand(-0.06, 0.06), 0.045 + rand(-0.012, 0.012), pt.z + rand(-0.06, 0.06));
    q.setFromEuler(new THREE.Euler(0, Math.atan2(tan.x, tan.z) + rand(-0.07, 0.07), 0));
    s.set(rand(0.86, 1.05), 1, rand(0.9, 1.08));
    m.compose(p, q, s);
    slabs.setMatrixAt(i, m);
  }
  slabs.instanceMatrix.needsUpdate = true;
  scene.add(slabs);
}

/* ---------- 법당 ---------- */
const hall = new THREE.Group();
hall.position.set(0, 0, -16);
scene.add(hall);

const stoneMat = new THREE.MeshStandardMaterial({ color: 0x6e7480, roughness: 0.95 });
const woodMat = new THREE.MeshStandardMaterial({ color: 0x4a2c25, roughness: 0.85 });
const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x2c211d, roughness: 0.9 });
const tileMat = new THREE.MeshStandardMaterial({ map: roofTex, color: 0x9aa3b4, roughness: 0.8, metalness: 0.05 });

function box(w, h, d, mat, x = 0, y = 0, z = 0, parent = hall) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m);
  return m;
}

// 기단
box(15.4, 0.95, 9.8, stoneMat, 0, 0.475, 0);
// 계단
box(5.6, 0.32, 0.85, stoneMat, 0, 0.72, 5.05);
box(6.4, 0.30, 0.85, stoneMat, 0, 0.42, 4.35);
box(7.2, 0.28, 0.85, stoneMat, 0, 0.14, 3.65);
// 몸체
box(13.6, 4.5, 6.6, darkWoodMat, 0, 3.2, -0.3);
// 기둥
const pillarGeo = new THREE.CylinderGeometry(0.3, 0.34, 4.7, 14);
[-6.2, -2.1, 2.1, 6.2].forEach(x => {
  [-3.3, 3.3].forEach(z => {
    const p = new THREE.Mesh(pillarGeo, woodMat);
    p.position.set(x, 3.3, z);
    p.castShadow = true; p.receiveShadow = true;
    hall.add(p);
  });
});
// 단청 띠
box(14, 0.28, 7, new THREE.MeshStandardMaterial({ color: 0x2f6b63, roughness: 0.8 }), 0, 5.5, -0.3);
box(14, 0.16, 7, new THREE.MeshStandardMaterial({ color: 0x8d3a2e, roughness: 0.8 }), 0, 5.2, -0.3);

// 한지 문 (은은한 빛)
{
  const doorMat = new THREE.MeshStandardMaterial({
    map: hanjiTex, emissive: 0xffb268, emissiveMap: hanjiTex, emissiveIntensity: 1.1, roughness: 1
  });
  [-3.4, 0, 3.4].forEach(x => {
    const d = new THREE.Mesh(new THREE.BoxGeometry(2.5, 3.5, 0.12), doorMat);
    d.position.set(x, 2.9, 2.85);
    hall.add(d);
    const glow = new THREE.PointLight(0xffb060, 8, 11, 2);
    glow.position.set(x, 2.6, 3.6);
    hall.add(glow);
  });
}

// 지붕 (맞배+팔작 느낌)
{
  const W = 9.3, D = 5.7, ridgeH = 2.15, baseY = 5.78;
  const verts = [];
  const A = [-W, baseY, D], B = [W, baseY, D], C = [W, baseY, -D], Dd = [-W, baseY, -D];
  const E = [-3.9, baseY + ridgeH, 0], F = [3.9, baseY + ridgeH, 0];
  const push = (...pts) => pts.forEach(p => verts.push(...p));
  // 앞 경사 (A,B,F,E)
  push(A, B, F); push(A, F, E);
  // 뒤 경사 (C,D,E,F)
  push(C, Dd, E); push(C, E, F);
  // 좌 옆 (D,A,E)
  push(Dd, A, E);
  // 우 옆 (B,C,F)
  push(B, C, F);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  // 기와 결이 보이도록 단순 평면 UV
  const uvs = [];
  for (let i = 0; i < verts.length; i += 3) {
    const x = verts[i], y = verts[i + 1], z = verts[i + 2];
    uvs.push((x + W) / (2 * W) * 4.5, ((y - baseY) / ridgeH) * 1.6 + (D - Math.abs(z)) / (2 * D) * 1.4);
  }
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  const roof = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    map: roofTex, color: 0x8d95a6, roughness: 0.8, side: THREE.DoubleSide, metalness: 0.06
  }));
  roof.castShadow = true; roof.receiveShadow = true;
  hall.add(roof);

  // 처마 끝 살짝 들림
  const eaveMat = new THREE.MeshStandardMaterial({ map: roofTex, color: 0xaab2c2, roughness: 0.8 });
  const eaveF = box(18.9, 0.2, 0.52, eaveMat, 0, baseY + 0.02, D + 0.16);
  eaveF.rotation.x = -0.13;
  const eaveB = box(18.9, 0.2, 0.52, eaveMat, 0, baseY + 0.02, -D - 0.16);
  eaveB.rotation.x = 0.13;
  const eaveL = box(0.52, 0.2, 11.9, eaveMat, -W - 0.16, baseY + 0.02, 0);
  eaveL.rotation.z = -0.13;
  const eaveR = box(0.52, 0.2, 11.9, eaveMat, W + 0.16, baseY + 0.02, 0);
  eaveR.rotation.z = 0.13;

  // 용마루
  box(9.4, 0.5, 0.55, new THREE.MeshStandardMaterial({ color: 0x2b3240, roughness: 0.7 }), 0, baseY + ridgeH + 0.08, 0);
  [-4.7, 4.7].forEach(x => {
    const orn = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.7, 8), new THREE.MeshStandardMaterial({ color: 0x39414f, roughness: 0.7 }));
    orn.position.set(x, baseY + ridgeH + 0.42, 0);
    orn.castShadow = true;
    hall.add(orn);
  });
}

// 편액
{
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.02),
    new THREE.MeshBasicMaterial({ map: plaqueTex, toneMapped: false }));
  plaque.position.set(0, 4.62, 3.52);
  hall.add(plaque);
}

/* ---------- 석탑 ---------- */
{
  const g = new THREE.Group();
  g.position.set(11.6, 0, -3.2);
  const mb = (w, h, d, y, m = stoneMat) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.y = y; b.castShadow = true; b.receiveShadow = true; g.add(b); return b;
  };
  mb(2.4, 0.4, 2.4, 0.2);
  mb(1.9, 0.34, 1.9, 0.57);
  let y = 0.74, size = 1.35;
  for (let i = 0; i < 3; i++) {
    mb(size, 0.62, size, y + 0.31);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(size * 0.95, 0.42, 4), stoneMat);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = y + 0.62 + 0.21;
    roof.castShadow = true; g.add(roof);
    y += 1.04; size *= 0.78;
  }
  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), stoneMat);
  finial.position.y = y + 0.16; g.add(finial);
  scene.add(g);
}

/* ---------- 석등 ---------- */
function stoneLantern(x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const add = (mesh, y) => { mesh.position.y = y; mesh.castShadow = true; mesh.receiveShadow = true; g.add(mesh); return mesh; };
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.72, 0.24, 8), stoneMat), 0.12);
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 1.05, 8), stoneMat), 0.76);
  add(new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.2, 0.52), stoneMat), 1.38);
  const lampBody = add(new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.6, 0.62),
    new THREE.MeshStandardMaterial({ color: 0xffdda8, emissive: 0xffb05c, emissiveIntensity: 1.5, roughness: 0.6 })), 1.78);
  const cap = add(new THREE.Mesh(new THREE.ConeGeometry(0.66, 0.44, 4), stoneMat), 2.28);
  cap.rotation.y = Math.PI / 4;
  add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), stoneMat), 2.55);
  const l = new THREE.PointLight(0xffb060, 16, 13, 2);
  l.position.set(0, 1.85, 0);
  g.add(l);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffbb77, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false }));
  s.scale.set(3.4, 3.4, 1); s.position.y = 1.8; g.add(s);
  scene.add(g);
  return { g, lampBody, light: l };
}
stoneLantern(-6.2, 6.6);
stoneLantern(6.2, 6.6);

/* ---------- 소원 연등 ---------- */
const lanterns = [];
{
  const stringCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-10, 4.5, -4.6),
    new THREE.Vector3(-5, 3.5, -5.0),
    new THREE.Vector3(0, 3.25, -5.2),
    new THREE.Vector3(5, 3.5, -5.0),
    new THREE.Vector3(10, 4.5, -4.6),
  ]);
  const wireGeo = new THREE.TubeGeometry(stringCurve, 40, 0.025, 5, false);
  scene.add(new THREE.Mesh(wireGeo, new THREE.MeshStandardMaterial({ color: 0x555b6b, roughness: 0.8 })));

  // 기둥
  [[-10, -4.6], [10, -4.6]].forEach(([x, z]) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 4.7, 10), woodMat);
    pole.position.set(x, 2.35, z);
    pole.castShadow = true;
    scene.add(pole);
  });

  const colors = [0xffb46b, 0xff9068, 0xffd287, 0xff9fb0, 0xffc06a];
  const N = 9;
  for (let i = 0; i < N; i++) {
    const t = (i + 0.5) / N;
    const p = stringCurve.getPointAt(t);
    const g = new THREE.Group();
    g.position.copy(p);
    const z = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 16, 12),
      new THREE.MeshStandardMaterial({
        color: colors[i % colors.length], emissive: colors[i % colors.length],
        emissiveIntensity: 1.25, roughness: 0.75
      })
    );
    z.scale.set(1, 0.86, 1);
    z.position.y = -0.42;
    g.add(z);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.1, 10),
      new THREE.MeshStandardMaterial({ color: 0x8a5a2a, roughness: 0.7 }));
    cap.position.y = -0.18; g.add(cap);
    const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.24, 6),
      new THREE.MeshStandardMaterial({ color: 0xffe0a8, emissive: 0xffcf90, emissiveIntensity: 0.8 }));
    tassel.position.y = -0.78; g.add(tassel);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffb070, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.scale.set(1.9, 1.9, 1); s.position.y = -0.44; g.add(s);
    scene.add(g);
    lanterns.push({ g, phase: rand(0, TAU), spd: rand(0.7, 1.4) });
  }
}

/* ---------- 소나무 · 바위 ---------- */
function pine(x, z, s = 1) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x2a2320, roughness: 1 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x1d3a2f, roughness: 1, flatShading: true });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * s, 0.26 * s, 2.2 * s, 7), trunkMat);
  trunk.position.y = 1.1 * s; trunk.castShadow = true; g.add(trunk);
  let y = 2.0 * s;
  for (let i = 0; i < 3; i++) {
    const r = (1.35 - i * 0.32) * s;
    const c = new THREE.Mesh(new THREE.ConeGeometry(r, 1.5 * s, 9), leafMat);
    c.position.y = y + 0.6 * s;
    c.castShadow = true; g.add(c);
    y += 0.78 * s;
  }
  scene.add(g);
}
[[-16.5, -7.5, 1.15], [16.5, -8.5, 1.25], [-18.5, 4.5, 1.0], [18.0, 4.0, 1.1],
 [-12.5, 13.0, 0.95], [13.0, 13.5, 1.05], [-21, -1.5, 1.3], [21.5, -2.0, 1.2]].forEach(([x, z, s]) => pine(x, z, s));

{
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x5f6675, roughness: 1, flatShading: true });
  for (let i = 0; i < 12; i++) {
    const a = rand(0, TAU), r = rand(5.5, 17);
    const s = rand(0.22, 0.62);
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rockMat);
    rock.position.set(Math.cos(a) * r, s * 0.5, Math.sin(a) * r);
    rock.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3));
    rock.scale.y = rand(0.6, 1.1);
    rock.castShadow = true; rock.receiveShadow = true;
    if (Math.hypot(rock.position.x, rock.position.z - 0) < 3) continue;
    scene.add(rock);
  }
}

/* ---------- 반딧불 ---------- */
const fireflies = (() => {
  const N = 90;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3);
  const base = [];
  for (let i = 0; i < N; i++) {
    const a = rand(0, TAU), r = rand(2, 17);
    const p = new THREE.Vector3(Math.cos(a) * r, rand(0.4, 3.4), Math.sin(a) * r);
    base.push(p);
    pos.set([p.x, p.y, p.z], i * 3);
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({
    map: glowTex, color: 0xffe1a0, size: 0.5, transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true, fog: false
  }));
  scene.add(pts);
  return { pts, base, N, phase: Array.from({ length: N }, () => rand(0, TAU)) };
})();

/* ============================================================
   캐릭터
   ============================================================ */
const MAT = {
  skin: new THREE.MeshStandardMaterial({ color: 0xffd8b8, roughness: 0.92 }),
  eye: new THREE.MeshStandardMaterial({ color: 0x241a20, roughness: 0.35 }),
  white: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }),
  blush: new THREE.MeshStandardMaterial({ color: 0xff9aa0, roughness: 1, transparent: true, opacity: 0.55 }),
  mouth: new THREE.MeshStandardMaterial({ color: 0x8c3b3b, roughness: 0.9 }),
};

function buildCharacter(kind) {
  const isGirl = kind === 'girl';
  const root = new THREE.Group();      // 월드 위치
  const bob = new THREE.Group();       // 몸 전체 상하 흔들림
  root.add(bob);

  const skin = MAT.skin;
  const hairMat = new THREE.MeshStandardMaterial({ color: isGirl ? 0x2a1c1e : 0x241b19, roughness: 0.7 });
  const clothMat = new THREE.MeshStandardMaterial({
    color: isGirl ? 0xfdf4e4 : 0x37567f, roughness: 0.88
  });
  const accMat = new THREE.MeshStandardMaterial({
    color: isGirl ? 0xd9567a : 0xd9a24d, roughness: 0.8
  });
  const pantsMat = new THREE.MeshStandardMaterial({
    color: isGirl ? 0xe9a7b6 : 0x2a3450, roughness: 0.9
  });
  const shoeMat = new THREE.MeshStandardMaterial({ color: isGirl ? 0xb8465f : 0x1b1a22, roughness: 0.75 });

  const addMesh = (geo, mat, parent, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };

  /* ── 몸통 ── */
  if (isGirl) {
    const skirtMat = new THREE.MeshStandardMaterial({ color: 0xe28ba3, roughness: 0.9, flatShading: true });
    addMesh(new THREE.CylinderGeometry(0.33, 0.64, 0.66, 16, 1, false), skirtMat, bob, 0, 0.72, 0);
    // 허리 띠
    addMesh(new THREE.CylinderGeometry(0.35, 0.35, 0.075, 18), accMat, bob, 0, 1.045, 0);
    // 저고리
    const top = addMesh(new THREE.CapsuleGeometry(0.255, 0.16, 6, 16), clothMat, bob, 0, 1.14, 0);
    top.scale.z = 0.92;
    // 고름
    const ribbon = addMesh(new THREE.BoxGeometry(0.09, 0.42, 0.04), accMat, bob, 0.07, 0.95, 0.27);
    ribbon.rotation.z = 0.16;
    // 깃
    const gCollarL = addMesh(new THREE.BoxGeometry(0.07, 0.2, 0.035), MAT.white, bob, -0.05, 1.2, 0.225);
    gCollarL.rotation.z = 0.55;
    const gCollarR = addMesh(new THREE.BoxGeometry(0.07, 0.2, 0.035), MAT.white, bob, 0.05, 1.2, 0.225);
    gCollarR.rotation.z = -0.55;
  } else {
    const torso = addMesh(new THREE.CapsuleGeometry(0.3, 0.26, 6, 16), clothMat, bob, 0, 0.85, 0);
    torso.scale.set(1, 1, 0.88);
    // 깃 (V자)
    const collarL = addMesh(new THREE.BoxGeometry(0.07, 0.24, 0.035), MAT.white, bob, -0.075, 1.04, 0.235);
    collarL.rotation.z = 0.38;
    const collarR = addMesh(new THREE.BoxGeometry(0.07, 0.24, 0.035), MAT.white, bob, 0.075, 1.04, 0.235);
    collarR.rotation.z = -0.38;
    // 띠
    addMesh(new THREE.CylinderGeometry(0.312, 0.312, 0.1, 16), accMat, bob, 0, 0.76, 0);
    const knot = addMesh(new THREE.SphereGeometry(0.055, 10, 8), accMat, bob, 0, 0.73, 0.28);
  }

  /* ── 팔 ── */
  function makeArm(side) {
    const pivot = new THREE.Group();
    pivot.position.set(side * (isGirl ? 0.34 : 0.35), isGirl ? 1.14 : 1.08, isGirl ? 0.02 : 0);
    bob.add(pivot);
    const sleeve = addMesh(new THREE.CapsuleGeometry(0.095, 0.19, 5, 12), clothMat, pivot, 0, -0.17, 0);
    sleeve.scale.z = 0.92;
    const hand = addMesh(new THREE.SphereGeometry(0.093, 12, 10), skin, pivot, 0, -0.36, 0);
    if (isGirl) {
      addMesh(new THREE.CylinderGeometry(0.1, 0.11, 0.06, 12), accMat, pivot, 0, -0.26, 0);
    }
    return pivot;
  }
  const armL = makeArm(-1), armR = makeArm(1);

  /* ── 다리 ── */
  function makeLeg(side) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.15, 0.56, 0);
    bob.add(pivot);
    const leg = addMesh(new THREE.CapsuleGeometry(0.1, 0.24, 5, 12), pantsMat, pivot, 0, -0.22, 0);
    leg.scale.z = 0.95;
    const shoe = addMesh(new THREE.BoxGeometry(0.21, 0.12, 0.32), shoeMat, pivot, 0, -0.47, 0.04);
    shoe.geometry.translate(0, 0, 0);
    return pivot;
  }
  const legL = makeLeg(-1), legR = makeLeg(1);

  /* ── 머리 ── */
  const head = new THREE.Group();
  head.position.set(0, 1.18, 0);
  bob.add(head);

  const skull = addMesh(new THREE.SphereGeometry(0.43, 28, 22), skin, head, 0, 0.38, 0);
  skull.scale.set(1, 0.97, 0.94);

  // 머리카락: 정수리 덮개 + 뒤통수 (얼굴은 비워 둠)
  const capGeo = new THREE.SphereGeometry(0.452, 30, 18, 0, TAU, 0, Math.PI * 0.40);
  addMesh(capGeo, hairMat, head, 0, 0.40, 0);
  const backGeo = new THREE.SphereGeometry(0.449, 30, 20, Math.PI * 0.80, Math.PI * 1.40, 0, Math.PI * 0.78);
  addMesh(backGeo, hairMat, head, 0, 0.38, 0);

  // 앞머리 (이마 위로 물결지는 머리칼)
  for (let i = 0; i < 7; i++) {
    const a = (i / 6 - 0.5) * 1.75;
    const lock = addMesh(new THREE.SphereGeometry(0.115, 14, 10), hairMat, head,
      Math.sin(a) * 0.395, 0.585 - Math.abs(a) * 0.05, Math.cos(a) * 0.355);
    lock.scale.set(1.3, 0.9, 0.95);
    lock.rotation.y = a;
  }

  if (isGirl) {
    // 긴 뒷머리 + 둥근 묶음
    [-1, 1].forEach(s => {
      const tail = addMesh(new THREE.CapsuleGeometry(0.13, 0.46, 6, 12), hairMat, head, s * 0.33, 0.10, -0.14);
      tail.rotation.z = s * 0.16;
    });
    const backTail = addMesh(new THREE.CapsuleGeometry(0.2, 0.42, 6, 14), hairMat, head, 0, 0.16, -0.32);
    backTail.scale.z = 0.7;
    addMesh(new THREE.SphereGeometry(0.155, 16, 14), hairMat, head, 0, 0.78, -0.2);
    const pin = addMesh(new THREE.CylinderGeometry(0.016, 0.016, 0.44, 6),
      new THREE.MeshStandardMaterial({ color: 0xf6d08a, emissive: 0xf0b45c, emissiveIntensity: 0.8, metalness: 0.6, roughness: 0.4 }),
      head, 0, 0.78, -0.2);
    pin.rotation.z = Math.PI / 2;
    // 앞머리 리본
    const ribbon = addMesh(new THREE.SphereGeometry(0.075, 10, 8), accMat, head, 0.19, 0.66, 0.09);
    ribbon.scale.set(1.5, 0.9, 0.6);
  } else {
    // 삐죽 머리 (뒤로 살짝 젖혀진 잔머리)
    [-0.18, 0.04, 0.2].forEach((x, i) => {
      const tuft = addMesh(new THREE.ConeGeometry(0.075, 0.2, 8), hairMat, head, x, 0.8, -0.1 + i * 0.03);
      tuft.rotation.z = (i - 1) * -0.35;
      tuft.rotation.x = -0.9;
    });
  }

  // 얼굴
  const eyeGeo = new THREE.SphereGeometry(0.062, 14, 12);
  const eyeL = addMesh(eyeGeo, MAT.eye, head, -0.145, 0.40, 0.375);
  const eyeR = addMesh(eyeGeo, MAT.eye, head, 0.145, 0.40, 0.375);
  eyeL.scale.set(0.9, 1.15, 0.55); eyeR.scale.set(0.9, 1.15, 0.55);
  const hiGeo = new THREE.SphereGeometry(0.022, 8, 8);
  addMesh(hiGeo, MAT.white, head, -0.125, 0.435, 0.415);
  addMesh(hiGeo, MAT.white, head, 0.165, 0.435, 0.415);

  // 눈썹
  const browMat = hairMat;
  [-1, 1].forEach(s => {
    const brow = addMesh(new THREE.BoxGeometry(0.09, 0.016, 0.03), browMat, head, s * 0.145, 0.505, 0.385);
    brow.rotation.z = s * -0.12;
  });

  // 볼
  [-1, 1].forEach(s => {
    const c = addMesh(new THREE.CircleGeometry(0.072, 16), MAT.blush, head, s * 0.255, 0.29, 0.35);
    c.rotation.y = s * 0.6;
  });
  // 입
  const mouth = addMesh(new THREE.TorusGeometry(0.045, 0.011, 6, 12, Math.PI), MAT.mouth, head, 0, 0.255, 0.408);
  mouth.rotation.z = Math.PI;

  bob.position.y = 0;
  scene.add(root);

  return {
    kind, isGirl, root, bob, head, armL, armR, legL, legR, skull,
    armOut: isGirl ? 0.44 : 0.16,
    phase: rand(0, TAU), yaw: Math.PI, target: null,
    vel: new THREE.Vector3(), speed: 0, idleTimer: rand(6, 11), gesture: null, gestureT: 0,
    autoT: null, autoDir: 1, pause: 0, baseY: 0,
    squash: 0,
  };
}

const boy = buildCharacter('boy');
const girl = buildCharacter('girl');

/* ---------- 걷기 / 제스처 애니메이션 ---------- */
function animateCharacter(c, dt, moveAmount) {
  c.phase += dt * (5.6 + moveAmount * 3.6);
  const walk = clamp(moveAmount, 0, 1.2);
  const s = Math.sin(c.phase), c2 = Math.cos(c.phase);

  // 팔·다리 흔들기
  const armSwing = s * 0.85 * walk;
  c.legL.rotation.x = s * 0.72 * walk;
  c.legR.rotation.x = -s * 0.72 * walk;
  c.armL.rotation.x = -armSwing;
  c.armR.rotation.x = armSwing;
  c.armL.rotation.z = c.armOut + 0.02 * Math.sin(c.phase * 0.5);
  c.armR.rotation.z = -c.armOut - 0.02 * Math.sin(c.phase * 0.5);

  // 몸통 흔들림
  const bobY = Math.abs(Math.sin(c.phase)) * 0.055 * walk;
  c.bob.position.y = bobY;
  c.bob.rotation.z = c2 * 0.045 * walk;
  c.bob.rotation.x = 0.05 * walk;
  c.head.rotation.z = -c2 * 0.03 * walk;

  // 제스처 (끄덕임 / 합장)
  if (c.gesture) {
    c.gestureT += dt;
    const t = c.gestureT;
    if (c.gesture === 'nod') {
      const k = Math.sin(Math.min(t / 1.25, 1) * Math.PI);
      c.head.rotation.x = k * 0.42;
      if (t > 1.25) c.gesture = null;
    } else if (c.gesture === 'pray') {
      const k = Math.sin(Math.min(t / 1.9, 1) * Math.PI);
      const kk = Math.min(t / 0.45, 1) * (1 - clamp((t - 1.5) / 0.6, 0, 1));
      c.armL.rotation.z = lerp(c.armOut, 0.98, kk);
      c.armR.rotation.z = lerp(-c.armOut, -0.98, kk);
      c.armL.rotation.x = lerp(0, -0.62, kk) + Math.sin(t * 2) * 0.02;
      c.armR.rotation.x = lerp(0, -0.62, kk) - Math.sin(t * 2) * 0.02;
      c.head.rotation.x = k * 0.3;
      c.bob.position.y -= 0.02 * kk;
      if (t > 2.1) c.gesture = null;
    }
  } else {
    c.head.rotation.x = lerp(c.head.rotation.x, 0, damp(dt, 6));
    if (walk < 0.1) {
      c.idleTimer -= dt;
      if (c.idleTimer <= 0) {
        c.gesture = Math.random() < 0.5 ? 'nod' : 'pray';
        c.gestureT = 0;
        c.idleTimer = rand(3.5, 8);
        toastOnce(c.kind);
      }
    }
  }
}

const toasted = {};
function toastOnce(kind) {
  if (toasted[kind]) return;
  toasted[kind] = true;
  showToast(kind === 'girl' ? '여자 캐릭터가 달빛에 합장합니다 🏮' : '남자 캐릭터가 고개를 끄덕입니다 🌙');
}

/* ============================================================
   이동 제어
   ============================================================ */
const WALK_BOUND = { r: 17.2, zMin: -8.2 };
function clampWalk(v) {
  const r = Math.hypot(v.x, v.z);
  if (r > WALK_BOUND.r) { v.x *= WALK_BOUND.r / r; v.z *= WALK_BOUND.r / r; }
  v.z = Math.max(v.z, WALK_BOUND.zMin);
  v.y = 0;
  return v;
}

const state = {
  mode: 'boy',
  auto: false,
  camYaw: 0.08,
  camPitch: 0.20,
  camDist: 8.4,
  focus: new THREE.Vector3(0, 1.05, 6.4),
  dragging: false,
};

function activeChars() {
  if (state.mode === 'boy') return [boy];
  if (state.mode === 'girl') return [girl];
  return [boy, girl];
}

function visibleChars() {
  return { boy: state.mode !== 'girl', girl: state.mode !== 'boy' };
}

// 초기 배치
boy.root.position.set(-0.6, 0, 6.4);
girl.root.position.set(0.6, 0, 6.4);
boy.root.rotation.y = 0; girl.root.rotation.y = 0;
boy.yaw = girl.yaw = 0;
girl.root.visible = false;
boy.root.visible = true;

const keys = new Set();
addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
    keys.add(k);
    if (k.startsWith('arrow')) e.preventDefault();
    hideHint();
  }
  if (k === 'f') openFortune();
  if (k === 'r') { state.camYaw = 0.08; state.camPitch = 0.20; state.camDist = 8.4; }
});
addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));

const stick = { x: 0, y: 0, active: false };
const stickEl = document.getElementById('stick');
const knobEl = stickEl.querySelector('.knob');

function isTouchDevice() {
  return matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
}
if (isTouchDevice()) stickEl.classList.add('show');

function stickStart(e) {
  stick.active = true;
  stickEl.setPointerCapture?.(e.pointerId);
  stickMove(e);
  hideHint();
}
function stickMove(e) {
  if (!stick.active) return;
  const r = stickEl.getBoundingClientRect();
  let dx = e.clientX - (r.left + r.width / 2);
  let dy = e.clientY - (r.top + r.height / 2);
  const max = r.width * 0.34;
  const len = Math.hypot(dx, dy);
  if (len > max) { dx = dx / len * max; dy = dy / len * max; }
  knobEl.style.transform = `translate(${dx}px, ${dy}px)`;
  stick.x = dx / max; stick.y = dy / max;
  if (Math.hypot(stick.x, stick.y) < 0.06) { stick.x = 0; stick.y = 0; }
  if (Math.hypot(stick.x, stick.y) > 0.12) stopAuto();
  e.preventDefault();
}
function stickEnd() {
  stick.active = false; stick.x = 0; stick.y = 0;
  knobEl.style.transform = 'translate(0,0)';
}
stickEl.addEventListener('pointerdown', stickStart);
stickEl.addEventListener('pointermove', stickMove);
stickEl.addEventListener('pointerup', stickEnd);
stickEl.addEventListener('pointercancel', stickEnd);

/* ---------- 화면 드래그 · 탭 ---------- */
const canvas = renderer.domElement;
const pointers = new Map();
let downInfo = null, pinchStart = 0;

canvas.addEventListener('pointerdown', e => {
  canvas.setPointerCapture?.(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 1) {
    downInfo = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 };
    state.dragging = false;
  } else if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    pinchStart = Math.hypot(a.x - b.x, a.y - b.y);
  }
});

canvas.addEventListener('pointermove', e => {
  const p = pointers.get(e.pointerId);
  if (!p) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y;
  p.x = e.clientX; p.y = e.clientY;

  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    if (pinchStart > 0) {
      state.camDist = clamp(state.camDist * (pinchStart / d), 4.5, 18);
      pinchStart = d;
    }
    return;
  }
  if (downInfo) downInfo.moved += Math.abs(dx) + Math.abs(dy);
  if (downInfo && downInfo.moved > 7) state.dragging = true;
  if (state.dragging) {
    state.camYaw -= dx * 0.006;
    state.camPitch = clamp(state.camPitch + dy * 0.004, -0.04, 1.0);
  }
});

function endPointer(e) {
  const p = pointers.get(e.pointerId);
  pointers.delete(e.pointerId);
  if (pointers.size < 2) pinchStart = 0;
  if (pointers.size === 0) {
    const wasTap = downInfo && downInfo.moved < 8 && performance.now() - downInfo.t < 600;
    state.dragging = false;
    if (wasTap && p) pickGround(p.x, p.y);
    downInfo = null;
  }
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
canvas.addEventListener('wheel', e => {
  state.camDist = clamp(state.camDist + e.deltaY * 0.004, 4.5, 18);
  e.preventDefault();
}, { passive: false });

const raycaster = new THREE.Raycaster();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const ndc = new THREE.Vector2();
const hit = new THREE.Vector3();

function pickGround(cx, cy) {
  ndc.set((cx / innerWidth) * 2 - 1, -(cy / innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  if (!raycaster.ray.intersectPlane(groundPlane, hit)) return;
  const p = clampWalk(hit.clone());
  const chars = activeChars();
  stopAuto();
  sparkleAt(p);
  if (chars.length === 1) {
    setTarget(chars[0], p, true);
  } else {
    // 둘이 나란히 서도록 좌우 간격
    const right = new THREE.Vector3(Math.cos(state.camYaw), 0, -Math.sin(state.camYaw));
    setTarget(boy, p.clone().addScaledVector(right, -0.75), false);
    setTarget(girl, p.clone().addScaledVector(right, 0.75), true);
  }
  hideHint();
}

const sparkles = [];
function sparkleAt(p) {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.12, 0.42, 24),
    new THREE.MeshBasicMaterial({ color: 0xffd79a, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.06;
  g.add(ring);
  g.position.copy(p);
  scene.add(g);
  sparkles.push({ g, t: 0 });
}

function setTarget(c, p, face) {
  c.target = p.clone();
  c.pause = 0;
  if (face) c.faceOnArrive = true;
}

/* ---------- 자동 산책 ---------- */
function stopAuto() {
  if (state.auto) {
    state.auto = false;
    updateAutoUI();
  }
}
function nearestT(pos) {
  let best = 0, bd = Infinity;
  for (let i = 0; i < 160; i++) {
    const t = i / 160;
    const p = pathCurve.getPointAt(t);
    const d = (p.x - pos.x) ** 2 + (p.z - pos.z) ** 2;
    if (d < bd) { bd = d; best = t; }
  }
  return best;
}

function startAuto() {
  state.auto = true;
  const chars = activeChars();
  chars.forEach((c, i) => {
    c.target = null;
    c.autoT = nearestT(c.root.position);
    c.autoDir = 1;
    c.autoPause = rand(0, 0.8);
    c.autoOffset = chars.length > 1 ? (i === 0 ? -0.85 : 0.85) : 0;
  });
  updateAutoUI();
  showToast('자동 산책 — 달빛 아래를 거닐어요 🌙');
}

function updateAutoUI() {
  document.getElementById('strollBtn').classList.toggle('on', state.auto);
}

/* ============================================================
   이동 업데이트
   ============================================================ */
const tmpDir = new THREE.Vector3();
const tmpTarget = new THREE.Vector3();

function moveChar(c, dt) {
  if (!c.root.visible) return;
  const pos = c.root.position;
  const wantDir = tmpDir.set(0, 0, 0);
  let wantSpeed = 0;

  // 1) 조이스틱 / 키보드
  let ix = stick.x, iy = stick.y;
  if (keys.has('a') || keys.has('arrowleft')) ix -= 1;
  if (keys.has('d') || keys.has('arrowright')) ix += 1;
  if (keys.has('w') || keys.has('arrowup')) iy -= 1;
  if (keys.has('s') || keys.has('arrowdown')) iy += 1;
  const iLen = Math.hypot(ix, iy);
  if (iLen > 0.12) {
    const nx = ix / Math.max(iLen, 1), ny = iy / Math.max(iLen, 1);
    const fwd = new THREE.Vector3(-Math.sin(state.camYaw), 0, -Math.cos(state.camYaw));
    const right = new THREE.Vector3(Math.cos(state.camYaw), 0, -Math.sin(state.camYaw));
    wantDir.addScaledVector(fwd, -ny).addScaledVector(right, nx);
    if (wantDir.lengthSq() > 0.001) wantDir.normalize();
    wantSpeed = 2.9 * Math.min(iLen, 1);
    c.target = null;
  }
  // 2) 자동 산책
  else if (state.auto && c.autoT != null) {
    const chars = activeChars();
    c.autoPause = Math.max(0, (c.autoPause || 0) - dt);
    if (c.autoPause <= 0) {
      c.autoT = (c.autoT + (2.1 * dt) / pathLength) % 1;
    }
    const pt = pathCurve.getPointAt(c.autoT);
    const tan = pathCurve.getTangentAt(c.autoT).normalize();
    const side = new THREE.Vector3(-tan.z, 0, tan.x);
    const goal = tmpTarget.copy(pt).addScaledVector(side, c.autoOffset || 0);
    wantDir.copy(goal).sub(pos); wantDir.y = 0;
    if (wantDir.lengthSq() > 0.04) {
      wantDir.normalize();
      wantSpeed = c.autoPause > 0 ? 0 : 2.1;
    }
    if (wantDir.lengthSq() < 0.001) wantSpeed = 0;
  }
  // 3) 클릭 지점
  else if (c.target) {
    wantDir.copy(c.target).sub(pos); wantDir.y = 0;
    const d = wantDir.length();
    if (d < 0.12) {
      if (c.faceOnArrive) {
        c.faceOnArrive = false;
        c.target = null;
        // 도착 후 법당 쪽을 바라봄
        c.arriveYaw = Math.PI + rand(-0.3, 0.3);
      } else {
        c.target = null;
      }
      wantSpeed = 0;
    } else {
      wantDir.normalize();
      wantSpeed = Math.min(2.9, 0.9 + d * 1.6);
    }
  }

  // 속도 스무딩
  const targetVel = wantDir.clone().multiplyScalar(wantSpeed);
  c.vel.x = lerp(c.vel.x, targetVel.x, damp(dt, 9));
  c.vel.z = lerp(c.vel.z, targetVel.z, damp(dt, 9));
  const spd = Math.hypot(c.vel.x, c.vel.z);

  if (spd > 0.05) {
    pos.x += c.vel.x * dt;
    pos.z += c.vel.z * dt;
    clampWalk(pos);
    const desiredYaw = Math.atan2(c.vel.x, c.vel.z);
    c.yaw = angleLerp(c.yaw, desiredYaw, damp(dt, 11));
    c.arriveYaw = null;
  } else if (c.arriveYaw != null) {
    c.yaw = angleLerp(c.yaw, c.arriveYaw, damp(dt, 4));
  }
  c.root.rotation.y = c.yaw;

  c.speed = spd;
  animateCharacter(c, dt, clamp(spd / 2.4, 0, 1));
}

/* ============================================================
   카메라
   ============================================================ */
const camTargetPos = new THREE.Vector3();
const focusGoal = new THREE.Vector3();

function updateCamera(dt) {
  const chars = activeChars().filter(c => c.root.visible);
  focusGoal.set(0, 0, 0);
  chars.forEach(c => focusGoal.add(c.root.position));
  if (chars.length) focusGoal.multiplyScalar(1 / chars.length);
  focusGoal.y = 1.15;
  state.focus.lerp(focusGoal, damp(dt, 5));

  const cp = Math.cos(state.camPitch), sp = Math.sin(state.camPitch);
  camTargetPos.set(
    state.focus.x + Math.sin(state.camYaw) * cp * state.camDist,
    state.focus.y + sp * state.camDist + 0.6,
    state.focus.z + Math.cos(state.camYaw) * cp * state.camDist
  );
  camTargetPos.y = Math.max(camTargetPos.y, 0.9);
  camera.position.lerp(camTargetPos, damp(dt, 6));
  camera.lookAt(state.focus.x, state.focus.y + 0.15, state.focus.z);

  // 시선에 따라 별·달이 살짝 흔들리는 느낌
  moon.position.x = -38 + Math.sin(state.camYaw * 0.2) * 4;
}

/* ============================================================
   UI
   ============================================================ */
const toastEl = document.getElementById('toast');
let toastTimer = null;
function showToast(msg, ms = 2200) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), ms);
}

function hideHint() {
  document.getElementById('hint').classList.add('dim');
}

const seg = document.getElementById('seg');
seg.addEventListener('click', e => {
  const btn = e.target.closest('button[data-mode]');
  if (!btn) return;
  const mode = btn.dataset.mode;
  if (mode === state.mode) return;
  [...seg.children].forEach(b => b.classList.toggle('on', b === btn));
  state.mode = mode;
  const vis = visibleChars();
  boy.root.visible = vis.boy;
  girl.root.visible = vis.girl;
  boy.vel.set(0, 0, 0); girl.vel.set(0, 0, 0);
  boy.target = null; girl.target = null;
  if (mode === 'both') {
    // 둘이 나란히 서게
    const right = new THREE.Vector3(Math.cos(state.camYaw), 0, -Math.sin(state.camYaw));
    const center = boy.root.position.clone().add(girl.root.position).multiplyScalar(0.5);
    boy.root.position.copy(center).addScaledVector(right, -0.8);
    girl.root.position.copy(center).addScaledVector(right, 0.8);
    state.focus.copy(center).setY(1.15);
    state.camDist = Math.max(state.camDist, 8.6);
    if (state.auto) startAuto();
    showToast('둘이 함께 — 나란히 마당을 거닐어요 👫');
  } else if (mode === 'girl') {
    state.camDist = Math.max(state.camDist, 6.4);
    showToast('여자 캐릭터 — 달빛 치마가 흔들립니다 🌸');
    if (state.auto) startAuto();
  } else {
    state.camDist = Math.max(state.camDist, 6.4);
    showToast('남자 캐릭터 — 아장아장 🌙');
    if (state.auto) startAuto();
  }
});

document.getElementById('strollBtn').addEventListener('click', () => {
  if (state.auto) { stopAuto(); showToast('자동 산책을 멈췄어요'); }
  else startAuto();
});

/* ---------- 운세 카드 ---------- */
const ZODIAC = [
  { e: '🐭', n: '쥐띠', y: '1984·1996·2008', color: '은빛', num: 7,
    lines: ['작은 인연 하나가 오늘의 문을 열어 줍니다.', '밤에 정리한 생각이 내일의 답이 됩니다.', '아껴 둔 것이 뜻밖의 자리에서 빛을 봅니다.'],
    tips: ['달빛이 비치는 창가에서 5분만 조용히 숨을 골라 보세요.', '미뤄 둔 연락 하나를 보내면 흐름이 트입니다.'] },
  { e: '🐮', n: '소띠', y: '1985·1997·2009', color: '황금빛', num: 2,
    lines: ['천천히 간 걸음이 오늘 가장 정확합니다.', '묵묵히 쌓은 것이 달빛 아래 모습을 드러냅니다.', '한 사람의 진심을 알아보는 날입니다.'],
    tips: ['아침에 마신 물 한 잔이 하루의 리듬을 잡아 줍니다.', '하고 싶던 말은 저녁보다 오후가 좋습니다.'] },
  { e: '🐯', n: '호랑이띠', y: '1986·1998·2010', color: '붉은색', num: 9,
    lines: ['망설이던 일에 첫발을 떼기 좋은 달빛입니다.', '기세보다 방향이 오늘의 승부를 가릅니다.', '한 번의 웃음이 굳어 있던 자리를 풉니다.'],
    tips: ['큰 결정은 산책을 한 바퀴 돈 뒤에 내려 보세요.', '오늘은 사과보다 감사가 잘 통해요.'] },
  { e: '🐰', n: '토끼띠', y: '1987·1999·2011', color: '연분홍', num: 4,
    lines: ['부드러운 말 한마디가 오늘의 복을 부릅니다.', '기다리던 소식이 달빛을 타고 옵니다.', '몸을 돌보면 마음의 길도 함께 열립니다.'],
    tips: ['따뜻한 차 한 잔으로 하루를 반듯하게 시작해 보세요.', '정리를 하면 잃어버린 것이 다시 보입니다.'] },
  { e: '🐲', n: '용띠', y: '1988·2000·2012', color: '청록색', num: 1,
    lines: ['구름 뒤에서 때를 기다리던 일이 움직입니다.', '넓게 보는 눈이 좁은 걱정을 지웁니다.', '베푼 마음이 두 배로 돌아오는 날입니다.'],
    tips: ['오늘은 혼자보다 함께일 때 답이 빨리 나옵니다.', '새로운 제안은 한 번 더 읽어 보세요.'] },
  { e: '🐍', n: '뱀띠', y: '1989·2001·2013', color: '보랏빛', num: 6,
    lines: ['조용한 통찰이 오늘의 무기가 됩니다.', '말하지 않은 마음이 상대에게 닿는 날입니다.', '오래된 인연이 따뜻한 소식을 들고 옵니다.'],
    tips: ['답장은 서두르지 말고 한 번 숨긴 뒤에 보내 보세요.', '밤 산책이 생각을 정리해 줍니다.'] },
  { e: '🐴', n: '말띠', y: '1990·2002·2014', color: '하늘색', num: 3,
    lines: ['멀리 보던 계획에 좋은 바람이 붑니다.', '발걸음이 가벼워지고 일이 술술 풀립니다.', '낯선 자리에서 반가운 얼굴을 만납니다.'],
    tips: ['오늘의 약속은 조금 일찍 도착하면 좋습니다.', '지출은 하나만 미루면 여유가 생깁니다.'] },
  { e: '🐑', n: '양띠', y: '1991·2003·2015', color: '아이보리', num: 8,
    lines: ['다정함이 오늘 가장 큰 재주입니다.', '손에 쥔 것을 나누면 빈자리가 채워집니다.', '마음먹은 일이 생각보다 가볍게 이루어집니다.'],
    tips: ['집안의 작은 것을 하나 고치면 기분이 달라집니다.', '고마운 사람에게 짧은 인사를 보내 보세요.'] },
  { e: '🐵', n: '원숭이띠', y: '1992·2004·2016', color: '주황색', num: 5,
    lines: ['재치 있는 한마디가 판을 바꿉니다.', '여러 길 중 지름길이 보이는 날입니다.', '궁금했던 것을 하나 배우면 운이 따라옵니다.'],
    tips: ['휴대폰 알림을 잠시 꺼 두면 집중이 살아납니다.', '오늘은 즉흥이 좋은 결과를 부릅니다.'] },
  { e: '🐔', n: '닭띠', y: '1993·2005·2017', color: '흰색', num: 10,
    lines: ['반듯하게 정리한 것이 오늘의 성과입니다.', '새벽의 결심이 저녁까지 이어집니다.', '솔직한 말이 관계를 더 단단하게 만듭니다.'],
    tips: ['해야 할 일 세 가지만 적어 두면 하루가 가벼워집니다.', '물을 자주 마시면 기운이 오릅니다.'] },
  { e: '🐶', n: '개띠', y: '1994·2006·2018', color: '카키색', num: 11,
    lines: ['믿음직한 사람 곁에서 복이 자랍니다.', '지키던 약속이 좋은 모양으로 돌아옵니다.', '따뜻한 밥 한 끼가 오늘의 행운입니다.'],
    tips: ['가까운 사람에게 먼저 안부를 전해 보세요.', '큰소리보다 낮은 목소리가 잘 들립니다.'] },
  { e: '🐷', n: '돼지띠', y: '1983·1995·2007', color: '분홍빛', num: 12,
    lines: ['넉넉한 마음이 오늘의 재물을 부릅니다.', '먹고 나누는 자리에 좋은 기운이 모입니다.', '편안히 쉬는 것이 가장 좋은 선택입니다.'],
    tips: ['오늘은 조금 일찍 잠자리에 들면 운이 붙습니다.', '작은 지출을 기록하면 큰 흐름이 보입니다.'] },
];

const POWER = ['★★★☆☆', '★★★★☆', '★★★★★', '★★★☆☆', '★★★★☆'];
const modalEl = document.getElementById('modal');
const cardEl = document.getElementById('card');
const zooEl = document.getElementById('zoo');
const today = new Date();
const dateStr = `${today.getFullYear()}. ${String(today.getMonth() + 1).padStart(2, '0')}. ${String(today.getDate()).padStart(2, '0')}`;
document.getElementById('modalSub').textContent = `${dateStr} · 띠를 고르면 달빛이 한 줄을 건넵니다`;

let currentZ = null;
function drawFortune(z) {
  currentZ = z;
  const line = z.lines[Math.floor(Math.random() * z.lines.length)];
  const tip = z.tips[Math.floor(Math.random() * z.tips.length)];
  document.getElementById('cZodiac').textContent = z.e;
  document.getElementById('cName').textContent = z.n;
  document.getElementById('cDate').textContent = `${dateStr} · ${z.y}년생`;
  document.getElementById('cLine').textContent = `“${line}”`;
  document.getElementById('cAdvice').textContent = tip;
  document.getElementById('cColor').textContent = z.color;
  document.getElementById('cNum').textContent = String(z.num);
  document.getElementById('cPower').textContent = POWER[Math.floor(Math.random() * POWER.length)];
  cardEl.classList.remove('show');
  void cardEl.offsetWidth;
  cardEl.classList.add('show');
  setTimeout(() => cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60);
}

ZODIAC.forEach((z, i) => {
  const b = document.createElement('button');
  b.innerHTML = `<span class="e">${z.e}</span><span class="n">${z.n.replace('띠', '')}</span>`;
  b.addEventListener('click', () => {
    drawFortune(z);
    sparkleChar();
  });
  zooEl.appendChild(b);
});

function sparkleChar() {
  activeChars().filter(c => c.root.visible).forEach(c => {
    c.gesture = 'pray'; c.gestureT = 0; c.idleTimer = rand(4, 8);
    const p = c.root.position;
    sparkleAt(new THREE.Vector3(p.x, 0, p.z));
  });
}

function openFortune() {
  modalEl.classList.add('open');
  hideHint();
  if (!cardEl.classList.contains('show')) {
    // 처음 열면 오늘 날짜로 띠를 무작위로 미리 뽑아 둠
  }
}
function closeFortune() { modalEl.classList.remove('open'); }

document.getElementById('fortuneBtn').addEventListener('click', openFortune);
document.getElementById('closeBtn').addEventListener('click', closeFortune);
document.getElementById('againBtn').addEventListener('click', () => {
  drawFortune(ZODIAC[Math.floor(Math.random() * ZODIAC.length)]);
  sparkleChar();
});
modalEl.addEventListener('click', e => { if (e.target === modalEl) closeFortune(); });
addEventListener('keydown', e => { if (e.key === 'Escape') closeFortune(); });

/* ---------- 리사이즈 ---------- */
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

/* ============================================================
   루프
   ============================================================ */
const clock = new THREE.Clock();
let elapsed = 0;
let introDone = false;

function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsed += dt;

  if (!introDone && elapsed > 0.1) {
    introDone = true;
    document.getElementById('loader').classList.add('hide');
    setTimeout(() => showToast('달빛 아래 산사 마당에 오신 것을 환영합니다 🏮', 3200), 500);
    setTimeout(hideHint, 9000);
  }

  // 캐릭터
  moveChar(boy, dt);
  moveChar(girl, dt);
  updateCamera(dt);

  // 연등 흔들림
  lanterns.forEach(l => {
    l.g.rotation.z = Math.sin(elapsed * l.spd + l.phase) * 0.07;
    l.g.rotation.x = Math.cos(elapsed * l.spd * 0.8 + l.phase) * 0.05;
  });

  // 반딧불
  {
    const arr = fireflies.pts.geometry.attributes.position.array;
    for (let i = 0; i < fireflies.N; i++) {
      const b = fireflies.base[i], ph = fireflies.phase[i];
      arr[i * 3] = b.x + Math.sin(elapsed * 0.35 + ph) * 1.6;
      arr[i * 3 + 1] = b.y + Math.sin(elapsed * 0.8 + ph * 1.7) * 0.42;
      arr[i * 3 + 2] = b.z + Math.cos(elapsed * 0.3 + ph) * 1.6;
    }
    fireflies.pts.geometry.attributes.position.needsUpdate = true;
    fireflies.pts.material.opacity = 0.55 + Math.sin(elapsed * 1.6) * 0.2;
  }

  // 클릭 스파클
  for (let i = sparkles.length - 1; i >= 0; i--) {
    const s = sparkles[i];
    s.t += dt;
    const k = s.t / 0.9;
    s.g.scale.setScalar(1 + k * 1.6);
    s.g.children[0].material.opacity = Math.max(0, 0.9 * (1 - k));
    s.g.position.y = 0.02;
    if (k >= 1) { scene.remove(s.g); s.g.children[0].geometry.dispose(); s.g.children[0].material.dispose(); sparkles.splice(i, 1); }
  }

  // 별 반짝임
  stars.material.opacity = 0.75 + Math.sin(elapsed * 0.9) * 0.12;

  renderer.render(scene, camera);
}
tick();

/* 디버그 훅 (미리보기 확인용) */
window.__dalbit = {
  scene, camera, renderer, boy, girl, state,
  setMode(m) { document.querySelector(`.seg button[data-mode="${m}"]`).click(); },
  walkTo(x, z) { pickGround(...worldToScreen(x, z)); },
  auto(on) { if (on) startAuto(); else stopAuto(); },
  fortune() { openFortune(); },
};
function worldToScreen(x, z) {
  const v = new THREE.Vector3(x, 0, z).project(camera);
  return [((v.x + 1) / 2) * innerWidth, ((-v.y + 1) / 2) * innerHeight];
}
