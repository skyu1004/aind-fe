import type { Todo } from '../types/todo'

const BASE = '/api/todos'

/** RFC 9457 problem details returned by the backend on errors. */
interface ProblemDetail {
  title?: string
  detail?: string
  status?: number
}

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function send(url: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!res.ok) {
    const problem = (await res.json().catch(() => null)) as ProblemDetail | null
    throw new ApiError(res.status, problem?.detail ?? problem?.title ?? '요청을 처리하지 못했습니다.')
  }
  return res
}

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  return (await send(url, init)).json() as Promise<T>
}

export const todoApi = {
  list: (signal?: AbortSignal) => json<Todo[]>(BASE, { signal }),
  create: (title: string) =>
    json<Todo>(BASE, { method: 'POST', body: JSON.stringify({ title }) }),
  update: (todo: Pick<Todo, 'id' | 'title' | 'completed'>) =>
    json<Todo>(`${BASE}/${todo.id}`, {
      method: 'PUT',
      body: JSON.stringify({ title: todo.title, completed: todo.completed }),
    }),
  remove: async (id: number): Promise<void> => {
    await send(`${BASE}/${id}`, { method: 'DELETE' })
  },
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다.'
}
