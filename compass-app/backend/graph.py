"""
Graph query helpers for the COMPASS Neo4j concept map.
"""
import os
from neo4j import GraphDatabase

NEO4J_URI  = os.getenv("NEO4J_URI",      "bolt://neo4j:7687")
NEO4J_USER = os.getenv("NEO4J_USER",     "neo4j")
NEO4J_PASS = os.getenv("NEO4J_PASSWORD", "compass4OUD")

_driver = None


def get_driver():
    global _driver
    if _driver is None:
        _driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASS))
    return _driver


def is_available() -> bool:
    try:
        with get_driver().session() as s:
            s.run("RETURN 1")
        return True
    except Exception:
        return False


def get_full_graph() -> dict:
    """Return all nodes and relationships for the concept map visualization."""
    with get_driver().session() as s:
        node_result = s.run("""
            MATCH (n)
            RETURN elementId(n) AS id, labels(n)[0] AS label, n.name AS name,
                   properties(n) AS props
        """)
        nodes = [{"id": r["id"], "label": r["label"],
                  "name": r["name"], "props": dict(r["props"])}
                 for r in node_result]

        rel_result = s.run("""
            MATCH (a)-[r]->(b)
            RETURN elementId(a) AS source, elementId(b) AS target, type(r) AS type,
                   properties(r) AS props
        """)
        links = [{"source": r["source"], "target": r["target"],
                  "type": r["type"], "props": dict(r["props"])}
                 for r in rel_result]

    return {"nodes": nodes, "links": links}


def get_neighborhood(name: str, depth: int = 2) -> dict:
    """Return node + its neighbors up to `depth` hops."""
    with get_driver().session() as s:
        result = s.run(f"""
            MATCH path = (n {{name: $name}})-[*1..{depth}]-(m)
            WITH n, m, relationships(path) AS rels
            UNWIND rels AS r
            WITH n, m, r, startNode(r) AS src, endNode(r) AS tgt
            RETURN DISTINCT
                elementId(src) AS src_id, labels(src)[0] AS src_label, src.name AS src_name,
                elementId(tgt) AS tgt_id, labels(tgt)[0] AS tgt_label, tgt.name AS tgt_name,
                type(r) AS rel_type
        """, name=name)
        rows = list(result)

    node_map: dict[str, dict] = {}
    links = []
    for row in rows:
        for id_k, lbl_k, nm_k in [("src_id","src_label","src_name"),
                                    ("tgt_id","tgt_label","tgt_name")]:
            nid = str(row[id_k])
            if nid not in node_map:
                node_map[nid] = {"id": nid, "label": row[lbl_k], "name": row[nm_k]}
        links.append({"source": str(row["src_id"]), "target": str(row["tgt_id"]),
                      "type": row["rel_type"]})

    return {"nodes": list(node_map.values()), "links": links}


def search_nodes(query: str) -> list[dict]:
    """Full-text search across node names."""
    with get_driver().session() as s:
        result = s.run("""
            MATCH (n) WHERE toLower(n.name) CONTAINS toLower($q)
            RETURN elementId(n) AS id, labels(n)[0] AS label, n.name AS name
            LIMIT 20
        """, q=query)
        return [{"id": r["id"], "label": r["label"], "name": r["name"]}
                for r in result]


# ── Graph-augmented RAG support ──────────────────────────────────────────────
# Entity matching here is deliberately simple (substring match against node
# names, not NER or embedding-based linking): the graph is small (~99 nodes)
# and node names are specific enough (e.g. "Buprenorphine/Naloxone") that
# substring matching against the question + retrieved passages is a reasonable
# first pass. Documented as a limitation, not a design claim.

_all_node_names_cache: list[str] | None = None


def _all_node_names() -> list[str]:
    global _all_node_names_cache
    if _all_node_names_cache is None:
        with get_driver().session() as s:
            result = s.run("MATCH (n) WHERE n.name IS NOT NULL RETURN DISTINCT n.name AS name")
            _all_node_names_cache = [r["name"] for r in result]
    return _all_node_names_cache


def match_entities(text: str) -> list[str]:
    """Return concept-map node names that appear as substrings in `text`
    (case-insensitive). Longest names are checked first so e.g.
    'Buprenorphine/Naloxone' is preferred over the shorter 'Buprenorphine'
    match it would otherwise also trigger."""
    text_l = text.lower()
    names = sorted(_all_node_names(), key=len, reverse=True)
    return [n for n in names if n.lower() in text_l]


def get_context_for_question(question: str, extra_text: str = "",
                              max_entities: int = 6, max_triples: int = 15) -> str:
    """Build a human-readable block of concept-map relationships relevant to a
    question, for injection into an LLM prompt alongside retrieved text
    passages. Returns "" if no entities matched or the graph is unreachable."""
    try:
        matched = match_entities(f"{question}\n{extra_text}")[:max_entities]
        if not matched:
            return ""

        triples: list[str] = []
        seen: set[tuple] = set()
        for name in matched:
            neighborhood = get_neighborhood(name, depth=1)
            by_id = {n["id"]: n for n in neighborhood["nodes"]}
            for link in neighborhood["links"]:
                src = by_id.get(link["source"])
                tgt = by_id.get(link["target"])
                if not src or not tgt:
                    continue
                key = (src["name"], link["type"], tgt["name"])
                if key in seen:
                    continue
                seen.add(key)
                triples.append(f"- {src['name']} ({src['label']}) {link['type']} {tgt['name']} ({tgt['label']})")
                if len(triples) >= max_triples:
                    break
            if len(triples) >= max_triples:
                break

        if not triples:
            return ""
        return "Related concept-map knowledge:\n" + "\n".join(triples)
    except Exception:
        # Graph augmentation is a best-effort addition — never let a graph
        # error take down a chat response that would otherwise succeed.
        return ""
