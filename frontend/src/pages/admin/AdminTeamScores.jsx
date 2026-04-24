import React, { useEffect, useState } from 'react'
import {
  Table, Button, Modal, Form, Input, InputNumber, DatePicker, Select,
  Space, Tag, Typography, Popconfirm, message,
} from 'antd'
import { TeamOutlined, PlusOutlined } from '@ant-design/icons'
import { teamScoresApi, departmentsApi, rulesApi } from '../../services/api'
import dayjs from 'dayjs'

const { Title, Text } = Typography

export default function AdminTeamScores() {
  const [data, setData] = useState({ items: [], total: 0 })
  const [page, setPage] = useState(1)
  const [depts, setDepts] = useState([])
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editRecord, setEditRecord] = useState(null)
  const [form] = Form.useForm()

  useEffect(() => {
    departmentsApi.list({ page_size: 200 }).then(r => setDepts(r.items || []))
    rulesApi.list({ page_size: 100 }).then(r => setRules(r.items || []))
  }, [])

  const fetchData = () => {
    setLoading(true)
    teamScoresApi.list({ page, page_size: 20 }).then(setData).finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [page])

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

  const columns = [
    { title: '日期', dataIndex: 'score_date', width: 110 },
    { title: '部门', dataIndex: 'department_name', render: v => <Tag color="geekblue">{v}</Tag> },
    { title: '积分渠道', dataIndex: 'channel', render: v => v ? <Tag color="cyan">{v}</Tag> : '-' },
    { title: '事件描述', dataIndex: 'event_desc', ellipsis: true },
    { title: '积分', dataIndex: 'score', align: 'right',
      render: v => <Text style={{ color: '#ffd700', fontWeight: 700 }}>+{v}</Text> },
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
          <TeamOutlined style={{ color: '#00d4ff', fontSize: 20 }} />
          <Title level={4} style={{ color: '#e8f0fe', margin: 0 }}>团队积分管理</Title>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}
          style={{ background: 'linear-gradient(135deg,#3b7dff,#00d4ff)', border: 'none' }}>
          新增团队积分
        </Button>
      </div>

      <div className="glass-card" style={{ padding: 20 }}>
        <Table loading={loading} dataSource={data.items} columns={columns} rowKey="id"
          pagination={{ total: data.total, current: page, pageSize: 20, onChange: setPage, showSizeChanger: false }} />
      </div>

      <Modal title={<Text style={{ color: '#e8f0fe' }}>{editRecord ? '编辑' : '新增'}团队积分</Text>}
        open={modalOpen} onCancel={() => setModalOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleSave} style={{ marginTop: 16 }}>
          <Form.Item name="department_id" label="部门" rules={[{ required: true }]}>
            <Select options={depts.map(d => ({ value: d.id, label: d.name }))} />
          </Form.Item>
          <Form.Item name="score_date" label="积分日期" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="score" label="积分值" rules={[{ required: true }]}>
            <InputNumber step={0.5} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="rule_id" label="关联规则">
            <Select allowClear options={rules.map(r => ({ value: r.id, label: r.name }))} />
          </Form.Item>
          <Form.Item name="channel" label="积分渠道">
            <Input />
          </Form.Item>
          <Form.Item name="event_desc" label="事件描述">
            <Input.TextArea rows={3} />
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
