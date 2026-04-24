import React, { useEffect, useState } from 'react'
import { Table, Button, Modal, Form, Input, Space, Typography, Popconfirm, message } from 'antd'
import { AppstoreOutlined, PlusOutlined } from '@ant-design/icons'
import { departmentsApi } from '../../services/api'

const { Title, Text } = Typography

export default function AdminDepartments() {
  const [data, setData] = useState({ items: [], total: 0 })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editRecord, setEditRecord] = useState(null)
  const [form] = Form.useForm()

  const fetchData = () => {
    setLoading(true)
    departmentsApi.list({ page, page_size: 20 }).then(setData).finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [page])

  const openEdit = (r) => { setEditRecord(r); form.setFieldsValue(r); setModalOpen(true) }
  const openCreate = () => { setEditRecord(null); form.resetFields(); setModalOpen(true) }

  const handleSave = async (values) => {
    try {
      if (editRecord) { await departmentsApi.update(editRecord.id, values); message.success('已更新') }
      else { await departmentsApi.create(values); message.success('已创建') }
      setModalOpen(false)
      fetchData()
    } catch (e) { message.error(typeof e === 'string' ? e : '失败') }
  }

  const handleDelete = async (id) => {
    await departmentsApi.delete(id)
    message.success('已删除')
    fetchData()
  }

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '部门名称', dataIndex: 'name', render: v => <Text style={{ color: '#e8f0fe', fontWeight: 500 }}>{v}</Text> },
    { title: '编码', dataIndex: 'code', render: v => <Text style={{ color: '#8899bb' }}>{v}</Text> },
    { title: '描述', dataIndex: 'description', ellipsis: true, render: v => v || '-' },
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
          <AppstoreOutlined style={{ color: '#00e676', fontSize: 20 }} />
          <Title level={4} style={{ color: '#e8f0fe', margin: 0 }}>部门管理</Title>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}
          style={{ background: 'linear-gradient(135deg,#3b7dff,#00d4ff)', border: 'none' }}>
          新增部门
        </Button>
      </div>

      <div className="glass-card" style={{ padding: 20 }}>
        <Table loading={loading} dataSource={data.items} columns={columns} rowKey="id"
          pagination={{ total: data.total, current: page, pageSize: 20, onChange: setPage, showSizeChanger: false }} />
      </div>

      <Modal title={<Text style={{ color: '#e8f0fe' }}>{editRecord ? '编辑部门' : '新增部门'}</Text>}
        open={modalOpen} onCancel={() => setModalOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleSave} style={{ marginTop: 16 }}>
          <Form.Item name="name" label="部门名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="code" label="部门编码" rules={[{ required: true }]}>
            <Input placeholder="英文，如 HR, FINANCE" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} />
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
