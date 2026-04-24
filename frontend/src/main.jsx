import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider, theme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import './styles/global.css'

import LoginPage from './pages/Login'
import AppLayout from './components/AppLayout'
import DashboardPage from './pages/Dashboard'
import LeaderboardPage from './pages/Leaderboard'
import AdminPage from './pages/admin/AdminPage'
import { useAuthStore } from './store/authStore'

/** 需要登录才能访问的路由 */
function PrivateRoute({ children }) {
  const token = useAuthStore(s => s.token)
  return token ? children : <Navigate to="/login" replace />
}

/** 仅管理员可访问的路由（必须admin角色+已登录） */
function AdminRoute({ children }) {
  const token = useAuthStore(s => s.token)
  const user = useAuthStore(s => s.user)
  if (!token) return <Navigate to="/login" replace />
  if (user?.role !== 'admin') return <Navigate to="/" replace />
  return children
}

const antdTheme = {
  algorithm: theme.defaultAlgorithm,
  token: {
    colorPrimary: '#4f6ef7',
    colorBgBase: '#f4f7fb',
    colorBgContainer: '#ffffff',
    colorBgElevated: '#ffffff',
    colorBorder: '#e8ecf2',
    colorText: '#0f172a',
    colorTextSecondary: '#64748b',
    borderRadius: 12,
    fontFamily: "'PingFang SC', 'Microsoft YaHei', sans-serif",
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ConfigProvider locale={zhCN} theme={antdTheme}>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* 前台页面：积分看板（Dashboard 含排行榜+图表） */}
        <Route path="/" element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
        </Route>

        {/* 管理后台：独立布局，不嵌套 AppLayout */}
        <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </ConfigProvider>
)
