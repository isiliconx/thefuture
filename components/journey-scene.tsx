"use client";

import { useEffect, useId, useRef, useState } from "react";
import * as THREE from "three";

type Props = { chapter: number; reducedMotion: boolean; onReady?: () => void };
type Sculpture = { group: THREE.Group; materials: Map<THREE.Material, number>; weight: number };
const GOLD = 0xc5a16b;
const PALE = 0xf3d49b;

// Every object is built locally. No model, texture, or network request is needed.
export default function JourneyScene({ chapter, reducedMotion, onReady }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const active = useRef(chapter);
  const motion = useRef(reducedMotion);
  const ready = useRef(onReady);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => { active.current = chapter; }, [chapter]);
  useEffect(() => { motion.current = reducedMotion; }, [reducedMotion]);
  useEffect(() => { ready.current = onReady; }, [onReady]);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
    } catch {
      setUnavailable(true);
      ready.current?.();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.6;
    renderer.domElement.setAttribute("aria-hidden", "true");
    renderer.domElement.style.cssText = "display:block;width:100%;height:100%;pointer-events:none";
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 80);
    camera.position.set(0, .15, 7.8);
    const ambient = new THREE.AmbientLight(0x967d5d, 1.65);
    const key = new THREE.DirectionalLight(0xffe2aa, 5.8);
    key.position.set(-3, 4, 5);
    const rim = new THREE.DirectionalLight(0x8ba9ba, 2.5);
    rim.position.set(4, 1, -3);
    const warm = new THREE.PointLight(0xffa04b, 18, 16);
    warm.position.set(-1, 0, 3);
    scene.add(ambient, key, rim, warm);

    let seed = 1947;
    const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const metal = (color = GOLD, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color, metalness: .82, roughness: .32, transparent: true, ...extra });
    const luminous = (color = PALE, opacity = .7) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
    const lineMat = (color = GOLD, opacity = .55) => new THREE.LineBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });

    const glowCanvas = document.createElement("canvas");
    glowCanvas.width = glowCanvas.height = 256;
    const ctx = glowCanvas.getContext("2d");
    if (ctx) {
      const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
      grad.addColorStop(0, "rgba(255,224,166,0.9)");
      grad.addColorStop(.12, "rgba(239,176,86,0.45)");
      grad.addColorStop(.37, "rgba(195,120,49,0.13)");
      grad.addColorStop(1, "rgba(140,76,29,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 256);
    }
    const glowTexture = new THREE.CanvasTexture(glowCanvas);
    const glow = (size: number, opacity: number, color = 0xffffff) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
      s.scale.setScalar(size);
      return s;
    };
    const tube = (points: THREE.Vector3[], radius: number, material: THREE.Material, closed = false) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, closed), Math.max(32, points.length * 3), radius, 5, closed), material);
    const ball = (radius: number, material: THREE.Material) => new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 16), material);
    const ring = (radius: number, width: number, material: THREE.Material) => new THREE.Mesh(new THREE.TorusGeometry(radius, width, 8, 180), material);
    const line = (points: THREE.Vector3[], material: THREE.Material) => new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material);
    const curveRing = (r: number, y: number, mat: THREE.Material) => {
      const points = Array.from({ length: 129 }, (_, i) => new THREE.Vector3(Math.cos(i / 128 * Math.PI * 2) * r, y, Math.sin(i / 128 * Math.PI * 2) * r));
      return line(points, mat);
    };
    function armillary(detailed = true) {
      const g = new THREE.Group();
      const bronze = metal();
      const wire = lineMat(0xc9a970, .62);
      const globe = ball(1.02, metal(0x493721, { roughness: .68, metalness: .58 }));
      g.add(globe);
      // A mapped celestial sphere, marked with meridians and parallels.
      for (let j = -7; j <= 7; j++) {
        const phi = j / 8 * Math.PI / 2;
        g.add(curveRing(1.027 * Math.cos(phi), 1.027 * Math.sin(phi), wire));
      }
      for (let i = 0; i < 16; i++) {
        const r = ring(1.028, .0023, bronze);
        r.rotation.y = i * Math.PI / 16;
        g.add(r);
      }
      const halo = glow(4.8, .36);
      halo.position.z = -.9;
      g.add(halo);
      const frame = new THREE.Group();
      const tilts = [[.92, .25, -.38], [.2, -.65, .63], [1.65, .2, .4], [.6, .7, -.8]];
      tilts.forEach(([x, y, z], i) => {
        const carrier = new THREE.Group();
        carrier.rotation.set(x, y, z);
        const radius = 1.4 + i * .19;
        carrier.add(ring(radius, i === 2 ? .019 : .012, bronze));
        if (i === 2) {
          carrier.add(ring(radius + .052, .004, bronze));
          const tickMat = metal(0xe0bb7a);
          const tickGeo = new THREE.BoxGeometry(.007, .035, .007);
          for (let j = 0; j < 120; j++) {
            const a = j / 120 * Math.PI * 2;
            const tick = new THREE.Mesh(tickGeo, tickMat);
            tick.position.set(Math.cos(a) * (radius + .025), Math.sin(a) * (radius + .025), 0);
            tick.rotation.z = a - Math.PI / 2;
            if (j % 10 === 0) tick.scale.y = 2.5;
            carrier.add(tick);
          }
        }
        const satellite = ball(i === 1 ? .105 : .045, i === 1 ? metal(0xc7b18c) : bronze);
        const a = i * 1.9 + .4;
        satellite.position.set(Math.cos(a) * radius, Math.sin(a) * radius, 0);
        carrier.add(satellite);
        if (i === 1) {
          const light = glow(.6, .7);
          light.position.copy(satellite.position);
          carrier.add(light);
        }
        frame.add(carrier);
      });
      frame.rotation.set(.2, -.2, -.3);
      g.add(frame);
      // Discrete stars on the celestial grid, with fine constellation joins.
      const constellations: THREE.Vector3[] = [];
      for (let i = 0; i < (detailed ? 90 : 45); i++) {
        const theta = random() * Math.PI * 2;
        const phi = Math.acos(2 * random() - 1);
        const p = new THREE.Vector3(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta)).multiplyScalar(1.04);
        const dot = ball(i % 9 === 0 ? .018 : .008, luminous(PALE, .9));
        dot.position.copy(p);
        g.add(dot);
        if (i % 3 === 0) constellations.push(p);
      }
      g.add(line(constellations, lineMat(PALE, .18)));
      g.rotation.set(.18, -.3, -.18);
      return g;
    }
    function fire() {
      const g = new THREE.Group();
      const base = metal(0x363334, { roughness: .95, metalness: .15 });
      for (let j = 0; j < 7; j++) {
        const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(.39, 0), base);
        const a = j / 7 * Math.PI * 2;
        rock.position.set(Math.cos(a) * .73, -1.1, Math.sin(a) * .73);
        rock.scale.set(1, .5, .8);
        rock.rotation.set(random(), random(), random());
        g.add(rock);
      }
      const center = glow(3.2, .94);
      center.position.y = -.3;
      g.add(center);
      for (let j = 0; j < 28; j++) {
        const a = j * 2.4;
        const points: THREE.Vector3[] = [];
        for (let i = 0; i <= 26; i++) {
          const t = i / 26;
          const rad = .6 * (1 - t) + .02;
          points.push(new THREE.Vector3(Math.cos(a + t * 5) * rad, -1 + t * (1.8 + random() * .12), Math.sin(a + t * 5) * rad));
        }
        g.add(tube(points, .006 + random() * .009, luminous(j % 3 ? 0xe6a14c : 0xffdfab, .45)));
      }
      const dustGeo = new THREE.BufferGeometry();
      const data = new Float32Array(130 * 3);
      for (let i = 0; i < 130; i++) { data[i * 3] = (random() - .5) * 2; data[i * 3 + 1] = random() * 3 - .9; data[i * 3 + 2] = (random() - .5) * 2; }
      dustGeo.setAttribute("position", new THREE.BufferAttribute(data, 3));
      g.add(new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xffbd70, size: .018, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false })));
      return g;
    }
    function optics() {
      const g = new THREE.Group();
      const disk = new THREE.Mesh(new THREE.CylinderGeometry(1.32, 1.32, .05, 100), metal(0x8e6c3f));
      disk.rotation.x = Math.PI / 2;
      g.add(disk);
      for (let i = 0; i < 6; i++) g.add(ring(.35 + i * .18, .004, metal(PALE)));
      const needle = new THREE.Mesh(new THREE.BoxGeometry(.055, 2.8, .07), metal(PALE));
      needle.rotation.z = -.6;
      needle.position.z = .1;
      g.add(needle);
      const upper = ring(.19, .033, metal());
      upper.position.y = 1.54;
      g.add(upper);
      for (let j = 0; j < 72; j++) {
        const a = j / 72 * Math.PI * 2;
        const tick = new THREE.Mesh(new THREE.BoxGeometry(.007, j % 6 === 0 ? .14 : .05, .01), metal(PALE));
        tick.position.set(Math.cos(a) * 1.21, Math.sin(a) * 1.21, .035);
        tick.rotation.z = a - Math.PI / 2;
        g.add(tick);
      }
      const net = new THREE.Group();
      for (let i = 0; i < 3; i++) { const r = ring(.95, .012, metal()); r.rotation.z = i * 1.2; r.scale.x = .55; r.position.set(Math.cos(i * 2) * .2, Math.sin(i * 2) * .2, .09); net.add(r); }
      g.add(net);
      g.rotation.set(.15, -.38, -.2);
      g.add(glow(4.5, .19));
      return g;
    }
    function telescope() {
      const g = new THREE.Group();
      const instrument = new THREE.Group();
      const brass = metal();
      const tubeBody = new THREE.Mesh(new THREE.CylinderGeometry(.19, .26, 2.4, 48), brass);
      tubeBody.rotation.z = Math.PI / 2;
      instrument.add(tubeBody);
      for (const x of [-1.15, -.7, .75, 1.15]) {
        const band = ring(x > 0 ? .205 : .265, .025, metal(0xead19c));
        band.rotation.y = Math.PI / 2;
        band.position.x = x;
        instrument.add(band);
      }
      const glass = new THREE.Mesh(new THREE.CircleGeometry(.235, 48), metal(0x253e49, { roughness: .12, metalness: .8 }));
      glass.rotation.y = -Math.PI / 2;
      glass.position.x = -1.21;
      instrument.add(glass);
      instrument.rotation.z = .35;
      instrument.position.y = .5;
      g.add(instrument);
      for (let i = 0; i < 3; i++) {
        const a = i / 3 * Math.PI * 2;
        g.add(tube([new THREE.Vector3(0, .1, 0), new THREE.Vector3(Math.cos(a) * .85, -1.45, Math.sin(a) * .85)], .022, brass));
      }
      for (let i = 0; i < 3; i++) { const r = curveRing(1.5 + i * .27, 0, lineMat(GOLD, .35)); r.rotation.set(.4, 0, .2); g.add(r); }
      const sun = ball(.13, luminous(PALE)); sun.position.set(-1.6, .9, .2); g.add(sun);
      const halo = glow(1, .7); halo.position.copy(sun.position); g.add(halo);
      g.rotation.y = -.4;
      return g;
    }
    function gear(radius: number, teeth: number, material: THREE.Material) {
      const shape = new THREE.Shape();
      for (let j = 0; j <= teeth * 4; j++) {
        const a = j / (teeth * 4) * Math.PI * 2;
        const r = radius * (j % 4 < 2 ? 1 : .86);
        if (j === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r); else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      const hole = new THREE.Path(); hole.absarc(0, 0, radius * .54, 0, Math.PI * 2, true); shape.holes.push(hole);
      const m = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: .09, bevelEnabled: true, bevelThickness: .015, bevelSize: .008, bevelSegments: 1 }), material);
      return m;
    }
    function electricity() {
      const g = new THREE.Group();
      const brass = metal();
      for (let j = 0; j < 3; j++) {
        const cog = gear(.8 - j * .15, 24 - j * 4, brass);
        cog.position.set(j === 0 ? -.7 : .6, j === 1 ? .72 : -.36, j * .15);
        cog.rotation.z = j * .13;
        g.add(cog);
        const spokes = new THREE.Group();
        for (let k = 0; k < 6; k++) {
          const spoke = new THREE.Mesh(new THREE.BoxGeometry(.035, 1.2 - j * .23, .06), brass); spoke.rotation.z = k * Math.PI / 3; spokes.add(spoke);
        }
        spokes.position.copy(cog.position); g.add(spokes);
      }
      const coils: THREE.Vector3[] = [];
      for (let i = 0; i < 380; i++) { const t = i / 379; const a = t * Math.PI * 30; coils.push(new THREE.Vector3(Math.cos(a) * .45, t * 1.8 - .9, Math.sin(a) * .45)); }
      const coil = tube(coils, .012, metal(0xe5ba76)); coil.position.set(.2, 0, .7); g.add(coil);
      const core = glow(3.4, .25); g.add(core);
      g.rotation.set(.1, -.35, -.2);
      return g;
    }
    function atomLife() {
      const g = new THREE.Group();
      const bronze = metal();
      for (let j = 0; j < 2; j++) {
        const pts: THREE.Vector3[] = [];
        for (let i = 0; i < 120; i++) { const t = i / 119; const a = t * Math.PI * 5 + j * Math.PI; pts.push(new THREE.Vector3(Math.cos(a) * .46, (t - .5) * 3, Math.sin(a) * .46)); }
        g.add(tube(pts, .035, bronze));
      }
      for (let i = 0; i < 30; i++) {
        const t = i / 29; const a = t * Math.PI * 5;
        g.add(tube([new THREE.Vector3(Math.cos(a) * .46, (t - .5) * 3, Math.sin(a) * .46), new THREE.Vector3(-Math.cos(a) * .46, (t - .5) * 3, -Math.sin(a) * .46)], .014, i % 3 ? bronze : luminous(PALE, .7)));
      }
      for (let i = 0; i < 3; i++) {
        const orbit = ring(1.68, .006, metal()); orbit.rotation.set(.5 + i * .7, i * 1.1, i * .9); orbit.scale.y = .65; g.add(orbit);
      }
      g.rotation.set(.1, 0, -.35);
      g.add(glow(3.4, .25));
      return g;
    }
    function network(future: boolean) {
      const g = new THREE.Group();
      const pts: THREE.Vector3[] = [];
      const count = future ? 210 : 95;
      for (let i = 0; i < count; i++) {
        const z = 1 - 2 * (i + .5) / count;
        const a = i * 2.3999632297;
        const r = Math.sqrt(1 - z * z);
        const p = new THREE.Vector3(Math.cos(a) * r, z, Math.sin(a) * r).multiplyScalar(future ? 1.48 : 1.35);
        if (!future) { p.x *= 1.15; p.y *= .83; p.z *= .75; }
        pts.push(p);
      }
      const edges: THREE.Vector3[] = [];
      pts.forEach((p, i) => {
        const node = ball(future ? .016 : .031, luminous(PALE, .87)); node.position.copy(p); g.add(node);
        for (let j = i + 1; j < pts.length; j++) { if (p.distanceTo(pts[j]) < (future ? .47 : .64)) edges.push(p, pts[j]); }
      });
      g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(edges), lineMat(GOLD, future ? .44 : .38)));
      if (future) {
        const inner = ball(.44, luminous(0xf1c178, .12)); g.add(inner);
        g.add(glow(3.8, .52));
        for (let i = 0; i < 3; i++) { const r = ring(1.85 + i * .1, .003, metal()); r.rotation.set(.4 + i, i * .8, .2); g.add(r); }
      } else {
        const chip = new THREE.Mesh(new THREE.BoxGeometry(.6, .6, .1), metal(0x6d5736)); chip.rotation.z = Math.PI / 4; g.add(chip); g.add(glow(2.5, .38));
      }
      return g;
    }

    const groups = [armillary(), fire(), armillary(false), optics(), telescope(), electricity(), atomLife(), network(false), network(true)];
    const sculptures: Sculpture[] = groups.map((group, i) => {
      const materials = new Map<THREE.Material, number>();
      group.traverse(o => {
        const m = (o as THREE.Mesh).material;
        if (m) for (const material of Array.isArray(m) ? m : [m]) { if (!materials.has(material)) materials.set(material, material.opacity); }
      });
      group.visible = i === 0;
      scene.add(group);
      return { group, materials, weight: i === 0 ? 1 : 0 };
    });
    // Shared celestial dust gives the transitions a continuous sense of place.
    const starGeo = new THREE.BufferGeometry();
    const stars = new Float32Array(650 * 3);
    for (let i = 0; i < 650; i++) { stars[i * 3] = (random() - .5) * 13; stars[i * 3 + 1] = (random() - .5) * 10; stars[i * 3 + 2] = (random() - .5) * 9 - 1; }
    starGeo.setAttribute("position", new THREE.BufferAttribute(stars, 3));
    const starfield = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xc8b79a, size: .012, transparent: true, opacity: .6, depthWrite: false, sizeAttenuation: true, blending: THREE.AdditiveBlending }));
    scene.add(starfield);
    const atmosphere = glow(8, .13); atmosphere.position.set(.2, -.3, -3); scene.add(atmosphere);
    const pointer = new THREE.Vector2();
    const parallax = new THREE.Vector2();
    const onPointer = (event: PointerEvent) => {
      pointer.x = (event.clientX / window.innerWidth - .5) * 2;
      pointer.y = (event.clientY / window.innerHeight - .5) * 2;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    const resize = () => {
      const { width, height } = el.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      // Keep the sculpture legible in a tall, narrow mobile viewport.
      camera.position.z = width / height < .8 ? 9.5 : 7.8;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize); observer.observe(el); resize();
    let frame = 0;
    let last = performance.now();
    let time = 0;
    let disposed = false;
    const baseRotations = groups.map(g => g.rotation.clone());
    let first = true;
    const render = (now: number) => {
      if (disposed) return;
      const dt = Math.min((now - last) / 1000, .05); last = now;
      const movement = motion.current ? 0 : 1;
      time += dt * movement;
      parallax.lerp(pointer, .025);
      const selected = Math.max(0, Math.min(active.current + 1, sculptures.length - 1));
      sculptures.forEach((sculpture, i) => {
        const target = selected === i ? 1 : 0;
        sculpture.weight += (target - sculpture.weight) * (motion.current ? 1 : Math.min(dt * 4.5, 1));
        sculpture.group.visible = sculpture.weight > .006;
        if (!sculpture.group.visible) return;
        sculpture.group.scale.setScalar(.84 + .16 * sculpture.weight);
        sculpture.group.position.y = Math.sin(time * .35) * .055 - (1 - sculpture.weight) * .15;
        sculpture.group.rotation.y = baseRotations[i].y + time * .055 + parallax.x * .09 * movement;
        sculpture.group.rotation.x = baseRotations[i].x + parallax.y * .055 * movement;
        sculpture.materials.forEach((opacity, material) => { material.opacity = opacity * sculpture.weight; });
      });
      starfield.rotation.y = time * .006;
      starfield.rotation.z = -.1 + time * .002;
      renderer.render(scene, camera);
      if (first) { first = false; ready.current?.(); }
      frame = requestAnimationFrame(render);
    };
    const onVisibility = () => {
      cancelAnimationFrame(frame);
      if (!document.hidden) { last = performance.now(); frame = requestAnimationFrame(render); }
    };
    document.addEventListener("visibilitychange", onVisibility);
    frame = requestAnimationFrame(render);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      scene.traverse(o => {
        const mesh = o as THREE.Mesh;
        if (mesh.geometry) geometries.add(mesh.geometry);
        if (mesh.material) for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) materials.add(m);
      });
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); glowTexture.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={host} style={{ width: "100%", height: "100%", position: "relative" }} role="img" aria-label={chapter < 0 ? "A slowly rotating golden celestial armillary sphere surrounded by starlight" : "A three-dimensional scientific sculpture for the current chapter"}>
    {unavailable && <CompatibilitySculpture chapter={chapter} reducedMotion={reducedMotion} />}
  </div>;
}

function CompatibilitySculpture({ chapter, reducedMotion }: Pick<Props, "chapter" | "reducedMotion">) {
  const id = useId().replace(/:/g, "");
  const paint = (name: string) => `url(#${id}-${name})`;
  const ticks = (radius: number, count: number, major = 6) => Array.from({ length: count }, (_, i) => {
    const a = i * 2 * Math.PI / count;
    const inner = radius - (i % major === 0 ? 12 : 5);
    return <line key={i} x1={Math.cos(a) * inner} y1={Math.sin(a) * inner} x2={Math.cos(a) * radius} y2={Math.sin(a) * radius} stroke={i % major === 0 ? "#e1c18b" : "#8f7046"} strokeWidth={i % major === 0 ? 1 : .55} />;
  });
  const sphere = (small = false) => <g transform={small ? "scale(.86)" : undefined}>
    <circle r="112" fill={paint("sphere")} stroke="#b58b4d" strokeWidth=".7" />
    <g clipPath={paint("clip")} stroke={paint("wire")} fill="none" strokeWidth=".7" opacity=".82">
      {Array.from({ length: 9 }, (_, i) => <ellipse key={`p${i}`} cy={(i - 4) * 24} rx={Math.sqrt(Math.max(0, 112 ** 2 - ((i - 4) * 24) ** 2))} ry={14 + Math.abs(i - 4) * .7} />)}
      {[13, 34, 58, 82, 103].flatMap((r, i) => [<ellipse key={`m${i}`} rx={r} ry="112" />, <ellipse key={`n${i}`} rx={r} ry="112" transform="rotate(35)" opacity=".22" />])}
    </g>
    <path d="M-67 -52L-43 -70L-18 -54L-27 -29L2 -21L18 15L42 3L61 31L46 63L20 73M-84 34L-56 48L-33 36L-23 55" stroke="#f2d3a0" strokeWidth=".9" opacity=".5" fill="none" />
    {[[-67,-52],[-43,-70],[-18,-54],[-27,-29],[2,-21],[18,15],[42,3],[61,31],[46,63],[20,73],[-84,34],[-56,48],[-33,36],[-23,55]].map(([x,y],i) => <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.9 : 1.2} fill="#f9d9a1" opacity=".85" />)}
    <circle r="112" fill="none" stroke={paint("metal")} strokeWidth="1.2" />
    <path d="M-102 -47 A112 112 0 0 1 51 -100" stroke="#f4dcad" strokeWidth="1.5" fill="none" opacity=".75" />
  </g>;
  const armillary = <g transform="rotate(-18)">
    <g transform="rotate(29)"><ellipse rx="219" ry="68" fill="none" stroke={paint("metal")} strokeWidth="2.3" /><ellipse rx="224" ry="72" fill="none" stroke="#a48857" strokeWidth=".55" opacity=".55" /></g>
    <g transform="rotate(-49)"><ellipse rx="204" ry="82" fill="none" stroke={paint("metal")} strokeWidth="2.5" /><ellipse rx="208" ry="86" fill="none" stroke="#b59259" strokeWidth=".7" /></g>
    <g transform="rotate(72)"><ellipse rx="187" ry="70" fill="none" stroke={paint("metal")} strokeWidth="1.8" /></g>
    {sphere()}
    <g transform="rotate(-35)"><ellipse rx="219" ry="101" fill="none" stroke={paint("metal")} strokeWidth="2.5" /><ellipse rx="224" ry="106" fill="none" stroke="#8f7046" strokeWidth=".7" />
      {Array.from({length:96},(_,i)=>{const a=i/96*Math.PI*2;return <line key={i} x1={Math.cos(a)*219} y1={Math.sin(a)*101} x2={Math.cos(a)*(i%8===0?229:224)} y2={Math.sin(a)*(i%8===0?111:106)} stroke="#c5a16b" strokeWidth=".7"/>;})}
    </g>
    <g transform="translate(178 -78)"><circle r="11" fill={paint("moon")} stroke="#c9b080" strokeWidth=".6" /><circle r="24" fill={paint("softGlow")} opacity=".35" /></g>
    <circle cx="-156" cy="-126" r="3.5" fill="#c5a16b" /><circle cx="81" cy="176" r="2.8" fill="#ddba7e" />
    <path d="M-240 0h12M228 0h12M0 -238v12M0 226v12" stroke="#a5814b" strokeWidth=".7" opacity=".7" />
    <circle r="242" stroke="#b8965e" fill="none" strokeWidth=".4" strokeDasharray="1 13" opacity=".35" />
  </g>;
  const astrolabe = <g transform="rotate(-16)">
    <circle r="169" fill={paint("disk")} stroke={paint("metal")} strokeWidth="4" />
    <circle r="160" fill="none" stroke="#d8b77b" strokeWidth=".8" />{ticks(157,120,10)}
    {[130,112,85,57,27].map((r,i)=><circle key={i} r={r} fill="none" stroke="#ba975f" strokeWidth={i===0?1.2:.6} opacity=".75"/>)}
    {Array.from({length:12},(_,i)=><g key={i} transform={`rotate(${i*30})`}><path d="M0 -130V130" stroke="#b28d52" strokeWidth=".5" opacity=".55"/><text y="-137" textAnchor="middle" fill="#d4b77d" fontFamily="serif" fontSize="9">{i*30}°</text></g>)}
    <g stroke={paint("metal")} strokeWidth="2.5" fill="none"><ellipse cy="34" rx="93" ry="91"/><ellipse cx="-39" cy="-7" rx="63" ry="97" transform="rotate(-28)"/><ellipse cx="32" cy="-32" rx="55" ry="81" transform="rotate(31)"/></g>
    <g transform="rotate(36)"><path d="M-6 -181L-10 174H10L6 -181Z" fill={paint("metal")} /><rect x="-11" y="-92" width="22" height="20" rx="2" fill="#44301b" stroke="#e0bc7b"/><rect x="-11" y="72" width="22" height="20" rx="2" fill="#44301b" stroke="#e0bc7b"/></g>
    <circle r="10" fill={paint("metal")} stroke="#e4c28b"/><circle r="3" fill="#43311c"/><path d="M-20 -171Q-23 -198 0 -201Q23 -198 20 -171" stroke={paint("metal")} strokeWidth="5" fill="none"/><circle cy="-218" r="21" fill="none" stroke={paint("metal")} strokeWidth="6" />
  </g>;
  const fire = <g>
    <ellipse cy="160" rx="128" ry="22" fill="#b47a3d" opacity=".08"/>
    <g fill={paint("rock")} stroke="#80705b" strokeWidth=".8"><path d="M-124 143L-99 115L-51 128L-38 159L-81 174Z"/><path d="M-38 152L-24 125L20 128L42 163L6 180Z"/><path d="M45 154L57 120L99 114L130 143L99 167Z"/></g>
    <g fill="none" strokeLinecap="round">{Array.from({length:19},(_,i)=>{const x=(i-9)*6;const h=170+Math.sin(i*2.3)*45;return <path key={i} d={`M${x} 137 C${x-80} 48 ${-x+80} -38 ${Math.sin(i)*17} ${-h} C${x-22} -42 ${x+37} 43 ${x} 137`} stroke={i%3===0?"#f1cf8c":"#b27a39"} strokeWidth={i%3===0?1.6:.7} opacity={i%3===0?.85:.5}/>;})}</g>
    <ellipse cy="54" rx="69" ry="105" fill={paint("fireGlow")} />
    {Array.from({length:44},(_,i)=><circle key={i} cx={Math.sin(i*2.4)*(32+(i%7)*15)} cy={-25-(i%13)*17} r={i%6===0?1.8:.8} fill="#eabd73" opacity={.25+(i%5)*.13}/>)}
  </g>;
  const telescope = <g>
    <g fill="none" stroke="#9b7846" opacity=".44"><ellipse cy="83" rx="217" ry="70" transform="rotate(-13)"/><ellipse cy="83" rx="180" ry="49" transform="rotate(-13)"/><circle cx="-181" cy="-31" r="10" fill={paint("moon")} stroke="#dabb82"/></g>
    <g stroke={paint("metal")} fill="none" strokeWidth="5"><path d="M0 12L-80 181M0 12L82 181M0 12L20 182"/><path d="M-41 98L44 98M20 182L-41 98M20 182L44 98" strokeWidth="1"/></g>
    <circle r="14" cy="8" fill={paint("metal")}/>
    <g transform="translate(0 -41) rotate(-23)"><path d="M-150 -28H90V28H-150Z" fill={paint("tube")} stroke="#cfad73"/><path d="M90 -20H143V20H90" fill={paint("tube")} stroke="#bd985e"/><rect x="-163" y="-34" width="17" height="68" rx="3" fill={paint("metal")}/><ellipse cx="-163" rx="8" ry="29" fill={paint("lens")} stroke="#d6bb87"/><rect x="141" y="-23" width="11" height="46" rx="2" fill={paint("metal")}/>{[-124,-84,70].map(x=><rect key={x} x={x} y="-31" width="7" height="62" rx="2" fill={paint("metal")}/>)}<path d="M-145 -19H69" stroke="#f4daa8" opacity=".5"/><path d="M-145 17H69" stroke="#3a291b" strokeWidth="3"/><path d="M-5 28V55H12V28" stroke="#c5a16b" fill={paint("tube")}/></g>
    <path d="M-220 -130h43M-198 -151v43M158 -149h16M166 -157v16" stroke="#c4a26c" opacity=".6" strokeWidth=".7"/>
  </g>;
  const gearPath = (r:number,n:number)=>Array.from({length:n*4},(_,i)=>{const a=i/(n*4)*Math.PI*2;const rr=r*(i%4<2?1:.88);return `${i===0?'M':'L'}${Math.cos(a)*rr},${Math.sin(a)*rr}`;}).join(' ')+'Z';
  const gears = <g transform="rotate(-12)">{[[-72,-39,105,24],[79,41,77,20],[-64,133,63,16],[92,-111,61,16]].map(([x,y,r,n],i)=><g key={i} transform={`translate(${x} ${y}) rotate(${i*13})`}><path d={gearPath(r,n)} fill={paint("disk")} stroke={paint("metal")} strokeWidth="2"/><circle r={r*.66} fill="#111310" stroke="#b18e56" strokeWidth="1.5"/>{Array.from({length:6},(_,j)=><path key={j} d={`M0 -${r*.73}V${r*.73}`} stroke={paint("metal")} strokeWidth="7" transform={`rotate(${j*60})`}/>)}<circle r={r*.2} fill={paint("metal")}/><circle r={r*.08} fill="#1b1a14"/>{ticks(r*.81,n,4)}</g>)}<g transform="translate(4 8)"><path d="M0 -127V125" stroke="#ceac6e" strokeWidth="3"/>{Array.from({length:21},(_,i)=><ellipse key={i} cy={i*9-90} rx="27" ry="9" fill="none" stroke={paint("metal")} strokeWidth="1.6"/>)}<circle cy="-130" r="13" fill={paint("moon")}/><circle cy="-130" r="47" fill={paint("softGlow")} opacity=".3"/></g></g>;
  const dna = <g transform="rotate(24)">
    <g stroke="#9b7d4e" fill="none" opacity=".45"><ellipse rx="203" ry="86" transform="rotate(35)"/><ellipse rx="210" ry="76" transform="rotate(-45)"/></g>
    {Array.from({length:34},(_,i)=>{const y=i*11-181;const a=i/33*Math.PI*5;return <g key={i}><line x1={Math.sin(a)*53} x2={-Math.sin(a)*53} y1={y} y2={y} stroke={paint("metal")} strokeWidth="2" opacity={.45+Math.abs(Math.sin(a))*.45}/><circle cx={Math.sin(a)*53} cy={y} r="3.5" fill="#d3b477"/><circle cx={-Math.sin(a)*53} cy={y} r="3.5" fill="#ab8551"/></g>;})}
    {[0,Math.PI].map((p,i)=><path key={i} d={Array.from({length:201},(_,j)=>`${j===0?'M':'L'}${Math.sin(j/200*Math.PI*5+p)*53},${j/200*363-181}`).join(' ')} fill="none" stroke={paint("metal")} strokeWidth="5"/>)}</g>;
  const nodes = Array.from({length:chapter===7?100:58},(_,i)=>{const z=1-2*(i+.5)/(chapter===7?100:58),a=i*2.399963;const r=Math.sqrt(1-z*z);return{x:Math.cos(a)*r*160,y:z*160,z:Math.sin(a)*r};});
  const network = <g>{chapter===7&&<g fill="none" stroke={paint("metal")} opacity=".5"><ellipse rx="215" ry="67" transform="rotate(-35)"/><ellipse rx="196" ry="75" transform="rotate(56)"/><circle r="188" strokeWidth=".4" strokeDasharray="2 9"/></g>}{nodes.flatMap((p,i)=>nodes.slice(i+1).map((q,j)=>Math.hypot(p.x-q.x,p.y-q.y)<55&&Math.abs(p.z-q.z)<.65?<line key={`${i}-${j}`} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke="#b8945a" strokeWidth=".7" opacity={.18+(p.z+1)*.2}/>:null))}{nodes.map((p,i)=><g key={i}><circle cx={p.x} cy={p.y} r={chapter===7?1.9:2.8} fill={p.z>0?"#edcf97":"#8d7046"}/>{i%9===0&&<circle cx={p.x} cy={p.y} r="13" fill={paint("softGlow")} opacity=".4"/>}</g>)}{chapter===7?<><circle r="41" fill={paint("softGlow")} opacity=".7"/><circle r="5" fill="#e9c78f" opacity=".8"/></>:<g transform="rotate(45)"><rect x="-28" y="-28" width="56" height="56" fill={paint("disk")} stroke="#c4a16c"/>{Array.from({length:7},(_,i)=><g key={i}><path d={`M${i*7-21} -28v-12M${i*7-21} 28v12M-28 ${i*7-21}h-12M28 ${i*7-21}h12`} stroke="#bf9f69"/></g>)}<rect x="-18" y="-18" width="36" height="36" fill="#1a1e1b" stroke="#a18756"/></g>}</g>;
  const art = chapter===0?fire:chapter===2?astrolabe:chapter===3?telescope:chapter===4?gears:chapter===5?dna:chapter===6||chapter===7?network:armillary;
  return <div className="scene-fallback" style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", overflow: "visible" }}>
    <svg key={chapter} className="compat-art" viewBox="-300 -300 600 600" style={{ width: "112%", height: "112%", maxWidth: 800, overflow: "visible", animation: reducedMotion ? "none" : "observatory-float 12s ease-in-out infinite" }} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#4b3925"/><stop offset=".19" stopColor="#ab8550"/><stop offset=".4" stopColor="#e1c797"/><stop offset=".52" stopColor="#9a7541"/><stop offset=".75" stopColor="#d2b47d"/><stop offset="1" stopColor="#554025"/></linearGradient>
        <linearGradient id={`${id}-wire`}><stop stopColor="#dbbc82"/><stop offset=".4" stopColor="#a8834a"/><stop offset="1" stopColor="#695332"/></linearGradient>
        <linearGradient id={`${id}-tube`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#7e5b2e"/><stop offset=".22" stopColor="#d3b67e"/><stop offset=".45" stopColor="#9f7d45"/><stop offset=".8" stopColor="#44311c"/><stop offset="1" stopColor="#9e7a43"/></linearGradient>
        <radialGradient id={`${id}-sphere`} cx="29%" cy="25%" r="80%"><stop stopColor="#a08a5c"/><stop offset=".26" stopColor="#77603a"/><stop offset=".61" stopColor="#3b3423"/><stop offset=".9" stopColor="#171d19"/><stop offset="1" stopColor="#121813"/></radialGradient>
        <radialGradient id={`${id}-disk`} cx="30%" cy="20%" r="90%"><stop stopColor="#9e7d47"/><stop offset=".5" stopColor="#66502e"/><stop offset="1" stopColor="#2f2c1e"/></radialGradient>
        <radialGradient id={`${id}-moon`} cx="27%" cy="22%"><stop stopColor="#ead8ad"/><stop offset=".4" stopColor="#c0aa7a"/><stop offset=".8" stopColor="#6f6043"/><stop offset="1" stopColor="#343326"/></radialGradient>
        <radialGradient id={`${id}-lens`} cx="30%" cy="20%"><stop stopColor="#9cb9ac"/><stop offset=".3" stopColor="#3c5f60"/><stop offset="1" stopColor="#121d21"/></radialGradient>
        <radialGradient id={`${id}-softGlow`}><stop stopColor="#f5d298" stopOpacity=".7"/><stop offset=".25" stopColor="#d8a256" stopOpacity=".18"/><stop offset="1" stopColor="#b3833d" stopOpacity="0"/></radialGradient>
        <radialGradient id={`${id}-fireGlow`}><stop stopColor="#d5ac69" stopOpacity=".36"/><stop offset=".4" stopColor="#bd7c31" stopOpacity=".12"/><stop offset="1" stopColor="#a76a25" stopOpacity="0"/></radialGradient>
        <linearGradient id={`${id}-rock`} x2=".8" y2="1"><stop stopColor="#575343"/><stop offset="1" stopColor="#20241f"/></linearGradient>
        <clipPath id={`${id}-clip`}><circle r="112"/></clipPath>
      </defs>
      <ellipse rx="279" ry="250" fill={paint("softGlow")} opacity=".17"/>
      {Array.from({length:65},(_,i)=><circle key={i} cx={Math.sin(i*3.17)*285} cy={Math.cos(i*2.43)*270} r={i%7===0?1.15:.55} fill="#c9b58c" opacity={.15+(i%5)*.1}/>)}
      {art}
    </svg>
    <span style={{ position: "absolute", bottom: "4%", color: "#7c7669", fontSize: 8, letterSpacing: ".16em", opacity: .8 }}>OBSERVATORY · COMPATIBILITY VIEW</span>
    <style>{`@keyframes observatory-float{0%,100%{transform:translateY(0) rotate(-1deg)}50%{transform:translateY(-8px) rotate(1deg)}}@media(prefers-reduced-motion:reduce){.compat-art{animation:none!important}}`}</style>
  </div>;
}
