import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useMultiplayer } from '../contexts/MultiplayerContext';
import apiClient from '../services/api';

const MultiplayerJoin = () => {
  const { roomCode: urlRoomCode } = useParams();
  const navigate = useNavigate();
  const { connect, isConnected, gameState } = useMultiplayer();

  const [roomCode, setRoomCode] = useState(urlRoomCode || '');
  const [nickname, setNickname] = useState('Player 2');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [roomInfo, setRoomInfo] = useState(null);
  const [hasJoined, setHasJoined] = useState(false);

  useEffect(() => {
    if (urlRoomCode) {
      // Auto-fetch room info if code in URL
      fetchRoomInfo(urlRoomCode);
    }
  }, [urlRoomCode]);

  const fetchRoomInfo = async (code) => {
    try {
      const response = await apiClient.get(`/api/multiplayer/rooms/${code}/room_status/`);
      setRoomInfo(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Room not found');
      console.error('Failed to fetch room info:', err);
    }
  };

  const handleJoin = async () => {
    setLoading(true);
    setError(null);

    try {
      await apiClient.post(`/api/multiplayer/rooms/${roomCode}/join_room/`, {
        guest_nickname: nickname,
      });

      // Connect to WebSocket
      connect(roomCode);

      // Mark as joined and show waiting room
      setHasJoined(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to join room');
      console.error('Failed to join room:', err);
    } finally {
      setLoading(false);
    }
  };

  // Listen for game start
  useEffect(() => {
    console.log('[MultiplayerJoin] Game state changed:', gameState);
    console.log('[MultiplayerJoin] Current roomCode:', roomCode);

    if (gameState && gameState.status === 'in_progress' && roomCode) {
      // Game has started, navigate to multiplayer game page
      console.log('[MultiplayerJoin] ✓ Game started, navigating to:', `/multiplayer/game/${roomCode}`);
      navigate(`/multiplayer/game/${roomCode}`);
    } else if (gameState && gameState.status === 'in_progress' && !roomCode) {
      console.error('[MultiplayerJoin] ✗ Game started but roomCode is missing!');
    }
  }, [gameState, roomCode, navigate]);

  // Show waiting room if already joined
  if (hasJoined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-900 to-purple-900 p-4 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full bg-gray-800 rounded-xl shadow-2xl p-8"
        >
          <h1 className="text-3xl font-bold text-white mb-6 text-center">
            Waiting Room
          </h1>

          {roomInfo && (
            <div className="bg-gray-700 rounded-lg p-4 mb-6">
              <div className="text-gray-300 text-sm">Host:</div>
              <div className="text-white font-semibold">{roomInfo.host_nickname}</div>
              <div className="text-gray-300 text-sm mt-2">Room Code:</div>
              <div className="text-indigo-400 font-mono text-2xl tracking-widest">{roomCode}</div>
            </div>
          )}

          <div className="text-center mb-6">
            <motion.div
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-xl text-gray-300 mb-4"
            >
              Waiting for host to start the game
              <span className="animate-pulse">...</span>
            </motion.div>
            <div className="flex justify-center">
              <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          </div>

          <div className="bg-indigo-900/50 rounded-lg p-4 text-center">
            <div className="text-indigo-300 text-sm mb-2">You are Player 2</div>
            <div className="text-gray-400 text-xs">
              The game will start automatically when the host begins
            </div>
          </div>

          {isConnected ? (
            <div className="mt-4 text-center text-green-400 text-sm">
              ● Connected
            </div>
          ) : (
            <div className="mt-4 text-center text-yellow-400 text-sm">
              ● Connecting...
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  // Show join form
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-900 to-purple-900 p-4 flex items-center justify-center">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-md w-full bg-gray-800 rounded-xl shadow-2xl p-8"
      >
        <h1 className="text-3xl font-bold text-white mb-6 text-center">
          Join Game
        </h1>

        {error && (
          <div className="bg-red-500 text-white p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {roomInfo && (
          <div className="bg-gray-700 rounded-lg p-4 mb-6">
            <div className="text-gray-300 text-sm">Host:</div>
            <div className="text-white font-semibold">{roomInfo.host_nickname}</div>
            <div className="text-gray-400 text-xs mt-1">
              Status: {roomInfo.status}
            </div>
          </div>
        )}

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-gray-300 mb-2">Room Code</label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="Enter 6-digit code"
              maxLength={6}
              className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center text-2xl font-mono tracking-widest uppercase"
              disabled={!!urlRoomCode}
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-2">Your Nickname</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Enter your nickname"
              maxLength={50}
              className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleJoin}
            disabled={!roomCode || !nickname || loading}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-colors ${
              roomCode && nickname && !loading
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-gray-500 text-gray-300 cursor-not-allowed'
            }`}
          >
            {loading ? 'Joining...' : 'Join Game'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default MultiplayerJoin;
