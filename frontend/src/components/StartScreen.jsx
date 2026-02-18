import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import TemplateSelector from './TemplateSelector';
import AnimePoolSelector from './AnimePoolSelector';

const StartScreen = () => {
  const { startGame } = useGame();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedAnimeIds, setSelectedAnimeIds] = useState([]);
  const [player1Name, setPlayer1Name] = useState('');
  const [player2Name, setPlayer2Name] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showLoginMessage, setShowLoginMessage] = useState(false);

  const [allCharacters, setAllCharacters] = useState([]);

  // Fetch characters when anime selection changes
  useEffect(() => {
    if (selectedAnimeIds.length > 0) {
      fetchCharacters();
    } else {
      setAllCharacters([]);
    }
  }, [selectedAnimeIds]);

  const fetchCharacters = async () => {
    try {
      const response = await api.getCharacters(selectedAnimeIds);
      setAllCharacters(response.data);
    } catch (err) {
      console.error('Failed to fetch characters:', err);
    }
  };

  const handleStartGame = async () => {
    setError(null);

    // Validation
    if (!selectedTemplate) {
      setError('Please select a game template');
      return;
    }

    if (selectedAnimeIds.length === 0) {
      setError('Please select at least one anime');
      return;
    }

    const minimumRequired = selectedTemplate.roles.length * 2;
    if (allCharacters.length < minimumRequired) {
      setError(`Not enough characters. You need at least ${minimumRequired} characters (${allCharacters.length} available)`);
      return;
    }

    setIsLoading(true);

    try {
      // Start the game with current configuration
      startGame(
        selectedTemplate,
        selectedAnimeIds,
        allCharacters,
        player1Name || 'Player 1',
        player2Name || 'Player 2'
      );
    } catch (err) {
      console.error('Failed to start game:', err);
      setError('Failed to start game. Please try again.');
      setIsLoading(false);
    }
  };

  const canStartGame = () => {
    if (!selectedTemplate) return false;
    if (selectedAnimeIds.length === 0) return false;
    if (allCharacters.length < (selectedTemplate.roles.length * 2)) return false;
    return true;
  };

  const handleMultiplayerClick = () => {
    // Check if user is logged in
    if (!isAuthenticated) {
      setShowLoginMessage(true);
      setTimeout(() => setShowLoginMessage(false), 5000);
      return;
    }

    // Save game config to localStorage
    localStorage.setItem('multiplayer_game_config', JSON.stringify({
      templateId: selectedTemplate.id,
      animePoolIds: selectedAnimeIds,
      hostNickname: player1Name || 'Player 1'
    }));

    // Navigate to multiplayer room creation
    navigate('/multiplayer/create');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl sm:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-3">
            AniFight
          </h1>
          <p className="text-xl text-neutral-700">Draft an Anime Team to Beat Mine</p>
          <p className="text-sm text-neutral-500 mt-2">Select your game settings and start drafting!</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 space-y-6">
          {/* Template Selection */}
          <TemplateSelector
            selectedTemplate={selectedTemplate}
            onSelect={setSelectedTemplate}
          />

          {/* Divider */}
          <div className="border-t border-neutral-200"></div>

          {/* Anime Pool Selection */}
          {selectedTemplate ? (
            <AnimePoolSelector
              selectedAnimeIds={selectedAnimeIds}
              onSelect={setSelectedAnimeIds}
              selectedTemplate={selectedTemplate}
            />
          ) : (
            <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200 text-center">
              <p className="text-sm text-neutral-600">
                Please select a template first to choose anime
              </p>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-neutral-200"></div>

          {/* Player Names (Optional) */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-neutral-700">
              Player Names (Optional)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="player1-name" className="block text-sm text-neutral-600 mb-1">
                  Player 1 (Left)
                </label>
                <input
                  id="player1-name"
                  type="text"
                  value={player1Name}
                  onChange={(e) => setPlayer1Name(e.target.value)}
                  placeholder="Player 1"
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                />
              </div>
              <div>
                <label htmlFor="player2-name" className="block text-sm text-neutral-600 mb-1">
                  Player 2 (Right)
                </label>
                <input
                  id="player2-name"
                  type="text"
                  value={player2Name}
                  onChange={(e) => setPlayer2Name(e.target.value)}
                  placeholder="Player 2"
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <svg className="w-5 h-5 text-danger mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-danger-dark">{error}</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Start Game Button */}
            <button
              onClick={handleStartGame}
              disabled={!canStartGame() || isLoading}
              className={`py-4 px-6 rounded-lg font-semibold text-lg transition-all transform ${
                canStartGame() && !isLoading
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]'
                  : 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center space-x-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Starting...</span>
                </span>
              ) : (
                'Start Game'
              )}
            </button>

            {/* Online Multiplayer Button */}
            <button
              onClick={handleMultiplayerClick}
              disabled={!canStartGame()}
              className={`py-4 px-6 rounded-lg font-semibold text-lg transition-all transform flex items-center justify-center space-x-2 ${
                canStartGame()
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]'
                  : 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Online Multiplayer</span>
            </button>
          </div>

          {/* Login Required Message */}
          {showLoginMessage && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
              <p className="text-orange-800 font-medium">
                You must be logged in to play online multiplayer
              </p>
              <button
                onClick={() => navigate('/login')}
                className="mt-2 text-indigo-600 hover:text-indigo-700 font-semibold underline"
              >
                Login here
              </button>
            </div>
          )}

          {!canStartGame() && !showLoginMessage && (
            <p className="text-center text-sm text-neutral-500 -mt-2">
              {!selectedTemplate
                ? 'Select a template to continue'
                : selectedAnimeIds.length === 0
                ? 'Select at least one anime'
                : 'Select more anime to meet minimum character requirement'}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-neutral-500">
          <p>No login required • Fast & fun • 2 minutes to play</p>
        </div>
      </div>
    </div>
  );
};

export default StartScreen;
