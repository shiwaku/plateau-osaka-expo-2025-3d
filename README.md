# PLATEAU 大阪・関西万博会場 3Dビューア

**2025年大阪・関西万博会場（夢洲）の PLATEAU 3D都市モデルを MapLibre GL JS + deck.gl で3D表示するデモサイトです。**

## デモ

https://xs489works.xsrv.jp/pmtiles-data/plateau-osaka-expo-2025-3d/

## 表示データ

国土交通省 Project PLATEAU「[大阪市（2025年）3D都市モデル](https://www.geospatial.jp/ckan/dataset/plateau-27999-osaka-shi-2025)」から以下のフィーチャを使用しています。

| レイヤ | フィーチャタイプ | 色 | 説明 |
|---|---|---|---|
| 建築物 | `bldg:Building` | 紫 | 万博会場内の建築物 |
| 建築物付属物 | `bldg:BuildingInstallation` | ピンク | 建築物の付属設備・構造物 |
| 都市設備・大屋根リング | `frn:CityFurniture` | 緑 | 大屋根リングを含む都市設備 |

### データ変換手順

1. CityGML（`.gml`）→ GeoJSON：[PLATEAU-GIS-Converter](https://github.com/Project-PLATEAU/PLATEAU-GIS-Converter)（nusamai v0.1.14）で変換
2. GeoJSON → GeoParquet：GDAL/ogr2ogr（`libgdal-arrow-parquet`）で変換

### 座標系・高さの補正

- CityGML の Z値は **WGS84楕円体高**（EPSG:4979）
- 表示時に Building.geojson の最小Z値をオフセットとして全フィーチャから差し引き、地面レベルを Z=0 に補正

## 技術スタック

| ライブラリ | バージョン | 用途 |
|---|---|---|
| [MapLibre GL JS](https://maplibre.org/) | ^5.16.0 | ベースマップ・カメラ制御 |
| [deck.gl](https://deck.gl/) | ^9.2.5 | 3D GeoJsonLayer（`_full3d: true`）|
| [Vite](https://vitejs.dev/) | ^7.3.1 | ビルドツール |
| TypeScript | ~5.9.3 | 型チェック |

## 機能

- **3D建物表示**：`GeoJsonLayer`（`_full3d: true`）で頂点Z値をそのまま3Dサーフェスとして描画
- **レイヤ切り替え**：各フィーチャタイプの表示/非表示
- **クリック情報表示**：建物属性のポップアップ
- **背景地図**：航空写真ラスタータイル

## セットアップ

```bash
npm install
npm run dev
```

ブラウザで http://localhost:5173/ を開く。

## ビルド

```bash
npm run build
```

## データ出典

© 国土交通省 Project PLATEAU（大阪市 2025年）
https://www.geospatial.jp/ckan/dataset/plateau-27999-osaka-shi-2025
