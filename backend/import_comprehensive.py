"""
综合导入脚本：先确保员工/部门完整存在，再导入积分
逻辑：
1. 从 员工姓名.xlsx 同步所有员工和部门到数据库
2. 从 个人积分导入模板06021.xlsx 导入积分
3. 如果积分中的员工不在库中，自动从员工姓名补充
"""

import pymysql
import pandas as pd
import sys
import os
from datetime import date

DB_CONFIG = dict(
    host=os.getenv('DB_HOST', 'mysql'),
    user=os.getenv('DB_USER', 'csuser'),
    password=os.getenv('DB_PASSWORD', ''),
    database=os.getenv('DB_NAME', 'culture_score'),
    charset='utf8mb4', cursorclass=pymysql.cursors.DictCursor
)

# 部门名称映射（Excel名称 -> DB名称）
DEPT_NAME_MAP = {
    "日用百货部（业务三组）": "日用百货部（三组）",
    "日用百货部\n（业务三组）": "日用百货部（三组）",
    "财务部": "财务管理部",
    "上海事业部": "上海分公司",
    "惠州研发中心": "惠州分公司",
    "总经理室": "行政管理部",
    "视觉设计部": "视觉设计部",
    "行政管理部": "行政管理部",
    "日本事业部": "日本事业部（一部）",
}

# 新增部门清单（Excel中有但DB中已存在的会跳过）
NEW_DEPTS = {
    "香港办事处": "HONGKONG",
    "总经理室": "GM_OFFICE",
    "惠州研发中心": "HUIZHOU_RD",
}

DEFAULT_PASSWORD_HASH = "$2b$12$LJ3m4ys3Lk0TSwHnLu2OcOX4EYCJ0I0pGiR1mQMn4gF0RwHVul7Si"  # admin123


def ensure_dept(cursor, dept_name):
    """确保部门存在，返回部门ID"""
    # 清理异常字符
    dept_name = dept_name.replace('\n', '').replace('\r', '').strip()
    if dept_name in DEPT_NAME_MAP:
        dept_name = DEPT_NAME_MAP[dept_name]
    cursor.execute("SELECT id FROM departments WHERE name=%s", (dept_name,))
    row = cursor.fetchone()
    if row:
        return row['id']
    # 新建部门
    code = NEW_DEPTS.get(dept_name, dept_name[:20].upper().replace('（', '').replace('）', '').replace(' ', '_'))
    cursor.execute("INSERT INTO departments (name, code, created_at, updated_at) VALUES (%s, %s, NOW(), NOW())", (dept_name, code))
    print(f"  [新建部门] {dept_name} ({code})")
    return cursor.lastrowid


def ensure_user(cursor, name, dept_id=None):
    """确保用户存在，返回用户ID"""
    cursor.execute("SELECT id FROM users WHERE name=%s", (name,))
    row = cursor.fetchone()
    if row:
        return row['id']
    username = f"emp_{pd.util.hash_pandas_object(pd.Series([name]))[0] % 1000000}"
    cursor.execute(
        "INSERT INTO users (username, name, password_hash, department_id, role, created_at, updated_at) VALUES (%s, %s, %s, %s, %s, NOW(), NOW())",
        (username, name, DEFAULT_PASSWORD_HASH, dept_id, 'employee')
    )
    print(f"  [新建员工] {name} (部门ID: {dept_id})")
    return cursor.lastrowid


def main():
    conn = pymysql.connect(**DB_CONFIG)
    cursor = conn.cursor()

    # ===== 第一步：同步 员工姓名.xlsx =====
    print("=" * 60)
    print("第一步：同步员工姓名.xlsx到数据库")
    print("=" * 60)
    df_emp = pd.read_excel('/tmp/员工姓名.xlsx')
    emp_names = set()
    created_emp = 0
    for _, row in df_emp.iterrows():
        name = str(row.get('姓名', '')).strip()
        if not name or name == 'nan':
            continue
        emp_names.add(name)
        dept_raw = str(row.get('部门', '') or '').strip()
        if dept_raw and dept_raw != 'nan':
            dept_id = ensure_dept(cursor, dept_raw)
        else:
            dept_id = None
        uid = ensure_user(cursor, name, dept_id)
        if uid:
            created_emp += 1
    conn.commit()
    print(f"\n员工姓名.xlsx 处理完成：总{len(emp_names)}人")

    # ===== 第二步：导入积分 =====
    print("\n" + "=" * 60)
    print("第二步：导入个人积分")
    print("=" * 60)
    df_score = pd.read_excel('/tmp/个人积分导入模板06021.xlsx')
    required = ["姓名", "积分", "积分日期"]
    for col in required:
        if col not in df_score.columns:
            print(f"错误：缺少列 '{col}'")
            sys.exit(1)

    # 可选列
    has_channel = "积分渠道" in df_score.columns
    has_event = "事件说明" in df_score.columns
    has_remark = "备注" in df_score.columns

    success, fail = 0, []
    for idx, row in df_score.iterrows():
        name = str(row.get("姓名", "")).strip()
        if not name or name == 'nan':
            fail.append(f"行{idx+2}: 姓名为空")
            continue

        # 检查用户是否存在
        cursor.execute("SELECT id FROM users WHERE name=%s", (name,))
        user_row = cursor.fetchone()
        if not user_row:
            # 自动从员工姓名中查找并补充
            if name in emp_names:
                dept_id = None
                emp_match = df_emp[df_emp['姓名'] == name]
                if len(emp_match) > 0:
                    dept_raw = str(emp_match.iloc[0].get('部门', '') or '').strip()
                    if dept_raw and dept_raw != 'nan':
                        dept_id = ensure_dept(cursor, dept_raw)
                uid = ensure_user(cursor, name, dept_id)
                conn.commit()
                print(f"  [自动补充] 员工 {name} 已创建（来自积分导入触发）")
            else:
                fail.append(f"行{idx+2}: 找不到用户 '{name}'（员工姓名中也无此名）")
                continue
            user_row = {'id': uid}

        try:
            score_date = pd.to_datetime(row["积分日期"]).date()
        except Exception:
            fail.append(f"行{idx+2}: {name}日期格式错误")
            continue

        score_val = float(row["积分"])
        channel = str(row.get("积分渠道", "") or "").strip() if has_channel else ""
        event_desc = str(row.get("事件说明", "") or "").strip() if has_event else ""
        remark = str(row.get("备注", "") or "").strip() if has_remark else ""

        sql = """INSERT INTO user_scores 
                 (user_id, score, channel, event_desc, score_date, recorder, created_at, updated_at)
                 VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW())"""
        cursor.execute(sql, (
            user_row['id'], score_val,
            channel or None, event_desc or None,
            score_date, "系统管理员"
        ))
        success += 1

    conn.commit()

    # ===== 第三步：结果汇总 =====
    print("\n" + "=" * 60)
    print("导入结果汇总")
    print("=" * 60)
    cursor.execute("SELECT COUNT(*) as cnt FROM departments")
    dept_cnt = cursor.fetchone()['cnt']
    cursor.execute("SELECT COUNT(*) as cnt FROM users")
    user_cnt = cursor.fetchone()['cnt']
    cursor.execute("SELECT COUNT(*) as cnt FROM user_scores")
    score_cnt = cursor.fetchone()['cnt']
    print(f"  部门总数: {dept_cnt}")
    print(f"  员工总数: {user_cnt}")
    print(f"  积分总数: {score_cnt}")
    print(f"  本次成功导入: {success} 条")
    if fail:
        print(f"  失败: {len(fail)} 条")
        for f in fail:
            print(f"    ❌ {f}")
    else:
        print("  失败: 0 条 ✅")

    cursor.close()
    conn.close()


if __name__ == '__main__':
    main()
