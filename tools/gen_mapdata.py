# -*- coding: utf-8 -*-
"""park_osm.json(Overpass 결과) -> src의 mapdata.js 생성.

좌표 변환: equirectangular 선형 사상 (공원 규모 ~1.3km, 곡률 무시 가능)
viewBox 1580 x 1000, 실제 종횡비(dlon*cos(lat) : dlat = 1.58 : 1) 유지.
"""
import json, math, os, sys

sys.stdout.reconfigure(encoding='utf-8')

SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'park_osm.json')
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'mapdata.js')

LAT_MIN, LAT_MAX = 37.54524, 37.55265
LON_MIN, LON_MAX = 127.07462, 127.08941
VIEW_W, VIEW_H = 1580.0, 1000.0

def prj(lat, lon):
    x = (lon - LON_MIN) / (LON_MAX - LON_MIN) * VIEW_W
    y = (LAT_MAX - lat) / (LAT_MAX - LAT_MIN) * VIEW_H
    return round(x, 1), round(y, 1)

def path_d(geom, close=False):
    pts = [prj(p['lat'], p['lon']) for p in geom]
    # 단순화: 4px 미만 이동 점 생략 (SVG 노드 수 절감)
    kept = [pts[0]]
    for p in pts[1:-1]:
        if abs(p[0]-kept[-1][0]) + abs(p[1]-kept[-1][1]) >= 4:
            kept.append(p)
    kept.append(pts[-1])
    d = f"M{kept[0][0]} {kept[0][1]}" + ''.join(f"L{x} {y}" for x, y in kept[1:])
    return d + ('Z' if close else '')

SRC_AREAS = SRC.replace('park_osm.json', 'park_osm_areas.json')
SRC_ROADS = SRC.replace('park_osm.json', 'park_osm_roads.json')

d = json.load(open(SRC, encoding='utf-8'))
ways = {e['id']: e for e in d['elements'] if e['type'] == 'way' and 'geometry' in e}
d2 = json.load(open(SRC_AREAS, encoding='utf-8'))
area_ways = {e['id']: e for e in d2['elements'] if e['type'] == 'way' and 'geometry' in e}
d3 = json.load(open(SRC_ROADS, encoding='utf-8'))
road_ways = {e['id']: e for e in d3['elements'] if e['type'] == 'way' and 'geometry' in e}

boundary = ways[202365904]
boundary_d = path_d(boundary['geometry'], close=True)
boundary_pts = [prj(p['lat'], p['lon']) for p in boundary['geometry']]

water, paths, buildings, path_pts = [], [], [], []
seen = set()
for e in ways.values():
    if e['id'] in seen or e['id'] == 202365904:
        continue
    seen.add(e['id'])
    t = e.get('tags', {})
    if t.get('natural') == 'water' or t.get('leisure') == 'swimming_pool':
        water.append(path_d(e['geometry'], close=True))
    elif t.get('highway') in ('footway', 'path', 'pedestrian', 'cycleway', 'service'):
        paths.append(path_d(e['geometry']))
        path_pts.append([prj(p['lat'], p['lon']) for p in e['geometry']])
    elif t.get('building'):
        buildings.append(path_d(e['geometry'], close=True))

# 면(面) 카테고리: 숲/잔디/동물사/놀이동산/경기장/놀이터/주차장/정원
woods, lawns, zoo_areas, themepark, pitches, playgrounds, parkings = [], [], [], [], [], [], []
for e in area_ways.values():
    t = e.get('tags', {})
    g = e['geometry']
    if len(g) < 3:
        continue
    if t.get('natural') == 'wood' or t.get('landuse') == 'forest':
        woods.append(path_d(g, close=True))
    elif t.get('natural') in ('grassland', 'scrub') or t.get('landuse') in ('grass', 'meadow', 'flowerbed') or t.get('leisure') == 'garden':
        lawns.append(path_d(g, close=True))
    elif t.get('tourism') == 'zoo' or t.get('attraction') == 'animal':
        zoo_areas.append(path_d(g, close=True))
    elif t.get('tourism') == 'theme_park':
        themepark.append(path_d(g, close=True))
    elif t.get('leisure') in ('pitch', 'track', 'sports_centre'):
        pitches.append(path_d(g, close=True))
    elif t.get('leisure') == 'playground':
        playgrounds.append(path_d(g, close=True))
    elif t.get('amenity') == 'parking':
        parkings.append(path_d(g, close=True))

# 주변 도로 (공원 밖 컨텍스트) — 캔버스 여유 ±350 유닛 밖 전체를 벗어난 way는 제외
MARGIN = 350
def in_canvas(g):
    return any(-MARGIN <= prj(p['lat'], p['lon'])[0] <= VIEW_W + MARGIN and
               -MARGIN <= prj(p['lat'], p['lon'])[1] <= VIEW_H + MARGIN for p in g)

roads_major, roads_minor = [], []
for e in road_ways.values():
    t = e.get('tags', {})
    g = e['geometry']
    if len(g) < 2 or not in_canvas(g):
        continue
    hw = t.get('highway')
    if hw in ('primary', 'secondary', 'trunk', 'motorway'):
        roads_major.append(path_d(g))
    elif hw in ('tertiary', 'residential', 'unclassified'):
        roads_minor.append(path_d(g))

# 숲 폴리곤 내부 나무 자동 배치 (결정적 지터 — 재생성해도 동일)
def point_in_poly(x, y, pts):
    inside = False
    j = len(pts) - 1
    for i in range(len(pts)):
        xi, yi = pts[i]; xj, yj = pts[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside

trees = []
GRID = 55
for e in area_ways.values():
    t = e.get('tags', {})
    if not (t.get('natural') == 'wood' or t.get('landuse') == 'forest'):
        continue
    pts = [prj(p['lat'], p['lon']) for p in e['geometry']]
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    x0, x1 = min(xs), max(xs); y0, y1 = min(ys), max(ys)
    gx = int(x0 // GRID)
    while gx * GRID < x1:
        gy = int(y0 // GRID)
        while gy * GRID < y1:
            # 결정적 지터
            h = (gx * 73856093 ^ gy * 19349663) & 0xffff
            jx = (h % 100) / 100 * GRID * 0.7
            jy = ((h >> 8) % 100) / 100 * GRID * 0.7
            px, py = gx * GRID + jx, gy * GRID + jy
            if 0 < px < VIEW_W and 0 < py < VIEW_H and point_in_poly(px, py, pts):
                trees.append([round(px, 1), round(py, 1), 18 + h % 14])
            gy += 1
        gx += 1
print(f"trees generated: {len(trees)}")

# ── 산책 데모 루트: 보행로 그래프에서 랜드마크 경유 최단경로 ──
import heapq, math as _m

def dist(a, b):
    return _m.hypot(a[0] - b[0], a[1] - b[1])

def nkey(p):
    return (round(p[0] / 6), round(p[1] / 6))  # ≈5m 그리드 스냅으로 교차점 접합

adj, node_pos = {}, {}
for pts in path_pts:
    for a, b in zip(pts, pts[1:]):
        ka, kb = nkey(a), nkey(b)
        node_pos.setdefault(ka, a)
        node_pos.setdefault(kb, b)
        if ka == kb:
            continue
        w = dist(a, b)
        adj.setdefault(ka, {})
        adj.setdefault(kb, {})
        adj[ka][kb] = min(w, adj[ka].get(kb, 1e18))
        adj[kb][ka] = min(w, adj[kb].get(ka, 1e18))

# 갭 브리징: 30유닛(≈25m) 이내 노드끼리 연결 (약간의 페널티) — 끊긴 보행로 접합
_nodes = list(node_pos.items())
_bridged = 0
for i in range(len(_nodes)):
    ki, pi = _nodes[i]
    for j in range(i + 1, len(_nodes)):
        kj, pj = _nodes[j]
        if abs(pi[0] - pj[0]) > 55 or abs(pi[1] - pj[1]) > 55:
            continue
        w = dist(pi, pj)
        if 0 < w <= 55 and kj not in adj.get(ki, {}):
            adj.setdefault(ki, {})[kj] = w * 2.0
            adj.setdefault(kj, {})[ki] = w * 2.0
            _bridged += 1
print(f"gap bridges: {_bridged}")

def nearest_node(p):
    return min(node_pos, key=lambda k: dist(node_pos[k], p))

def dijkstra(src, dst):
    pq = [(0.0, src)]
    prev, seen = {}, {src: 0.0}
    while pq:
        d0, u = heapq.heappop(pq)
        if u == dst:
            break
        if d0 > seen.get(u, 1e18):
            continue
        for v, w in adj.get(u, {}).items():
            nd = d0 + w
            if nd < seen.get(v, 1e18):
                seen[v] = nd
                prev[v] = u
                heapq.heappush(pq, (nd, v))
    if dst not in prev and dst != src:
        return None
    out, cur = [dst], dst
    while cur != src:
        cur = prev[cur]
        out.append(cur)
    return [node_pos[k] for k in reversed(out)]

WAYPOINTS = [  # 정문→(연못 남쪽 우회)→음악분수→꿈마루→숲속의무대→열대동물관→팔각당→(북상)→놀이동산
    (37.54939, 127.07632), (37.54915, 127.07700), (37.54920, 127.07770),
    (37.54952, 127.07821), (37.54923, 127.07936),
    (37.54905, 127.08030), (37.54932, 127.08176), (37.54984, 127.08245),
    (37.55040, 127.08280), (37.55100, 127.08330), (37.55148, 127.08379),
]
route = []
anchors = [nearest_node(prj(la, lo)) for la, lo in WAYPOINTS]
for a, b in zip(anchors, anchors[1:]):
    seg = dijkstra(a, b)
    if seg is None:  # 그래프 단절 시 직선 폴백
        seg = [node_pos[a], node_pos[b]]
        print(f"  경고: 직선 폴백 {a}->{b}")
    route += seg if not route else seg[1:]
route = [[round(x, 1), round(y, 1)] for x, y in route]
total_len = sum(dist(route[i], route[i + 1]) for i in range(len(route) - 1))
print(f"walk route: {len(route)} pts, 길이 {total_len:.0f} 유닛 (~{total_len / (VIEW_W / 1300):.0f} m)")

out = f"""// 자동 생성: tools/gen_mapdata.py (데이터 © OpenStreetMap contributors, ODbL)
const MAP = {{
  VIEW_W: {VIEW_W}, VIEW_H: {VIEW_H},
  LAT_MIN: {LAT_MIN}, LAT_MAX: {LAT_MAX}, LON_MIN: {LON_MIN}, LON_MAX: {LON_MAX},
  boundary: {json.dumps(boundary_d)},
  boundaryPts: {json.dumps(boundary_pts)},
  water: {json.dumps(water)},
  paths: {json.dumps(paths)},
  buildings: {json.dumps(buildings)},
  woods: {json.dumps(woods)},
  lawns: {json.dumps(lawns)},
  zooAreas: {json.dumps(zoo_areas)},
  themepark: {json.dumps(themepark)},
  pitches: {json.dumps(pitches)},
  playgrounds: {json.dumps(playgrounds)},
  parkings: {json.dumps(parkings)},
  roadsMajor: {json.dumps(roads_major)},
  roadsMinor: {json.dumps(roads_minor)},
  trees: {json.dumps(trees)},
  walkRoute: {json.dumps(route)}
}};
"""
with open(OUT, 'w', encoding='utf-8') as f:
    f.write(out)
print(f"OK -> {OUT}")
print(f"water {len(water)}, paths {len(paths)}, buildings {len(buildings)}, boundary pts {len(boundary_pts)}")
print(f"woods {len(woods)}, lawns {len(lawns)}, zoo {len(zoo_areas)}, themepark {len(themepark)}, "
      f"pitches {len(pitches)}, playgrounds {len(playgrounds)}, parkings {len(parkings)}")
print(f"size {os.path.getsize(OUT)/1024:.1f} KB")
