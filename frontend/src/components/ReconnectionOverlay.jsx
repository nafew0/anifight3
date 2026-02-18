import { motion } from 'framer-motion';

const ReconnectionOverlay = ({ isReconnecting, attempts, onForceQuit }) => {
  if (!isReconnecting) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center"
    >
      <div className="bg-gray-800 rounded-xl p-8 max-w-md text-center">
        <div className="mb-4">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Reconnecting...</h2>
        <p className="text-gray-300 mb-4">
          Connection lost. Attempting to reconnect (attempt {attempts}/10)
        </p>
        <p className="text-sm text-gray-400 mb-6">
          Your game progress is saved. Please wait while we restore your connection.
        </p>
        <button
          onClick={onForceQuit}
          className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Quit Game
        </button>
      </div>
    </motion.div>
  );
};

export default ReconnectionOverlay;
