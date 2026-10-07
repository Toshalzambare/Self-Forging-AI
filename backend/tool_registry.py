import sqlite3
import json
import os
from datetime import datetime

REGISTRY_DB = "tools_registry.db"

def init_db():
    conn = sqlite3.connect(REGISTRY_DB)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS tools (
            id TEXT PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            description TEXT,
            code TEXT NOT NULL,
            schema JSON,
            status TEXT DEFAULT 'active',
            created_at TEXT
        )
    ''')
    conn.commit()
    conn.close()

def add_tool(tool_id, name, description, code, schema, status="active"):
    conn = sqlite3.connect(REGISTRY_DB)
    c = conn.cursor()
    created_at = datetime.utcnow().isoformat()
    try:
        c.execute('''
            INSERT INTO tools (id, name, description, code, schema, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (tool_id, name, description, code, json.dumps(schema), status, created_at))
        conn.commit()
    except sqlite3.IntegrityError:
        pass # Tool already exists
    finally:
        conn.close()

def list_tools():
    conn = sqlite3.connect(REGISTRY_DB)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute('SELECT * FROM tools ORDER BY created_at DESC')
    rows = c.fetchall()
    conn.close()
    
    tools = []
    for row in rows:
        tools.append({
            "id": row["id"],
            "name": row["name"],
            "description": row["description"],
            "code": row["code"],
            "schema": json.loads(row["schema"]) if row["schema"] else {},
            "status": row["status"],
            "created_at": row["created_at"]
        })
    return tools
    
def get_tool(tool_id):
    conn = sqlite3.connect(REGISTRY_DB)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute('SELECT * FROM tools WHERE id = ?', (tool_id,))
    row = c.fetchone()
    conn.close()
    
    if row:
        return {
            "id": row["id"],
            "name": row["name"],
            "description": row["description"],
            "code": row["code"],
            "schema": json.loads(row["schema"]) if row["schema"] else {},
            "status": row["status"],
            "created_at": row["created_at"]
        }
    return None
