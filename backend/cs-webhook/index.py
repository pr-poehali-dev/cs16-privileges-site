import os
import json
import pymysql
from datetime import datetime, timedelta


ACCESS_FLAGS = {
    'vip': 'abcdefghijklmnopqrstu',
    'premium': 'abcdefghijklmnopqrstuv',
    'elite': 'abcdefghijklmnopqrstuvwxyz',
}

AUTH_FLAGS = {
    'vip': 'a',
    'premium': 'a',
    'elite': 'a',
}


def grant_privilege(player_id: str, auth_type: str, privilege: str, access_flags: str):
    conn = pymysql.connect(
        host=os.environ['CS_MYSQL_HOST'],
        port=int(os.environ.get('CS_MYSQL_PORT', 3306)),
        user=os.environ['CS_MYSQL_USER'],
        password=os.environ['CS_MYSQL_PASSWORD'],
        database=os.environ['CS_MYSQL_DB'],
        charset='utf8',
        connect_timeout=10,
        autocommit=True,
    )

    expires_at = (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d %H:%M:%S')

    with conn.cursor() as cur:
        cur.execute("SELECT id, access FROM gm_amxadmins WHERE username = %s", (player_id,))
        row = cur.fetchone()

        if row:
            cur.execute(
                "UPDATE gm_amxadmins SET access = %s, flags = %s WHERE id = %s",
                (access_flags, AUTH_FLAGS[privilege], row[0])
            )
        else:
            cur.execute(
                "INSERT INTO gm_amxadmins (username, password, access, flags) VALUES (%s, %s, %s, %s)",
                (player_id, '', access_flags, AUTH_FLAGS[privilege])
            )

    conn.close()


def handler(event: dict, context) -> dict:
    """Webhook от ЮKassa — получает уведомление об оплате и выдаёт привилегию в CS 1.6."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type'}, 'body': ''}

    body = json.loads(event.get('body') or '{}')

    event_type = body.get('event', '')
    if event_type != 'payment.succeeded':
        return {'statusCode': 200, 'headers': {'Access-Control-Allow-Origin': '*'}, 'body': json.dumps({'ok': True})}

    payment = body.get('object', {})
    status = payment.get('status')

    if status != 'succeeded':
        return {'statusCode': 200, 'headers': {'Access-Control-Allow-Origin': '*'}, 'body': json.dumps({'ok': True})}

    metadata = payment.get('metadata', {})
    privilege = metadata.get('privilege', '')
    player_id = metadata.get('player_id', '')
    auth_type = metadata.get('auth_type', 'steamid')
    access_flags = metadata.get('access_flags', ACCESS_FLAGS.get(privilege, 'a'))

    if not privilege or not player_id:
        return {'statusCode': 400, 'headers': {'Access-Control-Allow-Origin': '*'}, 'body': json.dumps({'error': 'Missing metadata'})}

    grant_privilege(player_id, auth_type, privilege, access_flags)

    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
        'body': json.dumps({'ok': True, 'player': player_id, 'privilege': privilege})
    }
