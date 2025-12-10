import sqlite3
import os
import base64
import json
from datetime import datetime

DB_FILE = os.path.join(os.path.dirname(__file__), 'webauthn.db')

CREATE_TABLE_SQL = '''
CREATE TABLE IF NOT EXISTS credentials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    credential_id TEXT UNIQUE,
    public_key TEXT,
    sign_count INTEGER,
    transports TEXT,
    created_at TEXT
);
'''


def init_db():
    conn = sqlite3.connect(DB_FILE)
    cur = conn.cursor()
    cur.execute(CREATE_TABLE_SQL)
    conn.commit()
    conn.close()


def _get_conn():
    conn = sqlite3.connect(DB_FILE)
    return conn


def store_credential(credential_id: str, public_key: str, sign_count: int, transports: str = ''):
    conn = _get_conn()
    cur = conn.cursor()
    cur.execute(
        'INSERT OR REPLACE INTO credentials (credential_id, public_key, sign_count, transports, created_at) VALUES (?, ?, ?, ?, ?)',
        (credential_id, public_key, sign_count, transports, datetime.utcnow().isoformat())
    )
    conn.commit()
    conn.close()


def get_all_credentials():
    conn = _get_conn()
    cur = conn.cursor()
    cur.execute('SELECT id, credential_id, public_key, sign_count, transports, created_at FROM credentials')
    rows = cur.fetchall()
    conn.close()
    creds = []
    for r in rows:
        creds.append({
            'id': r[0],
            'credential_id': r[1],
            'public_key': r[2],
            'sign_count': r[3],
            'transports': r[4],
            'created_at': r[5]
        })
    return creds


def get_credential_by_id(credential_id: str):
    conn = _get_conn()
    cur = conn.cursor()
    cur.execute('SELECT id, credential_id, public_key, sign_count, transports, created_at FROM credentials WHERE credential_id=?', (credential_id,))
    r = cur.fetchone()
    conn.close()
    if r:
        return {
            'id': r[0],
            'credential_id': r[1],
            'public_key': r[2],
            'sign_count': r[3],
            'transports': r[4],
            'created_at': r[5]
        }
    return None


def update_sign_count(credential_id: str, sign_count: int):
    conn = _get_conn()
    cur = conn.cursor()
    cur.execute('UPDATE credentials SET sign_count = ? WHERE credential_id = ?', (sign_count, credential_id))
    conn.commit()
    conn.close()


def delete_credential(credential_id: str):
    conn = _get_conn()
    cur = conn.cursor()
    cur.execute('DELETE FROM credentials WHERE credential_id = ?', (credential_id,))
    conn.commit()
    conn.close()


# initialize DB when imported
init_db()
