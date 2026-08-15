from __future__ import annotations

import argparse
import json
import time
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

from src.pawsafe.live_update import update_once


def seconds_until_next_hour(minute: int = 45) -> float:
    now = datetime.now(ZoneInfo("Asia/Seoul"))
    target = now.replace(minute=minute, second=0, microsecond=0)
    if target <= now:
        target += timedelta(hours=1)
    return (target - now).total_seconds()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="기상청 JSON을 CSV로 누적하고 최신 Edge Heat Cost를 갱신합니다."
    )
    parser.add_argument(
        "--api-url",
        default="http://127.0.0.1:8000/v1/weather/current",
    )
    parser.add_argument(
        "--asos-api-url",
        default="http://127.0.0.1:8000/v1/weather/asos/reference",
    )
    parser.add_argument("--watch", action="store_true")
    parser.add_argument("--interval-seconds", type=int)
    args = parser.parse_args()
    root = Path(__file__).resolve().parent

    while True:
        try:
            report = update_once(root, args.api_url, args.asos_api_url)
            print(json.dumps(report, ensure_ascii=False, indent=2))
        except Exception as exc:
            if not args.watch:
                raise
            print(f"실시간 Heat Cost 갱신 실패: {type(exc).__name__}: {exc}")

        if not args.watch:
            break
        delay = (
            max(60, args.interval_seconds)
            if args.interval_seconds is not None
            else seconds_until_next_hour(45)
        )
        time.sleep(delay)


if __name__ == "__main__":
    main()
