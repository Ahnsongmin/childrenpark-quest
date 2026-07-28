/* 기록 저장소 — 텍스트류는 localStorage, 사진은 IndexedDB (기기 밖으로 전송되지 않음) */

export function loadJSON(key, def) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    if (v !== null && v !== undefined) return v;
  } catch (_) { /* 손상된 값은 기본값으로 */ }
  return def;
}
export function saveJSON(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

const DB_NAME = 'quest-photos';
const STORE = 'photos';
const MAX_PHOTOS = 60; // 오래된 것부터 정리

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(req && req.result);
    t.onerror = () => reject(t.error);
  });
}

/* dataURL(압축된 JPEG) 저장 → id 반환. 상한 초과 시 가장 오래된 사진 삭제 */
export async function savePhoto(dataUrl) {
  const db = await openDB();
  const id = 'p' + Date.now() + Math.random().toString(36).slice(2, 6);
  await tx(db, 'readwrite', (s) => s.put(dataUrl, id));
  const keys = await tx(db, 'readonly', (s) => s.getAllKeys());
  if (keys && keys.length > MAX_PHOTOS) {
    const old = keys.sort().slice(0, keys.length - MAX_PHOTOS);
    await tx(db, 'readwrite', (s) => { old.forEach((k) => s.delete(k)); });
  }
  return id;
}

export async function getPhoto(id) {
  if (!id) return null;
  try {
    const db = await openDB();
    return (await tx(db, 'readonly', (s) => s.get(id))) || null;
  } catch (_) { return null; }
}

/* 파일(카메라 촬영 포함) → 320px JPEG dataURL 압축 */
export function fileToDataUrl(file, maxW = 320) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width);
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('이미지를 읽을 수 없어요')); };
    img.src = url;
  });
}
