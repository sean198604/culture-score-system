import pymysql, bcrypt, pandas as pd, numpy as np

df = pd.read_excel('/tmp/个人积分.xlsx')
names = df['姓名'].dropna().astype(str).str.strip().unique().tolist()
print(f'Excel中共 {len(names)} 个不重复姓名')

conn = pymysql.connect(host='mysql', user='csuser', password='CsUser@2026', database='culture_score')
cur = conn.cursor()

pwd_hash = bcrypt.hashpw(b'admin123', bcrypt.gensalt()).decode()
inserted, skipped = 0, []
for name in names:
    cur.execute('SELECT id FROM users WHERE name=%s', (name,))
    if cur.fetchone():
        skipped.append(name)
        continue
    cur.execute(
        'INSERT INTO users (username, name, password_hash, role, is_active) VALUES (%s,%s,%s,%s,%s)',
        (name, name, pwd_hash, 'employee', 1)
    )
    inserted += 1

conn.commit()
print(f'已插入: {inserted} 条，跳过已存在: {len(skipped)} 条')
cur.execute('SELECT COUNT(*) FROM users')
print('用户总数:', cur.fetchone()[0])
conn.close()
print('完成！')
