import { RouterProvider, createHashRouter, Navigate, Outlet } from 'react-router-dom';
import { StoreProvider } from './state/store';
import { BottomNav } from './components/BottomNav';
import { TasksActiveRoute } from './routes/TasksActiveRoute';
import { TasksCompletedRoute } from './routes/TasksCompletedRoute';
import { ForestRoute } from './routes/ForestRoute';
import { SettingsRoute } from './routes/SettingsRoute';
import { TaskDetailRoute } from './routes/TaskDetailRoute';

function Layout() {
  return (
    <div className="app-shell">
      <main className="app-main">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}

const router = createHashRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="/tasks" replace /> },
      { path: 'tasks', element: <TasksActiveRoute /> },
      { path: 'completed', element: <TasksCompletedRoute /> },
      { path: 'forest', element: <ForestRoute /> },
      { path: 'settings', element: <SettingsRoute /> },
      { path: 'task/:id', element: <TaskDetailRoute /> },
    ],
  },
]);

export function App() {
  return (
    <StoreProvider>
      <RouterProvider router={router} />
    </StoreProvider>
  );
}
