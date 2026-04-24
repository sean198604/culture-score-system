import React, { useEffect, useState } from 'react'
import { Table, Button, Modal, Form, Input, Select, Space, Tag, Typography, Badge, message, Popconfirm } from 'antd'
import { AlertOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons'
import { appealsApi } from '../../services/api'

const { Title, Text } = Typography
const { TextArea } = Input

const statusMap = {
  pending: { color: 'orange', text: '待审核' },
  approved: { color: 'green', text: '已通过' },
  rejected: { color: 'red', text: '已拒绝' },
}

export default function AdminAppeals() {
  const [data, setData] = useState({ items: [], total: 0 })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [reviewModal, setReviewModal] = useState({ open: false, record: null, action: null })
  const [form] = Form.useForm()

  const fetchData = () => {
    setLoading(true)
    const params = { page, page_size: 20 }
    if (statusFilter) params.status = statusFilter
    appealsApi.list(params).then(setData).finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [page, statusFilter])

  const openReview = (record, action) => {
    setReviewModal({ open: true, record, action })
    form.resetFields()
  }

  const handleReview = async (values) => {
    try {
      await appealsApi.review(reviewModal.record.id, { status: reviewModal.action, review_note: values.note })
      message.success(reviewModal.action === 'approved' ? '已通过' : '已拒绝')
      setReviewModal({ open: false, record: null, action: null })
      fetchData()
    } catch (e) { message.error('操作失败') }
  }

  const columns = [
    { title: '申诉人', dataIndex: 'user_name', render: v => <Tag>{v}</Tag> },
    { title: '申诉标题', dataIndex: 'title', ellipsis: true, render: v => <Text style={{ color: '#e8f0fe' }}>{v}</Text> },
    { title: '申诉内容', dataIndex: 'content', ellipsis: true, render: v => <Text style={{ color: '#8899bb', fontSize: 12 }}>{v}</Text> },
    { title: '状态', dataIndex: 'status', render: v => (
      <Badge status={v === 'pending' ? 'processing' : v === 'approved' ? 'success' : 'error'}
        text={<Text style={{ color: statusMap[v]?.color }}>{statusMap[v]?.text}</Text>} />
    )},
    { title: '提交时间', dataIndex: 'created_at', render: v => v?.slice(0, 16) },
    { title: '审核意见', dataIndex: 'review_note', ellipsis: true },
    { title: '操作', key: 'action', render: (_, r) => r.status === 'pending' ? (
      <Space>
        <Button size="small" type="primary" icon={<CheckOutlined />}
          onClick={() => openReview(r, 'approved')}
          style={{ background: '#00e676', border: 'none', color: '#000' }}>
          通过
        </Button>
        <Button size="small" danger icon={<CloseOutlined />}
          onClick={() => openReview(r, 'rejected')}>
          拒绝
        </Button>
      </Space>
    ) : '-' },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Space>
          <AlertOutlined style={{ color: '#ff9800', fontSize: 20 }} />
          <Title level={4} style={{ color: '#e8f0fe', margin: 0 }}>申诉审核</Title>
        </Space>
        <Select value={statusFilter} onChange={v => { setStatusFilter(v); setPage(1) }}
          options={[
            { value: 'pending', label: '待审核' },
            { value: 'approved', label: '已通过' },
            { value: 'rejected', label: '已拒绝' },
          ]}
          style={{ width: 120 }}
        />
      </div>

      <div className="glass-card" style={{ padding: 20 }}>
        <Table loading={loading} dataSource={data.items} columns={columns} rowKey="id"
          pagination={{ total: data.total, current: page, pageSize: 20, onChange: setPage, showSizeChanger: false }} />
      </div>

      <Modal
        title={<Text style={{ color: '#e8f0fe' }}>
          {reviewModal.action === 'approved' ? '✅ 通过申诉' : '❌ 拒绝申诉'}
        </Text>}
        open={reviewModal.open}
        onCancel={() => setReviewModal({ open: false, record: null, action: null })}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleReview} style={{ marginTop: 16 }}>
          <Form.Item label="审核意见" name="note">
            <TextArea rows={4} placeholder="请输入审核意见（可选）" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit"
                style={{
                  background: reviewModal.action === 'approved' ? '#00e676' : '#ff4444',
                  border: 'none',
                  color: reviewModal.action === 'approved' ? '#000' : '#fff',
                }}>
                确认{reviewModal.action === 'approved' ? '通过' : '拒绝'}
              </Button>
              <Button onClick={() => setReviewModal({ open: false, record: null, action: null })}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
