import os
import json
import pymysql


ACCESS_FLAGS = {
    'abcdefghijklmnopqrstu': 'VIP',
    'abcdefghijklmnopqrstuv': 'PREMIUM',
    'abcdefghijklmnopqrstuvwxyz': 'ELITE',
}


def get_conn():
    return pymysql.connect(
        host=os.environ['CS_MYSQL_HOST'],
        port=int(os.environ.get('CS_MYSQL_PORT', 3306)),
        user=os.environ['CS_MYSQL_USER'],
        password=os.environ['CS_MYSQL_PASSWORD'],
        database=os.environ['CS_MYSQL_DB'],
        charset='utf8',
        connect_timeout=10,
        autocommit=True,
    )


def detect_privilege(access: str) -> str:
    a = (access or '').strip().lower()
    if a in ACCESS_FLAGS:
        return ACCESS_FLAGS[a]
    if len(a) >= 26:
        return 'ELITE'
    if len(a) >= 22:
        return 'PREMIUM'
    if len(a) >= 1:
        return 'VIP'
    return 'Нет'


def check_auth(event: dict) -> bool:
    headers = {k.lower(): v for k, v in (event.get('headers') or {}).items()}
    token = headers.get('x-admin-token', '')
    return token == os.environ.get('ADMIN_PASSWORD', '')


def cors():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, PUT, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token',
    }


def handler(event: dict, context) -> dict:
    """Панель администратора CS 1.6: список привилегий, выдача, изменение, удаление."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors(), 'body': ''}

    method = event.get('httpMethod', 'GET')
    path = event.get('path', '/')

    # Проверка авторизации для всех методов кроме OPTIONS
    if not check_auth(event):
        return {
            'statusCode': 401,
            'headers': {**cors(), 'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Неверный пароль администратора'})
        }

    conn = get_conn()

    # GET / — список всех привилегий
    if method == 'GET':
        params = event.get('queryStringParameters') or {}
        search = (params.get('search') or '').strip()
        limit = min(int(params.get('limit', 50)), 200)
        offset = int(params.get('offset', 0))

        with conn.cursor() as cur:
            if search:
                cur.execute(
                    "SELECT id, username, access, flags FROM gm_amxadmins WHERE username LIKE %s ORDER BY id DESC LIMIT %s OFFSET %s",
                    (f'%{search}%', limit, offset)
                )
            else:
                cur.execute(
                    "SELECT id, username, access, flags FROM gm_amxadmins ORDER BY id DESC LIMIT %s OFFSET %s",
                    (limit, offset)
                )
            rows = cur.fetchall()

            cur.execute("SELECT COUNT(*) FROM gm_amxadmins")
            total = cur.fetchone()[0]

        conn.close()

        admins = [
            {
                'id': r[0],
                'username': r[1],
                'access': r[2],
                'flags': r[3],
                'privilege': detect_privilege(r[2]),
            }
            for r in rows
        ]

        return {
            'statusCode': 200,
            'headers': {**cors(), 'Content-Type': 'application/json'},
            'body': json.dumps({'admins': admins, 'total': total, 'limit': limit, 'offset': offset}, ensure_ascii=False)
        }

    # POST / — добавить или обновить привилегию вручную
    if method == 'POST':
        body = json.loads(event.get('body') or '{}')
        username = (body.get('username') or '').strip()
        privilege = (body.get('privilege') or '').lower()

        PRIV_FLAGS = {
            'vip': 'abcdefghijklmnopqrstu',
            'premium': 'abcdefghijklmnopqrstuv',
            'elite': 'abcdefghijklmnopqrstuvwxyz',
        }

        if not username or privilege not in PRIV_FLAGS:
            conn.close()
            return {'statusCode': 400, 'headers': {**cors()}, 'body': json.dumps({'error': 'Укажи username и privilege (vip/premium/elite)'})}

        access_flags = PRIV_FLAGS[privilege]

        with conn.cursor() as cur:
            cur.execute("SELECT id FROM gm_amxadmins WHERE username = %s", (username,))
            row = cur.fetchone()
            if row:
                cur.execute("UPDATE gm_amxadmins SET access = %s, flags = %s WHERE id = %s", (access_flags, 'a', row[0]))
                action = 'updated'
            else:
                cur.execute("INSERT INTO gm_amxadmins (username, password, access, flags) VALUES (%s, %s, %s, %s)", (username, '', access_flags, 'a'))
                action = 'created'

        conn.close()
        return {
            'statusCode': 200,
            'headers': {**cors(), 'Content-Type': 'application/json'},
            'body': json.dumps({'ok': True, 'action': action, 'username': username, 'privilege': privilege}, ensure_ascii=False)
        }

    # DELETE / — удалить привилегию по id
    if method == 'DELETE':
        body = json.loads(event.get('body') or '{}')
        admin_id = body.get('id')

        if not admin_id:
            conn.close()
            return {'statusCode': 400, 'headers': {**cors()}, 'body': json.dumps({'error': 'Укажи id'})}

        with conn.cursor() as cur:
            cur.execute("DELETE FROM gm_amxadmins WHERE id = %s", (admin_id,))
            deleted = cur.rowcount

        conn.close()
        return {
            'statusCode': 200,
            'headers': {**cors(), 'Content-Type': 'application/json'},
            'body': json.dumps({'ok': True, 'deleted': deleted})
        }

    conn.close()
    return {'statusCode': 405, 'headers': cors(), 'body': json.dumps({'error': 'Method not allowed'})}
