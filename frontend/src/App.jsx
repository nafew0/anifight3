import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { GameProvider, useGame, GAME_SCREENS } from './context/GameContext';
import { MultiplayerProvider } from './contexts/MultiplayerContext';
import Navigation from './components/Navigation';
import StartScreen from './components/StartScreen';
import DraftScreen from './components/DraftScreen';
import ResultScreen from './components/ResultScreen';
import MultiplayerGameBridge from './components/MultiplayerGameBridge';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import GamePage from './pages/GamePage';
import AnimePage from './pages/AnimePage';
import AnimeDetailPage from './pages/AnimeDetailPage';
import LibraryPage from './pages/LibraryPage';
import LibraryDetailPage from './pages/LibraryDetailPage';
import ComingSoonPage from './pages/ComingSoonPage';
import MultiplayerCreate from './pages/MultiplayerCreate';
import MultiplayerJoin from './pages/MultiplayerJoin';
import MultiplayerGameScreen from './pages/MultiplayerGameScreen';
import OfflineIndicator from './components/OfflineIndicator';

// Original game flow component (single-player)
function GameFlow() {
  const { currentScreen } = useGame();

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navigation />
      <div className="max-w-7xl mx-auto">
        {currentScreen === GAME_SCREENS.START && <StartScreen />}
        {currentScreen === GAME_SCREENS.DRAFT && <DraftScreen />}
        {currentScreen === GAME_SCREENS.RESULT && <ResultScreen />}
      </div>
    </div>
  );
}

// Protected route wrapper
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  // Get Google Client ID from environment variable
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <AuthProvider>
        <GameProvider>
          <MultiplayerProvider>
            <Router>
              <OfflineIndicator />
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/library" element={<LibraryPage />} />
                <Route path="/library/:animeId" element={<LibraryDetailPage />} />
                <Route path="/profile" element={<ComingSoonPage />} />

                {/* Game flow - public for now (admin content accessible to all) */}
                <Route path="/" element={<GameFlow />} />

                {/* Multiplayer routes */}
                <Route path="/multiplayer/create" element={<MultiplayerCreate />} />
                <Route path="/multiplayer/game/:roomCode" element={<MultiplayerGameScreen />} />
                <Route path="/join/:roomCode?" element={<MultiplayerJoin />} />

                {/* Protected routes - require authentication */}
                <Route
                  path="/game"
                  element={
                    <ProtectedRoute>
                      <GamePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/anime"
                  element={
                    <ProtectedRoute>
                      <AnimePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/anime/:animeId"
                  element={
                    <ProtectedRoute>
                      <AnimeDetailPage />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </Router>
          </MultiplayerProvider>
        </GameProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
