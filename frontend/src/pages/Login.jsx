import React, { useState } from 'react'
import { Form, Input, Button, message, Typography } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../services/api'
import { useAuthStore } from '../store/authStore'

const { Title, Text } = Typography

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const setAuth = useAuthStore(s => s.setAuth)

  const onFinish = async (values) => {
    setLoading(true)
    try {
      const res = await authApi.login({ username: values.username, password: values.password })
      setAuth({ id: res.user_id, name: res.name, role: res.role, department_id: res.department_id }, res.access_token)
      message.success(`欢迎回来，${res.name}！`)
      // admin登录后直接跳转管理后台
      navigate(res.role === 'admin' ? '/admin' : '/')
    } catch (e) {
      message.error(typeof e === 'string' ? e : '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f4f7fb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        width: 420,
        background: '#ffffff',
        border: '1px solid #e8ecf2',
        borderRadius: 16,
        padding: '48px 40px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 64, height: 64, borderRadius: 16,
            background: 'linear-gradient(135deg, #4f6ef7, #818cf8)',
            marginBottom: 16, fontSize: 28,
          }}>🏆</div>
          <Title level={3} style={{ color: '#0f172a', margin: 0, fontWeight: 700 }}>EGO 文化积分系统</Title>
          <Text style={{ color: '#64748b', fontSize: 13 }}>企业文化积分管理平台</Text>
        </div>

        <Form onFinish={onFinish} size="large" layout="vertical">
          <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input
              prefix={<UserOutlined style={{ color: '#94a3b8' }} />}
              placeholder="用户名 / 工号"
              style={{ background: '#f8fafc', border: '1px solid #e8ecf2', color: '#0f172a', borderRadius: 9, height: 44 }}
            />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password
              prefix={<LockOutlined style={{ color: '#94a3b8' }} />}
              placeholder="密码"
              style={{ background: '#f8fafc', border: '1px solid #e8ecf2', color: '#0f172a', borderRadius: 9, height: 44 }}
            />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              style={{
                background: '#4f6ef7',
                borderColor: '#4f6ef7',
                borderRadius: 9, height: 44, fontWeight: 600, fontSize: 15,
              }}
            >
              登 录
            </Button>
          </Form.Item>
        </Form>

        <Text style={{ color: '#94a3b8', fontSize: 12, display: 'block', textAlign: 'center' }}>
          默认管理员：admin / Admin@123
        </Text>
      </div>
    </div>
  )
}
