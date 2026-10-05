import { useEffect, useRef, useState, type FormEvent } from 'react'
import { errorMessage, todoApi } from './api/todos'
import type { Todo } from './types/todo'

function App() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [pendingIds, setPendingIds] = useState<ReadonlySet<number>>(new Set())
  // Mirrors pendingIds synchronously so a second click in the same tick is rejected.
  const pendingRef = useRef(new Set<number>())
  const submittingRef = useRef(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    todoApi
      .list(controller.signal)
      .then(setTodos)
      .catch((e: unknown) => {
        if (!controller.signal.aborted) setError(errorMessage(e))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [])

  const setPending = (id: number, pending: boolean) => {
    if (pending) pendingRef.current.add(id)
    else pendingRef.current.delete(id)
    setPendingIds(new Set(pendingRef.current))
  }

  const run = async (action: () => Promise<void>) => {
    try {
      setError(null)
      await action()
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  // Serialises requests per todo so rapid clicks can't race each other.
  const runForTodo = async (id: number, action: () => Promise<void>) => {
    if (pendingRef.current.has(id)) return
    setPending(id, true)
    await run(action)
    setPending(id, false)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed || submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    await run(async () => {
      const created = await todoApi.create(trimmed)
      setTodos((prev) => [created, ...prev])
      setTitle('')
    })
    submittingRef.current = false
    setSubmitting(false)
  }

  const toggle = (todo: Todo) =>
    runForTodo(todo.id, async () => {
      const updated = await todoApi.update({ ...todo, completed: !todo.completed })
      setTodos((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
    })

  const remove = (id: number) =>
    runForTodo(id, async () => {
      await todoApi.remove(id)
      setTodos((prev) => prev.filter((t) => t.id !== id))
    })

  const remaining = todos.filter((t) => !t.completed).length

  return (
    <main className="container">
      <h1>Todo Portal</h1>

      <form className="todo-form" onSubmit={handleSubmit}>
        <input
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="할 일을 입력하세요"
          maxLength={200}
          required
          aria-label="새 할 일"
        />
        <button type="submit" disabled={submitting}>
          추가
        </button>
      </form>

      <div className="error" aria-live="polite">
        {error}
      </div>

      {loading ? (
        <p className="summary">불러오는 중…</p>
      ) : (
        <>
          <ul className="todo-list">
            {todos.map((todo) => {
              const pending = pendingIds.has(todo.id)
              return (
                <li key={todo.id} className={todo.completed ? 'done' : undefined}>
                  <label>
                    <input
                      type="checkbox"
                      checked={todo.completed}
                      disabled={pending}
                      onChange={() => toggle(todo)}
                    />
                    <span>{todo.title}</span>
                  </label>
                  <button
                    className="delete"
                    disabled={pending}
                    onClick={() => remove(todo.id)}
                    aria-label={`${todo.title} 삭제`}
                    title="삭제"
                  >
                    <span aria-hidden="true">✕</span>
                  </button>
                </li>
              )
            })}
          </ul>

          <p className="summary">
            남은 할 일 {remaining}개 / 전체 {todos.length}개
          </p>
        </>
      )}
    </main>
  )
}

export default App
