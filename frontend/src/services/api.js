import request from './request'

// 通用文件下载（带token）
function downloadFile(url, filename) {
  const token = localStorage.getItem('token')
  const xhr = new XMLHttpRequest()
  xhr.open('GET', url, true)
  xhr.setRequestHeader('Authorization', `Bearer ${token}`)
  xhr.responseType = 'blob'
  xhr.onload = () => {
    if (xhr.status === 200) {
      const blob = new Blob([xhr.response], { type: xhr.getResponseHeader('Content-Type') })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = filename
      link.click()
      URL.revokeObjectURL(link.href)
    }
  }
  xhr.send()
}

export const authApi = {
  login: (data) => request.post('/auth/login', new URLSearchParams(data), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  }),
  me: () => request.get('/auth/me'),
}

export const dashboardApi = {
  get: () => request.get('/dashboard'),
}

export const statsApi = {
  get: (params) => request.get('/stats', { params }),
  detail: (params) => request.get('/stats/detail', { params }),
}

export const leaderboardApi = {
  users: (params) => request.get('/leaderboard/users', { params }),
  departments: (params) => request.get('/leaderboard/departments', { params }),
  availableMonths: () => request.get('/leaderboard/available-months'),
}

export const scoresApi = {
  list: (params) => request.get('/scores', { params }),
  create: (data) => request.post('/scores', data),
  update: (id, data) => request.put(`/scores/${id}`, data),
  delete: (id) => request.delete(`/scores/${id}`),
  importExcel: (file, overwrite = false) => {
    const form = new FormData()
    form.append('file', file)
    return request.post(`/scores/import/excel?overwrite=${overwrite}`, form)
  },
  downloadTemplate: () => {
    downloadFile('/api/scores/import/template', '个人积分导入模板.xlsx')
  },
}

export const teamScoresApi = {
  list: (params) => request.get('/team-scores', { params }),
  create: (data) => request.post('/team-scores', data),
  update: (id, data) => request.put(`/team-scores/${id}`, data),
  delete: (id) => request.delete(`/team-scores/${id}`),
  importExcel: (file, overwrite = false) => {
    const form = new FormData()
    form.append('file', file)
    return request.post(`/team-scores/import/excel?overwrite=${overwrite}`, form)
  },
  downloadTemplate: () => {
    downloadFile('/api/team-scores/import/template', '团队积分导入模板.xlsx')
  },
}

export const usersApi = {
  list: (params) => request.get('/users', { params }),
  create: (data) => request.post('/users', data),
  update: (id, data) => request.put(`/users/${id}`, data),
  delete: (id) => request.delete(`/users/${id}`),
  importExcel: (file) => {
    const form = new FormData()
    form.append('file', file)
    return request.post('/users/import/excel', form)
  },
  downloadTemplate: () => {
    downloadFile('/api/users/import/template', '员工导入模板.xlsx')
  },
}

export const departmentsApi = {
  list: (params) => request.get('/departments', { params }),
  create: (data) => request.post('/departments', data),
  update: (id, data) => request.put(`/departments/${id}`, data),
  delete: (id) => request.delete(`/departments/${id}`),
}

export const rulesApi = {
  list: (params) => request.get('/rules', { params }),
  create: (data) => request.post('/rules', data),
  update: (id, data) => request.put(`/rules/${id}`, data),
  delete: (id) => request.delete(`/rules/${id}`),
}

export const appealsApi = {
  list: (params) => request.get('/appeals', { params }),
  create: (data) => request.post('/appeals', data),
  review: (id, data) => request.put(`/appeals/${id}/review`, data),
  uploadImage: (file) => {
    const form = new FormData()
    form.append('file', file)
    return request.post('/appeals/upload-image', form)
  },
}
