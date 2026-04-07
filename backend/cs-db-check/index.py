import os
import json
import pymysql


def handler(event: dict, context) -> dict:
    """Проверяет структуру MySQL БД CS 1.6 — список таблиц и колонки."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type'}, 'body': ''}

    conn = pymysql.connect(
        host=os.environ['CS_MYSQL_HOST'],
        port=int(os.environ.get('CS_MYSQL_PORT', 3306)),
        user=os.environ['CS_MYSQL_USER'],
        password=os.environ['CS_MYSQL_PASSWORD'],
        database=os.environ['CS_MYSQL_DB'],
        charset='utf8',
        connect_timeout=10,
    )

    result = {}
    with conn.cursor() as cur:
        cur.execute("SHOW TABLES")
        tables = [row[0] for row in cur.fetchall()]
        result['tables'] = tables

        for table in tables:
            cur.execute(f"DESCRIBE `{table}`")
            result[table] = [{'field': r[0], 'type': r[1], 'null': r[2], 'key': r[3], 'default': r[4]} for r in cur.fetchall()]

    conn.close()

    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
        'body': json.dumps(result, ensure_ascii=False)
    }
