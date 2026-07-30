import React, { useEffect, useState, useRef, useCallback } from 'react'
import { Row, Col, Typography, Segmented, Switch, Table, Tag, Select, DatePicker, Spin, Input, Modal, Button } from 'antd'
import ReactECharts from 'echarts-for-react'
import { statsApi, leaderboardApi } from '../services/api'
import { useAuthStore } from '../store/authStore'
import useDashboardStore from '../store/useDashboardStore'
import { SearchOutlined, UserOutlined, TeamOutlined, FileTextOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

const { Title, Text } = Typography

// ═══════════════════════════════════════
// 统一高度常量
// ═══════════════════════════════════════
const CARD_PADDING = 32       // 卡片padding top+bottom (16+16)
const CARD_BORDER = 2         // border
const CHART_AREA_BASE = 660   // 排行榜卡片内容高度
const RIGHT_HEIGHT = CHART_AREA_BASE + CARD_PADDING + CARD_BORDER  // ≈694

// 左侧2图（去掉积分趋势）：均分总高度（减去1个gutter=16）
const LEFT_GUTTER = 16 * 1    // 2个卡片之间1个间距
const LEFT_CARD_HEIGHT = Math.floor((RIGHT_HEIGHT - LEFT_GUTTER) / 2)  // 每个卡片高度 ≈339
const LEFT_CHART_HEIGHT = LEFT_CARD_HEIGHT - CARD_PADDING - CARD_BORDER  // 图表高度 ≈305

// 排行榜表格滚动高度 = 卡片内容高度 - 标题 - 搜索框 - 表格头
const RANKING_SCROLL_Y = CHART_AREA_BASE - 100  // ≈560
// ═══════════════════════════════════════
function Ranking({ data, store, onDetail }) {
  const isUser = store.orgType === 'user'

  const columns = [
    {
      title: '#', width: 30, align: 'center',
      render: (_, __, i) => i + 1 <= 3
        ? ['🥇','🥈','🥉'][i]
        : <Text style={{ color: '#94a3b8', fontSize: 11 }}>{i + 1}</Text>,
    },
    {
      title: isUser ? '姓名' : '部门',
      dataIndex: 'name',
      width: 150,
      ellipsis: true,
      render: (v, r) => (
        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <Text strong style={{ color: '#0f172a', fontSize: 14 }}>{v}</Text>
          {isUser && r.department_name && (
            <Text style={{ color: '#94a3b8', fontSize: 10, marginLeft: 4 }}>{r.department_name}</Text>
          )}
        </div>
      ),
    },
    {
      title: '积分', dataIndex: 'score', align: 'right', width: 48,
      render: v => <Text style={{ color: '#4f6ef7', fontWeight: 700, fontSize: 14 }}>{v}</Text>,
    },
    {
      title: '', width: 30, align: 'center',
      render: (_, r) => (
        <Button
          type="link"
          size="small"
          icon={<FileTextOutlined />}
          style={{ fontSize: 11, padding: 0, color: '#4f6ef7' }}
          onClick={(e) => { e.stopPropagation(); onDetail(r) }}
        />
      ),
    },
  ]

  return (
    <Table
      dataSource={data}
      columns={columns}
      rowKey="id"
      size="small"
      pagination={false}
      scroll={{ y: RANKING_SCROLL_Y }}
      onRow={(record) => ({
        onClick: () => {
          store.setSelectedId(record.id === store.selectedId ? null : record.id)
        },
        style: {
          cursor: 'pointer',
          background: record.id === store.selectedId ? 'rgba(79,110,247,0.08)' : 'transparent',
          transition: 'background 0.2s',
        },
      })}
    />
  )
}

// ═══════════════════════════════════════
// 来源分布饼图（原渠道分布，放大版）
// ═══════════════════════════════════════
function CategoryChart({ data, store, height }) {
  const chartRef = useRef(null)

  const option = {
    backgroundColor: 'transparent',
    title: {
      text: '🎯 来源分布',
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
      radius: ['28%', '55%'],
      center: ['50%', '56%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      label: { show: true, fontSize: 11, color: '#64748b', formatter: '{b}\n{d}%' },
      emphasis: {
        label: { show: true, fontSize: 14, fontWeight: 'bold' },
        itemStyle: { shadowBlur: 12, shadowColor: 'rgba(0,0,0,0.12)' },
      },
      data,
      animationType: 'scale',
      animationDuration: 1000,
      animationEasing: 'elasticOut',
    }],
  }

  const handleChartClick = useCallback((params) => {
    store.setCategory(params.name === store.category ? null : params.name)
  }, [store])

  return (
    <ReactECharts
      ref={chartRef}
      option={option}
      style={{ height }}
      onEvents={{ click: handleChartClick }}
    />
  )
}

// ═══════════════════════════════════════
// 部门积分柱状图 / 个人积分排序 Top10
// ═══════════════════════════════════════
function DepartmentChart({ data, store, height, isUser }) {
  // 个人榜/部门榜：都取Top10
  const displayData = [...data].slice(0, 10).reverse()
  const colors = ['#4f6ef7', '#818cf8', '#6366f1', '#a78bfa', '#c084fc', '#e879f9', '#f472b6', '#fb923c', '#fbbf24', '#34d399']

  const chartTitle = isUser ? '👤 个人积分 Top10' : '🏢 部门积分 Top10'

  const option = {
    backgroundColor: 'transparent',
    title: {
      text: chartTitle,
      left: 0, top: 0,
      textStyle: { color: '#0f172a', fontSize: 15, fontWeight: 600 },
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: '#e8ecf2',
      textStyle: { color: '#0f172a' },
    },
    grid: { top: 40, right: 12, bottom: 20, left: isUser ? 70 : 90 },
    xAxis: {
      type: 'value',
      axisLine: { show: false },
      axisLabel: { color: '#64748b' },
      splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
    },
    yAxis: {
      type: 'category',
      data: displayData.map(i => i.name),
      axisLine: { lineStyle: { color: '#e8ecf2' } },
      axisLabel: { color: '#0f172a', fontSize: 11, width: isUser ? 55 : 75, overflow: 'truncate' },
    },
    series: [{
      type: 'bar',
      barWidth: 16,
      data: displayData.map((d, i) => ({
        value: d.score,
        itemStyle: {
          color: d.id === store.selectedId ? '#4f6ef7' : colors[i % colors.length],
          borderRadius: [0, 5, 5, 0],
          opacity: d.id === store.selectedId ? 1 : 0.75,
        },
      })),
      animationDuration: 1000,
      animationEasing: 'cubicOut',
    }],
  }

  const handleChartClick = useCallback((params) => {
    const clicked = displayData[params.dataIndex]
    if (clicked) {
      store.setSelectedId(clicked.id === store.selectedId ? null : clicked.id)
    }
  }, [displayData, store])

  return (
    <ReactECharts
      option={option}
      style={{ height }}
      onEvents={{ click: handleChartClick }}
    />
  )
}

// ═══════════════════════════════════════
// 企业文化卡片 — 渐变轮播（部门榜右侧）
// ═══════════════════════════════════════
function CultureCard({ height }) {
  const [page, setPage] = useState(0)
  const totalPages = 3

  // 15秒自动切换
  useEffect(() => {
    const timer = setInterval(() => {
      setPage(p => (p + 1) % totalPages)
    }, 15000)
    return () => clearInterval(timer)
  }, [])

  // ── 第1页：企业文化 ──
  const values = [
    {
      icon: '🤝', title: '1. 客户至上、多方共赢',
      points: ['让客户获得成功，让用户获得满意。', '客户思维贯穿始终。', '让合作伙伴获益，与供应商共成长。'],
    },
    {
      icon: '❤️', title: '2. 以人为本、共同富裕',
      points: ['诚信诚实、廉洁自律。', '忠诚团结、集体智慧。', '公平公正、协同共享。', '认真生活、快乐工作。'],
    },
    {
      icon: '🚀', title: '3. 高效高质、创新求变',
      points: ['一切工作要以高效、高质的结果为导向。', '企业的竞争力以不断创新和变革为核心。', '居安思危，可持续性发展。'],
    },
  ]

  const pageCulture = (
    <div style={{ height, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* 使命 */}
      <div style={{
        background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
        borderRadius: 12, padding: '14px 18px', border: '1px solid #c7d2fe',
      }}>
        <Text style={{ color: '#4f6ef7', fontSize: 12, fontWeight: 600, letterSpacing: 1 }}>🎯 使命</Text>
        <div style={{ marginTop: 4 }}>
          <Text style={{ color: '#1e293b', fontSize: 17, fontWeight: 700 }}>让客户信任！让员工幸福！</Text>
        </div>
      </div>
      {/* 愿景 */}
      <div style={{
        background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
        borderRadius: 12, padding: '14px 18px', border: '1px solid #bbf7d0',
      }}>
        <Text style={{ color: '#16a34a', fontSize: 12, fontWeight: 600, letterSpacing: 1 }}>🔭 愿景</Text>
        <div style={{ marginTop: 4 }}>
          <Text style={{ color: '#1e293b', fontSize: 17, fontWeight: 700 }}>成为高效、高质的新型外贸企业领跑者。</Text>
        </div>
      </div>
      {/* 价值观 */}
      <div style={{
        background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
        borderRadius: 12, padding: '14px 18px', border: '1px solid #fde68a',
      }}>
        <Text style={{ color: '#d97706', fontSize: 12, fontWeight: 600, letterSpacing: 1 }}>⭐ 价值观</Text>
        <div style={{ marginTop: 8 }}>
          {values.map((v, i) => (
            <div key={i} style={{ marginBottom: i < values.length - 1 ? 10 : 0 }}>
              <Text style={{ color: '#0f172a', fontSize: 14, fontWeight: 700 }}>{v.icon} {v.title}</Text>
              <div style={{ marginLeft: 24, marginTop: 3 }}>
                {v.points.map((p, j) => (
                  <div key={j}>
                    <Text style={{ color: '#475569', fontSize: 12, lineHeight: '20px' }}>• {p}</Text>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Slogan 独立卡片 */}
      <div style={{
        background: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)',
        borderRadius: 12, padding: '12px 18px', border: '1px solid #c4b5fd',
        textAlign: 'center',
      }}>
        <Text style={{ color: '#4f6ef7', fontSize: 15, fontWeight: 800, letterSpacing: 2, fontStyle: 'italic', whiteSpace: 'nowrap' }}>
          WORK HARD, WORK SMART, HAVE FUN!
        </Text>
      </div>
    </div>
  )

  // ── 第2页：文化积分介绍 ──
  const pageIntro = (
    <div style={{
      height, display: 'flex', flexDirection: 'column', justifyContent: 'center',
      background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 40%, #e0e7ff 100%)',
      borderRadius: 16, padding: '28px 24px', border: '1px solid #bfdbfe',
    }}>
      <div style={{ width: '100%', maxWidth: 360, margin: '-150px auto 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* 标题1：文化积分介绍 */}
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: 28 }}>🏆</span>
          <div style={{ marginTop: 6 }}>
            <Text style={{ color: '#1e40af', fontSize: 18, fontWeight: 700 }}>文化积分介绍</Text>
          </div>
        </div>
        {/* 正文1 */}
        <div style={{ background: 'rgba(255,255,255,0.6)', borderRadius: 12, padding: '14px 20px' }}>
          <Text style={{ color: '#1e293b', fontSize: 13, lineHeight: '24px', display: 'block' }}>
            为倡导正向积极的工作氛围，加深对公司文化价值观的理解，公司为每位员工设立积分账户，在达成特定事项（跟公司文化相关）后给予积分奖励，保障企业文化的落地。
          </Text>
        </div>
        {/* 标题2：众瀚国贸文化市集 */}
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: 28 }}>🎉</span>
          <div style={{ marginTop: 6 }}>
            <Text style={{ color: '#1e40af', fontSize: 18, fontWeight: 700 }}>众瀚国贸文化市集</Text>
          </div>
        </div>
        {/* 正文2 */}
        <div style={{ background: 'rgba(255,255,255,0.6)', borderRadius: 12, padding: '14px 20px' }}>
          <Text style={{ color: '#1e293b', fontSize: 13, lineHeight: '24px', display: 'block' }}>
            每年年底举办，届时员工们可根据自己手中所持的文化积分进行相应礼品的兑换。
          </Text>
        </div>
      </div>
    </div>
  )

  // ── 第3页：积分获取渠道 ──
  const channels = [
    { icon: '👤', name: '选才内推', color: '#4f6ef7' },
    { icon: '🎪', name: '文化活动', color: '#8b5cf6' },
    { icon: '🌸', name: '《众瀚四季》', color: '#ec4899' },
    { icon: '🏃', name: '社团组织', color: '#f59e0b' },
    { icon: '📖', name: '知识分享', color: '#10b981' },
    { icon: '🤝', name: '新人帮带', color: '#06b6d4' },
  ]

  const pageChannels = (
    <div style={{
      height, display: 'flex', flexDirection: 'column',
      background: 'linear-gradient(135deg, #fdf4ff 0%, #fae8ff 30%, #f5d0fe 60%, #e9d5ff 100%)',
      borderRadius: 16, padding: '24px', border: '1px solid #e9d5ff',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>✨</div>
        <Text style={{ color: '#7c3aed', fontSize: 20, fontWeight: 800 }}>积分获取渠道</Text>
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, flex: 1, alignContent: 'center',
      }}>
        {channels.map((ch, i) => (
          <div key={i} style={{
            background: 'rgba(255,255,255,0.7)',
            backdropFilter: 'blur(8px)',
            borderRadius: 12,
            padding: '16px 12px',
            textAlign: 'center',
            border: `1px solid ${ch.color}22`,
            boxShadow: `0 2px 8px ${ch.color}11`,
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>{ch.icon}</div>
            <Text style={{ color: '#1e293b', fontSize: 14, fontWeight: 700 }}>{ch.name}</Text>
          </div>
        ))}
      </div>
      <div style={{
        textAlign: 'center', marginTop: 16,
        background: 'rgba(124,58,237,0.08)', borderRadius: 10, padding: '10px 16px',
      }}>
        <Text style={{ color: '#7c3aed', fontSize: 12, fontWeight: 600 }}>
          更多渠道持续开放中，敬请期待 🚀
        </Text>
      </div>
    </div>
  )

  const pages = [pageCulture, pageIntro, pageChannels]
  const pageLabels = ['企业文化', '积分介绍', '获取渠道']

  return (
    <div style={{ height, display: 'flex', flexDirection: 'column' }}>
      {/* 内容区 */}
      <div style={{
        flex: 1, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          transition: 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: `translateY(-${page * 100}%)`,
          height: '100%',
        }}>
          {pages.map((p, i) => (
            <div key={i} style={{ height: '100%' }}>{p}</div>
          ))}
        </div>
      </div>

      {/* 底部页码指示器 */}
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, paddingTop: 10,
      }}>
        {pageLabels.map((label, i) => (
          <div
            key={i}
            onClick={() => setPage(i)}
            style={{
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '3px 10px',
              borderRadius: 20,
              background: page === i ? 'rgba(79,110,247,0.12)' : 'transparent',
              transition: 'all 0.3s',
            }}
          >
            <div style={{
              width: page === i ? 18 : 6, height: 6,
              borderRadius: 3,
              background: page === i ? '#4f6ef7' : '#cbd5e1',
              transition: 'all 0.4s',
            }} />
            <Text style={{
              fontSize: 11, color: page === i ? '#4f6ef7' : '#94a3b8',
              fontWeight: page === i ? 600 : 400,
              transition: 'color 0.3s',
            }}>
              {label}
            </Text>
          </div>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════
// 日历热力图（放大版）
// ═══════════════════════════════════════
function Heatmap({ data, height }) {
  const maxValue = data.length > 0 ? Math.max(...data.map(d => d[1]), 1) : 50

  const option = {
    backgroundColor: 'transparent',
    title: {
      text: '📅 积分日历',
      left: 0, top: 0,
      textStyle: { color: '#0f172a', fontSize: 15, fontWeight: 600 },
    },
    tooltip: {
      formatter: (params) => `${params.value[0]}：${params.value[1]}分`,
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: '#e8ecf2',
      textStyle: { color: '#0f172a' },
    },
    visualMap: {
      min: 0,
      max: maxValue,
      show: false,
      inRange: {
        color: ['#eef2ff', '#c7d2fe', '#818cf8', '#4f46e5'],
      },
    },
    calendar: {
      range: '2026',
      left: 40, right: 20, top: 40, bottom: 10,
      cellSize: ['auto', 13],
      splitLine: { lineStyle: { color: '#e8ecf2' } },
      itemStyle: { borderWidth: 2, borderColor: '#fff' },
      yearLabel: { show: false },
      monthLabel: { color: '#64748b', fontSize: 10 },
      dayLabel: { color: '#94a3b8', fontSize: 9, nameMap: 'ZH' },
    },
    series: [{
      type: 'heatmap',
      coordinateSystem: 'calendar',
      data,
      animationDuration: 800,
    }],
  }

  return <ReactECharts option={option} style={{ height }} />
}

// ═══════════════════════════════════════
// 积分明细弹窗 — 白底主体+顶端透明渐变
// ═══════════════════════════════════════
function DetailModal({ visible, record, store, onClose }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [animating, setAnimating] = useState(false)

  // 打开：立即显示
  useEffect(() => {
    if (visible && record) {
      setModalOpen(true)
      setLoading(true)
      const params = {
        orgType: store.orgType,
        id: record.id,
        timeType: store.timeType,
        year: store.year,
      }
      if (store.timeType === 'month' && store.month) params.month = store.month
      if (store.timeType === 'quarter' && store.quarter) params.quarter = store.quarter

      statsApi.detail(params)
        .then(setDetail)
        .finally(() => setLoading(false))
    }
  }, [visible, record])

  // 关闭：播放退出动画后再真正关闭
  const handleClose = useCallback(() => {
    setAnimating(true)
    setModalOpen(false)
    setTimeout(() => {
      setAnimating(false)
      setDetail(null)
      onClose()
    }, 320)
  }, [onClose])

  if (!record && !animating) return null

  const columns = [
    { title: '日期', dataIndex: 'score_date', width: 100, render: v => <Text style={{ fontSize: 12 }}>{v}</Text> },
    { title: '分类', dataIndex: 'channel', width: 90, render: v => v ? <Tag color="blue" style={{ fontSize: 11 }}>{v}</Tag> : <Text style={{ color: '#94a3b8' }}>-</Text> },
    { title: '事由', dataIndex: 'event_desc', ellipsis: true, render: v => <Text style={{ fontSize: 12 }}>{v || '-'}</Text> },
    { title: '积分', dataIndex: 'score', width: 70, align: 'right', render: v => <Text style={{ color: v >= 0 ? '#4f6ef7' : '#ef4444', fontWeight: 600, fontSize: 13 }}>{v >= 0 ? '+' : ''}{v}</Text> },
  ]

  return (
    <Modal
      centered
      width={680}
      open={modalOpen}
      onCancel={handleClose}
      footer={null}
      destroyOnClose
      rootClassName="glass-modal-root"
      styles={{
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
      }}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>{store.orgType === 'user' ? '👤' : '🏢'}</span>
          <span style={{ fontSize: 16, fontWeight: 600, color: '#0f172a' }}>{record.name}</span>
          {detail?.department_name && (
            <Tag color="blue" style={{ marginLeft: 4 }}>{detail.department_name}</Tag>
          )}
        </div>
      }
    >
      <Spin spinning={loading}>
        {detail && (
          <div>
            <div style={{ marginBottom: 12, display: 'flex', gap: 16 }}>
              <div style={{ background: 'rgba(79,110,247,0.06)', borderRadius: 10, padding: '10px 16px', flex: 1 }}>
                <Text style={{ color: '#64748b', fontSize: 11 }}>总积分</Text>
                <div><Text style={{ color: '#4f6ef7', fontSize: 22, fontWeight: 700 }}>{detail.items.reduce((s, i) => s + i.score, 0).toFixed(0)}</Text></div>
              </div>
              <div style={{ background: 'rgba(79,110,247,0.06)', borderRadius: 10, padding: '10px 16px', flex: 1 }}>
                <Text style={{ color: '#64748b', fontSize: 11 }}>记录数</Text>
                <div><Text style={{ color: '#0f172a', fontSize: 22, fontWeight: 700 }}>{detail.items.length}</Text></div>
              </div>
            </div>
            <Table
              dataSource={detail.items}
              columns={columns}
              rowKey="id"
              size="small"
              pagination={detail.items.length > 10 ? { pageSize: 10, size: 'small' } : false}
              scroll={{ y: 360 }}
            />
          </div>
        )}
      </Spin>
    </Modal>
  )
}

// ═══════════════════════════════════════
// 主页面：Dashboard
// ═══════════════════════════════════════
export default function DashboardPage() {
  const store = useDashboardStore()
  const { user } = useAuthStore()
  const [data, setData] = useState({ ranking: [], trend: [], category: [], department: [], heatmap: [] })
  const [loading, setLoading] = useState(false)
  const [availableMonths, setAvailableMonths] = useState([])
  const [searchText, setSearchText] = useState('')
  const [detailRecord, setDetailRecord] = useState(null)

  // 加载可用月份
  useEffect(() => {
    leaderboardApi.availableMonths()
      .then(d => {
        setAvailableMonths(d || [])
        if (d && d.length > 0) {
          store.setYear(d[0].year)
          store.setMonth(d[0].month)
        }
      })
      .catch(() => {})
  }, [])

  // 联动数据请求
  useEffect(() => {
    setLoading(true)
    const params = {
      timeType: store.timeType,
      orgType: store.orgType,
      year: store.year,
    }
    if (store.selectedId) params.selectedId = store.selectedId
    if (store.category) params.category = store.category
    if (store.timeType === 'month' && store.month) params.month = store.month
    if (store.timeType === 'quarter' && store.quarter) params.quarter = store.quarter

    statsApi.get(params)
      .then(setData)
      .finally(() => setLoading(false))
  }, [store.timeType, store.orgType, store.selectedId, store.category, store.year, store.month, store.quarter])

  // 年份选项
  const yearOptions = [...new Set(availableMonths.map(m => m.year))].sort((a, b) => b - a)
    .map(y => ({ value: y, label: `${y}年` }))

  // 搜索过滤排行
  const filteredRanking = searchText
    ? data.ranking.filter(r => r.name?.includes(searchText))
    : data.ranking

  // 明细弹窗
  const handleDetail = (record) => {
    setDetailRecord(record)
  }

  // ── 右侧柱状图动态高度 ──
  const deptChartHeight = RIGHT_HEIGHT - CARD_PADDING - CARD_BORDER - 10

  const isUser = store.orgType === 'user'

  return (
    <div>
      {/* 顶部控制栏 — 个人/部门切换放大到最显眼位置 */}
      <div style={{
        background: '#fff',
        borderRadius: 14,
        padding: '14px 20px',
        border: '1px solid #e8ecf2',
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
      }}>
        {/* 左侧：大号 个人/部门 切换 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Segmented
            value={store.orgType}
            onChange={v => {
              store.setOrgType(v)
              store.setSelectedId(null)
              store.setCategory(null)
            }}
            size="large"
            options={[
              { label: <span style={{ fontSize: 15, fontWeight: 600 }}>👤 个人榜</span>, value: 'user' },
              { label: <span style={{ fontSize: 15, fontWeight: 600 }}>🏢 部门榜</span>, value: 'department' },
            ]}
            style={{ borderRadius: 10 }}
          />
        </div>

        {/* 中间：时间维度选择 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Segmented
            value={store.timeType}
            onChange={v => { store.setTimeType(v); store.setSelectedId(null); store.setCategory(null) }}
            options={[
              { label: '月榜', value: 'month' },
              { label: '季榜', value: 'quarter' },
              { label: '年榜', value: 'year' },
            ]}
          />
          <Select
            value={store.year}
            onChange={v => store.setYear(v)}
            options={yearOptions}
            style={{ width: 100 }}
          />
          {store.timeType === 'month' && (
            <DatePicker
              picker="month"
              value={store.year && store.month ? dayjs(`${store.year}-${String(store.month).padStart(2, '0')}`, 'YYYY-MM') : null}
              onChange={d => {
                if (d) { store.setYear(d.year()); store.setMonth(d.month() + 1) }
              }}
              allowClear={false}
              style={{ width: 140 }}
            />
          )}
          {store.timeType === 'quarter' && (
            <Select
              value={store.quarter || 1}
              onChange={v => store.setQuarter(v)}
              options={[
                { value: 1, label: 'Q1 (1-3月)' },
                { value: 2, label: 'Q2 (4-6月)' },
                { value: 3, label: 'Q3 (7-9月)' },
                { value: 4, label: 'Q4 (10-12月)' },
              ]}
              style={{ width: 140 }}
            />
          )}
        </div>

        {/* 右侧：已选标签 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {store.selectedId && (
            <Tag
              closable
              onClose={() => store.setSelectedId(null)}
              style={{ margin: 0 }}
            >
              已选: {data.ranking.find(r => r.id === store.selectedId)?.name || store.selectedId}
            </Tag>
          )}
          {store.category && (
            <Tag
              color="blue"
              closable
              onClose={() => store.setCategory(null)}
              style={{ margin: 0 }}
            >
              来源: {store.category}
            </Tag>
          )}
        </div>
      </div>

      {/* 主区域：左侧排行 + 右侧图表 */}
      <Row gutter={[16, 16]}>
        {/* 左侧：排行榜 — 更窄 */}
        <Col xs={24} lg={6}>
          <div style={{
            background: '#fff',
            borderRadius: 14,
            padding: '16px 12px',
            border: '1px solid #e8ecf2',
            height: RIGHT_HEIGHT,
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text strong style={{ color: '#0f172a', fontSize: 15 }}>
                🏆 {isUser ? '个人积分列表' : '部门积分列表'}
              </Text>
              <Text style={{ color: '#94a3b8', fontSize: 11 }}>共 {data.ranking.length} {isUser ? '人' : '个部门'}</Text>
            </div>
            <Input
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              placeholder="搜索..."
              allowClear
              onChange={e => setSearchText(e.target.value)}
              style={{ marginBottom: 8, borderRadius: 8, fontSize: 13 }}
              size="small"
            />
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <Spin spinning={loading}>
                <Ranking data={filteredRanking} store={store} onDetail={handleDetail} />
              </Spin>
            </div>
          </div>
        </Col>

        {/* 右侧：图表区 — 移动端隐藏 */}
        <Col xs={0} lg={18}>
          <Row gutter={[16, 16]} style={{ height: RIGHT_HEIGHT }}>
            {/* 左列：来源分布 + 积分日历（2图，去掉积分趋势） */}
            <Col xs={24} md={14} style={{ height: '100%' }}>
              <Row gutter={[16, 16]} style={{ height: '100%' }}>
                <Col span={24} style={{ height: LEFT_CARD_HEIGHT }}>
                  <div style={{
                    background: '#fff',
                    borderRadius: 14,
                    padding: '16px 20px',
                    border: '1px solid #e8ecf2',
                    height: '100%',
                    overflow: 'hidden',
                  }}>
                    <Spin spinning={loading}>
                      <CategoryChart data={data.category} store={store} height={LEFT_CHART_HEIGHT} />
                    </Spin>
                  </div>
                </Col>
                <Col span={24} style={{ height: LEFT_CARD_HEIGHT }}>
                  <div style={{
                    background: '#fff',
                    borderRadius: 14,
                    padding: '16px 20px',
                    border: '1px solid #e8ecf2',
                    height: '100%',
                    overflow: 'hidden',
                  }}>
                    <Spin spinning={loading}>
                      <Heatmap data={data.heatmap} height={LEFT_CHART_HEIGHT} />
                    </Spin>
                  </div>
                </Col>
              </Row>
            </Col>

            {/* 右列：个人积分柱状图 / 企业文化内容 */}
            <Col xs={0} md={10} style={{ height: '100%' }}>
              <div style={{
                background: '#fff',
                borderRadius: 14,
                padding: '16px 20px',
                border: '1px solid #e8ecf2',
                height: '100%',
                overflow: 'hidden',
                minWidth: 420,
              }}>
                <Spin spinning={loading}>
                  <CultureCard height={deptChartHeight} />
                </Spin>
              </div>
            </Col>
          </Row>
        </Col>
      </Row>

      {/* 积分明细弹窗 */}
      <DetailModal
        visible={!!detailRecord}
        record={detailRecord}
        store={store}
        onClose={() => setDetailRecord(null)}
      />
    </div>
  )
}
