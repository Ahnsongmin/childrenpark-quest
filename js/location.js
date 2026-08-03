/* GPS 추적 상태 머신 — watchPosition을 감싸 필터(정확도·순간이동)·스무딩·공원 경계
   히스테리시스·백그라운드 복귀 재시작을 한 곳에서 처리한다.
   상태: idle | requesting | tracking | denied | unavailable | timeout | outsidePark
   좌표는 콘솔에 출력하지 않는다 (개인정보). */
import { LOCATION_CONFIG, acceptFix, smoothPos, speedMps, latLonDistM, animStateFor } from './geomath.mjs';

const WATCH_OPTS = { enableHighAccuracy: true, maximumAge: 5000, timeout: 12000 };

/* project: (lat,lon)→[x,z] 주입(geo.prj) / isInPark: (x,z,bufferM)→bool 주입(geo.inPark)
   onFix({x,z,accM,lowAccuracy,speedMps,animState,moved}) — 공원 안 좌표만 전달
   onState(state, {lowAccuracy?, nearPark?}) — 상태가 바뀔 때만 호출 */
export function createLocationTracker({ project, isInPark, onFix, onState, config = LOCATION_CONFIG }) {
  let watchId = null;
  let state = 'idle';
  let stateKey = '';
  let lastRaw = null;     // 마지막 수용 fix { lat, lon, accM, t }
  let smoothed = null;    // 스무딩 적용 월드 좌표 [x, z]
  let insidePark = false; // 경계 히스테리시스 상태
  let lastFixWall = 0;    // 마지막 수신 시각 (stale 판정)

  function setState(s, extra = {}) {
    const key = s + JSON.stringify(extra);
    if (key === stateKey) return;
    stateKey = key;
    state = s;
    if (onState) onState(s, extra);
  }

  function handleFix(pos) {
    lastFixWall = Date.now();
    const fix = {
      lat: pos.coords.latitude,
      lon: pos.coords.longitude,
      accM: pos.coords.accuracy || 0,
      t: pos.timestamp || Date.now(),
    };
    const verdict = acceptFix(lastRaw, fix, config);
    if (!verdict.ok) {
      // 신뢰할 수 없는 좌표 — 캐릭터는 마지막 신뢰 위치에 유지
      if (verdict.reason === 'accuracy' && state === 'tracking') setState('tracking', { lowAccuracy: true });
      return;
    }
    const dtSec = lastRaw ? (fix.t - lastRaw.t) / 1000 : 0;
    const dM = lastRaw ? latLonDistM(lastRaw.lat, lastRaw.lon, fix.lat, fix.lon) : 0;
    const sp = (typeof pos.coords.speed === 'number' && pos.coords.speed >= 0 && !Number.isNaN(pos.coords.speed))
      ? pos.coords.speed
      : speedMps(dM, dtSec);
    const moved = !lastRaw || dM >= config.minMovementMeters;
    lastRaw = fix;

    const [x, z] = project(fix.lat, fix.lon);
    if (!smoothed) smoothed = [x, z]; // 첫 좌표는 즉시
    else if (moved) smoothed = smoothPos(smoothed, [x, z], config.smoothingFactor); // 3m 미만 노이즈는 미반영

    /* 공원 경계 히스테리시스 — 밖→안은 좁게(40m), 안→밖은 넓게(120m) 판정해 깜빡임 방지 */
    insidePark = isInPark(smoothed[0], smoothed[1], insidePark ? config.parkExitBufferM : config.parkEnterBufferM);
    if (!insidePark) {
      setState('outsidePark', { nearPark: isInPark(smoothed[0], smoothed[1], config.parkNearM) });
      return;
    }
    setState('tracking', { lowAccuracy: verdict.lowAccuracy });
    if (onFix) {
      onFix({
        x: smoothed[0], z: smoothed[1], accM: fix.accM,
        lowAccuracy: verdict.lowAccuracy,
        speedMps: sp,
        animState: animStateFor(sp, config),
        moved,
      });
    }
  }

  function handleError(err) {
    if (err.code === err.PERMISSION_DENIED) {
      stop('denied');
    } else if (err.code === err.TIMEOUT) {
      setState('timeout'); // watch는 유지 — 신호가 돌아오면 자동 복구
    } else {
      stop('unavailable');
    }
  }

  function start() {
    if (watchId !== null) return;
    if (!('geolocation' in navigator)) { setState('unavailable'); return; }
    setState('requesting');
    watchId = navigator.geolocation.watchPosition(handleFix, handleError, WATCH_OPTS);
  }

  function stop(nextState = 'idle') {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
    lastRaw = null;
    smoothed = null;
    insidePark = false;
    setState(nextState);
  }

  /* 백그라운드 복귀 등에서 좌표가 오래 끊겼으면 watch 재시작 */
  function restartIfStale() {
    if (watchId === null) return;
    if (Date.now() - lastFixWall <= config.staleFixMs) return;
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
    setState('requesting');
    watchId = navigator.geolocation.watchPosition(handleFix, handleError, WATCH_OPTS);
  }

  return {
    start,
    stop: () => stop('idle'),
    restartIfStale,
    get state() { return state; },
    get active() { return watchId !== null; },
  };
}
