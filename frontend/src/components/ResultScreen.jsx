import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../context/GameContext';
import { useMultiplayer } from '../contexts/MultiplayerContext';

const Confetti = () => {
  const particles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 2 + Math.random() * 2,
    rotation: Math.random() * 360,
    color: ['#fbbf24', '#f59e0b', '#ec4899', '#a855f7', '#3b82f6', '#10b981'][Math.floor(Math.random() * 6)]
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {particles.map(particle => (
        <motion.div
          key={particle.id}
          initial={{
            x: `${particle.x}vw`,
            y: '-10%',
            rotate: 0,
            opacity: 1
          }}
          animate={{
            y: '110vh',
            rotate: particle.rotation * 4,
            opacity: [1, 1, 0]
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            ease: 'linear'
          }}
          className="absolute w-3 h-3 rounded-sm"
          style={{ backgroundColor: particle.color }}
        />
      ))}
    </div>
  );
};

const WinnerBanner = ({ winner, player1Name, player2Name }) => {
  let title, subtitle, bgGradient, textColor;

  if (winner === 'left') {
    title = `${player1Name} Wins!`;
    subtitle = 'Victory!';
    bgGradient = 'from-yellow-400 via-orange-500 to-red-500';
    textColor = 'text-white';
  } else if (winner === 'right') {
    title = `${player2Name} Wins!`;
    subtitle = 'Victory!';
    bgGradient = 'from-yellow-400 via-orange-500 to-red-500';
    textColor = 'text-white';
  } else {
    title = "It's a Draw!";
    subtitle = 'Perfectly balanced';
    bgGradient = 'from-indigo-500 via-purple-500 to-pink-500';
    textColor = 'text-white';
  }

  return (
    <motion.div
      initial={{ scale: 0, rotate: -10 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{
        type: 'spring',
        stiffness: 200,
        damping: 15
      }}
      className={`relative bg-gradient-to-r ${bgGradient} rounded-2xl shadow-2xl p-6 mb-8`}
    >
      {/* Shine effect */}
      <motion.div
        initial={{ x: '-100%' }}
        animate={{ x: '200%' }}
        transition={{
          duration: 2,
          repeat: Infinity,
          repeatDelay: 1,
        }}
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
        style={{ transform: 'skewX(-20deg)' }}
      />

      <div className="relative z-10 text-center">
        <motion.h1
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className={`text-5xl font-black ${textColor} mb-2 drop-shadow-lg`}
        >
          {title}
        </motion.h1>
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className={`text-xl font-bold ${textColor} opacity-90`}
        >
          {subtitle}
        </motion.p>
      </div>

      {/* Trophy icon for winner */}
      {winner !== 'draw' && (
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.4, type: 'spring' }}
          className="absolute -top-8 left-1/2 transform -translate-x-1/2"
        >
          <div className="bg-yellow-400 rounded-full p-4 shadow-xl">
            <svg className="w-12 h-12 text-yellow-900" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

const ScoreBreakdownTable = ({ teamData, playerName, isWinner }) => {
  return (
    <div className={`flex flex-col h-full border-2 rounded-xl transition-all ${
      isWinner ? 'border-yellow-400 bg-yellow-50' : 'border-neutral-300 bg-white'
    }`}>
      {/* Header */}
      <div className={`px-4 py-3 border-b-2 ${
        isWinner ? 'border-yellow-400 bg-yellow-100' : 'border-neutral-300 bg-neutral-50'
      }`}>
        <h2 className="text-xl font-bold text-neutral-900">{playerName}</h2>
        <p className="text-sm text-neutral-600">{teamData.breakdown.length} characters</p>
      </div>

      {/* Breakdown Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="bg-neutral-100 sticky top-0">
            <tr>
              <th className="px-2 py-2 text-left text-xs font-semibold text-neutral-700">Role</th>
              <th className="px-2 py-2 text-left text-xs font-semibold text-neutral-700">Character</th>
              <th className="px-2 py-2 text-center text-xs font-semibold text-neutral-700">APS</th>
              <th className="px-2 py-2 text-center text-xs font-semibold text-neutral-700">CP</th>
              <th className="px-2 py-2 text-center text-xs font-semibold text-neutral-700">Match</th>
              <th className="px-2 py-2 text-right text-xs font-semibold text-neutral-700">Score</th>
            </tr>
          </thead>
          <tbody>
            {teamData.breakdown.map((row, index) => (
              <motion.tr
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="border-b border-neutral-200 hover:bg-neutral-50"
              >
                {/* Role */}
                <td className="px-2 py-3 text-xs font-medium text-neutral-900">
                  {row.role}
                </td>

                {/* Character */}
                <td className="px-2 py-3">
                  <div className="flex items-center gap-2">
                    {row.character_image && (
                      <img
                        src={row.character_image}
                        alt={row.character_name}
                        className="w-8 h-8 rounded object-cover"
                      />
                    )}
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-neutral-900">{row.character_name}</span>
                      <span className="text-[10px] text-neutral-500">{row.anime_name}</span>
                    </div>
                  </div>
                </td>

                {/* APS */}
                <td className="px-2 py-3 text-center text-xs text-neutral-700">
                  {parseFloat(row.anime_power_scale).toFixed(2)}
                </td>

                {/* CP */}
                <td className="px-2 py-3 text-center text-xs text-neutral-700">
                  {parseFloat(row.character_power).toFixed(2)}
                </td>

                {/* Specialty Match */}
                <td className="px-2 py-3 text-center">
                  {row.specialty_match ? (
                    <span className="inline-flex items-center justify-center w-5 h-5 bg-success rounded-full text-white text-xs font-bold">
                      ✓
                    </span>
                  ) : (
                    <span className="inline-flex items-center justify-center w-5 h-5 bg-neutral-300 rounded-full text-neutral-500 text-xs font-bold">
                      ✗
                    </span>
                  )}
                </td>

                {/* Role Score */}
                <td className="px-2 py-3 text-right text-xs font-bold text-neutral-900">
                  {parseFloat(row.role_score).toFixed(2)}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Total Score */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className={`px-4 py-4 border-t-2 ${
          isWinner ? 'border-yellow-400 bg-yellow-100' : 'border-neutral-300 bg-neutral-100'
        }`}
      >
        <div className="flex justify-between items-center">
          <span className="text-lg font-bold text-neutral-900">Total Score</span>
          <span className={`text-3xl font-black ${
            isWinner ? 'text-yellow-600' : 'text-neutral-900'
          }`}>
            {parseFloat(teamData.total).toFixed(2)}
          </span>
        </div>
      </motion.div>
    </div>
  );
};

const ResultScreen = () => {
  const navigate = useNavigate();
  const {
    selectedTemplate,
    player1Name,
    player2Name,
    player1Assignments,
    player2Assignments,
    resetGame,
    playAgain,
    calculateFinalScore,
    playVictorySound,
    playDefeatSound,
  } = useGame();

  const { isMultiplayerGame, disconnect, playerRole } = useMultiplayer();

  const [scoreData, setScoreData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);

  // Handle play again for multiplayer
  const handlePlayAgain = () => {
    if (isMultiplayerGame) {
      // Disconnect from current room
      disconnect();
      resetGame();
      // Navigate to create new room (if host) or homepage (if guest)
      if (playerRole === 'host') {
        navigate('/multiplayer/create');
      } else {
        navigate('/');
      }
    } else {
      // Single player - just replay with same settings
      playAgain();
    }
  };

  // Handle reset/go home
  const handleReset = () => {
    if (isMultiplayerGame) {
      disconnect();
    }
    resetGame();
    navigate('/');
  };

  useEffect(() => {
    const fetchScore = async () => {
      try {
        setLoading(true);
        setError(null);

        const result = await calculateFinalScore();
        setScoreData(result);

        // Play victory/defeat sounds
        if (result.winner === 'left') {
          playVictorySound();
        } else if (result.winner === 'right') {
          playDefeatSound();
        }

        // Show confetti for winner (not for draw)
        if (result.winner !== 'draw') {
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 5000);
        }
      } catch (err) {
        console.error('Failed to fetch score:', err);
        setError(err.message || 'Failed to calculate scores');
      } finally {
        setLoading(false);
      }
    };

    fetchScore();
  }, [calculateFinalScore, playVictorySound, playDefeatSound]);

  if (loading) {
    return (
      <div
        className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center"
        role="main"
        aria-label="Loading results"
      >
        <div className="text-center">
          <div className="inline-block">
            <svg className="animate-spin h-16 w-16 text-indigo-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <p className="mt-4 text-xl text-neutral-300 font-medium">Calculating scores...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4"
        role="main"
        aria-label="Error loading results"
      >
        <div className="bg-red-900/30 border-2 border-red-500 rounded-2xl p-8 max-w-md">
          <div className="text-center">
            <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <h2 className="text-2xl font-bold text-white mb-2">Error</h2>
            <p className="text-red-300 mb-6">{error}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-danger hover:bg-danger-dark text-white rounded-lg font-medium transition-colors"
              >
                Retry
              </button>
              <button
                onClick={resetGame}
                className="px-4 py-2 bg-neutral-600 hover:bg-neutral-700 text-white rounded-lg font-medium transition-colors"
              >
                Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!scoreData) {
    return null;
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-8 px-4 overflow-auto"
      role="main"
      aria-label="Match results"
    >
      <div className="max-w-7xl mx-auto">
        {/* Confetti */}
        <AnimatePresence>
          {showConfetti && <Confetti />}
        </AnimatePresence>

        {/* Winner Banner */}
        <div
          role="status"
          aria-live="polite"
          aria-label={
            scoreData.winner === 'draw'
              ? "Match ended in a draw"
              : `${scoreData.winner === 'left' ? player1Name : player2Name} wins`
          }
        >
          <WinnerBanner
            winner={scoreData.winner}
            player1Name={player1Name}
            player2Name={player2Name}
          />
        </div>

        {/* Score Breakdown - Two Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Player 1 */}
          <ScoreBreakdownTable
            teamData={scoreData.leftTeam}
            playerName={player1Name}
            isWinner={scoreData.winner === 'left'}
          />

          {/* Player 2 */}
          <ScoreBreakdownTable
            teamData={scoreData.rightTeam}
            playerName={player2Name}
            isWinner={scoreData.winner === 'right'}
          />
        </div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex items-center justify-center gap-4"
        >
          <button
            onClick={handlePlayAgain}
            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-lg font-bold transition-colors shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-gray-900"
            aria-label={isMultiplayerGame ? "Create new room" : "Play again with same settings"}
          >
            {isMultiplayerGame ? (playerRole === 'host' ? 'New Room' : 'Exit') : 'Play Again'}
          </button>
          <button
            onClick={handleReset}
            className="px-8 py-4 bg-neutral-600 hover:bg-neutral-700 text-white rounded-xl text-lg font-bold transition-colors shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-gray-900"
            aria-label="Return to home screen"
          >
            Home
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default ResultScreen;
