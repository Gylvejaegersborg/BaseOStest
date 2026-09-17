import { Suspense, lazy } from 'react'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { Home } from './pages/Home'
import { Notes } from './pages/Notes'
import { Workbench } from './pages/Workbench'
import { Calendar } from './pages/Calendar'
import { Projects } from './pages/Projects'
import { Lab } from './pages/Lab'
import { Ops } from './pages/Ops'

const Weather = lazy(() => import('./pages/Weather').then((m) => ({ default: m.Weather })))
const Team = lazy(() => import('./pages/Team').then((m) => ({ default: m.Team })))

/** Chat and Meeting Room are retired in favor of the single Workbench
 *  page — these keep old bookmarks/links (Team's "open a chat with X")
 *  working, preserving the ?agent= query param. */
function LegacyRedirect() {
  return <Navigate to={{ pathname: '/workbench', search: window.location.search }} replace />
}

/** The standalone Sudoku route is retired — it now lives as a Lab module
 *  (grouped under Sandbox), consistent with Lab holding ISΛRK's other
 *  small standalone builds rather than duplicating routing for one of them. */
function SudokuRedirect() {
  return <Navigate to="/lab" replace />
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Home /> },
      { path: 'notes', element: <Notes /> },
      { path: 'workbench', element: <Workbench /> },
      { path: 'chat', element: <LegacyRedirect /> },
      { path: 'room', element: <LegacyRedirect /> },
      { path: 'calendar', element: <Calendar /> },
      { path: 'projects', element: <Projects /> },
      { path: 'lab', element: <Lab /> },
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
      { path: 'sudoku', element: <SudokuRedirect /> },
    ],
  },
])

export function App() {
  return <RouterProvider router={router} />
}
