import os
import json
import hashlib
import secrets
import psycopg2
from datetime import datetime


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def create_session(conn, user_id: int) -> str:
    token = secrets.token_hex(32)
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO sessions (id, user_id) VALUES (%s, %s)",
            (token, user_id)
        )
    conn.commit()
    return token


def get_user_by_session(conn, token: str):
    with conn.cursor() as cur:
        cur.execute(
            "SELECT u.id, u.email, u.username, u.steam_id, u.role, u.is_banned, u.ban_reason "
            "FROM sessions s JOIN users u ON s.user_id = u.id "
            "WHERE s.id = %s AND s.expires_at > NOW()",
            (token,)
        )
        return cur.fetchone()


def cors():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token',
    }


def handler(event: dict, context) -> dict:
    """Авторизация игроков: регистрация, логин, получение профиля, выход."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors(), 'body': ''}

    method = event.get('httpMethod', 'GET')
    path = (event.get('path') or '/').rstrip('/')
    headers = {k.lower(): v for k, v in (event.get('headers') or {}).items()}
    token = headers.get('x-session-token', '')

    conn = get_conn()

    try:
        # GET /me — текущий пользователь
        if method == 'GET':
            if not token:
                return {'statusCode': 401, 'headers': {**cors(), 'Content-Type': 'application/json'}, 'body': json.dumps({'error': 'Не авторизован'})}
            row = get_user_by_session(conn, token)
            if not row:
                return {'statusCode': 401, 'headers': {**cors(), 'Content-Type': 'application/json'}, 'body': json.dumps({'error': 'Сессия истекла'})}
            user_id, email, username, steam_id, role, is_banned, ban_reason = row
            return {
                'statusCode': 200,
                'headers': {**cors(), 'Content-Type': 'application/json'},
                'body': json.dumps({'id': user_id, 'email': email, 'username': username, 'steam_id': steam_id, 'role': role, 'is_banned': is_banned, 'ban_reason': ban_reason})
            }

        body = json.loads(event.get('body') or '{}')
        action = body.get('action', '')

        # REGISTER
        if action == 'register':
            email = (body.get('email') or '').strip().lower()
            username = (body.get('username') or '').strip()
            password = body.get('password', '')
            steam_id = (body.get('steam_id') or '').strip()

            if not email or not username or not password:
                return {'statusCode': 400, 'headers': {**cors()}, 'body': json.dumps({'error': 'Заполни все поля'})}
            if len(password) < 6:
                return {'statusCode': 400, 'headers': {**cors()}, 'body': json.dumps({'error': 'Пароль минимум 6 символов'})}

            pw_hash = hash_password(password)
            try:
                with conn.cursor() as cur:
                    cur.execute(
                        "INSERT INTO users (email, username, password_hash, steam_id) VALUES (%s, %s, %s, %s) RETURNING id",
                        (email, username, pw_hash, steam_id or None)
                    )
                    user_id = cur.fetchone()[0]
                conn.commit()
            except psycopg2.errors.UniqueViolation:
                return {'statusCode': 409, 'headers': {**cors()}, 'body': json.dumps({'error': 'Email или ник уже заняты'})}

            token = create_session(conn, user_id)
            return {
                'statusCode': 200,
                'headers': {**cors(), 'Content-Type': 'application/json'},
                'body': json.dumps({'token': token, 'username': username, 'role': 'player'})
            }

        # LOGIN
        if action == 'login':
            login = (body.get('login') or '').strip().lower()
            password = body.get('password', '')
            pw_hash = hash_password(password)

            with conn.cursor() as cur:
                cur.execute(
                    "SELECT id, username, role, is_banned, ban_reason FROM users WHERE (email = %s OR lower(username) = %s) AND password_hash = %s",
                    (login, login, pw_hash)
                )
                row = cur.fetchone()

            if not row:
                return {'statusCode': 401, 'headers': {**cors()}, 'body': json.dumps({'error': 'Неверный логин или пароль'})}

            user_id, username, role, is_banned, ban_reason = row
            if is_banned:
                return {'statusCode': 403, 'headers': {**cors()}, 'body': json.dumps({'error': f'Аккаунт заблокирован: {ban_reason or "нарушение правил"}'})}

            with conn.cursor() as cur:
                cur.execute("UPDATE users SET last_login = NOW() WHERE id = %s", (user_id,))
            conn.commit()

            token = create_session(conn, user_id)
            return {
                'statusCode': 200,
                'headers': {**cors(), 'Content-Type': 'application/json'},
                'body': json.dumps({'token': token, 'username': username, 'role': role})
            }

        # LOGOUT
        if action == 'logout':
            if token:
                with conn.cursor() as cur:
                    cur.execute("UPDATE sessions SET expires_at = NOW() WHERE id = %s", (token,))
                conn.commit()
            return {'statusCode': 200, 'headers': {**cors()}, 'body': json.dumps({'ok': True})}

        return {'statusCode': 400, 'headers': cors(), 'body': json.dumps({'error': 'Неизвестное действие'})}

    finally:
        conn.close()
