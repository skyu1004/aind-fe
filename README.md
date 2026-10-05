# aind-fe — Todo Portal Frontend

React 19 · TypeScript · Vite. 백엔드: [aind-be](https://github.com/skyu1004/aind-be)

## 실행

```bash
npm install
npm run dev        # http://localhost:5173  (/api → http://localhost:8080 프록시)
```

백엔드가 8080 포트에서 실행 중이어야 합니다.

## 스크립트

| 명령 | 설명 |
|------|------|
| `npm run dev` | 개발 서버 |
| `npm run build` | 타입체크 + 프로덕션 빌드 |
| `npm run lint` | oxlint |
| `npm test` | Vitest + React Testing Library + MSW + axe |
| `npm run coverage` | 커버리지 리포트 (lines 80 / branches 70 게이트) |

## 구조

```
src/
├── App.tsx          Todo 화면 (추가 · 완료 토글 · 삭제)
├── api/todos.ts     API 클라이언트, ProblemDetail → ApiError 변환
├── types/todo.ts    Todo 타입
└── test/            MSW 가짜 백엔드, 테스트 셋업
```
