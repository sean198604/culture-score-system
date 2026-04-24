import React, { useEffect, useState } from 'react'
import {
  Table, Button, Modal, Form, Input, Select, Space, Tag, Typography,
  Upload, message, Popconfirm, Switch,
} from 'antd'
import { UserOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons'
import { usersApi, departmentsApi } from '../../services/api'

const { Title, Text } = Typography

export default function AdminUsers() {
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
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '姓名', dataIndex: 'name', render: v => <Text style={{ color: '#e8f0fe', fontWeight: 500 }}>{v}</Text> },
    { title: '用户名', dataIndex: 'username', render: v => <Text style={{ color: '#8899bb' }}>{v}</Text> },
    { title: '部门', dataIndex: 'department_name', render: v => v ? <Tag color="geekblue">{v}</Tag> : '-' },
    { title: '角色', dataIndex: 'role', render: v => (
      <Tag color={v === 'admin' ? 'red' : v === 'hr' ? 'orange' : 'blue'}>
        {v === 'admin' ? '管理员' : v === 'hr' ? 'HR' : '员工'}
      </Tag>
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
          <UserOutlined style={{ color: '#3b7dff', fontSize: 20 }} />
          <Title level={4} style={{ color: '#e8f0fe', margin: 0 }}>员工管理</Title>
        </Space>
        <Space>
          <Input.Search placeholder="搜索姓名/工号" onSearch={v => { setKeyword(v); setPage(1) }} style={{ width: 200 }} />
          <Select allowClear placeholder="筛选部门" value={deptFilter}
            onChange={v => { setDeptFilter(v); setPage(1) }}
            options={depts.map(d => ({ value: d.id, label: d.name }))} style={{ width: 160 }} />
          <Upload beforeUpload={handleImport} showUploadList={false} accept=".xlsx,.xls">
            <Button icon={<UploadOutlined />}>导入Excel</Button>
          </Upload>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}
            style={{ background: 'linear-gradient(135deg,#3b7dff,#00d4ff)', border: 'none' }}>
            新增员工
          </Button>
        </Space>
      </div>

      <div className="glass-card" style={{ padding: 20 }}>
        <Table loading={loading} dataSource={data.items} columns={columns} rowKey="id"
          pagination={{ total: data.total, current: page, pageSize: 20, onChange: setPage, showSizeChanger: false }} />
      </div>

      <Modal
        title={<Text style={{ color: '#e8f0fe' }}>{editRecord ? '编辑员工' : '新增员工'}</Text>}
        open={modalOpen} onCancel={() => setModalOpen(false)} footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSave} style={{ marginTop: 16 }}>
          <Form.Item name="name" label="姓名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="username" label="用户名/工号" rules={editRecord ? [] : [{ required: true }]}>
            <Input disabled={!!editRecord} />
          </Form.Item>
          <Form.Item name="password" label={editRecord ? '新密码（留空不修改）' : '密码'} rules={editRecord ? [] : [{ required: true }]}>
            <Input.Password placeholder={editRecord ? '留空则不修改' : ''} />
          </Form.Item>
          <Form.Item name="department_id" label="部门">
            <Select allowClear options={depts.map(d => ({ value: d.id, label: d.name }))} />
          </Form.Item>
          <Form.Item name="role" label="角色" initialValue="employee">
            <Select options={[{ value: 'employee', label: '员工' }, { value: 'hr', label: 'HR' }, { value: 'admin', label: '管理员' }]} />
          </Form.Item>
          <Form.Item name="email" label="邮箱">
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="手机">
            <Input />
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
