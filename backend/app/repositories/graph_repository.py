from __future__ import annotations

import json
from dataclasses import dataclass
from itertools import pairwise
from pathlib import Path
from typing import Any

import networkx as nx
from pydantic import BaseModel, ConfigDict, Field
from shapely import Point
from shapely.strtree import STRtree

from app.core.errors import InvalidDataFileError
from app.schemas.geojson import LineStringGeometry


class NodeRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    node_id: str
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)


class EdgeRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    edge_id: str
    heat_edge_id: str
    from_node: str
    to_node: str
    distance_m: float = Field(gt=0)
    geometry: LineStringGeometry
    display_name: str = "이름 없는 보행 구간"
    walkable: bool = True
    is_reverse: bool = False


@dataclass(frozen=True)
class GraphData:
    version: str
    graph: nx.MultiDiGraph
    nodes: dict[str, NodeRecord]
    edges: dict[str, EdgeRecord]
    indexed_nodes: tuple[NodeRecord, ...]
    node_index: STRtree
    is_demo: bool


class GraphRepository:
    def load(self, path: Path) -> GraphData:
        if not path.is_file():
            raise InvalidDataFileError("graph")
        try:
            suffix = path.suffix.lower()
            if suffix in {".json", ".geojson"}:
                return self._load_geojson(path)
            if suffix == ".graphml":
                return self._load_graphml(path)
            if suffix == ".gpkg":
                return self._load_geopackage(path)
            if suffix == ".parquet":
                return self._load_parquet(path)
        except InvalidDataFileError:
            raise
        except Exception as exc:
            raise InvalidDataFileError("graph") from exc
        raise InvalidDataFileError("graph")

    def _load_geojson(self, path: Path) -> GraphData:
        payload = json.loads(path.read_text(encoding="utf-8"))
        if payload.get("type") != "FeatureCollection":
            raise InvalidDataFileError("graph")

        nodes: dict[str, NodeRecord] = {}
        edge_payloads: list[tuple[dict[str, Any], dict[str, Any] | None]] = []
        for feature in payload.get("features", []):
            properties = feature.get("properties", {})
            geometry = feature.get("geometry", {})
            if properties.get("feature_type") == "node" and geometry.get("type") == "Point":
                lng, lat = geometry["coordinates"]
                node = NodeRecord(node_id=str(properties["node_id"]), lat=lat, lng=lng)
                if node.node_id in nodes:
                    raise InvalidDataFileError("graph")
                nodes[node.node_id] = node
            elif properties.get("feature_type") == "edge":
                edge_payloads.append(
                    (properties, geometry if geometry.get("type") == "LineString" else None)
                )

        return self._build_graph(
            version=str(payload.get("graph_version", "unknown")),
            is_demo=bool(payload.get("is_demo", False)),
            nodes=nodes,
            edge_payloads=edge_payloads,
        )

    def _load_graphml(self, path: Path) -> GraphData:
        source = nx.read_graphml(path)
        nodes: dict[str, NodeRecord] = {}
        for node_id, attributes in source.nodes(data=True):
            nodes[str(node_id)] = NodeRecord(
                node_id=str(node_id),
                lat=float(attributes["lat"]),
                lng=float(attributes["lng"]),
            )
        edge_payloads: list[tuple[dict[str, Any], dict[str, Any] | None]] = []
        for index, (from_node, to_node, attributes) in enumerate(source.edges(data=True)):
            geometry_value = attributes.get("geometry")
            if isinstance(geometry_value, str):
                geometry = json.loads(geometry_value)
            else:
                geometry = {
                    "type": "LineString",
                    "coordinates": [
                        [nodes[str(from_node)].lng, nodes[str(from_node)].lat],
                        [nodes[str(to_node)].lng, nodes[str(to_node)].lat],
                    ],
                }
            properties = {
                **attributes,
                "edge_id": attributes.get("edge_id", f"edge_{index}"),
                "from_node": str(from_node),
                "to_node": str(to_node),
            }
            edge_payloads.append((properties, geometry))
        return self._build_graph(
            version=str(source.graph.get("graph_version", "unknown")),
            is_demo=bool(source.graph.get("is_demo", False)),
            nodes=nodes,
            edge_payloads=edge_payloads,
        )

    def _load_geopackage(self, path: Path) -> GraphData:
        import geopandas as gpd

        layers = set(gpd.list_layers(path)["name"].tolist())
        if "nodes" not in layers and "edges" in layers:
            return self._load_edge_only_geopackage(path, gpd.read_file(path, layer="edges"))
        nodes_frame = gpd.read_file(path, layer="nodes").to_crs(epsg=4326)
        edges_frame = gpd.read_file(path, layer="edges").to_crs(epsg=4326)
        nodes = {
            str(row.node_id): NodeRecord(
                node_id=str(row.node_id),
                lat=float(row.geometry.y),
                lng=float(row.geometry.x),
            )
            for row in nodes_frame.itertuples()
        }
        edge_payloads: list[tuple[dict[str, Any], dict[str, Any] | None]] = [
            (
                row._asdict(),
                {"type": "LineString", "coordinates": list(row.geometry.coords)},
            )
            for row in edges_frame.itertuples()
        ]
        return self._build_graph(
            version=str(edges_frame.attrs.get("graph_version", path.stem)),
            is_demo=False,
            nodes=nodes,
            edge_payloads=edge_payloads,
        )

    def _load_edge_only_geopackage(self, path: Path, edges_frame: Any) -> GraphData:
        """Load the data-team pipeline's edge-only GPKG.

        The pipeline deliberately stores every walkway as a geometry with all of
        its vertices and does not write a separate node layer. We split each
        vertex pair into a graph edge here, preserving the pipeline ``edge_id``
        as ``heat_edge_id`` so one Edge x Time heat record can be shared by all
        split segments. The supplied file remains outside the repository.
        """
        import geopandas as gpd
        from shapely.geometry import LineString, MultiLineString

        if edges_frame.crs is None:
            raise InvalidDataFileError("graph")
        nodes: dict[str, NodeRecord] = {}
        edge_payloads: list[tuple[dict[str, Any], dict[str, Any] | None]] = []

        def to_wgs84(value: Any) -> Any:
            return gpd.GeoSeries([value], crs=edges_frame.crs).to_crs(epsg=4326).iloc[0]

        for row_index, row in enumerate(edges_frame.itertuples()):
            properties = dict(row._asdict())
            source_edge_id = str(properties.get("edge_id") or properties.get("fid") or row_index)
            geometry = properties.pop("geometry", None)
            if geometry is None or geometry.is_empty:
                continue
            if isinstance(geometry, LineString):
                parts = [geometry]
            elif isinstance(geometry, MultiLineString):
                parts = list(geometry.geoms)
            else:
                continue
            try:
                raw_length = properties.get("length_m")
                original_length = float(raw_length) if raw_length is not None else 0.0
            except (TypeError, ValueError):
                original_length = 0.0
            oneway = str(properties.get("oneway") or "").strip().upper()
            bidirectional = oneway not in {"F", "T", "1", "YES", "Y", "TRUE"}
            display_name = str(
                properties.get("name") or properties.get("fclass") or "이름 없는 보행 구간"
            )

            for part_index, part in enumerate(parts):
                coordinates = list(part.coords)
                if len(coordinates) < 2:
                    continue
                part_length = float(part.length)
                if part_length <= 0:
                    continue
                for segment_index, (start, end) in enumerate(pairwise(coordinates)):
                    segment = LineString([start, end])
                    segment_length = float(segment.length)
                    if segment_length <= 0:
                        continue
                    if oneway == "T":
                        start, end = end, start
                        segment = LineString([start, end])
                    from_node_id = self._pipeline_node_id(start[0], start[1])
                    to_node_id = self._pipeline_node_id(end[0], end[1])
                    from_point = to_wgs84(Point(start))
                    to_point = to_wgs84(Point(end))
                    segment_geometry = to_wgs84(segment)
                    nodes.setdefault(
                        from_node_id,
                        NodeRecord(
                            node_id=from_node_id,
                            lat=float(from_point.y),
                            lng=float(from_point.x),
                        ),
                    )
                    nodes.setdefault(
                        to_node_id,
                        NodeRecord(
                            node_id=to_node_id,
                            lat=float(to_point.y),
                            lng=float(to_point.x),
                        ),
                    )
                    distance_m = (
                        original_length * segment_length / part_length
                        if original_length > 0
                        else segment_length
                    )
                    edge_payloads.append(
                        (
                            {
                                "edge_id": f"{source_edge_id}:{part_index}:{segment_index}",
                                "heat_edge_id": source_edge_id,
                                "from_node": from_node_id,
                                "to_node": to_node_id,
                                "distance_m": distance_m,
                                "display_name": display_name,
                                "bidirectional": bidirectional,
                            },
                            {
                                "type": "LineString",
                                "coordinates": [
                                    (
                                        float(segment_geometry.coords[0][0]),
                                        float(segment_geometry.coords[0][1]),
                                    ),
                                    (
                                        float(segment_geometry.coords[-1][0]),
                                        float(segment_geometry.coords[-1][1]),
                                    ),
                                ],
                            },
                        )
                    )
        return self._build_graph(
            version=f"pipeline:{path.stem}",
            is_demo=False,
            nodes=nodes,
            edge_payloads=edge_payloads,
        )

    @staticmethod
    def _pipeline_node_id(x: float, y: float) -> str:
        # The source graph is snapped to 0.5 m. Keep the same deterministic
        # identity without exposing coordinates in any API response.
        snapped_x = round(x * 2) / 2
        snapped_y = round(y * 2) / 2
        return f"pipeline:{snapped_x:.1f}:{snapped_y:.1f}"

    def _load_parquet(self, path: Path) -> GraphData:
        import pandas as pd

        frame = pd.read_parquet(path)
        required = {
            "edge_id",
            "from_node",
            "to_node",
            "from_lat",
            "from_lng",
            "to_lat",
            "to_lng",
            "distance_m",
        }
        if not required.issubset(frame.columns):
            raise InvalidDataFileError("graph")
        nodes: dict[str, NodeRecord] = {}
        edge_payloads: list[tuple[dict[str, Any], dict[str, Any] | None]] = []
        for row in frame.to_dict(orient="records"):
            from_node = str(row["from_node"])
            to_node = str(row["to_node"])
            nodes.setdefault(
                from_node,
                NodeRecord(node_id=from_node, lat=row["from_lat"], lng=row["from_lng"]),
            )
            nodes.setdefault(
                to_node,
                NodeRecord(node_id=to_node, lat=row["to_lat"], lng=row["to_lng"]),
            )
            geometry_value = row.get("geometry")
            geometry = (
                json.loads(geometry_value)
                if isinstance(geometry_value, str)
                else {
                    "type": "LineString",
                    "coordinates": [
                        [row["from_lng"], row["from_lat"]],
                        [row["to_lng"], row["to_lat"]],
                    ],
                }
            )
            edge_payloads.append((row, geometry))
        return self._build_graph(
            version=str(frame.attrs.get("graph_version", path.stem)),
            is_demo=False,
            nodes=nodes,
            edge_payloads=edge_payloads,
        )

    def _build_graph(
        self,
        *,
        version: str,
        is_demo: bool,
        nodes: dict[str, NodeRecord],
        edge_payloads: list[tuple[dict[str, Any], dict[str, Any] | None]],
    ) -> GraphData:
        if not nodes or not edge_payloads:
            raise InvalidDataFileError("graph")
        graph = nx.MultiDiGraph(graph_version=version)
        for node in nodes.values():
            graph.add_node(node.node_id, lat=node.lat, lng=node.lng)

        edges: dict[str, EdgeRecord] = {}
        for properties, raw_geometry in edge_payloads:
            if not bool(properties.get("walkable", True)):
                continue
            edge_id = str(properties["edge_id"])
            from_node = str(properties["from_node"])
            to_node = str(properties["to_node"])
            if edge_id in edges or from_node not in nodes or to_node not in nodes:
                raise InvalidDataFileError("graph")
            geometry = (
                LineStringGeometry.model_validate(raw_geometry)
                if raw_geometry is not None
                else None
            )
            if geometry is None or len(geometry.coordinates) < 2:
                geometry = LineStringGeometry(
                    coordinates=[
                        (nodes[from_node].lng, nodes[from_node].lat),
                        (nodes[to_node].lng, nodes[to_node].lat),
                    ]
                )
            edge = EdgeRecord(
                edge_id=edge_id,
                heat_edge_id=str(properties.get("heat_edge_id", edge_id)),
                from_node=from_node,
                to_node=to_node,
                distance_m=float(properties["distance_m"]),
                geometry=geometry,
                display_name=str(properties.get("display_name", "이름 없는 보행 구간")),
            )
            self._add_edge(graph, edges, edge)
            if bool(properties.get("bidirectional", True)):
                reverse_id = f"{edge_id}:reverse"
                reverse = edge.model_copy(
                    update={
                        "edge_id": reverse_id,
                        "from_node": to_node,
                        "to_node": from_node,
                        "is_reverse": True,
                        "geometry": LineStringGeometry(
                            coordinates=list(reversed(geometry.coordinates))
                        ),
                    }
                )
                self._add_edge(graph, edges, reverse)
        if not edges:
            raise InvalidDataFileError("graph")
        indexed_nodes = tuple(nodes.values())
        return GraphData(
            version=version,
            graph=graph,
            nodes=nodes,
            edges=edges,
            indexed_nodes=indexed_nodes,
            node_index=STRtree([Point(node.lng, node.lat) for node in indexed_nodes]),
            is_demo=is_demo,
        )

    @staticmethod
    def _add_edge(
        graph: nx.MultiDiGraph,
        edges: dict[str, EdgeRecord],
        edge: EdgeRecord,
    ) -> None:
        edges[edge.edge_id] = edge
        graph.add_edge(
            edge.from_node,
            edge.to_node,
            key=edge.edge_id,
            edge_id=edge.edge_id,
            distance_m=edge.distance_m,
        )
