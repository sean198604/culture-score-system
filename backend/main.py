from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from database import engine
import models
from config import get_settings

# ── 路由模块（对齐参考代码：user / score / ranking 分离）──────────
from routers import auth, users, departments, rules, scores, team_scores, leaderboard, appeals, dashboard, stats

settings = get_settings()

# 自动建表（生产环境建议用 alembic migrate）
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="EGO 企业文化积分系统",
    description="EGO INTERNATIONAL 企业文化积分管理平台",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 上传目录静态服务
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# ── 路由注册（prefix 统一由各 router 内部声明）────────────────────
# 对应关系:
#   auth       → /api/auth
#   users      → /api/users       (参考: user.router, prefix="/users")
#   scores     → /api/scores      (参考: score.router, prefix="/scores")
#   leaderboard→ /api/leaderboard (参考: ranking.router, prefix="/ranking")
#   departments→ /api/departments
#   rules      → /api/rules
#   team_scores→ /api/team-scores
#   appeals    → /api/appeals
#   dashboard  → /api/dashboard
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(departments.router)
app.include_router(rules.router)
app.include_router(scores.router)
app.include_router(team_scores.router)
app.include_router(leaderboard.router)
app.include_router(appeals.router)
app.include_router(dashboard.router)
app.include_router(stats.router)


@app.get("/health", tags=["健康检查"])
def health():
    return {"status": "ok", "service": "culture-score-system", "version": "1.0.0"}
