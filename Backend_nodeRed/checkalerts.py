from config.database import get_db_connection

c = get_db_connection()
cur = c.cursor(dictionary=True)

cur.execute("""
    SELECT id, device_id, status, created_at
    FROM alerts
    ORDER BY created_at DESC
    LIMIT 10
""")

for row in cur.fetchall():
    print(row)

c.close()