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

d = json.load(open(SRC, encoding='utf-8'))
ways = {e['id']: e for e in d['elements'] if e['type'] == 'way' and 'geometry' in e}
d2 = json.load(open(SRC_AREAS, encoding='utf-8'))
area_ways = {e['id']: e for e in d2['elements'] if e['type'] == 'way' and 'geometry' in e}

boundary = ways[202365904]
boundary_d = path_d(boundary['geometry'], close=True)
boundary_pts = [prj(p['lat'], p['lon']) for p in boundary['geometry']]

water, paths, buildings = [], [], []
seen = set()
for e in ways.values():
    if e['id'] in seen or e['id'] == 202365904:
        continue
    seen.add(e['id'])
    t = e.get('tags', {})
    if t.get('natural') == 'water' or t.get('leisure') == 'swimming_pool':
        water.append(path_d(e['geometry'], close=True))
    elif t.get('highway') in ('footway', 'path', 'pedestrian', 'cycleway'):
        paths.append(path_d(e['geometry']))
    elif t.get('highway') == 'service':
        paths.append(path_d(e['geometry']))
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
  parkings: {json.dumps(parkings)}
}};
"""
with open(OUT, 'w', encoding='utf-8') as f:
    f.write(out)
print(f"OK -> {OUT}")
print(f"water {len(water)}, paths {len(paths)}, buildings {len(buildings)}, boundary pts {len(boundary_pts)}")
print(f"woods {len(woods)}, lawns {len(lawns)}, zoo {len(zoo_areas)}, themepark {len(themepark)}, "
      f"pitches {len(pitches)}, playgrounds {len(playgrounds)}, parkings {len(parkings)}")
print(f"size {os.path.getsize(OUT)/1024:.1f} KB")
