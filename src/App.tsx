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
    ],
  },
])

export function App() {
  return <RouterProvider router={router} />
}
