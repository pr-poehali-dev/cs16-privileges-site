import os
import json
import pymysql


PRIVILEGE_MAP = {
    'abcdefghijklmnopqrstu': {'name': 'VIP', 'color': 'cyan'},
    'abcdefghijklmnopqrstuv': {'name': 'PREMIUM', 'color': 'magenta'},
    'abcdefghijklmnopqrstuvwxyz': {'name': 'ELITE', 'color': 'gold'},
}

FLAG_LABELS = {
    'a': 'Иммунитет',
    'b': 'Резервный слот',
    'c': 'Kick',
    'd': 'Ban (1 час)',
    'e': 'Slay/Slap',
    'f': 'Смена карты',
    'g': 'Cvar',
    'h': 'Cfg',
    'i': 'Chat',
    'j': 'Vote',
    'k': 'Password',
    'l': 'RCON',
    'm': 'Cheats',
    'z': 'Root (всё)',
}


def detect_privilege(access: str) -> dict:
    access = access.strip().lower() if access else ''
    for flags, info in PRIVILEGE_MAP.items():
        if access == flags:
            return info
    if len(access) >= 26:
        return {'name': 'ELITE', 'color': 'gold'}
    if len(access) >= 22:
        return {'name': 'PREMIUM', 'color': 'magenta'}
    if len(access) >= 1:
        return {'name': 'VIP', 'color': 'cyan'}
    return {'name': 'Нет привилегии', 'color': 'none'}


def handler(event: dict, context) -> dict:
    """Возвращает информацию о привилегии игрока CS 1.6 по его Steam ID или нику."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type'}, 'body': ''}

    params = event.get('queryStringParameters') or {}
    player_id = (params.get('player_id') or '').strip()

    if not player_id:
        return {'statusCode': 400, 'headers': {'Access-Control-Allow-Origin': '*'}, 'body': json.dumps({'error': 'Укажи параметр player_id'})}

    conn = pymysql.connect(
        host=os.environ['CS_MYSQL_HOST'],
        port=int(os.environ.get('CS_MYSQL_PORT', 3306)),
        user=os.environ['CS_MYSQL_USER'],
        password=os.environ['CS_MYSQL_PASSWORD'],
        database=os.environ['CS_MYSQL_DB'],
        charset='utf8',
        connect_timeout=10,
    )

    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, username, access, flags FROM gm_amxadmins WHERE username = %s LIMIT 1",
            (player_id,)
        )
        row = cur.fetchone()

    conn.close()

    if not row:
        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': json.dumps({'found': False, 'player_id': player_id})
        }

    admin_id, username, access, flags = row
    privilege = detect_privilege(access)

    active_flags = []
    for char in (access or ''):
        if char in FLAG_LABELS:
            active_flags.append({'flag': char, 'label': FLAG_LABELS[char]})

    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
        'body': json.dumps({
            'found': True,
            'player_id': username,
            'privilege': privilege['name'],
            'color': privilege['color'],
            'access': access,
            'flags': active_flags,
        }, ensure_ascii=False)
    }
