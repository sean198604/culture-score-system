import React, { useEffect, useState } from 'react'
import { Tabs, Table, Select, Typography, Space, Tag, Spin, Input, Segmented, DatePicker } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { leaderboardApi, departmentsApi } from '../services/api'
import dayjs from 'dayjs'

const { Text } = Typography

const rankBadge = (v, isSearch) => {
  if (isSearch) return <Text style={{ color: '#94a3b8' }}>-</Text>
  if (v === 1) return <span style={{ fontSize: 20 }}>🥇</span>
  if (v === 2) return <span style={{ fontSize: 20 }}>🥈</span>
  if (v === 3) return <span style={{ color: '#cd7f32', fontSize: 20 }}>🥉</span>
  return <Text style={{ color: '#64748b' }}>#{v}</Text>
}

export default function LeaderboardPage() {
  const [type, setType] = useState('month')
  const [activeTab, setActiveTab] = useState('users')
  const [userData, setUserData] = useState({ items: [], total: 0 })
  const [deptData, setDeptData] = useState({ items: [], total: 0 })
  const [depts, setDepts] = useState([])
  const [deptFilter, setDeptFilter] = useState(undefined)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [searchTimeout, setSearchTimeout] = useState(null)
  const [availableMonths, setAvailableMonths] = useState([])
  const [selectedYear, setSelectedYear] = useState(2026)
  const [selectedMonth, setSelectedMonth] = useState(null)
  const [selectedQuarter, setSelectedQuarter] = useState(null)

  useEffect(() => {
    departmentsApi.list({ page_size: 100 }).then(r => setDepts(r.items || []))
  }, [])

  // 加载可用月份
  useEffect(() => {
    leaderboardApi.availableMonths()
      .then(data => {
        setAvailableMonths(data || [])
        if (data && data.length > 0) {
          setSelectedYear(data[0].year)
          setSelectedMonth(data[0].month)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = { type, page, page_size: 20 }
    if (searchText) params.search = searchText
    if (type === 'month' && selectedYear && selectedMonth) {
      params.year = selectedYear
      params.month = selectedMonth
    } else if (type === 'quarter' && selectedYear && selectedQuarter) {
      params.year = selectedYear
      params.quarter = selectedQuarter
    } else if (type === 'year' && selectedYear) {
      params.year = selectedYear
    }
    if (activeTab === 'users') {
      if (deptFilter) params.department_id = deptFilter
      leaderboardApi.users(params).then(setUserData).finally(() => setLoading(false))
    } else {
      leaderboardApi.departments(params).then(setDeptData).finally(() => setLoading(false))
    }
  }, [type, activeTab, page, deptFilter, searchText, selectedYear, selectedMonth, selectedQuarter])

  const handleSearch = (val) => {
    if (searchTimeout) clearTimeout(searchTimeout)
    const t = setTimeout(() => { setSearchText(val); setPage(1) }, 300)
    setSearchTimeout(t)
  }

  const hasSearch = !!searchText

  // 年份选项
  const yearOptions = [...new Set(availableMonths.map(m => m.year))].sort((a, b) => b - a)
    .map(y => ({ value: y, label: `${y}年` }))

  const userCols = [
    { title: '排名', dataIndex: 'rank', width: 70, align: 'center', render: (v) => rankBadge(v, hasSearch) },
    { title: '姓名', dataIndex: 'name', render: (v) => <Text style={{ color: '#0f172a', fontWeight: 500 }}>{v}</Text> },
    { title: '部门', dataIndex: 'department_name', render: (v) => v ? <Tag color="blue">{v}</Tag> : <Text style={{ color: '#64748b' }}>-</Text> },
    { title: '积分', dataIndex: 'total_score', align: 'right',
      render: (v) => <Text style={{ color: '#4f6ef7', fontWeight: 700, fontSize: 16 }}>{v}</Text> },
  ]

  // 部门榜列 - 去掉人均
  const deptCols = [
    { title: '排名', dataIndex: 'rank', width: 70, align: 'center', render: (v) => rankBadge(v, hasSearch) },
    { title: '部门', dataIndex: 'department_name', render: (v) => <Text style={{ color: '#0f172a', fontWeight: 500 }}>{v}</Text> },
    { title: '总积分', dataIndex: 'total_score', align: 'right',
      render: (v) => <Text style={{ color: '#f59e0b', fontWeight: 700, fontSize: 16 }}>{v}</Text> },
  ]

  // 时间选择器
  const renderPeriodSelector = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <Input
        prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
        placeholder={activeTab === 'users' ? '搜索姓名...' : '搜索部门...'}
        allowClear
        onChange={e => handleSearch(e.target.value)}
        style={{ width: 160 }}
      />
      {activeTab === 'users' && (
        <Select
          allowClear placeholder="筛选部门"
          value={deptFilter} onChange={v => { setDeptFilter(v); setPage(1) }}
          options={depts.map(d => ({ value: d.id, label: d.name }))}
          style={{ width: 150 }}
        />
      )}
      <Segmented
        value={type}
        onChange={v => { setType(v); setPage(1); setSelectedQuarter(null) }}
        options={[
          { label: '月榜', value: 'month' },
          { label: '季榜', value: 'quarter' },
          { label: '年榜', value: 'year' },
        ]}
      />
      <Select
        value={selectedYear}
        onChange={v => setSelectedYear(v)}
        options={yearOptions}
        style={{ width: 100 }}
      />
      {type === 'month' && (
        <DatePicker
          picker="month"
          value={selectedYear && selectedMonth ? dayjs(`${selectedYear}-${String(selectedMonth).padStart(2, '0')}`, 'YYYY-MM') : null}
          onChange={d => {
            if (d) { setSelectedYear(d.year()); setSelectedMonth(d.month() + 1) }
          }}
          allowClear={false}
          style={{ width: 140 }}
        />
      )}
      {type === 'quarter' && (
        <DatePicker
          picker="quarter"
          value={selectedYear && selectedQuarter ? dayjs(`${selectedYear}-${String((selectedQuarter - 1) * 3 + 1).padStart(2, '0')}`, 'YYYY-MM') : null}
          onChange={d => {
            if (d) { setSelectedYear(d.year()); setSelectedQuarter(d.quarter()) }
          }}
          allowClear={false}
          style={{ width: 150 }}
        />
      )}
    </div>
  )

  return (
    <div>
      <div className="glass-card" style={{ padding: 20 }}>
        <Tabs
          activeKey={activeTab}
          onChange={v => { setActiveTab(v); setPage(1); setSearchText('') }}
          tabBarExtraContent={renderPeriodSelector()}
          items={[
            { key: 'users', label: '👤 员工榜' },
            { key: 'depts', label: '🏢 部门榜' },
          ]}
        />
        <Spin spinning={loading}>
          {activeTab === 'users' ? (
            <Table
              dataSource={userData.items}
              columns={userCols}
              rowKey="user_id"
              pagination={{
                total: userData.total, current: page, pageSize: 20,
                onChange: setPage, showSizeChanger: false,
              }}
            />
          ) : (
            <Table
              dataSource={deptData.items}
              columns={deptCols}
              rowKey="department_id"
              pagination={{
                total: deptData.total, current: page, pageSize: 20,
                onChange: setPage, showSizeChanger: false,
              }}
            />
          )}
        </Spin>
      </div>
    </div>
  )
}
