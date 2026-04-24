# EGO 企业文化积分系统

> EGO INTERNATIONAL 企业文化积分管理平台，生产级全栈项目

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + Vite + Ant Design 5 + ECharts |
| 后端 | FastAPI + SQLAlchemy + Python 3.11 |
| 数据库 | MySQL 8.0 |
| 部署 | Docker + docker-compose + Nginx |

## 项目结构

```
culture-score-system/
├── backend/
│   ├── main.py              # FastAPI 入口
│   ├── config.py            # 配置管理
│   ├── database.py          # 数据库连接
│   ├── models.py            # SQLAlchemy 模型
│   ├── schemas.py           # Pydantic 数据校验
│   ├── auth.py              # JWT 认证
│   ├── routers/             # 路由模块
│   │   ├── auth.py          # 认证接口
│   │   ├── users.py         # 用户管理
│   │   ├── departments.py   # 部门管理
│   │   ├── rules.py         # 积分规则
│   │   ├── scores.py        # 员工积分
│   │   ├── team_scores.py   # 团队积分
│   │   ├── leaderboard.py   # 排行榜
│   │   ├── appeals.py       # 申诉管理
│   │   └── dashboard.py     # 仪表盘
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── main.jsx         # 应用入口
│   │   ├── styles/
│   │   │   └── global.css   # 全局深色主题
│   │   ├── store/
│   │   │   └── authStore.js # Zustand 状态管理
│   │   ├── services/
│   │   │   ├── request.js   # Axios 封装
│   │   │   └── api.js       # API 接口
│   │   ├── components/
│   │   │   └── AppLayout.jsx # 布局组件
│   │   └── pages/
│   │       ├── Login.jsx    # 登录
│   │       ├── Dashboard.jsx # 首页
│   │       ├── Leaderboard.jsx # 排行榜
│   │       ├── MyScores.jsx # 个人积分
│   │       ├── TeamScores.jsx # 团队积分
│   │       ├── Appeals.jsx  # 申诉
│   │       └── admin/       # 管理后台
│   │           ├── AdminUsers.jsx
│   │           ├── AdminRules.jsx
│   │           ├── AdminScores.jsx
│   │           ├── AdminTeamScores.jsx
│   │           ├── AdminDepartments.jsx
│   │           └── AdminAppeals.jsx
│   ├── nginx.conf
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
├── init.sql
└── README.md
```

## 快速启动（Docker）

### 前提条件
- Docker 20+
- docker-compose 2+

### 一键部署

```bash
# 克隆项目
git clone <repo-url>
cd culture-score-system

# 启动所有服务
docker-compose up -d --build

# 查看日志
docker-compose logs -f

# 访问
# 前端：http://localhost
# API文档：http://localhost:8000/api/docs
```

### 默认账号

| 账号 | 密码 | 角色 |
|------|------|------|
| admin | Admin@123 | 管理员 |
| hr_admin | Admin@123 | HR管理员 |

## 本地开发

### 后端

```bash
cd backend
pip install -r requirements.txt

# 配置数据库（本地MySQL）
export DATABASE_URL="mysql+pymysql://root:password@localhost:3306/culture_score"

# 初始化数据库
mysql -u root -p < ../init.sql

# 启动
uvicorn main:app --reload --port 8000
```

### 前端

```bash
cd frontend
npm install

# 启动开发服务器（代理到本地后端:8000）
npm run dev
# 访问 http://localhost:3000
```

## 功能模块

### 员工端
- **Dashboard**：个人积分、排名、趋势折线图、Top榜
- **排行榜**：员工/部门排行，支持月/季/年/总切换
- **积分流水**：个人历史积分，支持日期筛选
- **团队积分**：查看所在团队积分记录
- **积分申诉**：提交申诉（含图片），查看状态

### 管理后台（HR/Admin）
- **员工管理**：增删改查，支持Excel批量导入
- **积分规则**：维护积分渠道和分值规则
- **个人积分管理**：批量导入/手动录入员工积分
- **团队积分管理**：录入部门团队积分
- **部门管理**：维护组织架构
- **申诉审核**：通过/拒绝申诉，填写意见

## API 文档

启动后访问：http://localhost:8000/api/docs

### 关键接口示例

```bash
# 登录
curl -X POST http://localhost/api/auth/login \
  -d "username=admin&password=Admin@123"

# 获取排行榜（月度）
curl -H "Authorization: Bearer <token>" \
  "http://localhost/api/leaderboard/users?type=month&page=1&page_size=20"

# 获取部门排行（年度）
curl -H "Authorization: Bearer <token>" \
  "http://localhost/api/leaderboard/departments?type=year"

# 新增员工积分
curl -X POST http://localhost/api/scores \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"user_id":1,"score":5,"channel":"内部期刊","score_date":"2026-04-21","event_desc":"投稿获奖"}'
```

## Excel 导入格式

### 员工导入
| 姓名 | 用户名 | 部门 | 手机 | 邮箱 |
|------|--------|------|------|------|
| 张三 | zhang3 | HR部门 | 13800000000 | zhang@ego.com |

> 默认密码：`Ego@123456`，登录后请修改

### 积分导入
| 姓名 | 积分 | 积分日期 | 积分渠道 | 事件说明 | 备注 |
|------|------|---------|---------|---------|------|
| 张三 | 5 | 2026-04-21 | 内部期刊 | 文章投稿 | |

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| DATABASE_URL | - | 数据库连接串 |
| SECRET_KEY | - | JWT密钥（生产必改） |
| ACCESS_TOKEN_EXPIRE_MINUTES | 480 | Token有效期（分钟） |
| UPLOAD_DIR | /app/uploads | 上传文件目录 |

## 生产部署注意

1. **修改 docker-compose.yml 中所有密码**
2. **修改 SECRET_KEY** 为随机强密码
3. **配置 HTTPS**（建议在 Nginx 前加 Certbot）
4. **定期备份 MySQL 数据**

```bash
# 数据库备份
docker exec culture_mysql mysqldump -uroot -pCultureScore@2026 culture_score > backup_$(date +%Y%m%d).sql
```
