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
