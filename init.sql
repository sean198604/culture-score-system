SET NAMES utf8mb4;

-- ============================================================
-- EGO 企业文化积分系统 - 数据库初始化 SQL
-- ============================================================

CREATE DATABASE IF NOT EXISTS culture_score DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE culture_score;

-- --------------------------------------------------------
-- 部门表
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS departments (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE COMMENT '部门名称',
    code        VARCHAR(50)  NOT NULL UNIQUE COMMENT '部门编码',
    description TEXT COMMENT '描述',
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB COMMENT='部门表';

-- --------------------------------------------------------
-- 用户表
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(50)  NOT NULL UNIQUE COMMENT '用户名/工号',
    name          VARCHAR(50)  NOT NULL COMMENT '真实姓名',
    password_hash VARCHAR(255) NOT NULL COMMENT '密码哈希',
    department_id INT COMMENT '部门ID',
    role          ENUM('employee','admin','hr') DEFAULT 'employee' COMMENT '角色',
    email         VARCHAR(100) COMMENT '邮箱',
    phone         VARCHAR(20)  COMMENT '手机',
    avatar        VARCHAR(255) COMMENT '头像URL',
    is_active     TINYINT(1) DEFAULT 1 COMMENT '是否启用',
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='用户表';

-- --------------------------------------------------------
-- 积分规则表
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS score_rules (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL COMMENT '规则名称',
    category    VARCHAR(50)  NOT NULL COMMENT '分类（活动/培训/荣誉/其他）',
    channel     VARCHAR(100) COMMENT '积分渠道',
    description TEXT COMMENT '规则说明',
    min_score   DECIMAL(8,2) DEFAULT 0 COMMENT '最低分',
    max_score   DECIMAL(8,2) DEFAULT 100 COMMENT '最高分',
    is_active   TINYINT(1) DEFAULT 1,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB COMMENT='积分规则表';

-- --------------------------------------------------------
-- 员工积分记录表
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_scores (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL COMMENT '用户ID',
    rule_id     INT COMMENT '关联规则ID',
    score       DECIMAL(8,2) NOT NULL COMMENT '积分值（正为加分，负为扣分）',
    channel     VARCHAR(100) COMMENT '积分渠道',
    event_desc  TEXT COMMENT '事件描述',
    score_date  DATE NOT NULL COMMENT '积分日期',
    recorder    VARCHAR(50)  COMMENT '登记人',
    remark      TEXT COMMENT '备注',
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (rule_id) REFERENCES score_rules(id) ON DELETE SET NULL,
    INDEX idx_user_date (user_id, score_date),
    INDEX idx_score_date (score_date)
) ENGINE=InnoDB COMMENT='员工积分记录表';

-- --------------------------------------------------------
-- 团队积分记录表
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS team_scores (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    department_id INT NOT NULL COMMENT '部门ID',
    rule_id       INT COMMENT '关联规则ID',
    score         DECIMAL(8,2) NOT NULL COMMENT '积分值',
    channel       VARCHAR(100) COMMENT '积分渠道',
    event_desc    TEXT COMMENT '事件描述',
    score_date    DATE NOT NULL COMMENT '积分日期',
    recorder      VARCHAR(50) COMMENT '登记人',
    remark        TEXT COMMENT '备注',
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    FOREIGN KEY (rule_id) REFERENCES score_rules(id) ON DELETE SET NULL,
    INDEX idx_dept_date (department_id, score_date),
    INDEX idx_score_date (score_date)
) ENGINE=InnoDB COMMENT='团队积分记录表';

-- --------------------------------------------------------
-- 申诉表
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS appeals (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL COMMENT '申诉人ID',
    score_id    INT COMMENT '关联积分记录ID（可空）',
    title       VARCHAR(200) NOT NULL COMMENT '申诉标题',
    content     TEXT NOT NULL COMMENT '申诉内容',
    image_urls  TEXT COMMENT '图片URL列表（JSON数组）',
    status      ENUM('pending','approved','rejected') DEFAULT 'pending' COMMENT '审核状态',
    reviewer_id INT COMMENT '审核人ID',
    review_note TEXT COMMENT '审核意见',
    reviewed_at DATETIME COMMENT '审核时间',
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='申诉表';

-- ============================================================
-- 初始数据
-- ============================================================

-- 部门数据（来自Excel）
INSERT INTO departments (name, code) VALUES
('节日事业部', 'FESTIVAL'),
('日用百货部（一组）', 'DAILY1'),
('日用百货部（二组）', 'DAILY2'),
('日用百货部（三组）', 'DAILY3'),
('电商事业部', 'ECOM'),
('户外事业部', 'OUTDOOR'),
('日本事业部（一部）', 'JAPAN1'),
('日本事业部（二部）', 'JAPAN2'),
('移动光源部', 'LIGHT'),
('越南办事处', 'VIETNAM'),
('业务管理部', 'BIZOPS'),
('上海分公司', 'SHANGHAI'),
('行政管理部', 'ADMIN'),
('人力资源部', 'HR'),
('财务管理部', 'FINANCE'),
('惠州分公司', 'HUIZHOU'),
('视觉设计部', 'DESIGN'),
('单证部', 'DOCS'),
('管培生', 'TRAINEE')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 积分规则
INSERT INTO score_rules (name, category, channel, description, min_score, max_score) VALUES
('新春年会创意视频', '活动', '2026新春年会', '新春视频 创意奖励', 1, 10),
('新春年会普通视频', '活动', '2026新春年会', '新春视频 参与奖励', 1, 5),
('文化调研', '活动', '文化调研', '文化活动调研完成率达标', 1, 5),
('众瀚讲堂参训', '培训', '众瀚讲堂', '参加内部培训', 0.5, 3),
('内部期刊编辑', '荣誉', '内部期刊', '参与内刊编辑制作', 1, 10),
('内部期刊投稿', '活动', '内部期刊', '新人分享投稿', 1, 5),
('导师带教', '荣誉', '导师带教', '担任管培生导师', 1, 10),
('管培生轮岗', '荣誉', '管培生轮岗', '安排管培生导师', 1, 5),
('三八文化活动', '活动', '三八文化活动', '三八节文化活动参与', 1, 5),
('其他活动', '其他', '其他', '其他文化活动', 0.5, 20);

-- 管理员账号（密码: admin123，bcrypt hash）
INSERT INTO users (username, name, password_hash, role, is_active) VALUES
('admin', '系统管理员', '$2b$12$mRlEURuQift8OS9qMPZN6OHn17F55xCH25HW2L7hghzIwvzrzLqZu', 'admin', 1),
('hr_admin', 'HR管理员', '$2b$12$mRlEURuQift8OS9qMPZN6OHn17F55xCH25HW2L7hghzIwvzrzLqZu', 'hr', 1)
ON DUPLICATE KEY UPDATE name=VALUES(name);
