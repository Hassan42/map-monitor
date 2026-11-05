import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router'
import Landing from './components/Landing.tsx'
import ChooseUsername from './components/ChooseUsername.tsx'
import AuthProvider from './store/AuthContext.tsx'
import Maps from './components/Maps.tsx'
import Explore from './components/Explore.tsx'
import Profile from './components/Profile.tsx'

// MapLibre is heavy: only pages with a map load it
const Map = lazy(() => import('./components/Map.tsx'))

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/choose-username" element={<ChooseUsername />} />
          <Route path="/register" element={<Navigate to="/" replace />} />
          <Route path="/maps" element={<Maps />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/users/:username" element={<Profile />} />
          <Route path="/maps/:id" element={<Map />} />
        </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
