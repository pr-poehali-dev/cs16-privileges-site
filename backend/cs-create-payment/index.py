import os
import json
import uuid
import urllib.request
import urllib.error
import base64


PRICES = {
    'vip': {'amount': '149.00', 'label': 'VIP на 30 дней'},
    'premium': {'amount': '299.00', 'label': 'PREMIUM на 30 дней'},
    'elite': {'amount': '499.00', 'label': 'ELITE на 30 дней'},
}

ACCESS_FLAGS = {
    'vip': 'abcdefghijklmnopqrstu',
    'premium': 'abcdefghijklmnopqrstuv',
    'elite': 'abcdefghijklmnopqrstuvwxyz',
}


def handler(event: dict, context) -> dict:
    """Создаёт платёж в ЮKassa для покупки привилегии CS 1.6."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type'}, 'body': ''}

    body = json.loads(event.get('body') or '{}')
    privilege = body.get('privilege', '').lower()
    player_id = (body.get('player_id') or '').strip()
    auth_type = body.get('auth_type', 'steamid')

    if privilege not in PRICES:
        return {'statusCode': 400, 'headers': {'Access-Control-Allow-Origin': '*'}, 'body': json.dumps({'error': 'Неверный тип привилегии'})}

    if not player_id:
        return {'statusCode': 400, 'headers': {'Access-Control-Allow-Origin': '*'}, 'body': json.dumps({'error': 'Укажи Steam ID или ник'})}

    price = PRICES[privilege]
    idempotence_key = str(uuid.uuid4())

    shop_id = os.environ['YUKASSA_SHOP_ID']
    secret_key = os.environ['YUKASSA_SECRET_KEY']
    credentials = base64.b64encode(f"{shop_id}:{secret_key}".encode()).decode()

    return_url = os.environ.get('SITE_URL', 'https://poehali.dev') + '?payment=success'

    payload = {
        'amount': {'value': price['amount'], 'currency': 'RUB'},
        'confirmation': {'type': 'redirect', 'return_url': return_url},
        'capture': True,
        'description': f"{price['label']} — {player_id}",
        'metadata': {
            'privilege': privilege,
            'player_id': player_id,
            'auth_type': auth_type,
            'access_flags': ACCESS_FLAGS[privilege],
        }
    }

    req = urllib.request.Request(
        'https://api.yookassa.ru/v3/payments',
        data=json.dumps(payload).encode(),
        headers={
            'Authorization': f'Basic {credentials}',
            'Content-Type': 'application/json',
            'Idempotence-Key': idempotence_key,
        },
        method='POST'
    )

    with urllib.request.urlopen(req) as resp:
        result = json.loads(resp.read())

    confirmation_url = result['confirmation']['confirmation_url']
    payment_id = result['id']

    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
        'body': json.dumps({'payment_id': payment_id, 'confirmation_url': confirmation_url})
    }
