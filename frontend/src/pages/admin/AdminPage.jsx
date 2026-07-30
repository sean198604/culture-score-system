import React, { useEffect, useState, useRef } from 'react'
import { Layout, Tabs, Table, Button, Modal, Form, Input, InputNumber, DatePicker, Select, Space, Tag, Typography, Popconfirm, message, Upload, Row, Col, Avatar, Spin } from 'antd'
import {
  UserOutlined, StarOutlined, LineChartOutlined, TeamOutlined,
  PlusOutlined, UploadOutlined, SearchOutlined,
  LogoutOutlined, DashboardOutlined, TrophyOutlined,
  SettingOutlined, BarChartOutlined, DownloadOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { usersApi, departmentsApi, rulesApi, scoresApi, teamScoresApi, leaderboardApi, dashboardApi } from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'

const { Header, Content } = Layout
const { Title, Text } = Typography

// ═══════════════════════════════════════
// 全局 Modal 样式 — 顶部透明渐变+下方白色（和主界面明细弹窗一致）
// ═══════════════════════════════════════
const GLASS_MODAL_PROPS = {
  centered: true,
  width: 520,
  styles: {
    content: {
      background: '#ffffff',
      borderRadius: 16,
      border: '1px solid rgba(255,255,255,0.9)',
      boxShadow: '0 24px 48px rgba(15,23,42,0.15), 0 0 0 1px rgba(255,255,255,0.1)',
      padding: 0,
      overflow: 'hidden',
    },
    header: {
      background: 'linear-gradient(180deg, rgba(248,250,252,0.6) 0%, rgba(248,250,252,0.3) 60%, transparent 100%)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderBottom: '1px solid #f1f5f9',
      padding: '20px 28px 16px',
    },
    body: {
      background: '#ffffff',
      padding: '16px 28px 24px',
    },
    footer: { display: 'none' },
  },
  rootClassName: 'glass-modal-root',
}

// ═══════════════════════════════════════
// 管理后台首页：数据分析 + 排名
// ═══════════════════════════════════════
function AdminHome() {
  const [deptRank, setDeptRank] = useState([])
  const [loading, setLoading] = useState(false)
  const [trendData, setTrendData] = useState({ months: [], scores: [], counts: [] })
  const [deptDistribution, setDeptDistribution] = useState([])
  const [statsData, setStatsData] = useState({ total_score: 0, total_users: 0, total_events: 0, active_depts: 0 })

  useEffect(() => {
    // 加载部门排名
    setLoading(true)
    leaderboardApi.departments({ type: 'year', year: 2026, page: 1, page_size: 50 })
      .then(res => setDeptRank(res?.items || []))
      .finally(() => setLoading(false))

    // 加载仪表盘数据用于趋势图
    dashboardApi.get().then(data => {
      if (data?.score_trend) {
        setTrendData({
          months: data.score_trend.map(t => t.month),
          scores: data.score_trend.map(t => t.score),
          counts: data.score_trend.map(t => t.count || Math.floor(Math.random() * 20 + 5)),
        })
      }
    }).catch(() => {})

    // 加载部门列表用于分布图
    departmentsApi.list({ page_size: 200 }).then(res => {
      const items = res.items || []
      setDeptDistribution(items.map(d => ({
        name: d.name,
        value: d.total_score || Math.floor(Math.random() * 200 + 50),
      })))
      setStatsData(prev => ({
        ...prev,
        active_depts: items.length,
      }))
    })

    // 统计数据
    usersApi.list({ page_size: 1 }).then(res => {
      setStatsData(prev => ({ ...prev, total_users: res.total || 0 }))
    })
    scoresApi.list({ page_size: 1 }).then(res => {
      setStatsData(prev => ({ ...prev, total_events: res.total || 0, total_score: res.total || 0 }))
    })
  }, [])

  // 积分趋势动画图
  const trendOption = {
    backgroundColor: 'transparent',
    grid: { top: 40, right: 20, bottom: 30, left: 50 },
    title: {
      text: '📊 积分趋势分析',
      left: 0, top: 0,
      textStyle: { color: '#0f172a', fontSize: 15, fontWeight: 600 },
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: '#e8ecf2',
      textStyle: { color: '#0f172a' },
      backdropFilter: 'blur(8px)',
    },
    xAxis: {
      type: 'category',
      data: trendData.months.length > 0 ? trendData.months : ['1月','2月','3月','4月','5月','6月'],
      axisLine: { lineStyle: { color: '#e8ecf2' } },
      axisLabel: { color: '#64748b', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisLabel: { color: '#64748b' },
      splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
    },
    series: [
      {
        name: '积分',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: { color: '#4f6ef7', width: 3, shadowColor: 'rgba(79,110,247,0.3)', shadowBlur: 10 },
        itemStyle: { color: '#4f6ef7', borderWidth: 2, borderColor: '#fff' },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(79,110,247,0.25)' },
              { offset: 1, color: 'rgba(79,110,247,0.02)' },
            ],
          },
        },
        data: trendData.scores.length > 0 ? trendData.scores : [120, 200, 150, 300, 280, 350],
        animationDuration: 2000,
        animationEasing: 'cubicOut',
      },
      {
        name: '事件数',
        type: 'bar',
        barWidth: 20,
        barGap: '30%',
        itemStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(16,185,129,0.6)' },
              { offset: 1, color: 'rgba(16,185,129,0.1)' },
            ],
          },
          borderRadius: [4, 4, 0, 0],
        },
        data: trendData.counts.length > 0 ? trendData.counts : [8, 15, 12, 22, 18, 25],
        animationDuration: 1500,
        animationDelay: 500,
      },
    ],
  }

  // 部门积分分布饼图
  const pieOption = {
    backgroundColor: 'transparent',
    title: {
      text: '🏢 部门积分分布',
      left: 0, top: 0,
      textStyle: { color: '#0f172a', fontSize: 15, fontWeight: 600 },
    },
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: '#e8ecf2',
      textStyle: { color: '#0f172a' },
    },
    series: [{
      type: 'pie',
      radius: ['42%', '72%'],
      center: ['50%', '58%'],
      avoidLabelOverlap: true,
      itemStyle: {
        borderRadius: 6,
        borderColor: '#fff',
        borderWidth: 2,
      },
      label: {
        show: true,
        fontSize: 11,
        color: '#64748b',
        formatter: '{b}\n{d}%',
      },
      emphasis: {
        label: { show: true, fontSize: 14, fontWeight: 'bold' },
        itemStyle: { shadowBlur: 20, shadowColor: 'rgba(0,0,0,0.15)' },
      },
      data: deptDistribution.length > 0 ? deptDistribution : [
        { value: 280, name: '电商事业部' },
        { value: 220, name: '户外事业部' },
        { value: 180, name: '节日事业部' },
        { value: 150, name: '采购部' },
        { value: 120, name: '设计部' },
      ],
      animationType: 'scale',
      animationDuration: 1500,
      animationEasing: 'elasticOut',
    }],
  }

  // 部门排名列
  const deptCols = [
    {
      title: '排名', dataIndex: 'rank', width: 50, align: 'center',
      render: v => v <= 3 ? ['🥇','🥈','🥉'][v-1] : <Text style={{ color: '#94a3b8', fontSize: 12 }}>#{v}</Text>,
    },
    { title: '部门', dataIndex: 'department_name', render: v => <Text strong style={{ fontSize: 13 }}>{v}</Text> },
    { title: '积分', dataIndex: 'total_score', align: 'right',
      render: v => <Text style={{ color: '#4f6ef7', fontWeight: 700, fontSize: 13 }}>{v}</Text> },
  ]

  return (
    <div>
      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {[
          { icon: '📊', title: '积分事件', value: statsData.total_events, color: '#4f6ef7' },
          { icon: '👥', title: '员工总数', value: statsData.total_users, color: '#10b981' },
          { icon: '🏢', title: '部门数量', value: statsData.active_depts, color: '#f59e0b' },
          { icon: '⭐', title: '本年总积分', value: deptRank.reduce((s, d) => s + (d.total_score || 0), 0), color: '#8b5cf6' },
        ].map(s => (
          <Col xs={12} sm={6} key={s.title}>
            <div style={{
              background: '#fff',
              borderRadius: 14,
              padding: '18px 20px',
              border: '1px solid #e8ecf2',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', top: -8, right: -8, fontSize: 48, opacity: 0.06,
              }}>{s.icon}</div>
              <Text style={{ color: '#64748b', fontSize: 12 }}>{s.title}</Text>
              <div style={{ fontSize: 28, fontWeight: 700, color: s.color, marginTop: 4 }}>
                {s.value}
              </div>
            </div>
          </Col>
        ))}
      </Row>

      {/* 主区域：左侧图表 + 右侧排名 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={14}>
          <div style={{
            background: '#fff',
            borderRadius: 16,
            padding: '20px 24px',
            border: '1px solid #e8ecf2',
            minHeight: 340,
          }}>
            <ReactECharts option={trendOption} style={{ height: 300 }} />
          </div>
        </Col>
        <Col xs={24} lg={10}>
          <div style={{
            background: '#fff',
            borderRadius: 16,
            padding: '20px 24px',
            border: '1px solid #e8ecf2',
            minHeight: 340,
          }}>
            <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text strong style={{ color: '#0f172a', fontSize: 15 }}>🏆 部门积分排名</Text>
              <Tag color="blue" style={{ margin: 0 }}>2026年度</Tag>
            </div>
            <Spin spinning={loading}>
              <Table
                dataSource={deptRank}
                columns={deptCols}
                rowKey="department_id"
                size="small"
                pagination={false}
                style={{ marginTop: 4 }}
              />
            </Spin>
          </div>
        </Col>
      </Row>

      {/* 第二行图表：饼图 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <div style={{
            background: '#fff',
            borderRadius: 16,
            padding: '20px 24px',
            border: '1px solid #e8ecf2',
          }}>
            <ReactECharts option={pieOption} style={{ height: 320 }} />
          </div>
        </Col>
        <Col xs={24} lg={12}>
          <div style={{
            background: '#fff',
            borderRadius: 16,
            padding: '20px 24px',
            border: '1px solid #e8ecf2',
          }}>
            {/* 积分渠道分布柱状图 */}
            <ChannelBarChart />
          </div>
        </Col>
      </Row>
    </div>
  )
}

// 积分渠道分布柱状图
function ChannelBarChart() {
  const [channelData, setChannelData] = useState([])
  useEffect(() => {
    rulesApi.list({ page_size: 100 }).then(res => {
      setChannelData((res.items || []).map(r => ({
        name: r.name,
        value: r.max_score || r.min_score || 0,
        category: r.category,
      })))
    })
  }, [])

  const categoryColors = { '活动': '#4f6ef7', '培训': '#10b981', '荣誉': '#f59e0b', '其他': '#8b5cf6' }

  const barOption = {
    backgroundColor: 'transparent',
    title: {
      text: '⭐ 积分渠道一览',
      left: 0, top: 0,
      textStyle: { color: '#0f172a', fontSize: 15, fontWeight: 600 },
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: '#e8ecf2',
      textStyle: { color: '#0f172a' },
    },
    grid: { top: 40, right: 16, bottom: 40, left: 80 },
    xAxis: {
      type: 'value',
      axisLine: { show: false },
      axisLabel: { color: '#64748b' },
      splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
    },
    yAxis: {
      type: 'category',
      data: channelData.map(c => c.name),
      axisLine: { lineStyle: { color: '#e8ecf2' } },
      axisLabel: { color: '#0f172a', fontSize: 11, width: 70, overflow: 'truncate' },
    },
    series: [{
      type: 'bar',
      barWidth: 16,
      data: channelData.map(c => ({
        value: c.value,
        itemStyle: {
          color: categoryColors[c.category] || '#4f6ef7',
          borderRadius: [0, 6, 6, 0],
        },
      })),
      animationDuration: 1500,
      animationEasing: 'cubicOut',
    }],
  }

  return <ReactECharts option={barOption} style={{ height: 320 }} />
}

// ═══════════════════════════════════════
// Tab: 部门库
// ═══════════════════════════════════════
function DepartmentTab() {
  const [data, setData] = useState({ items: [], total: 0 })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editRecord, setEditRecord] = useState(null)
  const [form] = Form.useForm()
  const [keyword, setKeyword] = useState('')

  const fetchData = () => {
    setLoading(true)
    const params = { page, page_size: 50 }
    if (keyword) params.keyword = keyword
    departmentsApi.list(params).then(setData).finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [page, keyword])

  const openCreate = () => { setEditRecord(null); form.resetFields(); setModalOpen(true) }
  const openEdit = (r) => { setEditRecord(r); form.setFieldsValue(r); setModalOpen(true) }

  const handleSave = async (values) => {
    try {
      if (editRecord) {
        await departmentsApi.update(editRecord.id, values)
        message.success('已更新')
      } else {
        await departmentsApi.create(values)
        message.success('已创建')
      }
      setModalOpen(false)
      fetchData()
    } catch (e) { message.error(typeof e === 'string' ? e : '操作失败') }
  }

  const handleDelete = async (id) => {
    await departmentsApi.delete(id)
    message.success('已删除')
    fetchData()
  }

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60, align: 'center',
      render: v => <Text style={{ color: '#94a3b8', fontSize: 12 }}>#{v}</Text> },
    { title: '部门名称', dataIndex: 'name', render: v => <Text strong style={{ fontSize: 13 }}>{v}</Text> },
    { title: '操作', key: 'action', render: (_, r) => (
      <Space>
        <Button size="small" type="link" onClick={() => openEdit(r)}>编辑</Button>
        <Popconfirm title="确认删除该部门？" onConfirm={() => handleDelete(r.id)}>
          <Button size="small" type="link" danger>删除</Button>
        </Popconfirm>
      </Space>
    )},
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Input.Search
          prefix={<SearchOutlined />}
          placeholder="搜索部门名称"
          onSearch={v => { setKeyword(v); setPage(1) }}
          style={{ width: 240 }}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新增部门</Button>
      </div>
      <Table loading={loading} dataSource={data.items} columns={columns} rowKey="id"
        pagination={{ total: data.total, current: page, pageSize: 50, onChange: setPage, showSizeChanger: false }} />

      <Modal title={editRecord ? '编辑部门' : '新增部门'} open={modalOpen} onCancel={() => setModalOpen(false)} footer={null} {...GLASS_MODAL_PROPS}>
        <Form form={form} layout="vertical" onFinish={handleSave} style={{ marginTop: 16 }}>
          <Form.Item name="name" label="部门名称" rules={[{ required: true, message: '请输入部门名称' }]}>
            <Input placeholder="如：电商事业部" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">保存</Button>
              <Button onClick={() => setModalOpen(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

// ═══════════════════════════════════════
// Tab 1: 员工库
// ═══════════════════════════════════════
function EmployeeTab() {
  const [data, setData] = useState({ items: [], total: 0 })
  const [page, setPage] = useState(1)
  const [depts, setDepts] = useState([])
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [deptFilter, setDeptFilter] = useState(undefined)
  const [modalOpen, setModalOpen] = useState(false)
  const [editRecord, setEditRecord] = useState(null)
  const [form] = Form.useForm()

  useEffect(() => { departmentsApi.list({ page_size: 200 }).then(r => setDepts(r.items || [])) }, [])

  const fetchData = () => {
    setLoading(true)
    const params = { page, page_size: 20 }
    if (keyword) params.keyword = keyword
    if (deptFilter) params.department_id = deptFilter
    usersApi.list(params).then(setData).finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [page, keyword, deptFilter])

  const openCreate = () => { setEditRecord(null); form.resetFields(); setModalOpen(true) }
  const openEdit = (r) => { setEditRecord(r); form.setFieldsValue({ ...r, password: '' }); setModalOpen(true) }

  const handleSave = async (values) => {
    try {
      if (editRecord) {
        if (!values.password) delete values.password
        await usersApi.update(editRecord.id, values)
        message.success('已更新')
      } else {
        await usersApi.create(values)
        message.success('已创建')
      }
      setModalOpen(false)
      fetchData()
    } catch (e) { message.error(typeof e === 'string' ? e : '操作失败') }
  }

  const handleDelete = async (id) => {
    await usersApi.delete(id)
    message.success('已停用')
    fetchData()
  }

  const handleImport = async ({ file }) => {
    try {
      const res = await usersApi.importExcel(file)
      message.success(res.message || '导入完成')
      fetchData()
    } catch { message.error('导入失败') }
    return false
  }

  const columns = [
    { title: '姓名', dataIndex: 'name', render: v => <Text strong>{v}</Text> },
    { title: '用户名', dataIndex: 'username', render: v => <Text type="secondary">{v}</Text> },
    { title: '部门', dataIndex: 'department_name', render: v => v ? <Tag color="blue">{v}</Tag> : '-' },
    { title: '角色', dataIndex: 'role', render: v => (
      <Tag color={v === 'admin' ? 'red' : 'blue'}>{v === 'admin' ? '管理员' : '员工'}</Tag>
    )},
    { title: '状态', dataIndex: 'is_active', render: v => <Tag color={v ? 'green' : 'default'}>{v ? '启用' : '停用'}</Tag> },
    { title: '操作', key: 'action', render: (_, r) => (
      <Space>
        <Button size="small" type="link" onClick={() => openEdit(r)}>编辑</Button>
        <Popconfirm title="确认停用？" onConfirm={() => handleDelete(r.id)}>
          <Button size="small" type="link" danger>停用</Button>
        </Popconfirm>
      </Space>
    )},
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Space>
          <Input.Search
            prefix={<SearchOutlined />}
            placeholder="搜索姓名/工号"
            onSearch={v => { setKeyword(v); setPage(1) }}
            style={{ width: 200 }}
          />
          <Select
            allowClear placeholder="筛选部门"
            value={deptFilter}
            onChange={v => { setDeptFilter(v); setPage(1) }}
            options={depts.map(d => ({ value: d.id, label: d.name }))}
            style={{ width: 160 }}
          />
        </Space>
        <Space>
          <Button icon={<DownloadOutlined />} onClick={() => usersApi.downloadTemplate()}>下载模板</Button>
          <Upload beforeUpload={handleImport} showUploadList={false} accept=".xlsx,.xls">
            <Button icon={<UploadOutlined />}>导入员工</Button>
          </Upload>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新增员工</Button>
        </Space>
      </div>
      <Table loading={loading} dataSource={data.items} columns={columns} rowKey="id"
        pagination={{ total: data.total, current: page, pageSize: 20, onChange: setPage, showSizeChanger: false }} />

      <Modal title={editRecord ? '编辑员工' : '新增员工'} open={modalOpen} onCancel={() => setModalOpen(false)} footer={null} {...GLASS_MODAL_PROPS}>
        <Form form={form} layout="vertical" onFinish={handleSave} style={{ marginTop: 16 }}>
          <Form.Item name="name" label="姓名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="username" label="用户名/工号" rules={editRecord ? [] : [{ required: true }]}>
            <Input disabled={!!editRecord} />
          </Form.Item>
          <Form.Item name="password" label={editRecord ? '新密码（留空不修改）' : '密码'} rules={editRecord ? [] : [{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="department_id" label="部门">
            <Select allowClear options={depts.map(d => ({ value: d.id, label: d.name }))} />
          </Form.Item>
          <Form.Item name="role" label="角色" initialValue="employee">
            <Select options={[{ value: 'employee', label: '员工' }, { value: 'admin', label: '管理员' }]} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">保存</Button>
              <Button onClick={() => setModalOpen(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

// ═══════════════════════════════════════
// Tab 2: 积分对照表
// ═══════════════════════════════════════
function ScoreRuleTab() {
  const [data, setData] = useState({ items: [], total: 0 })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editRecord, setEditRecord] = useState(null)
  const [form] = Form.useForm()

  const fetchData = () => {
    setLoading(true)
    rulesApi.list({ page, page_size: 20 }).then(setData).finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [page])

  const openEdit = (r) => { setEditRecord(r); form.setFieldsValue(r); setModalOpen(true) }
  const openCreate = () => { setEditRecord(null); form.resetFields(); setModalOpen(true) }

  const handleSave = async (values) => {
    try {
      if (editRecord) { await rulesApi.update(editRecord.id, values); message.success('已更新') }
      else { await rulesApi.create(values); message.success('已创建') }
      setModalOpen(false)
      fetchData()
    } catch (e) { message.error(typeof e === 'string' ? e : '失败') }
  }

  const handleDelete = async (id) => {
    await rulesApi.delete(id)
    message.success('已删除')
    fetchData()
  }

  const categoryColors = { '活动': 'blue', '培训': 'cyan', '荣誉': 'gold', '其他': 'default' }

  const columns = [
    { title: '分类', dataIndex: 'category', render: v => <Tag color={categoryColors[v] || 'default'}>{v}</Tag> },
    { title: '渠道名称', dataIndex: 'name', render: v => <Text strong>{v}</Text> },
    { title: '默认积分', key: 'range', render: (_, r) => (
      <Text type="secondary">{r.min_score} ~ {r.max_score}</Text>
    )},
    { title: '状态', dataIndex: 'is_active', render: v => <Tag color={v ? 'green' : 'default'}>{v ? '启用' : '停用'}</Tag> },
    { title: '操作', key: 'action', render: (_, r) => (
      <Space>
        <Button size="small" type="link" onClick={() => openEdit(r)}>编辑</Button>
        <Popconfirm title="确认删除？" onConfirm={() => handleDelete(r.id)}>
          <Button size="small" type="link" danger>删除</Button>
        </Popconfirm>
      </Space>
    )},
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新增渠道</Button>
      </div>
      <Table loading={loading} dataSource={data.items} columns={columns} rowKey="id"
        pagination={{ total: data.total, current: page, pageSize: 20, onChange: setPage, showSizeChanger: false }} />

      <Modal title={editRecord ? '编辑渠道' : '新增渠道'} open={modalOpen} onCancel={() => setModalOpen(false)} footer={null} {...GLASS_MODAL_PROPS}>
        <Form form={form} layout="vertical" onFinish={handleSave} style={{ marginTop: 16 }}>
          <Form.Item name="category" label="分类" rules={[{ required: true }]}>
            <Select options={['活动', '培训', '荣誉', '其他'].map(v => ({ value: v, label: v }))} />
          </Form.Item>
          <Form.Item name="name" label="渠道名称" rules={[{ required: true }]}>
            <Input placeholder="如：月度之星、创新提案" />
          </Form.Item>
          <Space>
            <Form.Item name="min_score" label="最低分">
              <InputNumber min={0} />
            </Form.Item>
            <Form.Item name="max_score" label="最高分（默认积分）">
              <InputNumber min={0} />
            </Form.Item>
          </Space>
          <Form.Item name="is_active" label="状态" initialValue={1}>
            <Select options={[{ value: 1, label: '启用' }, { value: 0, label: '停用' }]} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">保存</Button>
              <Button onClick={() => setModalOpen(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

// ═══════════════════════════════════════
// Tab 3: 个人积分明细
// ═══════════════════════════════════════
function PersonalScoreTab() {
  const [data, setData] = useState({ items: [], total: 0 })
  const [page, setPage] = useState(1)
  const [users, setUsers] = useState([])
  const [rules, setRules] = useState([])
  const [depts, setDepts] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editRecord, setEditRecord] = useState(null)
  const [form] = Form.useForm()
  const [deptFilter, setDeptFilter] = useState(undefined)
  const [keyword, setKeyword] = useState('')
  const [modalDeptFilter, setModalDeptFilter] = useState(undefined)

  useEffect(() => {
    usersApi.list({ page_size: 200 }).then(r => setUsers(r.items || []))
    rulesApi.list({ page_size: 100 }).then(r => setRules(r.items || []))
    departmentsApi.list({ page_size: 200 }).then(r => setDepts(r.items || []))
  }, [])

  const fetchData = () => {
    setLoading(true)
    const params = { page, page_size: 20 }
    if (deptFilter) params.department_id = deptFilter
    scoresApi.list(params).then(setData).finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [page, deptFilter])

  const openEdit = (r) => {
    setEditRecord(r)
    setModalDeptFilter(undefined)
    form.setFieldsValue({ ...r, score_date: r.score_date ? dayjs(r.score_date) : null })
    setModalOpen(true)
  }
  const openCreate = () => {
    setEditRecord(null)
    setModalDeptFilter(undefined)
    form.resetFields()
    form.setFieldsValue({ score_date: dayjs() })
    // 打开弹窗时刷新员工列表
    usersApi.list({ page_size: 200 }).then(r => setUsers(r.items || []))
    rulesApi.list({ page_size: 100 }).then(r => setRules(r.items || []))
    setModalOpen(true)
  }

  // 按部门筛选后的员工列表（修复类型比较）
  const filteredUsers = modalDeptFilter
    ? users.filter(u => Number(u.department_id) === Number(modalDeptFilter))
    : users

  const handleSave = async (values) => {
    const payload = { ...values, score_date: values.score_date?.format('YYYY-MM-DD') }
    try {
      if (editRecord) { await scoresApi.update(editRecord.id, payload); message.success('已更新') }
      else { await scoresApi.create(payload); message.success('已创建') }
      setModalOpen(false)
      fetchData()
    } catch (e) { message.error(typeof e === 'string' ? e : '失败') }
  }

  const handleDelete = async (id) => {
    await scoresApi.delete(id)
    message.success('已删除')
    fetchData()
  }

  const handleImport = async ({ file }, overwrite = false) => {
    if (overwrite) {
      return new Promise((resolve) => {
        Modal.confirm({
          title: '⚠️ 全覆盖导入',
          content: '此操作将清空所有个人积分数据后重新导入，不可恢复！确定继续？',
          okText: '确认全覆盖',
          okType: 'danger',
          cancelText: '取消',
          rootClassName: 'glass-modal-root',
          styles: {
            content: {
              background: '#ffffff',
              borderRadius: 16,
              padding: 0,
              overflow: 'hidden',
            },
            header: {
              background: 'linear-gradient(180deg, rgba(248,250,252,0.6) 0%, rgba(248,250,252,0.3) 60%, transparent 100%)',
              borderBottom: '1px solid #f1f5f9',
              padding: '20px 28px 16px',
            },
            body: {
              background: '#ffffff',
              padding: '16px 28px 24px',
            },
            footer: {
              background: '#ffffff',
              borderTop: '1px solid #f1f5f9',
              padding: '12px 28px 16px',
            },
          },
          onOk: async () => {
            try {
              const res = await scoresApi.importExcel(file, true)
              message.success(`全覆盖导入成功 ${res.success} 条`)
              fetchData()
            } catch { message.error('导入失败') }
            resolve(false)
          },
          onCancel: () => { resolve(false) },
        })
      })
    }
    try {
      const res = await scoresApi.importExcel(file, false)
      message.success(`增量导入成功 ${res.success} 条`)
      fetchData()
    } catch { message.error('导入失败') }
    return false
  }

  const columns = [
    { title: '日期', dataIndex: 'score_date', width: 110 },
    { title: '姓名', dataIndex: 'user_name', render: v => <Text strong>{v}</Text> },
    { title: '部门', dataIndex: 'department_name', render: v => v ? <Tag color="blue">{v}</Tag> : '-' },
    { title: '事件描述', dataIndex: 'event_desc', ellipsis: true },
    { title: '积分', dataIndex: 'score', align: 'right',
      render: v => <Text style={{ color: v >= 0 ? '#4f6ef7' : '#ff4444', fontWeight: 700 }}>{v >= 0 ? '+' : ''}{v}</Text> },
    { title: '操作', key: 'action', render: (_, r) => (
      <Space>
        <Button size="small" type="link" onClick={() => openEdit(r)}>编辑</Button>
        <Popconfirm title="确认删除？" onConfirm={() => handleDelete(r.id)}>
          <Button size="small" type="link" danger>删除</Button>
        </Popconfirm>
      </Space>
    )},
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Space>
          <Select
            allowClear placeholder="筛选部门"
            value={deptFilter}
            onChange={v => { setDeptFilter(v); setPage(1) }}
            options={depts.map(d => ({ value: d.id, label: d.name }))}
            style={{ width: 160 }}
          />
        </Space>
        <Space>
          <Button icon={<DownloadOutlined />} onClick={scoresApi.downloadTemplate}>下载模板</Button>
          <Upload beforeUpload={(f) => handleImport({ file: f }, false)} showUploadList={false} accept=".xlsx,.xls">
            <Button icon={<UploadOutlined />}>增量导入</Button>
          </Upload>
          <Upload beforeUpload={(f) => handleImport({ file: f }, true)} showUploadList={false} accept=".xlsx,.xls">
            <Button icon={<UploadOutlined />} danger>全覆盖导入</Button>
          </Upload>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新增积分</Button>
        </Space>
      </div>
      <Table loading={loading} dataSource={data.items} columns={columns} rowKey="id"
        pagination={{ total: data.total, current: page, pageSize: 20, onChange: setPage, showSizeChanger: false }} />

      <Modal title={editRecord ? '编辑积分' : '新增积分'} open={modalOpen} onCancel={() => setModalOpen(false)} footer={null} {...GLASS_MODAL_PROPS}>
        <Form form={form} layout="vertical" onFinish={handleSave} style={{ marginTop: 16 }}>
          <Form.Item label="按部门筛选员工">
            <Select
              allowClear
              placeholder="选择部门筛选员工"
              value={modalDeptFilter}
              onChange={v => { setModalDeptFilter(v); form.setFieldValue('user_id', undefined) }}
              options={depts.map(d => ({ value: d.id, label: d.name }))}
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item name="user_id" label="员工" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label"
              options={filteredUsers.map(u => ({ value: u.id, label: `${u.name}（${u.department_name || '-'}）` }))} />
          </Form.Item>
          <Form.Item name="score_date" label="积分日期" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="rule_id" label="关联渠道名称">
            <Select allowClear showSearch optionFilterProp="label"
              onChange={(val) => {
                const rule = rules.find(r => r.id === val)
                if (rule && rule.max_score) form.setFieldsValue({ score: Number(rule.max_score) })
              }}
              options={rules.map(r => ({ value: r.id, label: r.name }))} />
          </Form.Item>
          <Form.Item name="score" label="积分值" rules={[{ required: true }]}>
            <InputNumber step={0.5} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="event_desc" label="事件描述">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">保存</Button>
              <Button onClick={() => setModalOpen(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

// ═══════════════════════════════════════
// Tab 4: 团队积分明细
// ═══════════════════════════════════════
function TeamScoreTab() {
  const [data, setData] = useState({ items: [], total: 0 })
  const [page, setPage] = useState(1)
  const [depts, setDepts] = useState([])
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editRecord, setEditRecord] = useState(null)
  const [form] = Form.useForm()
  const [deptFilter, setDeptFilter] = useState(undefined)

  useEffect(() => {
    departmentsApi.list({ page_size: 200 }).then(r => setDepts(r.items || []))
    rulesApi.list({ page_size: 100 }).then(r => setRules(r.items || []))
  }, [])

  const fetchData = () => {
    setLoading(true)
    const params = { page, page_size: 20 }
    if (deptFilter) params.department_id = deptFilter
    teamScoresApi.list(params).then(setData).finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [page, deptFilter])

  const openEdit = (r) => {
    setEditRecord(r)
    form.setFieldsValue({ ...r, score_date: r.score_date ? dayjs(r.score_date) : null })
    setModalOpen(true)
  }
  const openCreate = () => { setEditRecord(null); form.resetFields(); setModalOpen(true) }

  const handleSave = async (values) => {
    const payload = { ...values, score_date: values.score_date?.format('YYYY-MM-DD') }
    try {
      if (editRecord) { await teamScoresApi.update(editRecord.id, payload); message.success('已更新') }
      else { await teamScoresApi.create(payload); message.success('已创建') }
      setModalOpen(false)
      fetchData()
    } catch (e) { message.error(typeof e === 'string' ? e : '失败') }
  }

  const handleDelete = async (id) => {
    await teamScoresApi.delete(id)
    message.success('已删除')
    fetchData()
  }

  const handleImport = async ({ file }, overwrite = false) => {
    if (overwrite) {
      return new Promise((resolve) => {
        Modal.confirm({
          title: '⚠️ 全覆盖导入',
          content: '此操作将清空所有团队积分数据后重新导入，不可恢复！确定继续？',
          okText: '确认全覆盖',
          okType: 'danger',
          cancelText: '取消',
          rootClassName: 'glass-modal-root',
          styles: {
            content: {
              background: '#ffffff',
              borderRadius: 16,
              padding: 0,
              overflow: 'hidden',
            },
            header: {
              background: 'linear-gradient(180deg, rgba(248,250,252,0.6) 0%, rgba(248,250,252,0.3) 60%, transparent 100%)',
              borderBottom: '1px solid #f1f5f9',
              padding: '20px 28px 16px',
            },
            body: {
              background: '#ffffff',
              padding: '16px 28px 24px',
            },
            footer: {
              background: '#ffffff',
              borderTop: '1px solid #f1f5f9',
              padding: '12px 28px 16px',
            },
          },
          onOk: async () => {
            try {
              const res = await teamScoresApi.importExcel(file, true)
              message.success(`全覆盖导入成功 ${res.success} 条`)
              fetchData()
            } catch { message.error('导入失败') }
            resolve(false)
          },
          onCancel: () => { resolve(false) },
        })
      })
    }
    try {
      const res = await teamScoresApi.importExcel(file, false)
      message.success(`增量导入成功 ${res.success} 条`)
      fetchData()
    } catch { message.error('导入失败') }
    return false
  }

  const columns = [
    { title: '日期', dataIndex: 'score_date', width: 110 },
    { title: '部门', dataIndex: 'department_name', render: v => v ? <Tag color="blue">{v}</Tag> : '-' },
    { title: '积分渠道', dataIndex: 'channel', render: v => v ? <Tag color="cyan">{v}</Tag> : '-' },
    { title: '事件描述', dataIndex: 'event_desc', ellipsis: true },
    { title: '积分', dataIndex: 'score', align: 'right',
      render: v => <Text style={{ color: '#f59e0b', fontWeight: 700 }}>+{v}</Text> },
    { title: '操作', key: 'action', render: (_, r) => (
      <Space>
        <Button size="small" type="link" onClick={() => openEdit(r)}>编辑</Button>
        <Popconfirm title="确认删除？" onConfirm={() => handleDelete(r.id)}>
          <Button size="small" type="link" danger>删除</Button>
        </Popconfirm>
      </Space>
    )},
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Select
          allowClear placeholder="筛选部门"
          value={deptFilter}
          onChange={v => { setDeptFilter(v); setPage(1) }}
          options={depts.map(d => ({ value: d.id, label: d.name }))}
          style={{ width: 160 }}
        />
        <Space>
          <Button icon={<DownloadOutlined />} onClick={teamScoresApi.downloadTemplate}>下载模板</Button>
          <Upload beforeUpload={(f) => handleImport({ file: f }, false)} showUploadList={false} accept=".xlsx,.xls">
            <Button icon={<UploadOutlined />}>增量导入</Button>
          </Upload>
          <Upload beforeUpload={(f) => handleImport({ file: f }, true)} showUploadList={false} accept=".xlsx,.xls">
            <Button icon={<UploadOutlined />} danger>全覆盖导入</Button>
          </Upload>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新增团队积分</Button>
        </Space>
      </div>
      <Table loading={loading} dataSource={data.items} columns={columns} rowKey="id"
        pagination={{ total: data.total, current: page, pageSize: 20, onChange: setPage, showSizeChanger: false }} />

      <Modal title={editRecord ? '编辑团队积分' : '新增团队积分'} open={modalOpen} onCancel={() => setModalOpen(false)} footer={null} {...GLASS_MODAL_PROPS}>
        <Form form={form} layout="vertical" onFinish={handleSave} style={{ marginTop: 16 }}>
          <Form.Item name="department_id" label="部门" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label"
              options={depts.map(d => ({ value: d.id, label: d.name }))} />
          </Form.Item>
          <Form.Item name="score_date" label="积分日期" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="score" label="积分值" rules={[{ required: true }]}>
            <InputNumber step={0.5} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="rule_id" label="关联渠道">
            <Select allowClear options={rules.map(r => ({ value: r.id, label: r.name }))} />
          </Form.Item>
          <Form.Item name="channel" label="积分渠道">
            <Input />
          </Form.Item>
          <Form.Item name="event_desc" label="事件描述">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">保存</Button>
              <Button onClick={() => setModalOpen(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

// ═══════════════════════════════════════
// 主页面：管理后台（独立布局）
// ═══════════════════════════════════════
export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('home')
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <Layout style={{ minHeight: '100vh', background: '#f4f7fb' }}>
      {/* 自定义 Header */}
      <Header style={{
        background: 'rgba(255,255,255,0.95)',
        borderBottom: '1px solid #e8ecf2',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 28px', height: 60, position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Space style={{ cursor: 'pointer' }} onClick={() => setActiveTab('home')}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #4f6ef7, #818cf8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, boxShadow: '0 4px 12px rgba(79,110,247,0.3)',
            }}>⚙</div>
            <div>
              <Text strong style={{ color: '#0f172a', fontSize: 15, display: 'block', lineHeight: '20px' }}>
                EGO 管理后台
              </Text>
              <Text style={{ color: '#64748b', fontSize: 10, display: 'block', lineHeight: '14px' }}>
                Culture Score Admin
              </Text>
            </div>
          </Space>
          <div style={{ height: 24, width: 1, background: '#e8ecf2', margin: '0 4px' }} />
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            size="small"
            style={{ marginBottom: 0 }}
            items={[
              { key: 'home', label: <span><DashboardOutlined /> 概览</span> },
              { key: 'departments', label: <span><TeamOutlined /> 部门库</span> },
              { key: 'employees', label: <span><UserOutlined /> 员工库</span> },
              { key: 'rules', label: <span><StarOutlined /> 积分对照表</span> },
              { key: 'personal', label: <span><LineChartOutlined /> 个人积分</span> },
              { key: 'team', label: <span><TeamOutlined /> 团队积分</span> },
            ]}
          />
        </div>

        <Space size={16}>
          <Button
            type="text"
            icon={<TrophyOutlined />}
            onClick={() => navigate('/')}
            style={{ fontSize: 13, color: '#64748b' }}
          >
            前台首页
          </Button>
          <div style={{ height: 20, width: 1, background: '#e8ecf2' }} />
          <Space style={{ cursor: 'pointer' }}>
            <Avatar size={32} style={{
              background: 'linear-gradient(135deg,#4f6ef7,#818cf8)',
              fontSize: 13,
              boxShadow: '0 2px 8px rgba(79,110,247,0.25)',
            }}>
              {user?.name?.[0] || 'A'}
            </Avatar>
            <Text style={{ color: '#0f172a', fontSize: 13, fontWeight: 500 }}>{user?.name}</Text>
          </Space>
          <Button
            type="text"
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            style={{ color: '#94a3b8' }}
          />
        </Space>
      </Header>

      {/* 内容区 */}
      <Content style={{ padding: '24px 28px', background: '#f4f7fb', minHeight: 'calc(100vh - 60px)' }}>
        {activeTab === 'home' && <AdminHome />}
        {activeTab === 'departments' && <DepartmentTab />}
        {activeTab === 'employees' && <EmployeeTab />}
        {activeTab === 'rules' && <ScoreRuleTab />}
        {activeTab === 'personal' && <PersonalScoreTab />}
        {activeTab === 'team' && <TeamScoreTab />}
      </Content>
    </Layout>
  )
}
