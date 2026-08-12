from __future__ import annotations

from statistics import median

from app.providers.heat_cost.base import EdgeHeatRecord, HeatCostSnapshot, MissingHeatPolicy
from app.repositories.graph_repository import EdgeRecord, GraphData
from app.schemas.common import WarningMessage


class HeatCostRepository:
    def __init__(
        self,
        *,
        missing_policy: MissingHeatPolicy,
        conservative_heat_cost: float,
    ) -> None:
        self.missing_policy = missing_policy
        self.conservative_heat_cost = conservative_heat_cost

    def validate_graph_edges(
        self,
        graph_data: GraphData,
        snapshot: HeatCostSnapshot,
    ) -> list[WarningMessage]:
        graph_ids = {edge.heat_edge_id for edge in graph_data.edges.values()}
        unknown = sorted(set(snapshot.records) - graph_ids)
        missing = sorted(graph_ids - set(snapshot.records))
        warnings: list[WarningMessage] = []
        if unknown:
            warnings.append(
                WarningMessage(
                    code="UNKNOWN_HEAT_EDGES_IGNORED",
                    message=f"그래프에 없는 Heat Cost Edge {len(unknown)}개를 제외했습니다.",
                )
            )
        if missing:
            warnings.append(
                WarningMessage(
                    code="MISSING_HEAT_POLICY",
                    message=(
                        f"Heat Cost가 없는 Edge {len(missing)}개에 "
                        f"'{self.missing_policy}' 정책을 적용했습니다."
                    ),
                )
            )
        return warnings

    def resolve(
        self,
        edge: EdgeRecord,
        snapshot: HeatCostSnapshot,
    ) -> EdgeHeatRecord | None:
        record = snapshot.records.get(edge.heat_edge_id)
        if record is not None:
            return record
        if self.missing_policy == "exclude":
            return None
        if self.missing_policy == "conservative":
            value = self.conservative_heat_cost
        else:
            if not snapshot.records:
                return None
            value = float(median(item.heat_cost for item in snapshot.records.values()))
        return EdgeHeatRecord(
            edge_id=edge.heat_edge_id,
            from_node=edge.from_node,
            to_node=edge.to_node,
            valid_at=snapshot.valid_at,
            heat_cost=value,
            shade_ratio=None,
            direct_sun_minutes=None,
            surface_type="unknown",
            confidence=None,
            validation_status="unknown",
            data_version=snapshot.data_version,
        )
