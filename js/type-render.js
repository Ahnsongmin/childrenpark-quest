/* 캐릭터 2D 이미지 렌더 — 오프스크린 three.js로 치비를 그려 dataURL/Image로 반환.
   도감(16~32장 연속 렌더)·리캡 유형 슬라이드 공용. WebGL 컨텍스트는 1개를 재사용한다
   (브라우저 컨텍스트 상한 ~8-16개 — 카드마다 렌더러를 만들면 앞선 카드가 지워짐). */
import * as THREE from 'three';
import { buildChibi, characterImagePath } from './character.js';

let shared = null; // { renderer, camera, scene, light 준비된 세트 }
const cache = new Map(); // key → Promise<Image|null>

function getShared(w, h) {
  if (!shared) {
    const canvas = document.createElement('canvas');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    const camera = new THREE.PerspectiveCamera(38, w / h, 0.5, 200);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight('#eaf6ff', '#9fcf8a', 1.2));
    const sun = new THREE.DirectionalLight('#fff6e0', 1.5);
    sun.position.set(6, 12, 8);
    scene.add(sun);
    shared = { canvas, renderer, camera, scene };
  }
  shared.canvas.width = w;
  shared.canvas.height = h;
  shared.renderer.setSize(w, h, false);
  shared.camera.aspect = w / h;
  shared.camera.position.set(0, 9.5, 27);
  shared.camera.lookAt(0, 6.4, 0);
  shared.camera.updateProjectionMatrix();
  return shared;
}

function loadImg(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function disposeGroup(group) {
  group.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      if (o.material.map) o.material.map.dispose();
      o.material.dispose();
    }
  });
}

/* 아바타 설정(성별·의상·gear=유형 combo id)으로 캐릭터 이미지를 반환.
   ①img/characters/*.webp 일러스트 → ②오프스크린 치비 렌더 → ③null(호출측 이모지 폴백) */
export function renderCharacterImage(cfg, w = 540, h = 720) {
  const key = JSON.stringify([cfg.gender, !!cfg.dress, cfg.top | 0, cfg.bottom | 0, cfg.gear || null, w, h]);
  if (cache.has(key)) return cache.get(key);
  const p = (async () => {
    const art = await loadImg(characterImagePath(cfg));
    if (art) return art;
    try {
      const { renderer, camera, scene } = getShared(w, h);
      const ch = buildChibi(cfg);
      ch.group.rotation.y = 0.3;
      scene.add(ch.group);
      renderer.render(scene, camera);
      const url = renderer.domElement.toDataURL('image/png');
      scene.remove(ch.group);
      disposeGroup(ch.group);
      return await loadImg(url);
    } catch (_) {
      return null; // WebGL 미지원 기기 — 이모지 폴백
    }
  })();
  cache.set(key, p);
  return p;
}
