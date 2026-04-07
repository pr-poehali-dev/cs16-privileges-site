import os
import json
import pymysql
import psycopg2
from datetime import datetime, timedelta


ACCESS_FLAGS = {
    'vip': 'abcdefghijklmnopqrstu',
    'premium': 'abcdefghijklmnopqrstuv',
    'elite': 'abcdefghijklmnopqrstuvwxyz',
}

PRICES = {'vip': 149, 'premium': 299, 'elite': 499}


def grant_privilege(player_id: str, privilege: str, access_flags: str):
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
    with conn.cursor() as cur:
        cur.execute("SELECT id FROM gm_amxadmins WHERE username = %s", (player_id,))
        row = cur.fetchone()
        if row:
            cur.execute("UPDATE gm_amxadmins SET access=%s, flags='a' WHERE id=%s", (access_flags, row[0]))
        else:
            cur.execute("INSERT INTO gm_amxadmins (username, password, access, flags) VALUES (%s,'', %s,'a')", (player_id, access_flags))
    conn.close()


def save_order(player_id: str, privilege: str, amount: float, payment_id: str):
    try:
        pg = psycopg2.connect(os.environ['DATABASE_URL'])
        with pg.cursor() as cur:
            cur.execute(
                "INSERT INTO orders (player_id, privilege, amount, status, payment_id, activated_at) "
                "VALUES (%s, %s, %s, 'succeeded', %s, NOW())",
                (player_id, privilege, amount, payment_id)
            )
        pg.commit()
        pg.close()
    except Exception:
        pass


def handler(event: dict, context) -> dict:
    """Webhook от ЮKassa — выдаёт привилегию в CS 1.6 и сохраняет заказ в БД."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type'}, 'body': ''}

    body = json.loads(event.get('body') or '{}')

    if body.get('event') != 'payment.succeeded':
        return {'statusCode': 200, 'headers': {'Access-Control-Allow-Origin': '*'}, 'body': json.dumps({'ok': True})}

    payment = body.get('object', {})
    if payment.get('status') != 'succeeded':
        return {'statusCode': 200, 'headers': {'Access-Control-Allow-Origin': '*'}, 'body': json.dumps({'ok': True})}

    metadata = payment.get('metadata', {})
    privilege = metadata.get('privilege', '')
    player_id = metadata.get('player_id', '')
    access_flags = metadata.get('access_flags', ACCESS_FLAGS.get(privilege, 'a'))
    payment_id = payment.get('id', '')
    amount = float(payment.get('amount', {}).get('value', PRICES.get(privilege, 0)))

    if not privilege or not player_id:
        return {'statusCode': 400, 'headers': {'Access-Control-Allow-Origin': '*'}, 'body': json.dumps({'error': 'Missing metadata'})}

    grant_privilege(player_id, privilege, access_flags)
    save_order(player_id, privilege, amount, payment_id)

    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
        'body': json.dumps({'ok': True, 'player': player_id, 'privilege': privilege})
    }
