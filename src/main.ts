import "./style.css";
import {
  Map,
  ScaleControl,
  NavigationControl,
  AttributionControl,
  type StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { GeoJsonLayer } from "@deck.gl/layers";
import type { FeatureCollection, Geometry, Position } from "geojson";

// 万博会場（夢洲）の中心座標
const EXPO_CENTER: [number, number] = [135.383125, 34.648131];

// GeoJSON 全頂点のZ最小値を求める
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const findMinZ = (fc: FeatureCollection): number => {
  let minZ = Infinity;
  const check = (c: any): void => {
    if (typeof c[0] === "number") {
      if (c.length >= 3) minZ = Math.min(minZ, c[2]);
      return;
    }
    c.forEach(check);
  };
  fc.features.forEach((f) => {
    if (f.geometry) check((f.geometry as any).coordinates);
  });
  return minZ === Infinity ? 0 : minZ;
};

// 夢洲の地盤標高（海抜約3m）
const GROUND_ELEVATION = 3.0;

// 全頂点のZ値からオフセットを差し引く
const shiftZ = (fc: FeatureCollection, offset: number): FeatureCollection => {
  const adjustZ = (pos: Position): Position =>
    pos.length >= 3 ? [pos[0], pos[1], pos[2] - offset] : pos;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adjustCoords = (coords: any): any => {
    if (typeof coords[0] === "number") return adjustZ(coords as Position);
    return coords.map(adjustCoords);
  };
  return {
    ...fc,
    features: fc.features.map((f) => {
      if (!f.geometry) return f;
      const geom = f.geometry as Geometry & { coordinates: unknown };
      return {
        ...f,
        geometry: {
          ...geom,
          coordinates: adjustCoords(geom.coordinates),
        } as Geometry,
      };
    }),
  };
};

// ベースマップスタイル（ローカル航空写真タイル）
const style: StyleSpecification = {
  version: 8,
  name: "plateau-demo",
  glyphs:
    "https://gsi-cyberjapan.github.io/optimal_bvmap/glyphs/{fontstack}/{range}.pbf",
  sources: {
    aerial: {
      type: "raster",
      tiles: [
        "https://xs489works.xsrv.jp/pmtiles-data/plateau-osaka-expo-2025-3d/tiles/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      minzoom: 9,
      maxzoom: 18,
    },
  },
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": "#1a1a2e" },
    },
    {
      id: "aerial-tiles",
      type: "raster",
      source: "aerial",
      paint: { "raster-opacity": 0.5 },
    },
  ],
};

// ローディング表示
const loadingEl = document.getElementById("loading")!;
const loadingText = document.getElementById("loading-text")!;
const setLoadingText = (text: string) => {
  loadingText.textContent = text;
};
const hideLoading = () => {
  loadingEl.style.display = "none";
};

// GeoJSON フェッチ
setLoadingText("Building.geojson を読み込み中...");
const buildingRaw = (await fetch(
  "https://xs489works.xsrv.jp/pmtiles-data/plateau-osaka-expo-2025-3d/geojson/Building.geojson",
).then((r) => r.json())) as FeatureCollection;

// ジオイド高（最小Z）＋標高（夢洲約3m）を合わせて差し引く
const zOffset = findMinZ(buildingRaw) + GROUND_ELEVATION;
console.log(`Z offset (geoid + elevation): ${zOffset.toFixed(3)} m`);

const buildingData = shiftZ(buildingRaw, zOffset);

setLoadingText("BuildingInstallation.geojson を読み込み中... (大容量)");
const installationData = shiftZ(
  (await fetch(
    "https://xs489works.xsrv.jp/pmtiles-data/plateau-osaka-expo-2025-3d/geojson/BuildingInstallation.geojson",
  ).then((r) => r.json())) as FeatureCollection,
  zOffset,
);

setLoadingText("CityFurniture.geojson を読み込み中... (大容量)");
const cityFurnitureData = shiftZ(
  (await fetch(
    "https://xs489works.xsrv.jp/pmtiles-data/plateau-osaka-expo-2025-3d/geojson/CityFurniture.geojson",
  ).then((r) => r.json())) as FeatureCollection,
  zOffset,
);

setLoadingText("地図を初期化中...");

// マップ初期化
const map = new Map({
  container: "map",
  style,
  center: EXPO_CENTER,
  zoom: 16.5,
  pitch: 60,
  bearing: -20,
  hash: true,
  maxPitch: 85,
  attributionControl: false,
});

map.addControl(new ScaleControl());
map.addControl(new NavigationControl());
map.addControl(
  new AttributionControl({
    customAttribution:
      '<a href="https://www.geospatial.jp/ckan/dataset/plateau-27999-osaka-shi-2025" target="_blank">© 2025年大阪・関西万博会場　3D都市モデル（Project PLATEAU）</a>',
    compact: false,
  }),
);

await map.once("load");

// Skyレイヤ
map.setSky({
  "sky-color": "#199EF3",
  "sky-horizon-blend": 0.7,
  "horizon-color": "#f0f8ff",
  "horizon-fog-blend": 0.8,
  "fog-color": "#2c7fb8",
  "fog-ground-blend": 0.9,
  "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 12, 0],
});

// レイヤ表示状態
let showBuilding = true;
let showInstallation = true;
let showCityFurniture = true;

// ポップアップ
const popupEl = document.getElementById("popup")!;
const popupBody = document.getElementById("popup-body")!;
const popupTitle = document.getElementById("popup-title")!;

document.getElementById("popup-close")!.addEventListener("click", () => {
  popupEl.style.display = "none";
});

const LAYER_LABELS: Record<string, string> = {
  building: "建築物 (Building)",
  installation: "建築物付属物 (BuildingInstallation)",
  furniture: "都市設備 (CityFurniture)",
};

const showPopup = (layerType: string, props: Record<string, unknown>) => {
  popupTitle.textContent = LAYER_LABELS[layerType] ?? layerType;
  const rows = Object.entries(props)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(
      ([k, v]) =>
        `<tr><td class="key">${k}</td><td class="val">${String(v)}</td></tr>`,
    )
    .join("");
  popupBody.innerHTML = `<table>${rows}</table>`;
  popupEl.style.display = "block";
};

const empty = (): FeatureCollection => ({
  type: "FeatureCollection",
  features: [],
});

// deck.gl レイヤ生成
const buildLayers = () => [
  new GeoJsonLayer({
    id: "plateau-building-installation",
    data: showInstallation ? installationData : empty(),
    _full3d: true,
    material: false,
    filled: true,
    stroked: false,
    getFillColor: [255, 0, 128, 150],
    pickable: true,
    onClick: (info) => {
      if (info.object?.properties)
        showPopup(
          "installation",
          info.object.properties as Record<string, unknown>,
        );
    },
    onHover: (info) => {
      map.getCanvas().style.cursor = info.object ? "pointer" : "";
    },
  }),
  new GeoJsonLayer({
    id: "plateau-building",
    data: showBuilding ? buildingData : empty(),
    _full3d: true,
    material: false,
    filled: true,
    stroked: true,
    getFillColor: [160, 0, 255, 150],
    getLineColor: [200, 100, 255, 255],
    lineWidthMinPixels: 0.2,
    pickable: true,
    onClick: (info) => {
      if (info.object?.properties)
        showPopup(
          "building",
          info.object.properties as Record<string, unknown>,
        );
    },
    onHover: (info) => {
      map.getCanvas().style.cursor = info.object ? "pointer" : "";
    },
  }),
  new GeoJsonLayer({
    id: "plateau-city-furniture",
    data: showCityFurniture ? cityFurnitureData : empty(),
    _full3d: true,
    material: false,
    filled: true,
    stroked: false,
    getFillColor: [0, 255, 0, 150],
    pickable: true,
    onClick: (info) => {
      if (info.object?.properties)
        showPopup(
          "furniture",
          info.object.properties as Record<string, unknown>,
        );
    },
    onHover: (info) => {
      map.getCanvas().style.cursor = info.object ? "pointer" : "";
    },
  }),
];

const deckOverlay = new MapboxOverlay({
  interleaved: true,
  layers: buildLayers(),
});

map.addControl(deckOverlay);

hideLoading();

// レイヤトグル
document.getElementById("toggle-building")!.addEventListener("change", (e) => {
  showBuilding = (e.target as HTMLInputElement).checked;
  deckOverlay.setProps({ layers: buildLayers() });
});
document
  .getElementById("toggle-installation")!
  .addEventListener("change", (e) => {
    showInstallation = (e.target as HTMLInputElement).checked;
    deckOverlay.setProps({ layers: buildLayers() });
  });
document
  .getElementById("toggle-city-furniture")!
  .addEventListener("change", (e) => {
    showCityFurniture = (e.target as HTMLInputElement).checked;
    deckOverlay.setProps({ layers: buildLayers() });
  });
