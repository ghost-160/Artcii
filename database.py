import os
import sqlite3
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "database.db")


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = get_connection()
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS artworks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ascii_content TEXT NOT NULL,
                theme TEXT,
                mode TEXT,
                style TEXT,
                color_mode TEXT,
                charset TEXT,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.commit()
    finally:
        conn.close()


def save_artwork(ascii_content, theme, mode, style, color_mode, charset):
    conn = get_connection()
    try:
        conn.execute(
            "INSERT INTO artworks (ascii_content, theme, mode, style, color_mode, charset, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (
                ascii_content,
                theme,
                mode,
                style,
                color_mode,
                charset,
                datetime.utcnow().isoformat(),
            ),
        )
        conn.commit()
    finally:
        conn.close()


def get_artworks():
    conn = get_connection()
    try:
        cursor = conn.execute(
            "SELECT id, ascii_content, theme, mode, style, color_mode, charset, created_at FROM artworks ORDER BY created_at DESC"
        )
        return [dict(row) for row in cursor.fetchall()]
    finally:
        conn.close()


def delete_artwork(art_id):
    conn = get_connection()
    try:
        conn.execute("DELETE FROM artworks WHERE id = ?", (art_id,))
        conn.commit()
    finally:
        conn.close()
