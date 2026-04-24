import React from 'react'
import { Layout, Avatar, Dropdown, Typography, Space, Button } from 'antd'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  UserOutlined, LogoutOutlined, SettingOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '../store/authStore'

const { Header, Content } = Layout
const { Text } = Typography

export default function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const isLoggedIn = !!useAuthStore(s => s.token)
  const isAdmin = user?.role === 'admin'

  const userMenu = {
    items: [
      ...(isAdmin ? [
        { key: 'admin', icon: <SettingOutlined />, label: '管理后台' },
        { type: 'divider' },
      ] : []),
      { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true },
    ],
    onClick: ({ key }) => {
      if (key === 'admin') navigate('/admin')
      if (key === 'logout') { logout(); navigate('/') }
    }
  }

  // 判断当前路由高亮
  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{
        background: 'rgba(255,255,255,0.95)',
        borderBottom: '1px solid #e8ecf2',
        backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', height: 56, position: 'sticky', top: 0, zIndex: 100,
      }}>
        {/* 左侧：平台名称 + 导航 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Space
            style={{ cursor: 'pointer' }}
            onClick={() => navigate('/')}
          >
            <span style={{ fontSize: 22 }}>🏆</span>
            <div>
              <Text strong style={{ color: '#0f172a', fontSize: 15, whiteSpace: 'nowrap', display: 'block', lineHeight: '18px' }}>
                EGO 文化积分平台
              </Text>
              <Text style={{ color: '#64748b', fontSize: 10, whiteSpace: 'nowrap', display: 'block', lineHeight: '12px' }}>
                EGO INTERNATIONAL
              </Text>
            </div>
          </Space>
          <Button
            type={isActive('/') ? 'primary' : 'text'}
            size="small"
            onClick={() => navigate('/')}
            style={{ fontSize: 13 }}
          >
            积分看板
          </Button>
        </div>

        {/* 右侧：管理员入口/用户信息 */}
        <Space size={12}>
          {isAdmin && (
            <Button
              type={isActive('/admin') ? 'primary' : 'default'}
              icon={<SettingOutlined />}
              onClick={() => navigate('/admin')}
              style={{ fontSize: 13 }}
            >
              管理后台
            </Button>
          )}
          {isLoggedIn ? (
            <Dropdown menu={userMenu} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }}>
                <Avatar size={28} style={{ background: 'linear-gradient(135deg,#4f6ef7,#818cf8)', fontSize: 12 }}>
                  {user?.name?.[0] || 'U'}
                </Avatar>
                <Text style={{ color: '#0f172a', fontSize: 13 }}>{user?.name}</Text>
              </Space>
            </Dropdown>
          ) : (
            <Button
              type="primary"
              size="small"
              onClick={() => navigate('/login')}
              style={{ fontSize: 13 }}
            >
              登录
            </Button>
          )}
        </Space>
      </Header>

      <Content style={{ padding: 24, background: '#f4f7fb', minHeight: 'calc(100vh - 56px)' }}>
        <Outlet />
      </Content>
    </Layout>
  )
}
