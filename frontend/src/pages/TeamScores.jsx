import React, { useEffect, useState } from 'react'
import { Table, Tag, Typography, Select, Space, DatePicker } from 'antd'
import { TeamOutlined } from '@ant-design/icons'
import { teamScoresApi, departmentsApi } from '../services/api'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

export default function TeamScoresPage() {
  const [data, setData] = useState({ items: [], total: 0 })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [depts, setDepts] = useState([])
  const [deptFilter, setDeptFilter] = useState(undefined)
  const [dateRange, setDateRange] = useState(null)

  useEffect(() => {
    departmentsApi.list({ page_size: 100 }).then(r => setDepts(r.items || []))
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = { page, page_size: 20 }
    if (deptFilter) params.department_id = deptFilter
    if (dateRange?.[0]) params.start_date = dateRange[0].format('YYYY-MM-DD')
    if (dateRange?.[1]) params.end_date = dateRange[1].format('YYYY-MM-DD')
    teamScoresApi.list(params).then(setData).finally(() => setLoading(false))
  }, [page, deptFilter, dateRange])

  const columns = [
    { title: '日期', dataIndex: 'score_date' },
    { title: '部门', dataIndex: 'department_name', render: v => <Tag color="geekblue">{v}</Tag> },
    { title: '积分渠道', dataIndex: 'channel', render: v => v ? <Tag color="cyan">{v}</Tag> : '-' },
    { title: '事件描述', dataIndex: 'event_desc', ellipsis: true },
    { title: '积分', dataIndex: 'score', align: 'right',
      render: v => <Text style={{ color: '#ffd700', fontWeight: 700, fontSize: 15 }}>+{v}</Text> },
    { title: '登记人', dataIndex: 'recorder', render: v => <Text style={{ color: '#8899bb', fontSize: 12 }}>{v || '-'}</Text> },
  ]

  return (
    <div>
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        <TeamOutlined style={{ color: '#00d4ff', fontSize: 22 }} />
        <Title level={4} style={{ color: '#e8f0fe', margin: 0 }}>团队积分明细</Title>
      </div>
      <div className="glass-card" style={{ padding: 20 }}>
        <Space style={{ marginBottom: 16 }}>
          <Select
            allowClear placeholder="筛选部门"
            value={deptFilter} onChange={v => { setDeptFilter(v); setPage(1) }}
            options={depts.map(d => ({ value: d.id, label: d.name }))}
            style={{ width: 180 }}
          />
          <RangePicker onChange={v => { setDateRange(v); setPage(1) }} />
        </Space>
        <Table
          loading={loading}
          dataSource={data.items}
          columns={columns}
          rowKey="id"
          pagination={{
            total: data.total, current: page, pageSize: 20,
            onChange: setPage, showSizeChanger: false,
          }}
        />
      </div>
    </div>
  )
}
