import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { makeCar } from "./car-model.js";
import { parts } from "./car-catalog.js";

const views = {
  front: [
    [-7, 3.3, 6.3],
    [0, 0.98, 0],
  ],
  side: [
    [0, 2, 11.8],
    [0, 1, 0],
  ],
  rear: [
    [8, 3.6, 7],
    [0, 1, 0],
  ],
  top: [
    [-3.8, 4.6, 3.6],
    [-1.65, 0.95, 0],
  ],
  inside: [
    [1.3, 3.5, 3.7],
    [0.35, 1.12, 0],
  ],
  under: [
    [-2, -5.7, 3.4],
    [0, 0.65, 0],
  ],
};
export function mountScene(canvas, fail) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.23;
  const scene = new THREE.Scene();
  const generator = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const reflection = generator.fromScene(room, 0, 0.1, 100, { size: 32 });
  scene.environment = reflection.texture;
  scene.environmentIntensity = 0.8;
  room.dispose();
  generator.dispose();
  scene.add(new THREE.HemisphereLight(0xfff3df, 0xb9aa93, 2));
  const key = new THREE.DirectionalLight(0xfff3d7, 2.5);
  key.position.set(-5, 8, 4);
  scene.add(key);
  const car = makeCar();
  scene.add(car.group);
  const shadowCanvas = document.createElement("canvas");
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const ctx = shadowCanvas.getContext("2d");
  const grad = ctx.createRadialGradient(64, 64, 5, 64, 64, 64);
  grad.addColorStop(0, "rgba(44,39,30,.5)");
  grad.addColorStop(0.57, "rgba(44,39,30,.32)");
  grad.addColorStop(1, "transparent");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 3.7),
    new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(shadowCanvas),
      transparent: true,
      depthWrite: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.015;
  scene.add(shadow);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.04, 140);
  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.minDistance = 1.3;
  controls.maxDistance = 18;
  let frame = 0,
    view = "front",
    selected = null;
  const outline = new THREE.Box3Helper(new THREE.Box3(), 0xcc882e);
  outline.visible = false;
  scene.add(outline);
  function draw() {
    if (!frame && !document.hidden)
      frame = requestAnimationFrame(() => {
        frame = 0;
        renderer.render(scene, camera);
      });
  }
  function preset(name) {
    view = name;
    const [eye, target] = views[name];
    controls.target.fromArray(target);
    const vector = new THREE.Vector3().fromArray(eye).sub(controls.target);
    if (camera.aspect < 1.4)
      vector.multiplyScalar(Math.min(1.9, 1.4 / camera.aspect));
    camera.position.copy(controls.target).add(vector);
    controls.update();
    draw();
  }
  function resize() {
    const w = canvas.clientWidth,
      h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    preset(view);
  }
  new ResizeObserver(resize).observe(canvas);
  controls.addEventListener("change", draw);
  function zoom(factor) {
    const offset = camera.position.clone().sub(controls.target);
    offset.setLength(
      THREE.MathUtils.clamp(
        offset.length() * factor,
        controls.minDistance,
        controls.maxDistance,
      ),
    );
    camera.position.copy(controls.target).add(offset);
    controls.update();
    draw();
  }
  canvas.addEventListener("keydown", (e) => {
    if (
      ![
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "+",
        "=",
        "-",
      ].includes(e.key)
    )
      return;
    e.preventDefault();
    if (["+", "=", "-"].includes(e.key)) {
      zoom(e.key === "-" ? 1.15 : 0.87);
      return;
    }
    const offset = camera.position.clone().sub(controls.target),
      s = new THREE.Spherical().setFromVector3(offset);
    if (e.key === "ArrowLeft") s.theta -= 0.18;
    if (e.key === "ArrowRight") s.theta += 0.18;
    if (e.key === "ArrowUp") s.phi -= 0.14;
    if (e.key === "ArrowDown") s.phi += 0.14;
    s.makeSafe();
    camera.position.copy(controls.target).add(offset.setFromSpherical(s));
    controls.update();
    draw();
  });
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    fail("3D graphics paused. Reload to resume your saved build.");
  });
  document.addEventListener("visibilitychange", draw);
  resize();
  return {
    preset,
    zoom,
    focus(id) {
      const bounds = new THREE.Box3().setFromObject(car.parts[id]);
      bounds.getCenter(controls.target);
      const size = bounds.getSize(new THREE.Vector3()).length();
      camera.position
        .copy(controls.target)
        .add(
          new THREE.Vector3(-1, 0.72, 1)
            .normalize()
            .multiplyScalar(Math.max(1.5, size * 2.4)),
        );
      controls.update();
      draw();
    },
    update(state, reference, cut, id, isolated) {
      car.applyStyle(state.style);
      selected = id;
      for (const p of parts) {
        const shell =
          ["Body", "Trim"].includes(p.category) || p.id === "headliner";
        car.parts[p.id].visible =
          (reference || state.installed.includes(p.id)) &&
          (!cut || !shell) &&
          (!isolated || p.id === id);
      }
      outline.visible = Boolean(
        !isolated && !reference && selected && car.parts[selected]?.visible,
      );
      if (outline.visible) outline.box.setFromObject(car.parts[selected]);
      shadow.visible = reference || state.installed.length > 0;
      draw();
    },
    metrics: () => ({
      ...renderer.info.render,
      visible: Object.keys(car.parts).filter((id) => car.parts[id].visible),
      eye: camera.position.toArray(),
    }),
  };
}
