import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { axe } from 'vitest-axe'
import App from './App'
import { makeTodo, server, useFakeBackend } from './test/server'

const renderApp = async () => {
  const user = userEvent.setup()
  const view = render(<App />)
  await waitFor(() => expect(screen.queryByText('불러오는 중…')).not.toBeInTheDocument())
  return { user, ...view }
}

describe('App', () => {
  it('shows loading and then the todos from the server', async () => {
    useFakeBackend([makeTodo({ id: 1, title: '우유 사기' }), makeTodo({ id: 2, title: '보고서', completed: true })])
    render(<App />)

    expect(screen.getByText('불러오는 중…')).toBeInTheDocument()
    expect(await screen.findByText('우유 사기')).toBeInTheDocument()
    expect(screen.getByText('남은 할 일 1개 / 전체 2개')).toBeInTheDocument()
  })

  it('adds a todo with a trimmed title and clears the input', async () => {
    const backend = useFakeBackend()
    const { user } = await renderApp()

    const input = screen.getByRole('textbox', { name: '새 할 일' })
    await user.type(input, '  장보기  ')
    await user.click(screen.getByRole('button', { name: '추가' }))

    expect(await screen.findByText('장보기')).toBeInTheDocument()
    expect(input).toHaveValue('')
    expect(backend.todos.map((t) => t.title)).toEqual(['장보기'])
  })

  it('does not send a request for a blank title', async () => {
    const backend = useFakeBackend()
    const { user } = await renderApp()

    await user.type(screen.getByRole('textbox', { name: '새 할 일' }), '   ')
    await user.click(screen.getByRole('button', { name: '추가' }))

    expect(backend.todos).toHaveLength(0)
  })

  it('creates only one todo when submit is double-clicked', async () => {
    const backend = useFakeBackend()
    server.use(
      http.post('/api/todos', async () => {
        await delay(50)
        return HttpResponse.json(makeTodo({ id: 9, title: '한 번만' }), { status: 201 })
      }),
    )
    let posts = 0
    server.events.on('request:start', ({ request }) => {
      if (request.method === 'POST') posts++
    })
    const { user } = await renderApp()

    await user.type(screen.getByRole('textbox', { name: '새 할 일' }), '한 번만')
    await user.dblClick(screen.getByRole('button', { name: '추가' }))

    expect(await screen.findByText('한 번만')).toBeInTheDocument()
    expect(posts).toBe(1)
    expect(backend.todos).toHaveLength(0)
    server.events.removeAllListeners()
  })

  it('toggles completion', async () => {
    useFakeBackend([makeTodo({ id: 1, title: '우유 사기' })])
    const { user } = await renderApp()

    const checkbox = screen.getByRole('checkbox', { name: '우유 사기' })
    await user.click(checkbox)

    await waitFor(() => expect(checkbox).toBeChecked())
    expect(screen.getByText('남은 할 일 0개 / 전체 1개')).toBeInTheDocument()
  })

  it('deletes a todo', async () => {
    useFakeBackend([makeTodo({ id: 1, title: '우유 사기' })])
    const { user } = await renderApp()

    await user.click(screen.getByRole('button', { name: '우유 사기 삭제' }))

    await waitFor(() => expect(screen.queryByText('우유 사기')).not.toBeInTheDocument())
  })

  it('shows the server ProblemDetail message when a request fails', async () => {
    useFakeBackend([makeTodo({ id: 1, title: '우유 사기' })])
    server.use(
      http.delete('/api/todos/:id', () =>
        HttpResponse.json({ status: 404, title: 'Not Found', detail: 'Todo not found: 1' }, { status: 404 }),
      ),
    )
    const { user } = await renderApp()

    await user.click(screen.getByRole('button', { name: '우유 사기 삭제' }))

    expect(await screen.findByText('Todo not found: 1')).toBeInTheDocument()
    expect(screen.getByText('우유 사기')).toBeInTheDocument()
  })

  it('falls back to a generic message when the error body is not JSON', async () => {
    server.use(http.get('/api/todos', () => new HttpResponse('boom', { status: 502 })))
    render(<App />)

    expect(await screen.findByText('요청을 처리하지 못했습니다.')).toBeInTheDocument()
  })

  it('disables the row while its request is in flight', async () => {
    useFakeBackend([makeTodo({ id: 1, title: '우유 사기' })])
    server.use(
      http.put('/api/todos/:id', async () => {
        await delay(50)
        return HttpResponse.json(makeTodo({ id: 1, completed: true }))
      }),
    )
    const { user } = await renderApp()

    const row = screen.getByRole('listitem')
    await user.click(within(row).getByRole('checkbox'))

    expect(within(row).getByRole('checkbox')).toBeDisabled()
    expect(within(row).getByRole('button')).toBeDisabled()
    await waitFor(() => expect(within(row).getByRole('checkbox')).toBeEnabled())
  })

  it('has no detectable accessibility violations', async () => {
    useFakeBackend([makeTodo({ id: 1, title: '우유 사기' })])
    const { container } = await renderApp()

    expect(await axe(container)).toHaveNoViolations()
  })
})
