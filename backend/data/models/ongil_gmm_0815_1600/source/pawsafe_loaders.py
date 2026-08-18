"""PawSafe 실데이터 로더 — 실제 파일 스키마에 맞춘 견고한 버전.

노트북 1절이 이 로직을 그대로 사용합니다.
"""
from __future__ import annotations

import math
import zipfile
from pathlib import Path

import geopandas as gpd
import numpy as np
import pandas as pd
from shapely.geometry import box
from shapely.ops import unary_union

ENCODINGS = ("utf-8-sig", "cp949", "euc-kr", "utf-8", "latin-1")


def read_csv_auto(path, **kwargs):
    """인코딩을 자동 판별해 CSV를 읽는다.

    서울시·국토부 데이터는 cp949, 공공데이터포털은 utf-8-sig가 섞여 있다.
    """
    last = None
    for enc in ENCODINGS:
        try:
            return pd.read_csv(path, encoding=enc, low_memory=False, **kwargs)
        except (UnicodeDecodeError, LookupError) as exc:
            last = exc
    raise ValueError(f"인코딩 판별 실패: {path} ({last})")


def pick_column(df, *candidates, contains=None):
    """여러 후보 이름 중 실제 존재하는 컬럼을 찾는다."""
    for c in candidates:
        if c in df.columns:
            return c
    if contains:
        for col in df.columns:
            if any(k in str(col) for k in contains):
                return col
    return None


def drop_header_row(df, numeric_column):
    """2행이 영문 헤더인 서울시 CSV 형식을 정리한다.

    street_trees.csv는 1행이 한글명, 2행이 영문 코드명으로 되어 있다.
    """
    coerced = pd.to_numeric(df[numeric_column], errors="coerce")
    return df[coerced.notna()].copy()


# ══════════════════════════════════════════════════════════════════
# 1. 경계
# ══════════════════════════════════════════════════════════════════
def load_boundary(path, crs):
    g = gpd.read_file(path).to_crs(crs)
    return unary_union(g.geometry)


# ══════════════════════════════════════════════════════════════════
# 2. 보행 네트워크
# ══════════════════════════════════════════════════════════════════
WALKABLE = {"footway", "path", "steps", "pedestrian",
            "living_street", "residential", "service"}


def load_walkways(path, boundary, crs):
    g = gpd.read_file(path).to_crs(crs)
    g = gpd.clip(g, boundary)
    g = g.explode(index_parts=False).reset_index(drop=True)

    col = pick_column(g, "fclass", "highway")
    if col:
        g = g[g[col].isin(WALKABLE)].copy()

    g = g[g.geometry.geom_type == "LineString"]
    g = g[g.geometry.length > 0].reset_index(drop=True)
    g["edge_id"] = [f"E{i:07d}" for i in range(len(g))]
    g["length_m"] = g.geometry.length
    return g[["edge_id", "length_m", "geometry"]]


# ── 송파구 법정동코드 (행정표준코드관리시스템) ────────────────────
BJD_CODES = {
    "1171010100": "잠실동", "1171010200": "신천동", "1171010300": "풍납동",
    "1171010400": "송파동", "1171010500": "석촌동", "1171010600": "삼전동",
    "1171010700": "가락동", "1171010800": "문정동", "1171010900": "장지동",
    "1171011100": "방이동", "1171011200": "오금동", "1171011300": "거여동",
    "1171011400": "마천동",
}

ADDRESS_PATTERN = r"(\S+동)\s+(\d+)(?:-(\d+))?번지"


def load_register(path):
    """건축물대장 표제부를 읽어 (법정동, 번, 지) 기준 높이 테이블을 만든다.

    세움터에서 받은 .xls는 실제로는 HTML 표이므로 read_html로 읽는다.
    지번 코드 컬럼이 없어 '대지위치' 문자열에서 파싱한다.
    한 지번에 여러 동이 있으면 가장 높은 건물을 대표값으로 쓴다.
    """
    path = Path(path)
    if path.suffix.lower() in (".xls", ".xlsx", ".html", ".htm"):
        try:
            df = pd.read_html(path, encoding="utf-8")[0]
        except ValueError:
            df = pd.read_excel(path)
    else:
        df = read_csv_auto(path)

    addr = pick_column(df, "대지위치", contains=["대지위치", "소재지"])
    h_col = pick_column(df, "높이(m)", contains=["높이"])
    f_col = pick_column(df, "지상층수", contains=["지상층수"])
    if not (addr and h_col):
        raise ValueError(f"필요 컬럼 없음: {df.columns.tolist()[:10]}")

    parsed = df[addr].astype(str).str.extract(ADDRESS_PATTERN)
    out = pd.DataFrame({
        "dong": parsed[0],
        "BONU": pd.to_numeric(parsed[1], errors="coerce"),
        "BUNU": pd.to_numeric(parsed[2], errors="coerce").fillna(0),
        "reg_height": pd.to_numeric(df[h_col], errors="coerce"),
        "reg_floors": (pd.to_numeric(df[f_col], errors="coerce")
                       if f_col else np.nan),
    }).dropna(subset=["dong", "BONU"])

    return (out.groupby(["dong", "BONU", "BUNU"], as_index=False)
               .agg(reg_height=("reg_height", "max"),
                    reg_floors=("reg_floors", "max")))


# ══════════════════════════════════════════════════════════════════
# 3. 건물 (zip / gpkg / shp 모두 지원)
# ══════════════════════════════════════════════════════════════════
def _shp_inside_zip(zip_path):
    with zipfile.ZipFile(zip_path) as z:
        for name in z.namelist():
            if name.lower().endswith(".shp"):
                return name
    raise FileNotFoundError(f"{zip_path} 안에 .shp가 없습니다")


def load_buildings(path, boundary, crs, cfg, register_path=None):
    """건물 로드 + 높이 3단계 보완 (실측 → 층수×3m → 기본 9m)."""
    path = Path(path)

    if path.suffix.lower() == ".zip":
        inner = _shp_inside_zip(path)
        # bbox로 부분 로드 — 서울 전체 SHP는 100MB라 전체 로드가 느리다
        bounds = gpd.GeoSeries([boundary], crs=crs).to_crs("EPSG:5179").total_bounds
        g = gpd.read_file(f"zip://{path}!{inner}", bbox=tuple(bounds))
    elif path.suffix.lower() == ".parquet":
        g = gpd.read_parquet(path)
    else:
        g = gpd.read_file(path)

    g = g.to_crs(crs)
    g = gpd.clip(g, boundary)
    g = g[g.geometry.geom_type.isin(["Polygon", "MultiPolygon"])].copy()

    # ① 실측 높이
    height_col = pick_column(g, "height_m", "HEIGHT", "height", contains=["높이"])
    height = pd.to_numeric(g[height_col], errors="coerce") if height_col else pd.Series(np.nan, index=g.index)

    # ② 층수 — 연속수치지형도는 NMLY
    floor_col = pick_column(g, "NMLY", "floors", "GRND_FLR_CNT", contains=["층수"])
    floors = pd.to_numeric(g[floor_col], errors="coerce") if floor_col else pd.Series(np.nan, index=g.index)

    # ③ 건축물대장으로 보완
    if register_path and Path(register_path).exists():
        try:
            reg = load_register(register_path)
            g_key = pd.DataFrame({
                "dong": g["BJCD"].astype(str).map(BJD_CODES),
                "BONU": pd.to_numeric(g["BONU"], errors="coerce"),
                "BUNU": pd.to_numeric(g["BUNU"], errors="coerce"),
            })
            merged = g_key.merge(reg, on=["dong", "BONU", "BUNU"], how="left")

            matched = int((merged["reg_height"] > 0).sum())
            if matched:
                height = height.fillna(pd.Series(merged["reg_height"].values,
                                                 index=g.index))
                floors = floors.fillna(pd.Series(merged["reg_floors"].values,
                                                 index=g.index))
                print(f"     건축물대장 높이 매칭 {matched:,}동 "
                      f"({100*matched/len(g):.1f}%) · "
                      f"평균 {merged.loc[merged.reg_height > 0, 'reg_height'].mean():.1f}m")
            else:
                dong_ok = g_key["dong"].notna().mean()
                print(f"     ⚠ 건축물대장 매칭 0동 "
                      f"(법정동 매핑률 {100*dong_ok:.0f}%)")
                print(f"        다른 자치구 대장일 수 있습니다. 층수 추정으로 진행합니다.")
        except Exception as exc:
            print(f"     ⚠ 건축물대장 보완 실패({type(exc).__name__}: {exc})")

    estimated = floors * cfg["default_floor_height_m"]
    g["height_m"] = (height.where(height > 0, estimated)
                     .fillna(cfg["default_building_height_m"])
                     .clip(2, 300))
    return g[["height_m", "geometry"]].reset_index(drop=True)


# ══════════════════════════════════════════════════════════════════
# 4. 가로수
# ══════════════════════════════════════════════════════════════════
def load_trees(path, boundary, crs, cfg):
    df = read_csv_auto(path)

    lon_col = pick_column(df, "경도", "lon", "X", contains=["경도", "lon"])
    lat_col = pick_column(df, "위도", "lat", "Y", contains=["위도", "lat"])
    if not (lon_col and lat_col):
        raise ValueError(f"위경도 컬럼을 찾을 수 없습니다: {df.columns.tolist()[:12]}")

    df = drop_header_row(df, lon_col)          # 영문 헤더 행 제거
    df[lon_col] = pd.to_numeric(df[lon_col], errors="coerce")
    df[lat_col] = pd.to_numeric(df[lat_col], errors="coerce")
    df = df.dropna(subset=[lon_col, lat_col])
    df = df[df[lon_col].between(124, 132) & df[lat_col].between(33, 39)]

    g = gpd.GeoDataFrame(
        df, geometry=gpd.points_from_xy(df[lon_col], df[lat_col]),
        crs="EPSG:4326").to_crs(crs)
    g = gpd.clip(g, boundary)

    h_col = pick_column(g, "수고", contains=["수고"])
    w_col = pick_column(g, "수관너비", "수관폭", contains=["수관"])

    g["height_m"] = (pd.to_numeric(g[h_col], errors="coerce").clip(1, 40)
                     if h_col else np.nan)
    g["crown_width_m"] = (pd.to_numeric(g[w_col], errors="coerce").clip(0.5, 30)
                          if w_col else np.nan)
    g["height_m"] = g["height_m"].fillna(cfg["default_tree_height_m"])
    g["crown_width_m"] = g["crown_width_m"].fillna(cfg["default_tree_crown_width_m"])

    return g[["height_m", "crown_width_m", "geometry"]].reset_index(drop=True)


# ══════════════════════════════════════════════════════════════════
# 5. 포장재
# ══════════════════════════════════════════════════════════════════
def attach_pavement(edges, pavement_path, code_path, crs, cfg, absorptivity):
    """SWM 포장재를 Edge에 붙인다.

    주의 두 가지
      · 좌표가 100배 스케일로 저장돼 있다
      · 좌표계가 EPSG:5181 (사업 좌표계 5186과 다름)
    """
    edges = edges.copy()

    if not Path(pavement_path).exists():
        print("     ⚠ 포장재 파일 없음 — 전 구간 unknown")
        edges["surface_code"] = "unknown"
        edges["surface_absorptivity"] = absorptivity["unknown"]
        return edges

    pav = read_csv_auto(pavement_path)
    scale = cfg.get("pavement_coordinate_scale", 100.0)

    code_col = pick_column(pav, "SWB_CODE", contains=["SWB"])
    xmin = pick_column(pav, "G2_XMIN", "XMIN")
    ymin = pick_column(pav, "G2_YMIN", "YMIN")
    xmax = pick_column(pav, "G2_XMAX", "XMAX")
    ymax = pick_column(pav, "G2_YMAX", "YMAX")

    for c in [xmin, ymin, xmax, ymax]:
        pav[c] = pd.to_numeric(pav[c], errors="coerce")
    pav = pav.dropna(subset=[xmin, ymin, xmax, ymax])

    geoms = [box(a / scale, b / scale, c / scale, d / scale)
             for a, b, c, d in zip(pav[xmin], pav[ymin], pav[xmax], pav[ymax])]
    pav_gdf = gpd.GeoDataFrame(
        {"surface_code": pav[code_col].astype(str)},
        geometry=geoms, crs="EPSG:5181").to_crs(crs)
    pav_gdf = pav_gdf[pav_gdf.geometry.is_valid & ~pav_gdf.geometry.is_empty]
    pav_gdf = pav_gdf.reset_index(drop=True)

    # ① 교차 — 겹침 길이가 가장 긴 포장 선택
    hit = gpd.sjoin(edges[["edge_id", "geometry"]], pav_gdf,
                    how="inner", predicate="intersects")
    if len(hit):
        hit["overlap_m"] = [
            edges.geometry.iloc[edges.index.get_loc(i)]
                 .intersection(pav_gdf.geometry.iloc[int(j)]).length
            for i, j in zip(hit.index, hit["index_right"])
        ]
        best = (hit.sort_values(["edge_id", "overlap_m"], ascending=[True, False])
                   .drop_duplicates("edge_id")[["edge_id", "surface_code"]])
        edges = edges.merge(best, on="edge_id", how="left")
    else:
        edges["surface_code"] = np.nan

    # ② 최근접 — 남은 Edge
    missing = edges["surface_code"].isna()
    if missing.any():
        centres = pav_gdf.copy()
        centres["geometry"] = centres.geometry.centroid
        near = gpd.sjoin_nearest(
            edges.loc[missing, ["edge_id", "geometry"]], centres,
            max_distance=cfg["pavement_join_max_distance_m"], how="left")
        near = near[["edge_id", "surface_code"]].drop_duplicates("edge_id")
        edges = edges.merge(near, on="edge_id", how="left", suffixes=("", "_near"))
        edges["surface_code"] = edges["surface_code"].fillna(edges["surface_code_near"])
        edges = edges.drop(columns=["surface_code_near"])

    # 결측·무효 코드는 모두 unknown으로 통일한다.
    # SWM 데이터에는 '-', '', 'nan' 같은 placeholder가 섞여 있다.
    invalid = {"-", "", "nan", "None", "NaN", "null"}
    edges["surface_code"] = (edges["surface_code"].astype(str).str.strip()
                             .replace(list(invalid), "unknown")
                             .fillna("unknown"))
    edges.loc[~edges["surface_code"].isin(absorptivity), "surface_code"] = "unknown"
    edges["surface_absorptivity"] = edges["surface_code"].map(absorptivity)
    return edges


# ══════════════════════════════════════════════════════════════════
# 6. 기상 (백업 CSV — 한글 컬럼 자동 매핑)
# ══════════════════════════════════════════════════════════════════
WEATHER_ALIASES = {
    "timestamp":             ["일시", "tm", "timestamp", "관측시각"],
    "air_temperature_c":     ["기온(°C)", "기온(℃)", "기온", "ta", "air_temperature_c"],
    "humidity_pct":          ["습도(%)", "습도", "hm", "humidity_pct"],
    "wind_speed_ms":         ["풍속(m/s)", "풍속", "ws", "wind_speed_ms"],
    "rainfall_mm":           ["강수량(mm)", "강수량", "rn", "rainfall_mm"],
    "solar_radiation_mj_m2": ["일사(MJ/m2)", "일사(MJ/m²)", "일사", "icsr",
                              "solar_radiation_mj_m2"],
    "sunshine_hours":        ["일조(hr)", "일조", "ss", "sunshine_hours"],
}


def normalize_weather(df):
    """어떤 컬럼명으로 오든 표준 이름으로 통일한다."""
    out = pd.DataFrame()
    for standard, aliases in WEATHER_ALIASES.items():
        col = next((a for a in aliases if a in df.columns), None)
        if col is None:
            col = next((c for c in df.columns
                        if any(a in str(c) for a in aliases)), None)
        if col is None:
            out[standard] = np.nan
            continue
        out[standard] = (pd.to_datetime(df[col]) if standard == "timestamp"
                         else pd.to_numeric(df[col], errors="coerce"))

    out["rainfall_mm"] = out["rainfall_mm"].fillna(0.0).clip(lower=0)
    for c in ["air_temperature_c", "humidity_pct", "wind_speed_ms"]:
        out[c] = out[c].interpolate().ffill().bfill()
    out["solar_radiation_mj_m2"] = out["solar_radiation_mj_m2"].fillna(0).clip(lower=0)
    return out.sort_values("timestamp").reset_index(drop=True)
