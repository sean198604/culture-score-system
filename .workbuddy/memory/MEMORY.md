# MEMORY.md - 长期记忆

## 工作背景
EGO INTERNATIONAL 外贸公司员工，负责委外材料余额核对、AI效率平台开发及数据处理工具。
核心工作：claw-dashboard-portal外贸AI效率平台、ClairePPT（Excel转PPT）、产品市场调研工具。
技术栈：Docker Compose、Nginx反向代理、Flask，内网192.168.1.246（端口8888/7004/7005）。

## 个人偏好
- 中文沟通，偏好表格对比、直接方案、编号列表、分步中间结果
- 调试使用PowerShell（curl | ConvertFrom-Json）
- 迭代习惯：先输出→修正→重述完整逻辑

## EGO 文化积分系统（2026-04-21 完成）
**路径**：`c:\Users\Administrator\Documents\Github\culture-score-systemv`
**技术栈**：React+Vite+AntD5+ECharts / FastAPI+SQLAlchemy / MySQL 8.0 / Docker Compose
**功能**：员工Dashboard、排行榜、积分流水、申诉 + 管理后台（员工/规则/积分/部门/审核）
**数据来源**：EGO 文化积分平台丨2026.xlsx（19个部门，含节日/电商/户外等事业部）
**默认账号**：admin / Admin@123
**默认视图**：个人榜年榜（timeType=year, orgType=user）
**部署**：`docker-compose up -d --build`，前端:**7006**，API:8001/api/docs
**已知坑**：DATABASE_URL 密码含@需URL编码（`CsUser%402026`）；宿主机8000被其他容器占用，后端对外端口改为8001:8000；init.sql必须开头加`SET NAMES utf8mb4;`否则中文双重编码；DATABASE_URL需加`?charset=utf8mb4`；passlib和bcrypt4.x不兼容需直接用bcrypt库
**路由规则**：Dashboard/Leaderboard 公开访问无需登录；my-scores/team-scores/appeals 需登录；admin 需管理员角色
**UI风格**：亮色主题，对齐8888外贸AI效率平台（Tailwind Slate色板），主色#4f6ef7，背景#f4f7fb，卡片白#fff，边框#e8ecf2，文字#0f172a/#64748b
**布局**：顶栏大号Segmented(个人榜/部门榜)+时间维度；左侧排行榜(lg=6)大字体14px；右左列来源分布+积分日历(2图)右列CultureCard企业文化轮播（个人榜/部门榜统一显示，15秒3页自动切换：企业文化/积分介绍/获取渠道）
