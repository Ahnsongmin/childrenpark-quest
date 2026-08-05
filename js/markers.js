/* 랜드마크 16곳 — 이모지 캔버스 스프라이트 마커 (사진 없음) */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ZONES, LANDMARKS } from './config.js';
import { prj } from './geo.js';

const CW = 256, CH = 320; // 캔버스: 위 원형 배지 + 아래 이름 라벨

function markerTexture(lm) {
  const c = document.createElement('canvas');
  c.width = CW; c.height = CH;
  const ctx = c.getContext('2d');
  // 배지
  ctx.beginPath();
  ctx.arc(128, 100, 84, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = 14;
  ctx.strokeStyle = ZONES[lm.zone].color;
  ctx.stroke();
  ctx.font = '92px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(lm.emoji, 128, 108);
  // 이름 라벨 (길면 축소) — 번역문으로 폭을 재야 영어 이름이 잘리지 않는다
  const label = window.I18N ? window.I18N.t(lm.name) : lm.name;
  let fs = 42;
  ctx.font = `800 ${fs}px "Apple SD Gothic Neo","Malgun Gothic",sans-serif`;
  while (ctx.measureText(label).width > 244 && fs > 18) {
    fs -= 2;
    ctx.font = `800 ${fs}px "Apple SD Gothic Neo","Malgun Gothic",sans-serif`;
  }
  ctx.lineWidth = 12;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#ffffff';
  ctx.strokeText(label, 128, 254);
  ctx.fillStyle = '#3a5540';
  ctx.fillText(label, 128, 254);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function createMarkers(scene) {
  const list = [];
  const sprites = [];
  const postGeos = [], blobGeos = [];
  LANDMARKS.forEach((lm, i) => {
    const [x, z] = prj(lm.lat, lm.lon);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: markerTexture(lm) }));
    sprite.position.set(x, 20, z);
    sprite.userData.lm = lm;
    scene.add(sprite);
    sprite.userData.refresh = () => {
      sprite.material.map.dispose();
      sprite.material.map = markerTexture(lm);
      sprite.material.needsUpdate = true;
    };
    const post = new THREE.CylinderGeometry(0.5, 0.5, 9, 6);
    post.translate(x, 4.5, z);
    postGeos.push(post);
    const blob = new THREE.CircleGeometry(2.4, 16).rotateX(-Math.PI / 2);
    blob.translate(x, 0.15, z);
    blobGeos.push(blob);
    list.push({ lm, sprite, x, z, i, pop: 0 });
    sprites.push(sprite);
  });
  // 기둥·그림자는 각각 1메시로 병합 (드로우콜 절약)
  scene.add(new THREE.Mesh(
    mergeGeometries(postGeos),
    new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.85 }),
  ));
  scene.add(new THREE.Mesh(
    mergeGeometries(blobGeos),
    new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.15 }),
  ));
  postGeos.concat(blobGeos).forEach((g) => g.dispose());

  function update(t, camera) {
    for (const m of list) {
      // 통통 뜨는 배지 + 거리 기반 크기 클램프 (멀어도 너무 작아지지 않게)
      const d = camera.position.distanceTo(m.sprite.position);
      let h = Math.min(46, Math.max(17, d * 0.082));
      if (m.pop > 0) { h *= 1 + m.pop * 0.45; m.pop = Math.max(0, m.pop - 0.03); }
      m.sprite.scale.set(h * CW / CH, h, 1);
      m.sprite.position.y = 13 + h * 0.42 + Math.sin(t * 1.6 + m.i * 0.8) * 1.0;
    }
  }

  /* 라벨은 캔버스 텍스처라 언어를 바꿔도 저절로 다시 그려지지 않는다.
     사전이 준비된 시점(lang-changed)에 텍스처만 새로 굽는다. */
  window.addEventListener('lang-changed', () => sprites.forEach((s) => s.userData.refresh()));

  return { list, sprites, update };
}
