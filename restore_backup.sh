#!/bin/bash
# EGO 文化积分系统 - 数据恢复脚本
# 从 backup_culture_score.sql 恢复数据库
# 使用方式: bash restore_backup.sh

echo "=== 恢复数据库 ==="
# 密码从环境变量读取，避免明文写入脚本：export DB_PASSWORD='...'
docker exec -i culture-score-systemv-7006-mysql mysql -u csuser -p"${DB_PASSWORD}" culture_score < backup_culture_score.sql
echo "✅ 数据库恢复完成"
