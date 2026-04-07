import os
import json
import hashlib
import secrets
import psycopg2
import pymysql

CS_ACCESS_FLAGS = {
    'vip': 'abcdefghijklmnopqrstu',
    'premium': 'abcdefghijklmnopqrstuv',
    'elite': 'abcdefghijklmnopqrstuvwxyz',
}
CS_FLAG_TO_NAME = {v: k.upper() for k, v in CS_ACCESS_FLAGS.items()}


def detect_privilege(access: str) -> str:
    a = (access or '').strip().lower()
    if a in CS_FLAG_TO_NAME:
        return CS_FLAG_TO_NAME[a]
    if len(a) >= 26: return 'ELITE'
    if len(a) >= 22: return 'PREMIUM'
    if len(a) >= 1: return 'VIP'
    return 'Нет'


def get_mysql():
    return pymysql.connect(
        host=os.environ['CS_MYSQL_HOST'],
        port=int(os.environ.get('CS_MYSQL_PORT', 3306)),
        user=os.environ['CS_MYSQL_USER'],
        password=os.environ['CS_MYSQL_PASSWORD'],
        database=os.environ['CS_MYSQL_DB'],
        charset='utf8', connect_timeout=10, autocommit=True,
    )


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def hash_pw(p: str) -> str:
    return hashlib.sha256(p.encode()).hexdigest()


def get_session_user(conn, token: str):
    if not token:
        return None
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


def ok(data):
    return {'statusCode': 200, 'headers': {**cors(), 'Content-Type': 'application/json'}, 'body': json.dumps(data, ensure_ascii=False, default=str)}


def err(msg, code=400):
    return {'statusCode': code, 'headers': {**cors(), 'Content-Type': 'application/json'}, 'body': json.dumps({'error': msg})}


def handler(event: dict, context) -> dict:
    """Основное API: авторизация, чат, заказы, настройки сервера, управление пользователями."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors(), 'body': ''}

    method = event.get('httpMethod', 'GET')
    headers = {k.lower(): v for k, v in (event.get('headers') or {}).items()}
    token = headers.get('x-session-token', '')
    params = event.get('queryStringParameters') or {}
    action = params.get('action', '')

    body = {}
    if method == 'POST':
        body = json.loads(event.get('body') or '{}')
        if not action:
            action = body.get('action', '')

    conn = get_conn()
    try:
        user = get_session_user(conn, token)

        # ── AUTH ──────────────────────────────────────────────
        if action == 'me':
            if not user:
                return err('Не авторизован', 401)
            uid, email, username, steam_id, role, is_banned, ban_reason = user
            return ok({'id': uid, 'email': email, 'username': username, 'steam_id': steam_id, 'role': role, 'is_banned': is_banned, 'ban_reason': ban_reason})

        if action == 'register':
            email = (body.get('email') or '').strip().lower()
            username = (body.get('username') or '').strip()
            password = body.get('password', '')
            steam_id = (body.get('steam_id') or '').strip() or None
            if not email or not username or not password:
                return err('Заполни все поля')
            if len(password) < 6:
                return err('Пароль минимум 6 символов')
            try:
                with conn.cursor() as cur:
                    cur.execute(
                        "INSERT INTO users (email, username, password_hash, steam_id) VALUES (%s, %s, %s, %s) RETURNING id",
                        (email, username, hash_pw(password), steam_id)
                    )
                    uid = cur.fetchone()[0]
                conn.commit()
            except psycopg2.errors.UniqueViolation:
                return err('Email или ник уже заняты', 409)
            tok = secrets.token_hex(32)
            with conn.cursor() as cur:
                cur.execute("INSERT INTO sessions (id, user_id) VALUES (%s, %s)", (tok, uid))
            conn.commit()
            return ok({'token': tok, 'username': username, 'role': 'player'})

        if action == 'login':
            login = (body.get('login') or '').strip().lower()
            password = body.get('password', '')
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT id, username, role, is_banned, ban_reason FROM users "
                    "WHERE (email=%s OR lower(username)=%s) AND password_hash=%s",
                    (login, login, hash_pw(password))
                )
                row = cur.fetchone()
            if not row:
                return err('Неверный логин или пароль', 401)
            uid, username, role, is_banned, ban_reason = row
            if is_banned:
                return err(f'Аккаунт заблокирован: {ban_reason or "нарушение правил"}', 403)
            with conn.cursor() as cur:
                cur.execute("UPDATE users SET last_login=NOW() WHERE id=%s", (uid,))
            tok = secrets.token_hex(32)
            with conn.cursor() as cur:
                cur.execute("INSERT INTO sessions (id, user_id) VALUES (%s, %s)", (tok, uid))
            conn.commit()
            return ok({'token': tok, 'username': username, 'role': role})

        if action == 'logout':
            if token:
                with conn.cursor() as cur:
                    cur.execute("UPDATE sessions SET expires_at=NOW() WHERE id=%s", (token,))
                conn.commit()
            return ok({'ok': True})

        # ── CHAT ──────────────────────────────────────────────
        if action == 'chat_get':
            limit = min(int(params.get('limit', 50)), 100)
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT m.id, m.username, m.message, m.created_at, COALESCE(u.role,'player') "
                    "FROM chat_messages m LEFT JOIN users u ON m.user_id=u.id "
                    "WHERE m.is_hidden=FALSE ORDER BY m.created_at DESC LIMIT %s",
                    (limit,)
                )
                rows = cur.fetchall()
            msgs = [{'id': r[0], 'username': r[1], 'message': r[2], 'created_at': r[3].isoformat(), 'role': r[4]} for r in reversed(rows)]
            return ok(msgs)

        if action == 'chat_send':
            if not user:
                return err('Нужна авторизация', 401)
            uid, email, username, steam_id, role, is_banned, ban_reason = user
            if is_banned:
                return err('Ты заблокирован', 403)
            msg = (body.get('message') or '').strip()
            if not msg:
                return err('Пустое сообщение')
            if len(msg) > 500:
                return err('Слишком длинное сообщение')
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO chat_messages (user_id, username, message) VALUES (%s,%s,%s) RETURNING id, created_at",
                    (uid, username, msg)
                )
                mid, cat = cur.fetchone()
            conn.commit()
            return ok({'id': mid, 'username': username, 'message': msg, 'created_at': cat.isoformat(), 'role': role})

        if action == 'chat_hide':
            if not user or user[4] != 'admin':
                return err('Нет прав', 403)
            with conn.cursor() as cur:
                cur.execute("UPDATE chat_messages SET is_hidden=TRUE WHERE id=%s", (body.get('id'),))
            conn.commit()
            return ok({'ok': True})

        # ── SETTINGS ──────────────────────────────────────────
        if action == 'settings_get':
            with conn.cursor() as cur:
                cur.execute("SELECT key, value FROM site_settings ORDER BY key")
                rows = cur.fetchall()
            return ok({r[0]: r[1] for r in rows})

        if action == 'settings_set':
            if not user or user[4] != 'admin':
                return err('Только для администратора', 403)
            updated = []
            for key, value in body.items():
                if key == 'action':
                    continue
                with conn.cursor() as cur:
                    cur.execute(
                        "INSERT INTO site_settings (key, value, updated_at) VALUES (%s,%s,NOW()) "
                        "ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()",
                        (key, str(value))
                    )
                updated.append(key)
            conn.commit()
            return ok({'ok': True, 'updated': updated})

        # ── ORDERS ────────────────────────────────────────────
        if action == 'orders_get':
            if not user:
                return err('Нужна авторизация', 401)
            uid, email, username, steam_id, role, is_banned, ban_reason = user
            limit = min(int(params.get('limit', 50)), 200)
            offset = int(params.get('offset', 0))
            with conn.cursor() as cur:
                if role == 'admin':
                    cur.execute(
                        "SELECT o.id, o.player_id, o.privilege, o.amount, o.status, o.created_at, o.activated_at, COALESCE(u.username,'—') "
                        "FROM orders o LEFT JOIN users u ON o.user_id=u.id ORDER BY o.created_at DESC LIMIT %s OFFSET %s",
                        (limit, offset)
                    )
                else:
                    cur.execute(
                        "SELECT id, player_id, privilege, amount, status, created_at, activated_at, NULL "
                        "FROM orders WHERE user_id=%s ORDER BY created_at DESC LIMIT %s OFFSET %s",
                        (uid, limit, offset)
                    )
                rows = cur.fetchall()
                cur.execute("SELECT COUNT(*) FROM orders" + ("" if role == 'admin' else " WHERE user_id=%s"),
                            () if role == 'admin' else (uid,))
                total = cur.fetchone()[0]
            orders = [{'id': r[0], 'player_id': r[1], 'privilege': r[2], 'amount': float(r[3]), 'status': r[4], 'created_at': r[5].isoformat(), 'activated_at': r[6].isoformat() if r[6] else None, 'username': r[7]} for r in rows]
            return ok({'orders': orders, 'total': total})

        if action == 'orders_add':
            uid = user[0] if user else None
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO orders (user_id, player_id, privilege, amount, status, payment_id, activated_at) "
                    "VALUES (%s,%s,%s,%s,%s,%s,NOW()) RETURNING id",
                    (uid, body.get('player_id',''), body.get('privilege',''), body.get('amount',0), body.get('status','succeeded'), body.get('payment_id'))
                )
                oid = cur.fetchone()[0]
            conn.commit()
            return ok({'ok': True, 'order_id': oid})

        # ── USERS MANAGEMENT ──────────────────────────────────
        if action == 'users_get':
            if not user or user[4] != 'admin':
                return err('Только для администратора', 403)
            search = (params.get('search') or '').strip()
            limit = min(int(params.get('limit', 50)), 200)
            offset = int(params.get('offset', 0))
            with conn.cursor() as cur:
                if search:
                    cur.execute(
                        "SELECT id, email, username, steam_id, role, is_banned, ban_reason, created_at, last_login "
                        "FROM users WHERE username ILIKE %s OR email ILIKE %s ORDER BY created_at DESC LIMIT %s OFFSET %s",
                        (f'%{search}%', f'%{search}%', limit, offset)
                    )
                else:
                    cur.execute(
                        "SELECT id, email, username, steam_id, role, is_banned, ban_reason, created_at, last_login "
                        "FROM users ORDER BY created_at DESC LIMIT %s OFFSET %s",
                        (limit, offset)
                    )
                rows = cur.fetchall()
                cur.execute("SELECT COUNT(*) FROM users" + (" WHERE username ILIKE %s OR email ILIKE %s" if search else ""),
                            (f'%{search}%', f'%{search}%') if search else ())
                total = cur.fetchone()[0]
            users = [{'id': r[0], 'email': r[1], 'username': r[2], 'steam_id': r[3], 'role': r[4], 'is_banned': r[5], 'ban_reason': r[6], 'created_at': r[7].isoformat(), 'last_login': r[8].isoformat() if r[8] else None} for r in rows]
            return ok({'users': users, 'total': total})

        if action == 'user_ban':
            if not user or user[4] != 'admin':
                return err('Только для администратора', 403)
            reason = body.get('reason', 'нарушение правил')
            with conn.cursor() as cur:
                cur.execute("UPDATE users SET is_banned=TRUE, ban_reason=%s WHERE id=%s", (reason, body.get('user_id')))
            conn.commit()
            return ok({'ok': True})

        if action == 'user_unban':
            if not user or user[4] != 'admin':
                return err('Только для администратора', 403)
            with conn.cursor() as cur:
                cur.execute("UPDATE users SET is_banned=FALSE, ban_reason=NULL WHERE id=%s", (body.get('user_id'),))
            conn.commit()
            return ok({'ok': True})

        if action == 'user_role':
            if not user or user[4] != 'admin':
                return err('Только для администратора', 403)
            new_role = body.get('role', 'player')
            if new_role not in ('player', 'admin'):
                return err('Роль: player или admin')
            with conn.cursor() as cur:
                cur.execute("UPDATE users SET role=%s WHERE id=%s", (new_role, body.get('user_id')))
            conn.commit()
            return ok({'ok': True})

        # ── STATS (admin dashboard) ───────────────────────────
        if action == 'stats':
            if not user or user[4] != 'admin':
                return err('Только для администратора', 403)
            with conn.cursor() as cur:
                cur.execute("SELECT COUNT(*) FROM users")
                total_users = cur.fetchone()[0]
                cur.execute("SELECT COUNT(*) FROM orders WHERE status='succeeded'")
                total_orders = cur.fetchone()[0]
                cur.execute("SELECT COALESCE(SUM(amount),0) FROM orders WHERE status='succeeded'")
                total_revenue = float(cur.fetchone()[0])
                cur.execute("SELECT privilege, COUNT(*) FROM orders WHERE status='succeeded' GROUP BY privilege")
                by_priv = {r[0]: r[1] for r in cur.fetchall()}
                cur.execute("SELECT COUNT(*) FROM users WHERE last_login > NOW() - INTERVAL '7 days'")
                active_week = cur.fetchone()[0]
            return ok({'total_users': total_users, 'total_orders': total_orders, 'total_revenue': total_revenue, 'by_privilege': by_priv, 'active_week': active_week})

        # ── CS PRIVILEGES (MySQL) ─────────────────────────────
        if action == 'cs_list':
            if not user or user[4] != 'admin':
                return err('Только для администратора', 403)
            search = (params.get('search') or '').strip()
            limit = min(int(params.get('limit', 50)), 200)
            offset = int(params.get('offset', 0))
            mc = get_mysql()
            with mc.cursor() as cur:
                if search:
                    cur.execute("SELECT id, username, access, flags FROM gm_amxadmins WHERE username LIKE %s ORDER BY id DESC LIMIT %s OFFSET %s", (f'%{search}%', limit, offset))
                else:
                    cur.execute("SELECT id, username, access, flags FROM gm_amxadmins ORDER BY id DESC LIMIT %s OFFSET %s", (limit, offset))
                rows = cur.fetchall()
                cur.execute("SELECT COUNT(*) FROM gm_amxadmins" + (" WHERE username LIKE %s" if search else ""), (f'%{search}%',) if search else ())
                total = cur.fetchone()[0]
            mc.close()
            admins = [{'id': r[0], 'username': r[1], 'access': r[2], 'flags': r[3], 'privilege': detect_privilege(r[2])} for r in rows]
            return ok({'admins': admins, 'total': total})

        if action == 'cs_grant':
            if not user or user[4] != 'admin':
                return err('Только для администратора', 403)
            username = (body.get('username') or '').strip()
            privilege = (body.get('privilege') or '').lower()
            if not username or privilege not in CS_ACCESS_FLAGS:
                return err('Укажи username и privilege (vip/premium/elite)')
            flags = CS_ACCESS_FLAGS[privilege]
            mc = get_mysql()
            with mc.cursor() as cur:
                cur.execute("SELECT id FROM gm_amxadmins WHERE username=%s", (username,))
                row = cur.fetchone()
                if row:
                    cur.execute("UPDATE gm_amxadmins SET access=%s, flags='a' WHERE id=%s", (flags, row[0]))
                    act = 'updated'
                else:
                    cur.execute("INSERT INTO gm_amxadmins (username, password, access, flags) VALUES (%s,'', %s,'a')", (username, flags))
                    act = 'created'
            mc.close()
            return ok({'ok': True, 'action': act, 'username': username, 'privilege': privilege})

        if action == 'cs_revoke':
            if not user or user[4] != 'admin':
                return err('Только для администратора', 403)
            admin_id = body.get('id')
            if not admin_id:
                return err('Укажи id')
            mc = get_mysql()
            with mc.cursor() as cur:
                cur.execute("SELECT id FROM gm_amxadmins WHERE id=%s", (admin_id,))
                if not cur.fetchone():
                    mc.close()
                    return err('Запись не найдена', 404)
                cur.execute("UPDATE gm_amxadmins SET access='', flags='' WHERE id=%s", (admin_id,))
            mc.close()
            return ok({'ok': True})

        return err('Неизвестное действие')

    finally:
        conn.close()