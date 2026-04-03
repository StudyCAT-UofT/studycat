import { http, HttpResponse } from 'msw'

export const handlers = [
  // ─── Auth ────────────────────────────────────────────────────────────────
  http.get('/api/auth/session', () =>
    HttpResponse.json({ user: { userId: 'user-1', username: 'testuser' } })
  ),
  http.post('/api/auth/login', () =>
    HttpResponse.json({ user: { userId: 'user-1', username: 'testuser' } })
  ),
  http.post('/api/auth/logout', () =>
    HttpResponse.json({ success: true })
  ),

  // ─── Admin ───────────────────────────────────────────────────────────────
  http.get('/api/admin/status', () =>
    HttpResponse.json({ admin: false })
  ),

  // ─── Enrollments / Course offerings ──────────────────────────────────────
  http.get('/api/enrollments', () =>
    HttpResponse.json({ courseOfferings: [] })
  ),

  // ─── Quizzes ─────────────────────────────────────────────────────────────
  http.get('/api/quizzes', () =>
    HttpResponse.json({ quizzes: [] })
  ),
  http.post('/api/quizzes', () =>
    HttpResponse.json({ id: 'quiz-new', title: 'New Quiz' }, { status: 201 })
  ),
  http.put('/api/quizzes/:id', () =>
    HttpResponse.json({ id: 'quiz-1', title: 'Updated Quiz' })
  ),
  http.delete('/api/quizzes/:id', () =>
    HttpResponse.json({ success: true })
  ),

  // ─── Items / Question bank ───────────────────────────────────────────────
  http.get('/api/items', () =>
    HttpResponse.json({ items: [], total: 0 })
  ),
  http.get('/api/items/export', () =>
    new HttpResponse('col1,col2\nval1,val2', {
      headers: { 'Content-Disposition': 'attachment; filename="questions.csv"', 'Content-Type': 'text/csv' }
    })
  ),
  http.post('/api/items', () =>
    HttpResponse.json({ id: 'item-new' }, { status: 201 })
  ),
  http.put('/api/items/:id', () =>
    HttpResponse.json({ id: 'item-1' })
  ),
  http.patch('/api/items/:id', () =>
    HttpResponse.json({ id: 'item-1' })
  ),
  http.patch('/api/items', () =>
    HttpResponse.json({ success: true, message: '2 item(s) updated' })
  ),
  http.delete('/api/items', () =>
    HttpResponse.json({ success: true })
  ),

  // ─── Modules ─────────────────────────────────────────────────────────────
  http.get('/api/modules', () =>
    HttpResponse.json({ modules: [] })
  ),

  // ─── Students ────────────────────────────────────────────────────────────
  http.get('/api/students', () =>
    HttpResponse.json({ students: [] })
  ),
  http.post('/api/students', () =>
    HttpResponse.json({
      results: { created: [{ username: 'jdoe' }], alreadyExists: [], errors: [], missingNames: 0 }
    }, { status: 200 })
  ),

  // ─── Enrollments ─────────────────────────────────────────────────────────
  http.patch('/api/enrollments', () =>
    HttpResponse.json({ success: true })
  ),
  http.delete('/api/enrollments', () =>
    HttpResponse.json({ success: true })
  ),

  // ─── Analytics data ──────────────────────────────────────────────────────
  http.get('/api/data/theta', () =>
    HttpResponse.json([])
  ),
  http.get('/api/data/attempt', () =>
    HttpResponse.json({ attempts: [] })
  ),
  http.get('/api/data/question', () =>
    HttpResponse.json([])
  ),
]
