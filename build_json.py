#!/usr/bin/env python3
"""Gera data/fish_prices.json a partir do CSV histórico."""
from __future__ import annotations
import csv
import json
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent
CSV_PATH = ROOT / "data" / "fish_prices.csv"
JSON_PATH = ROOT / "data" / "fish_prices.json"

def main() -> int:
    if not CSV_PATH.exists():
        raise SystemExit(f"CSV não encontrado: {CSV_PATH}")
    with CSV_PATH.open(newline="", encoding="utf-8") as fh:
        records = list(csv.DictReader(fh))
    for record in records:
        raw = record.get("preco_medio_eur", "")
        try:
            record["preco_medio_eur"] = float(raw)
        except (TypeError, ValueError):
            record["preco_medio_eur"] = None
        for field in ("t", "f"):
            try:
                record[field] = int(record[field])
            except (KeyError, TypeError, ValueError):
                pass
    payload = {
        "generated_at": datetime.now(ZoneInfo("Europe/Lisbon")).isoformat(timespec="seconds"),
        "source": "Docapesca",
        "records": records,
    }
    tmp = JSON_PATH.with_suffix(".json.tmp")
    with tmp.open("w", encoding="utf-8") as fh:
        # Remove duplicados causados pela paginação (os dados atualizam a cada 30 min)
        dedup = {}
        for record in records:
            key = (record["data"], record["lota_key"], record["esp"],
                record["t"], record["f"], record["nome"])
            dedup[key] = record          # fica com a última ocorrência
        records = list(dedup.values())
        json.dump(payload, fh, ensure_ascii=False, indent=2)
    tmp.replace(JSON_PATH)
    print(f"JSON atualizado: {JSON_PATH} ({len(records)} registos)")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
