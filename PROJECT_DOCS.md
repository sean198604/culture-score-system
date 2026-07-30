# EGO 文化积分系统 — 项目文档

## 目录

- [项目概况](#项目概况)
- [技术栈](#技术栈)
- [部署（Docker Compose）](#部署docker-compose)
- [默认账号](#默认账号)
- [数据备份与恢复](#数据备份与恢复)
- [数据库结构](#数据库结构)
- [常见问题](#常见问题)

---

## 项目概况

EGO 国际外贸公司内部企业文化积分管理平台。

- **前端**：排行榜 Dashboard + 个人/部门积分明细 + 公司文化轮播
- **后台**：员工管理、部门管理、积分规则、积分录入、申诉审核
- **数据源**：员工姓名.xlsx、积分导入模板

---

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 18 + Vite + Ant Design 5 + ECharts |
| 后端 | FastAPI + SQLAlchemy + Pydantic |
| 数据库 | MySQL 8.0 |
| 部署 | Docker Compose |
| 反向代理 | Nginx |

---

## 部署（Docker Compose）

### 启动

```bash
cd /c/Users/Administrator/Documents/Github/culture-score-systemv
docker-compose up -d --build
```

### 服务端口

| 服务 | 内网地址 | 说明 |
|------|---------|------|
| 前端 | http://192.168.1.246:7006 | Dashboard + Admin |
| 后端API | http://192.168.1.246:8001/docs | Swagger 文档 |
| MySQL | 127.0.0.1:3306 | 数据库 |

### Docker 容器名

| 容器 | 名称 |
|------|------|
| MySQL | culture-score-systemv-7006-mysql |
| 后端 | culture-score-systemv-7006-backend |
| 前端 | culture-score-systemv-7006-frontend |

### 网络

- 使用 Docker 默认 bridge 网络
- 服务间通过容器名互相访问（例：后端通过 `mysql:3306` 连接数据库）

---

## 默认账号

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | admin123 | 管理员 |
| hr | admin123 | HR（后台预置） |

---

## 数据备份与恢复

### 备份文件

备份根目录为项目根目录 `C:\Users\Administrator\Documents\Github\culture-score-systemv`：

| 文件 | 说明 |
|------|------|
| `backup_culture_score.sql` | MySQL 全量数据 dump |
| `restore_backup.sh` | 一键恢复脚本 |

备份包含所有表：

| 表 | 说明 | 约记录数 |
|----|------|---------|
| departments | 部门 | 20 |
| users | 员工 | 176 |
| score_rules | 积分对照规则 | 10 |
| user_scores | 个人积分流水 | ~192 |
| team_scores | 团队积分流水 | ~27 |
| appeals | 积分申诉 | 0 |

### Docker 卷持久化

`docker-compose.yml` 已配置命名卷，重启容器数据不会丢失：

```yaml
volumes:
  mysql_data:     # MySQL 数据目录 (/var/lib/mysql)
  uploads_data:   # 上传文件目录 (/app/uploads)
```

### 备份命令

```bash
# 手动备份数据库
docker exec culture-score-systemv-7006-mysql mysqldump \
  -u csuser -p'<DB_PASSWORD>' \
  --databases culture_score \
  --skip-lock-tables \
  --routines --triggers \
  --default-character-set=utf8mb4 \
  > backup_culture_score.sql
```

### 恢复命令

**方式一：从备份 SQL 文件恢复**

```bash
docker exec -i culture-score-systemv-7006-mysql \
  mysql -u csuser -p'<DB_PASSWORD>' culture_score \
  < backup_culture_score.sql
```

**方式二：使用恢复脚本**

```bash
bash restore_backup.sh
```

**方式三：从 Docker 卷恢复（Docker 重启无需操作）**

```bash
# Docker 卷已持久化，docker-compose up -d 重启数据不会丢失
# 如需彻底重建卷（⚠️ 会丢失数据）：
docker-compose down -v        # 删除所有卷
docker-compose up -d          # 启动空服务
docker exec -i culture-score-systemv-7006-mysql mysql -u csuser -p'<DB_PASSWORD>' culture_score < backup_culture_score.sql   # 恢复数据
```

### 数据导入注意事项

1. **init.sql**：首次启动时自动创建表结构（含 DEFAULT CURRENT_TIMESTAMP）
2. **MySQL 密码中的 @**：`DATABASE_URL` 中密码 `CsUser@<DB_PASSWORD>` 需 URL 编码为 `CsUser%40<DB_PASSWORD>`
3. **中文字符集**：连接参数需加 `?charset=utf8mb4`
4. **created_at 字段**：使用原始 SQL 插入时需显式指定 `NOW()`，否则可能为 NULL

---

## 数据库结构

### departments（部门表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK | 自增ID |
| name | VARCHAR(100) | 部门名称（唯一） |
| code | VARCHAR(50) | 部门编码（唯一） |
| description | TEXT | 描述 |
| created_at | DATETIME | 创建时间 |

### users（用户表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK | 自增ID |
| username | VARCHAR(50) | 用户名/工号（唯一） |
| name | VARCHAR(50) | 真实姓名 |
| password_hash | VARCHAR(255) | 密码哈希（bcrypt） |
| department_id | INT FK | 所属部门 |
| role | ENUM | employee / admin / hr |
| is_active | TINYINT(1) | 1=启用, 0=停用 |
| email | VARCHAR(100) | 邮箱 |
| phone | VARCHAR(20) | 手机 |
| created_at | DATETIME | 创建时间 |

### score_rules（积分规则表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK | 自增ID |
| name | VARCHAR(100) | 规则名称（渠道名称） |
| category | VARCHAR(50) | 分类（活动/培训/荣誉/其他） |
| channel | VARCHAR(100) | 积分渠道 |
| min_score | DECIMAL(8,2) | 最低分 |
| max_score | DECIMAL(8,2) | 最高分（默认积分） |
| is_active | TINYINT(1) | 1=启用 |
| created_at | DATETIME | 创建时间 |

### user_scores（员工积分记录表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK | 自增ID |
| user_id | INT FK | 用户ID |
| rule_id | INT FK | 关联规则ID |
| score | DECIMAL(8,2) | 积分值（正/负） |
| channel | VARCHAR(100) | 积分渠道 |
| event_desc | TEXT | 事件描述 |
| score_date | DATE | 积分日期 |
| recorder | VARCHAR(50) | 登记人 |
| remark | TEXT | 备注 |
| created_at | DATETIME | 创建时间 |

### team_scores（团队积分记录表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK | 自增ID |
| department_id | INT FK | 部门ID |
| rule_id | INT FK | 关联规则ID |
| score | DECIMAL(8,2) | 积分值 |
| channel | VARCHAR(100) | 积分渠道 |
| event_desc | TEXT | 事件描述 |
| score_date | DATE | 积分日期 |
| recorder | VARCHAR(50) | 登记人 |
| created_at | DATETIME | 创建时间 |

### appeals（积分申诉表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK | 自增ID |
| user_id | INT FK | 申诉人 |
| score_id | INT | 关联积分记录ID |
| title | VARCHAR(200) | 申诉标题 |
| content | TEXT | 申诉内容 |
| image_urls | TEXT | 图片链接 |
| status | VARCHAR(20) | pending / approved / rejected |
| reviewer_id | INT | 审核人ID |
| review_note | TEXT | 审核意见 |
| created_at | DATETIME | 创建时间 |

---

## 常见问题

### Q: 前端页面显示空白或数据不对

```bash
# 强制刷新浏览器缓存
Ctrl + Shift + R
# 或打开无痕窗口测试
```

### Q: 后端 API 返回 500

通过 Nginx 日志排查：

```bash
docker logs culture-score-systemv-7006-backend --tail 50 | grep -A 5 "ERROR\|Traceback"
docker logs culture-score-systemv-7006-frontend --tail 30 | grep -E " 4[0-9][0-9]| 5[0-9][0-9]"
```

### Q: 导入积分后员工列表人数不对

检查 `is_active` 字段是否都为 1：

```sql
UPDATE users SET is_active = 1 WHERE is_active IS NULL;
```

### Q: 管理后台新增部门提示"请求失败"

后端 `DepartmentCreate` 的 `code` 字段已设为可选（自动从 `name` 生成），如仍失败检查 Nginx 日志确认具体错误码。

### Q: 数据库密码中的特殊字符

MySQL 连接密码 `CsUser@<DB_PASSWORD>` 中的 `@` 在 URL 中需编码为 `%40`：

```
DATABASE_URL=mysql+pymysql://csuser:CsUser%40<DB_PASSWORD>@mysql:3306/culture_score?charset=utf8mb4
```

### Q: 如何查看当前数据状态

```bash
docker exec culture-score-systemv-7006-mysql mysql -u csuser -p'CsUser@<DB_PASSWORD>' culture_score -e "
SELECT 'departments' t, COUNT(*) FROM departments
UNION ALL SELECT 'users', COUNT(*) FROM users
UNION ALL SELECT 'score_rules', COUNT(*) FROM score_rules
UNION ALL SELECT 'user_scores', COUNT(*) FROM user_scores
UNION ALL SELECT 'team_scores', COUNT(*) FROM team_scores;
"
```
