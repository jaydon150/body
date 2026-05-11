import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { FEMUR_SEED } from './anatomySeed';
import { useSelectionStore } from '../state/selectionStore';

const BONE_COLOR = '#d8cfb8';
const BONE_SELECTED_COLOR = '#f2c86b';

function createFemurProxy(material: THREE.Material) {
  const group = new THREE.Group();
  group.name = FEMUR_SEED.id;
  group.rotation.set(0.12, -0.35, 0.04);

  const addMesh = (
    geometry: THREE.BufferGeometry,
    position: [number, number, number],
    scale: [number, number, number] = [1, 1, 1],
    rotation: [number, number, number] = [0, 0, 0]
  ) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    mesh.rotation.set(...rotation);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };

  addMesh(new THREE.CylinderGeometry(0.17, 0.22, 2.7, 32), [0, -0.12, 0]);
  addMesh(new THREE.CylinderGeometry(0.13, 0.18, 0.82, 32), [-0.42, 1.28, 0], [1, 1, 1], [0, 0, -0.82]);
  addMesh(new THREE.SphereGeometry(0.33, 40, 24), [-0.78, 1.55, 0], [1.08, 1, 1.02]);
  addMesh(new THREE.SphereGeometry(0.28, 32, 18), [0.25, 1.28, -0.02], [0.82, 1.05, 0.72]);
  addMesh(new THREE.SphereGeometry(0.18, 24, 16), [-0.05, 0.98, 0.12], [0.62, 0.72, 0.52]);
  addMesh(new THREE.SphereGeometry(0.27, 32, 18), [-0.26, -1.52, 0.13], [1.05, 0.82, 0.9]);
  addMesh(new THREE.SphereGeometry(0.27, 32, 18), [0.26, -1.52, 0.13], [1.05, 0.82, 0.9]);

  return group;
}

function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }
    child.geometry.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of materials) {
      material.dispose();
    }
  });
}

export function FemurScene() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const selectedId = useSelectionStore((state) => state.selected?.id ?? null);
  const select = useSelectionStore((state) => state.select);
  const clear = useSelectionStore((state) => state.clear);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return undefined;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0a0a0a');

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0.2, 0.2, 4.8);
    camera.lookAt(0, -0.1, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setClearColor('#0a0a0a', 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    host.append(renderer.domElement);

    scene.add(new THREE.AmbientLight('#ffffff', 0.6));
    const keyLight = new THREE.DirectionalLight('#ffffff', 1.1);
    keyLight.position.set(4, 5, 3);
    keyLight.castShadow = true;
    scene.add(keyLight);
    const fillLight = new THREE.PointLight('#d7e6ff', 0.55);
    fillLight.position.set(-3, 2, -2);
    scene.add(fillLight);

    const material = new THREE.MeshStandardMaterial({
      color: selectedId === FEMUR_SEED.id ? BONE_SELECTED_COLOR : BONE_COLOR,
      roughness: 0.62,
      metalness: 0.02
    });
    const femur = createFemurProxy(material);
    scene.add(femur);

    const grid = new THREE.GridHelper(4, 8, '#333333', '#1d1d1d');
    grid.position.y = -1.92;
    scene.add(grid);

    const resize = () => {
      const { width, height } = host.getBoundingClientRect();
      const safeWidth = Math.max(1, Math.floor(width));
      const safeHeight = Math.max(1, Math.floor(height));
      camera.aspect = safeWidth / safeHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(safeWidth, safeHeight, false);
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const handleClick = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(femur.children, true)[0];
      if (!hit) {
        return;
      }
      if (selectedId === FEMUR_SEED.id) {
        clear();
        return;
      }
      select({
        id: FEMUR_SEED.id,
        label: FEMUR_SEED.label,
        latinLabel: FEMUR_SEED.latinLabel,
        materialHint: FEMUR_SEED.materialHint,
        status: FEMUR_SEED.status
      });
    };

    renderer.domElement.addEventListener('click', handleClick);

    let frameId = 0;
    const render = () => {
      femur.rotation.y += 0.002;
      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(render);
    };
    render();

    return () => {
      window.cancelAnimationFrame(frameId);
      renderer.domElement.removeEventListener('click', handleClick);
      resizeObserver.disconnect();
      disposeObject(femur);
      material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [clear, select, selectedId]);

  return <div ref={hostRef} className="scene-host" aria-label="3D femur proxy scene" />;
}
