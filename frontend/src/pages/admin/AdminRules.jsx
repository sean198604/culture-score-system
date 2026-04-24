import React, { useEffect, useState } from 'react'
import { Table, Button, Modal, Form, Input, InputNumber, Space, Tag, Typography, Popconfirm, message, Select } from 'antd'
import { StarOutlined, PlusOutlined } from '@ant-design/icons'
import { rulesApi } from '../../services/api'

const { Title, Text } = Typography

const categoryColors = { '活动': 'blue', '培训': 'cyan', '荣誉': 'gold', '其他': 'default' }

export default function AdminRules() {
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

  const columns = [
    { title: '规则名称', dataIndex: 'name', render: v => <Text style={{ color: '#e8f0fe' }}>{v}</Text> },
    { title: '分类', dataIndex: 'category', render: v => <Tag color={categoryColors[v] || 'default'}>{v}</Tag> },
    { title: '积分渠道', dataIndex: 'channel', render: v => v || '-' },
    { title: '分值范围', key: 'range', render: (_, r) => <Text style={{ color: '#8899bb' }}>{r.min_score} ~ {r.max_score}</Text> },
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
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Space>
          <StarOutlined style={{ color: '#ffd700', fontSize: 20 }} />
          <Title level={4} style={{ color: '#e8f0fe', margin: 0 }}>积分规则管理</Title>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}
          style={{ background: 'linear-gradient(135deg,#3b7dff,#00d4ff)', border: 'none' }}>
          新增规则
        </Button>
      </div>

      <div className="glass-card" style={{ padding: 20 }}>
        <Table loading={loading} dataSource={data.items} columns={columns} rowKey="id"
          pagination={{ total: data.total, current: page, pageSize: 20, onChange: setPage, showSizeChanger: false }} />
      </div>

      <Modal title={<Text style={{ color: '#e8f0fe' }}>{editRecord ? '编辑规则' : '新增规则'}</Text>}
        open={modalOpen} onCancel={() => setModalOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleSave} style={{ marginTop: 16 }}>
          <Form.Item name="name" label="规则名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="category" label="分类" rules={[{ required: true }]}>
            <Select options={['活动','培训','荣誉','其他'].map(v => ({ value: v, label: v }))} />
          </Form.Item>
          <Form.Item name="channel" label="积分渠道">
            <Input />
          </Form.Item>
          <Form.Item name="description" label="规则说明">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Space>
            <Form.Item name="min_score" label="最低分">
              <InputNumber min={0} />
            </Form.Item>
            <Form.Item name="max_score" label="最高分">
              <InputNumber min={0} />
            </Form.Item>
          </Space>
          <Form.Item name="is_active" label="状态" initialValue={1}>
            <Select options={[{ value: 1, label: '启用' }, { value: 0, label: '停用' }]} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" style={{ background: 'linear-gradient(135deg,#3b7dff,#00d4ff)', border: 'none' }}>保存</Button>
              <Button onClick={() => setModalOpen(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
