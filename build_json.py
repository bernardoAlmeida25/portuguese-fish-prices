#!/usr/bin/env python3
"""Gera os ficheiros de dados do site (site/data/) a partir de data/fish_prices*.csv.

Uso (na raiz do repo):
    python build_json.py

Só usa a biblioteca padrão. Escreve:
    site/data/manifest.json        catálogo (lotas, espécies, produtos) e lista de dias
    site/data/months/AAAA-MM.json  preços do mês em formato compacto [dia, lota, produto, preço]

O que corrige face à versão anterior:
  * remove linhas repetidas ANTES de escrever (antes o payload apontava para a lista
    original e os duplicados ficavam no JSON);
  * identifica a espécie pelo código `esp` (as lotas abreviam o mesmo nome de formas
    diferentes: 'Pescada-br', 'PESC BRANC', ...) e o produto por (esp, calibre, frescura);
  * o ficheiro cresce por mês em vez de repetir o histórico todo num só JSON.
"""
from __future__ import annotations

import csv
import json
import re
import sys
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent
CSV_DIR = ROOT / "data"
CSV_GLOB = "fish_prices*.csv"
OUT = ROOT / "site" / "data"

# Sufixo de calibre/frescura no fim do nome: ' T3', ' T3/E', 'T1A', '.T2E', ' t3' ...
_SUFFIX = re.compile(r"[\s.\-/]*[Tt]\s*\d+\s*/?\s*[EAB]?\s*$")


def clean_name(nome: str) -> str:
    base = _SUFFIX.sub("", nome).strip(" .-/")
    return base or nome.strip()


def shouting(s: str) -> bool:
    letters = [c for c in s if c.isalpha()]
    return bool(letters) and all(c.isupper() for c in letters)


def pretty(s: str) -> str:
    return re.sub(r"[A-Za-zÀ-ÿ]+", lambda m: m.group(0).capitalize(), s)


def read_rows() -> tuple[list[dict], int, list[Path]]:
    files = sorted(CSV_DIR.glob(CSV_GLOB))
    if not files:
        raise SystemExit(f"Nenhum {CSV_GLOB} em {CSV_DIR}")
    unique: dict[tuple, dict] = {}
    total = 0
    for path in files:
        with path.open(newline="", encoding="utf-8") as fh:
            for r in csv.DictReader(fh):
                total += 1
                try:
                    price = float(r["preco_medio_eur"])
                    t = int(r["t"])
                    f = int(r["f"])
                except (KeyError, TypeError, ValueError):
                    continue
                if not (price >= 0):  # descarta NaN e negativos
                    continue
                key = (r["data"], r["lota_key"], r["esp"], t, f, r["nome"])
                prev = unique.get(key)
                if prev is None or r.get("recolhido_em", "") >= prev["recolhido_em"]:
                    unique[key] = {
                        "data": r["data"], "recolhido_em": r.get("recolhido_em", ""),
                        "lota_key": r["lota_key"], "lota": r["lota"],
                        "esp": r["esp"], "t": t, "f": f, "nome": r["nome"], "preco": price,
                    }
    return list(unique.values()), total, files


def main() -> int:
    rows, total_lines, files = read_rows()
    print(f"{total_lines} linhas lidas de {len(files)} ficheiro(s); "
          f"{total_lines - len(rows)} duplicadas removidas -> {len(rows)} registos únicos")

    # --- catálogos -----------------------------------------------------------
    lotas = sorted({(r["lota_key"], r["lota"]) for r in rows}, key=lambda x: x[1])
    lota_idx = {k: i for i, (k, _) in enumerate(lotas)}

    variants: dict[str, Counter] = defaultdict(Counter)
    for r in rows:
        variants[r["esp"]][clean_name(r["nome"])] += 1
    species: dict[str, str] = {}
    for esp, counter in variants.items():
        best = max(counter, key=lambda v: (not shouting(v), counter[v], len(v)))
        species[esp] = pretty(best) if shouting(best) else best

    items = sorted({(r["esp"], r["t"], r["f"]) for r in rows})
    item_idx = {it: i for i, it in enumerate(items)}

    # --- preço por (dia, lota, produto): média se a lota tiver 2 nomes para o mesmo produto
    acc: dict[tuple, list[float]] = defaultdict(list)
    for r in rows:
        acc[(r["data"], lota_idx[r["lota_key"]], item_idx[(r["esp"], r["t"], r["f"])])].append(r["preco"])
    cells = sorted((d, l, i, round(sum(v) / len(v), 2)) for (d, l, i), v in acc.items())

    # --- partição por mês ------------------------------------------------------
    by_month: dict[str, list[tuple]] = defaultdict(list)
    for cell in cells:
        by_month[cell[0][:7]].append(cell)

    (OUT / "months").mkdir(parents=True, exist_ok=True)
    for old in (OUT / "months").glob("*.json"):
        old.unlink()
    for ym, month_cells in by_month.items():
        days = sorted({c[0] for c in month_cells})
        day_idx = {d: i for i, d in enumerate(days)}
        payload = {"days": days, "rows": [[day_idx[d], l, i, p] for d, l, i, p in month_cells]}
        (OUT / "months" / f"{ym}.json").write_text(
            json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    # --- cobertura por dia -----------------------------------------------------
    per_day: dict[str, dict] = defaultdict(lambda: {"lotas": set(), "rows": 0})
    for d, l, _i, _p in cells:
        per_day[d]["lotas"].add(l)
        per_day[d]["rows"] += 1
    days_info = [{"d": d, "lotas": len(v["lotas"]), "rows": v["rows"]} for d, v in sorted(per_day.items())]

    manifest = {
        "generated_at": datetime.now(ZoneInfo("Europe/Lisbon")).isoformat(timespec="seconds"),
        "source": "Docapesca",
        "lotas": [{"k": k, "n": n} for k, n in lotas],
        "species": species,
        "items": [list(it) for it in items],
        "days": days_info,
        "months": sorted(by_month),
    }
    (OUT / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    # --- verificação: letra no nome vs campo f (usado como frescura E/A/B) ---------
    check = Counter()
    for r in rows:
        m = re.search(r"[Tt]\s*\d+\s*/?\s*([EAB])\s*$", r["nome"])
        if m:
            check[(m.group(1), r["f"])] += 1
    print("Letra no nome vs f:", dict(check))
    print(f"OK  {len(lotas)} lotas · {len(species)} espécies · {len(items)} produtos · "
          f"{len(days_info)} dia(s) · {len(by_month)} mês(es)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
