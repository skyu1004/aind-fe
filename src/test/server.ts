import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import type { Todo } from '../types/todo'

const now = '2026-01-01T00:00:00Z'

export const makeTodo = (overrides: Partial<Todo> = {}): Todo => ({
  id: 1,
  title: '우유 사기',
  completed: false,
  createdAt: now,
  updatedAt: now,
  ...overrides,
})

/** In-memory fake of the backend so tests exercise real fetch calls. */
export function useFakeBackend(initial: Todo[] = []) {
  let todos = [...initial]
  let nextId = Math.max(0, ...todos.map((t) => t.id)) + 1

  server.use(
    http.get('/api/todos', () => HttpResponse.json(todos)),
    http.post('/api/todos', async ({ request }) => {
      const { title } = (await request.json()) as { title: string }
      const todo = makeTodo({ id: nextId++, title })
      todos = [todo, ...todos]
      return HttpResponse.json(todo, { status: 201 })
    }),
    http.put('/api/todos/:id', async ({ params, request }) => {
      const body = (await request.json()) as Pick<Todo, 'title' | 'completed'>
      const id = Number(params.id)
      todos = todos.map((t) => (t.id === id ? { ...t, ...body } : t))
      return HttpResponse.json(todos.find((t) => t.id === id))
    }),
    http.delete('/api/todos/:id', ({ params }) => {
      todos = todos.filter((t) => t.id !== Number(params.id))
      return new HttpResponse(null, { status: 204 })
    }),
  )

  return { get todos() { return todos } }
}

export const server = setupServer()
