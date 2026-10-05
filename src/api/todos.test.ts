import { describe, expect, it } from 'vitest'
import { ApiError, errorMessage } from './todos'

describe('errorMessage', () => {
  it('uses the message of Error instances', () => {
    expect(errorMessage(new ApiError(400, 'bad'))).toBe('bad')
  })

  it('falls back for non-Error values', () => {
    expect(errorMessage('oops')).toBe('알 수 없는 오류가 발생했습니다.')
  })
})
