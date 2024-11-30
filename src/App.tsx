import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import Chat from './components/Chat'
import Settings from './pages/Settings'

function App() {
  return (
    <Router basename="/LibreExpert">
      <div className="min-h-screen bg-background">
        <nav className="border-b p-4">
          <div className="container mx-auto flex justify-between items-center">
            <Link to="/" className="text-xl font-bold">LibreExpert</Link>
            <Link to="/settings" className="text-sm text-muted-foreground hover:text-foreground">
              Настройки
            </Link>
          </div>
        </nav>
        
        <Routes>
          <Route path="/" element={<Chat />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
