import { BrowserRouter, Routes, Route, Navigate } from 'react-router'
import Login from './components/Login.tsx'
import ChooseUsername from './components/ChooseUsername.tsx'
import AuthProvider from './store/AuthContext.tsx'
import Maps from './components/Maps.tsx'
import Map from './components/Map.tsx'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Maps />} />
          <Route path="/login" element={<Login />} />
          <Route path="/choose-username" element={<ChooseUsername />} />
          <Route path="/register" element={<Navigate to="/login" replace />} />
          <Route path="/maps" element={<Maps />} />
          <Route path="/maps/:id" element={<Map />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
