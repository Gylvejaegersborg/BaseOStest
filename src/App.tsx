import { Suspense, lazy } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { Home } from './pages/Home'
import { Notes } from './pages/Notes'
import { Chat } from './pages/Chat'
import { Calendar } from './pages/Calendar'
import { Projects } from './pages/Projects'
import { Lab } from './pages/Lab'
import { MeetingRoom } from './pages/MeetingRoom'
import { Ops } from './pages/Ops'

const Sudoku = lazy(() => import('./pages/Sudoku').then((m) => ({ default: m.Sudoku })))
const Weather = lazy(() => import('./pages/Weather').then((m) => ({ default: m.Weather })))
const Team = lazy(() => import('./pages/Team').then((m) => ({ default: m.Team })))

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Home /> },
      { path: 'notes', element: <Notes /> },
      { path: 'chat', element: <Chat /> },
      { path: 'calendar', element: <Calendar /> },
      { path: 'projects', element: <Projects /> },
      { path: 'lab', element: <Lab /> },
      { path: 'room', element: <MeetingRoom /> },
      { path: 'ops', element: <Ops /> },
      {
        path: 'team',
        element: (
          <Suspense fallback={<div className="h-full w-full bg-bg" />}>
            <Team />
          </Suspense>
        ),
      },
      {
        path: 'weather',
        element: (
          <Suspense fallback={<div className="h-full w-full bg-bg" />}>
            <Weather />
          </Suspense>
        ),
      },
      {
        path: 'sudoku',
        element: (
          <Suspense fallback={<div className="h-full w-full bg-claude-bg" />}>
            <Sudoku />
          </Suspense>
        ),
      },
    ],
  },
])

export function App() {
  return <RouterProvider router={router} />
}
