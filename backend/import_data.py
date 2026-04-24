"""
导入 Excel 初始数据到数据库 - 使用 zipfile 方式读取 xlsx
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import zipfile
import xml.etree.ElementTree as ET
from datetime import datetime, date, timedelta
from database import SessionLocal
import models
from auth import get_password_hash

ns_uri = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'

# Excel部门名 → 数据库部门名（处理繁简体差异和别名）
DEPT_NAME_MAP = {
    '戶外事业部': '户外事业部',
    '日本事业部': '日本事业部（一部）',
    '日本事业部一部': '日本事业部（一部）',
    '日本事业部二部': '日本事业部（二部）',
    '日用百货二组': '日用百货部（二组）',
    '日用百货三组': '日用百货部（三组）',
    '日用百货一组': '日用百货部（一组）',
    '上海事业部': '上海分公司',
    '日用百货部三组': '日用百货部（三组）',
    '日用百货部一组': '日用百货部（一组）',
    '日用百货部二组': '日用百货部（二组）',
    '财务部': '财务管理部',
}


def excel_serial_to_date(serial):
    if isinstance(serial, date):
        return serial
    try:
        serial_int = int(serial)
        base = date(1899, 12, 30)
        return base + timedelta(days=serial_int)
    except (ValueError, TypeError):
        if isinstance(serial, str) and '.' in serial:
            parts = serial.split('.')
            if len(parts) == 3:
                try:
                    return date(int(parts[0]), int(parts[1]), int(parts[2]))
                except ValueError:
                    return None
        return None


def load_shared_strings(zf):
    ss = []
    try:
        ss_tree = ET.parse(zf.open('xl/sharedStrings.xml'))
        for si in ss_tree.findall(f'.//{{{ns_uri}}}si'):
            texts = si.findall(f'{{{ns_uri}}}t')
            ss.append(''.join(t.text or '' for t in texts))
    except Exception:
        pass
    return ss


def read_sheet(zf, sheet_file, ss):
    tree = ET.parse(zf.open(sheet_file))
    rows_data = []
    for row in tree.findall(f'.//{{{ns_uri}}}row'):
        cells = {}
        for c in row.findall(f'{{{ns_uri}}}c'):
            ref = c.attrib.get('r', '')
            col = ''.join(ch for ch in ref if ch.isalpha())
            v = c.find(f'{{{ns_uri}}}v')
            t_attr = c.attrib.get('t', '')
            val = v.text if v is not None else ''
            if t_attr == 's' and val:
                val = ss[int(val)]
            cells[col] = val
        rows_data.append(cells)
    return rows_data


def map_dept_name(name):
    """映射Excel部门名到数据库部门名"""
    name = name.strip()
    # 先查映射表
    if name in DEPT_NAME_MAP:
        return DEPT_NAME_MAP[name]
    return name


def import_data(xlsx_path):
    db = SessionLocal()
    try:
        zf = zipfile.ZipFile(xlsx_path)
        ss = load_shared_strings(zf)

        # 读取现有部门
        dept_name_to_id = {}
        for d in db.query(models.Department).all():
            dept_name_to_id[d.name] = d.id
        print(f"数据库部门: {list(dept_name_to_id.keys())}")

        # 读取积分规则
        channel_to_rule = {}
        for r in db.query(models.ScoreRule).all():
            channel_to_rule[r.channel] = r.id

        # 读取现有用户
        user_name_to_id = {}
        for u in db.query(models.User).all():
            user_name_to_id[u.name] = u.id

        # 读取团队积分记录 (sheet2)
        team_rows = read_sheet(zf, 'xl/worksheets/sheet2.xml', ss)
        team_records = []
        for row_cells in team_rows[2:]:
            score_date_raw = row_cells.get('B', '')
            dept_name = row_cells.get('C', '')
            score_raw = row_cells.get('D', '')
            channel = row_cells.get('E', '')
            event_desc = row_cells.get('F', '')
            recorder = row_cells.get('G', '')

            if not dept_name or not score_raw:
                continue
            try:
                score = float(score_raw)
            except (ValueError, TypeError):
                continue
            score_date = excel_serial_to_date(score_date_raw)
            if not score_date:
                continue

            mapped_dept = map_dept_name(dept_name)
            team_records.append({
                'score_date': score_date, 'dept_name': mapped_dept,
                'score': score, 'channel': channel,
                'event_desc': event_desc, 'recorder': recorder,
            })

        # 读取员工积分记录 (sheet4)
        # 注意：sheet4 的数据从B列开始（A列空），所以列映射是 B/C/D/E/F/G/H
        emp_rows = read_sheet(zf, 'xl/worksheets/sheet4.xml', ss)
        employee_records = []
        for row_cells in emp_rows[2:]:
            score_date_raw = row_cells.get('B', '')
            dept_name = row_cells.get('C', '')
            name = row_cells.get('D', '')
            score_raw = row_cells.get('E', '')
            channel = row_cells.get('F', '')
            event_desc = row_cells.get('G', '')
            recorder = row_cells.get('H', '')

            if not name or not score_raw:
                continue
            try:
                score = float(score_raw)
            except (ValueError, TypeError):
                continue
            score_date = excel_serial_to_date(score_date_raw)
            if not score_date:
                continue

            mapped_dept = map_dept_name(dept_name)

            # 自动创建用户
            if name not in user_name_to_id and name != '-':
                dept_id = dept_name_to_id.get(mapped_dept)
                username = name
                existing_usernames = {u.username for u in db.query(models.User).all()}
                base_username = username
                counter = 1
                while username in existing_usernames:
                    username = f"{base_username}{counter}"
                    counter += 1

                new_user = models.User(
                    username=username, name=name,
                    password_hash=get_password_hash('123456'),
                    department_id=dept_id, role='employee', is_active=1,
                )
                db.add(new_user)
                db.flush()
                user_name_to_id[name] = new_user.id
                print(f"  新建用户: {name} (部门: {mapped_dept}, ID: {new_user.id})")

            employee_records.append({
                'score_date': score_date, 'dept_name': mapped_dept,
                'name': name, 'score': score, 'channel': channel,
                'event_desc': event_desc, 'recorder': recorder,
            })

        # 写入员工积分
        emp_count = 0
        for rec in employee_records:
            user_id = user_name_to_id.get(rec['name'])
            if not user_id:
                continue
            rule_id = channel_to_rule.get(rec['channel'])
            exists = db.query(models.UserScore).filter(
                models.UserScore.user_id == user_id,
                models.UserScore.score == rec['score'],
                models.UserScore.score_date == rec['score_date'],
                models.UserScore.channel == rec['channel'],
            ).first()
            if exists:
                continue
            db.add(models.UserScore(
                user_id=user_id, rule_id=rule_id, score=rec['score'],
                channel=rec['channel'], event_desc=rec['event_desc'],
                score_date=rec['score_date'], recorder=rec['recorder'],
            ))
            emp_count += 1

        # 写入团队积分
        team_count = 0
        for rec in team_records:
            dept_id = dept_name_to_id.get(rec['dept_name'])
            if not dept_id:
                print(f"  ⚠ 部门未找到: {rec['dept_name']}")
                continue
            rule_id = channel_to_rule.get(rec['channel'])
            exists = db.query(models.TeamScore).filter(
                models.TeamScore.department_id == dept_id,
                models.TeamScore.score == rec['score'],
                models.TeamScore.score_date == rec['score_date'],
                models.TeamScore.channel == rec['channel'],
            ).first()
            if exists:
                continue
            db.add(models.TeamScore(
                department_id=dept_id, rule_id=rule_id, score=rec['score'],
                channel=rec['channel'], event_desc=rec['event_desc'],
                score_date=rec['score_date'], recorder=rec['recorder'],
            ))
            team_count += 1

        # 更新 admin 密码
        admin = db.query(models.User).filter(models.User.username == 'admin').first()
        if admin:
            admin.password_hash = get_password_hash('Admin@123')
            print(f"  更新 admin 密码 hash")

        hr = db.query(models.User).filter(models.User.username == 'hr_admin').first()
        if hr:
            hr.password_hash = get_password_hash('Admin@123')
            print(f"  更新 hr_admin 密码 hash")

        db.commit()
        print(f"\n✅ 导入完成!")
        print(f"  员工积分记录: {emp_count} 条新增 (共{len(employee_records)}条)")
        print(f"  团队积分记录: {team_count} 条新增 (共{len(team_records)}条)")

    except Exception as e:
        db.rollback()
        print(f"❌ 导入失败: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == '__main__':
    xlsx_path = '/tmp/data.xlsx'
    if not os.path.exists(xlsx_path):
        print(f"❌ 文件不存在: {xlsx_path}")
        sys.exit(1)
    import_data(xlsx_path)
