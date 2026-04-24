import React, { useEffect, useState } from 'react'
import { Table, Tag, Typography, DatePicker, Select, Space, Statistic, Row, Col } from 'antd'
import { LineChartOutlined } from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { scoresApi } from '../services/api'
import { useAuthStore } from '../store/authStore'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

export default function MyScoresPage() {
  const user = useAuthStore(s => s.user)
  const [data, setData] = useState({ items: [], total: 0 })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState(null)
  const [channel, setChannel] = useState(undefined)

  const fetchData = () => {
    setLoading(true)
    const params = { page, page_size: 20, user_id: user?.id }
    if (dateRange?.[0]) params.start_date = dateRange[0].format('YYYY-MM-DD')
    if (dateRange?.[1]) params.end_date = dateRange[1].format('YYYY-MM-DD')
    if (channel) params.channel = channel
    scoresApi.list(params).then(setData).finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [page, dateRange, channel])

  const totalScore = data.items.reduce((s, r) => s + Number(r.score), 0)

  // 按月聚合趋势
  const trendMap = {}
  data.items.forEach(r => {
    const m = dayjs(r.score_date).format('YYYY-MM')
    trendMap[m] = (trendMap[m] || 0) + Number(r.score)
  })
  const trendMonths = Object.keys(trendMap).sort()

  const trendOption = {
    backgroundColor: 'transparent',
    grid: { top: 10, right: 10, bottom: 30, left: 50 },
    xAxis: { type: 'category', data: trendMonths, axisLabel: { color: '#8899bb', fontSize: 11 }, axisLine: { lineStyle: { color: '#1e2d4a' } } },
    yAxis: { type: 'value', axisLabel: { color: '#8899bb' }, splitLine: { lineStyle: { color: '#1e2d4a', type: 'dashed' } } },
    series: [{
      data: trendMonths.map(m => trendMap[m]),
      type: 'bar',
      barWidth: '50%',
      itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#3b7dff' }, { offset: 1, color: '#00d4ff' }] }, borderRadius: [4,4,0,0] },
    }],
    tooltip: { trigger: 'axis', backgroundColor: '#141c2e', borderColor: '#1e2d4a', textStyle: { color: '#e8f0fe' } },
  }

  const columns = [
    { title: '日期', dataIndex: 'score_date', render: v => <Text style={{ color: '#8899bb', fontSize: 12 }}>{v}</Text> },
    { title: '积分渠道', dataIndex: 'channel', render: v => v ? <Tag color="blue">{v}</Tag> : '-' },
    { title: '事件描述', dataIndex: 'event_desc', ellipsis: true, render: v => <Text style={{ color: '#e8f0fe' }}>{v || '-'}</Text> },
    { title: '积分', dataIndex: 'score', align: 'right',
      render: v => <Text style={{ color: v >= 0 ? '#00e676' : '#ff4444', fontWeight: 700, fontSize: 15 }}>
        {v >= 0 ? '+' : ''}{v}
      </Text> },
    { title: '登记人', dataIndex: 'recorder', render: v => <Text style={{ color: '#8899bb', fontSize: 12 }}>{v || '-'}</Text> },
    { title: '备注', dataIndex: 'remark', ellipsis: true, render: v => <Text style={{ color: '#8899bb', fontSize: 12 }}>{v || '-'}</Text> },
  ]

  return (
    <div>
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        <LineChartOutlined style={{ color: '#3b7dff', fontSize: 22 }} />
        <Title level={4} style={{ color: '#e8f0fe', margin: 0 }}>我的积分流水</Title>
      </div>

      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={6}>
          <div className="stat-card">
            <Text style={{ color: '#8899bb', fontSize: 12 }}>本页积分合计</Text>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#3b7dff', marginTop: 6 }}>
              {totalScore.toFixed(1)} 分
            </div>
          </div>
        </Col>
        <Col span={18}>
          <div className="glass-card" style={{ padding: '12px 16px' }}>
            <ReactECharts option={trendOption} style={{ height: 80 }} />
          </div>
        </Col>
      </Row>

      <div className="glass-card" style={{ padding: 20 }}>
        <Space style={{ marginBottom: 16 }}>
          <RangePicker
            onChange={setDateRange}
            style={{ background: '#0f1525', borderColor: '#1e2d4a' }}
          />
          <Select
            allowClear placeholder="按渠道筛选"
            value={channel} onChange={setChannel}
            options={[...new Set(data.items.map(r => r.channel).filter(Boolean))].map(c => ({ value: c, label: c }))}
            style={{ width: 160 }}
          />
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
