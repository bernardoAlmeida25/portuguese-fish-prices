#!/usr/bin/env python3
"""
Docapesca — Estatísticas diárias e preços de peixe em lota
=========================================================

Scraper diário dos preços médios da primeira venda de pescado nas lotas
geridas pela Docapesca (fonte: https://www.docapesca.pt/pt/estatisticas).

Como funciona a fonte (confirmado a 2026-10-19):
  * A página é uma app Next.js, mas a tabela e a paginação são renderizadas
    no servidor: um GET simples com `search`, `market` e `page` devolve HTML
    parseável — não é preciso `_rsc` nem JavaScript.
  * Cada página tem 12 linhas; o fim das páginas deteta-se por a tabela
    vir vazia (estado "Não foram encontrados resultados"), renderizado no
    HTML do servidor — mas os <script> embutidos também podem conter essa
    string, por isso só se confia na tabela após os remover.
  * O paginador inclui um link "(Ultima página)" — os hrefs `page=N` dão
    a última página diretamente (atalho), e o aria-label
    "Sua pesquisa por retornou N resultados" dá o total (redundância útil).
  * A página parece expor só os dados do dia corrente — não há parâmetro
    de data confirmado. O campo `data` é a data de recolha, não a do leilão.

A CONFIRMAR (ver README):
  * Unidade do "Valor médio (€)": €/kg vs €/unidade (a coluna diz apenas €;
    os anúncios anuais da Docapesca falam de €/kg).
  * Os ids 16, 18 e 19 não aparecem na lista de lotas da página — valerá a
    pena verificar se correspondem a lotas escondidas (ex.: Costa da Caparica).

Uso:
    python fish_prices.py                     # recolhe as 17 lotas
    python fish_prices.py --market peniche    # recolhe só uma lota (teste)
    python fish_prices.py --dry-run           # não escreve, só imprime

Saída: data/fish_prices.csv — uma linha por (data, lota, espécie, calibre).
Cada execução substitui as linhas do dia corrente (os leilões decorrem ao
longo do dia, por isso repetir uma execução atualiza o dia).
"""

from __future__ import annotations

import argparse
import csv
import re
import sys
import time
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import requests
from bs4 import BeautifulSoup

BASE_URL = "https://www.docapesca.pt/pt/estatisticas"
CSV_PATH = Path(__file__).resolve().parent / "data" / "fish_prices.csv"
FIELDS = [
    "data", "recolhido_em", "lota_key", "lota",
    "esp", "t", "f", "nome", "especie", "calibre", "preco_medio_eur",
]
EMPTY_MARKER = "Não foram encontrados resultados"
REQUEST_TIMEOUT = 30
MAX_RETRIES = 3
POLITE_DELAY_S = 1.0
USER_AGENT = "portuguese-fish-prices (+https://github.com/bernardoAlmeida25)"

# (key, nome oficial, id na Docapesca) — extraído da página de estatísticas.
MARKETS: list[tuple[str, str, int]] = [
    ("viana-do-castelo", "Viana do Castelo", 1),
    ("povoa-de-varzim", "Póvoa de Varzim", 2),
    ("matosinhos", "Matosinhos", 3),
    ("aveiro", "Aveiro", 4),
    ("figueira-da-foz", "Figueira da Foz", 5),
    ("nazare", "Nazaré", 6),
    ("peniche", "Peniche", 7),
    ("cascais", "Cascais", 8),
    ("sesimbra", "Sesimbra", 9),
    ("setubal", "Setúbal", 10),
    ("sines", "Sines", 11),
    ("lagos", "Lagos", 12),
    ("sagres", "Sagres", 13),
    ("portimao", "Portimão", 14),
    ("olhao", "Olhão", 15),
    ("quarteira", "Quarteira", 17),
    ("vila-real-de-santo-antonio", "Vila Real de Santo António", 20),
]


def build_session() -> requests.Session:
    session = requests.Session()
    session.headers.update({
        "User-Agent": USER_AGENT,
        "Accept-Language": "pt-PT,pt;q=0.9",
    })
    return session


def fetch_page(session: requests.Session, market_key: str, page: int) -> str:
    """GET com retries; devolve o HTML da página ou levanta RuntimeError."""
    last_exc: Exception | None = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = session.get(
                BASE_URL,
                params={"search": "", "market": market_key, "page": page},
                timeout=REQUEST_TIMEOUT,
            )
            response.raise_for_status()
            return response.text
        except requests.RequestException as exc:
            last_exc = exc
            time.sleep(2 ** attempt)  # 2s, 4s, 8s
    raise RuntimeError(f"GET falhou (market={market_key}, page={page}): {last_exc}")


def split_nome(nome: str) -> tuple[str, str | None]:
    """Separa o calibre do nome da espécie.

    'CARAPAU T1 A' -> ('CARAPAU', 'T1'); 'CANGULO' -> ('CANGULO', None).
    A letra final (A/B/E) fica no `nome` — o significado não está
    documentado (provável apresentação/estado), por isso preserva-se.
    """
    match = re.search(r"\bT(\d+)\b", nome)
    if not match:
        return nome, None
    return nome[: match.start()].strip(), f"T{match.group(1)}"


def parse_page(
    html: str,
    market_key: str,
    market_name: str,
    day_iso: str,
    recolhido_em: str,
) -> tuple[list[dict], int | None, int | None]:
    """Devolve (linhas, total_resultados, ultima_pagina)."""
    soup = BeautifulSoup(html, "html.parser")

    # ATENÇÃO: remover scripts ANTES de qualquer verificação. O HTML de uma
    # app Next.js embute o payload RSC e referências a chunks JS que podem
    # conter as strings da interface — incluindo a mensagem de estado vazio.
    # Verificar EMPTY_MARKER no HTML cru dava falsos "0 resultados".
    for tag in soup(["script", "style"]):
        tag.decompose()

    # Total de resultados vem no aria-label do alerta:
    # "Sua pesquisa por <termo> retornou N resultados"
    total: int | None = None
    alert = soup.find(attrs={"role": "alert", "aria-label": True})
    if alert is not None:
        match = re.search(r"retornou\s*(\d+)", alert.get("aria-label", ""))
        if match:
            total = int(match.group(1))

    # Última página: máximo dos hrefs do paginador
    # (o link "(Ultima página)" também é um href page=N).
    last_page: int | None = None
    pages = [int(n) for n in re.findall(r"[?&]page=(\d+)", html)]
    if pages:
        last_page = max(pages)

    rows: list[dict] = []
    for tr in soup.select("table tbody tr"):
        cells = [td.get_text(strip=True) for td in tr.find_all("td")]
        if len(cells) != 5:
            continue
        esp, t_raw, f_raw, nome, valor_raw = cells
        try:
            preco = float(valor_raw.replace(",", "."))
        except ValueError:
            print(
                f"AVISO  {market_key}: valor não numérico {valor_raw!r} em {nome!r} — linha ignorada",
                file=sys.stderr,
            )
            continue
        especie, calibre = split_nome(nome)
        rows.append({
            "data": day_iso,
            "recolhido_em": recolhido_em,
            "lota_key": market_key,
            "lota": market_name,
            "esp": esp,
            "t": int(t_raw) if t_raw.isdigit() else t_raw,
            "f": int(f_raw) if f_raw.isdigit() else f_raw,
            "nome": nome,
            "especie": especie,
            "calibre": calibre,
            "preco_medio_eur": preco,
        })
    if not rows and EMPTY_MARKER not in soup.get_text():
        # Tabela sem linhas mas também sem o estado vazio oficial: sinal de
        # que o HTML mudou (redesign, novo seletor) — avisa em vez de falhar
        # silenciosamente.
        print(
            f"AVISO  {market_key}: sem linhas e sem estado vazio — o HTML mudou?",
            file=sys.stderr,
        )
    return rows, total, last_page


def collect_market(
    session: requests.Session,
    market_key: str,
    market_name: str,
    day_iso: str,
    recolhido_em: str,
) -> list[dict]:
    """Percorre todas as páginas de uma lota. 0 linhas é um resultado válido
    (dias sem descargas), distinto de erro (que levanta exceção)."""
    rows: list[dict] = []
    total: int | None = None
    page = 1
    while True:
        html = fetch_page(session, market_key, page)
        page_rows, page_total, page_last = parse_page(
            html, market_key, market_name, day_iso, recolhido_em
        )
        if not page_rows:
            break  # estado vazio (ou página além do fim)
        rows.extend(page_rows)
        if page_total is not None:
            total = page_total
        if page_last is not None:
            last_page = page_last
        elif total:
            # Sem paginador visível mas com total conhecido: usa o total.
            last_page = -(-total // max(len(page_rows), 1))
        else:
            last_page = page
        if page >= last_page:
            break
        page += 1
        time.sleep(POLITE_DELAY_S)

    if total is not None and len(rows) != total:
        print(
            f"AVISO  {market_key}: recolhidas {len(rows)} de {total} linhas",
            file=sys.stderr,
        )
    return rows


def upsert_rows(new_rows: list[dict]) -> int:
    """Escreve o CSV: mantém os dias anteriores, substitui as linhas do dia
    corrente. Escrita atómica via ficheiro temporário. Devolve o total."""
    CSV_PATH.parent.mkdir(parents=True, exist_ok=True)
    today = new_rows[0]["data"]
    existing: list[dict] = []
    if CSV_PATH.exists():
        with CSV_PATH.open(newline="", encoding="utf-8") as fh:
            existing = [
                row for row in csv.DictReader(fh) if row.get("data") != today
            ]
    all_rows = sorted(
        existing + new_rows,
        key=lambda r: (r["data"], r["lota_key"], r["esp"], str(r["t"]), str(r["f"])),
    )
    tmp_path = CSV_PATH.with_suffix(".csv.tmp")
    with tmp_path.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(all_rows)
    tmp_path.replace(CSV_PATH)
    return len(all_rows)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Recolhe os preços diários do pescado nas lotas da Docapesca."
    )
    parser.add_argument(
        "--market",
        help="recolher só uma lota (key ou parte do nome, ex.: peniche)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="não escreve o CSV, apenas imprime o resumo",
    )
    args = parser.parse_args()

    markets = MARKETS
    if args.market:
        query = args.market.lower()
        markets = [
            mk for mk in MARKETS
            if query in mk[0] or query in mk[1].lower()
        ]
        if not markets:
            print(f"ERRO   lota desconhecida: {args.market!r}", file=sys.stderr)
            return 2

    tz = ZoneInfo("Europe/Lisbon")
    now = datetime.now(tz)
    day_iso = now.date().isoformat()
    recolhido_em = now.isoformat(timespec="seconds")
    session = build_session()

    failures = 0
    collected: list[dict] = []
    for key, name, _id in markets:
        try:
            rows = collect_market(session, key, name, day_iso, recolhido_em)
        except Exception as exc:  # noqa: BLE001 — uma lota falhada não para as restantes
            print(f"ERRO   {key}: {exc}", file=sys.stderr)
            failures += 1
            continue
        print(f"OK     {key:<28} {len(rows):>4} linhas")
        collected.extend(rows)

    if not args.dry_run and collected:
        total = upsert_rows(collected)
        print(f"OK     CSV atualizado: {CSV_PATH.name} ({total} linhas no total)")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())