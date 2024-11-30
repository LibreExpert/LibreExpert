import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Chat from '../components/Chat'
import Settings from './pages/Settings'

function App() {
  return (
    <Router basename="/LibreExpert">
      <div className="min-h-screen bg-background">
        <Routes>
          <Route path="/" element={<Chat />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
