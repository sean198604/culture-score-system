import React, { useEffect, useState } from 'react'
import {
  Table, Button, Modal, Form, Input, Tag, Typography, Space, Select,
  Upload, message, Tabs, Badge,
} from 'antd'
import { AlertOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons'
import { appealsApi } from '../services/api'
import { useAuthStore } from '../store/authStore'

const { Title, Text } = Typography
const { TextArea } = Input

const statusMap = {
  pending: { color: 'orange', text: '待审核' },
  approved: { color: 'green', text: '已通过' },
  rejected: { color: 'red', text: '已拒绝' },
}

export default function AppealsPage() {
  const user = useAuthStore(s => s.user)
  const [data, setData] = useState({ items: [], total: 0 })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState(undefined)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [imgUrls, setImgUrls] = useState([])
  const [form] = Form.useForm()

  const fetchData = () => {
    setLoading(true)
    const params = { page, page_size: 20 }
    if (statusFilter) params.status = statusFilter
    appealsApi.list(params).then(setData).finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [page, statusFilter])

  const handleSubmit = async (values) => {
    setSubmitting(true)
    try {
      await appealsApi.create({ ...values, image_urls: imgUrls })
      message.success('申诉已提交')
      setModalOpen(false)
      form.resetFields()
      setImgUrls([])
      fetchData()
    } catch (e) {
      message.error(typeof e === 'string' ? e : '提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleImgUpload = async ({ file }) => {
    try {
      const res = await appealsApi.uploadImage(file)
      setImgUrls(prev => [...prev, res.url])
      message.success('图片上传成功')
    } catch {
      message.error('图片上传失败')
    }
    return false
  }

  const columns = [
    { title: '申诉标题', dataIndex: 'title', ellipsis: true, render: v => <Text style={{ color: '#e8f0fe' }}>{v}</Text> },
    { title: '申诉人', dataIndex: 'user_name', render: v => <Tag>{v}</Tag> },
    { title: '状态', dataIndex: 'status', render: v => (
      <Badge status={v === 'pending' ? 'processing' : v === 'approved' ? 'success' : 'error'}
        text={<Text style={{ color: statusMap[v]?.color }}>{statusMap[v]?.text}</Text>} />
    )},
    { title: '提交时间', dataIndex: 'created_at', render: v => v?.slice(0, 16) },
    { title: '审核意见', dataIndex: 'review_note', ellipsis: true, render: v => <Text style={{ color: '#8899bb' }}>{v || '-'}</Text> },
  ]

  return (
    <div>
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Space>
          <AlertOutlined style={{ color: '#ff9800', fontSize: 22 }} />
          <Title level={4} style={{ color: '#e8f0fe', margin: 0 }}>积分申诉</Title>
        </Space>
        <Space>
          <Select allowClear placeholder="筛选状态" value={statusFilter}
            onChange={v => { setStatusFilter(v); setPage(1) }}
            options={[{ value: 'pending', label: '待审核' }, { value: 'approved', label: '已通过' }, { value: 'rejected', label: '已拒绝' }]}
            style={{ width: 120 }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}
            style={{ background: 'linear-gradient(135deg,#3b7dff,#00d4ff)', border: 'none' }}>
            提交申诉
          </Button>
        </Space>
      </div>

      <div className="glass-card" style={{ padding: 20 }}>
        <Table
          loading={loading}
          dataSource={data.items}
          columns={columns}
          rowKey="id"
          pagination={{ total: data.total, current: page, pageSize: 20, onChange: setPage, showSizeChanger: false }}
        />
      </div>

      <Modal
        title={<Text style={{ color: '#e8f0fe' }}>提交积分申诉</Text>}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); setImgUrls([]) }}
        footer={null}
        width={560}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 16 }}>
          <Form.Item name="title" label="申诉标题" rules={[{ required: true }]}>
            <Input placeholder="请简要描述申诉原因" />
          </Form.Item>
          <Form.Item name="content" label="申诉内容" rules={[{ required: true }]}>
            <TextArea rows={4} placeholder="请详细说明申诉情况..." />
          </Form.Item>
          <Form.Item label="上传图片（可选）">
            <Upload beforeUpload={handleImgUpload} showUploadList={false} accept="image/*">
              <Button icon={<UploadOutlined />}>上传图片</Button>
            </Upload>
            {imgUrls.map((url, i) => (
              <img key={i} src={url} alt="" style={{ width: 60, height: 60, objectFit: 'cover', marginTop: 8, marginRight: 8, borderRadius: 4 }} />
            ))}
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={submitting}
                style={{ background: 'linear-gradient(135deg,#3b7dff,#00d4ff)', border: 'none' }}>
                提交申诉
              </Button>
              <Button onClick={() => { setModalOpen(false); form.resetFields() }}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
