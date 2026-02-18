import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const DrawButton = ({
  onClick,
  disabled = false,
  isShuffling = false,
  characterPool = [],
  remainingCount = 0,
  playDrawSound = null
}) => {
  const [shuffleImages, setShuffleImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const intervalRef = useRef(null);

  // Start shuffle animation when isShuffling is true
  useEffect(() => {
    if (isShuffling && characterPool.length > 0) {
      // Play draw sound at the start of animation
      if (playDrawSound) {
        playDrawSound();
      }
      // Get random selection of images from pool
      const images = characterPool
        .filter(char => char.image)
        .sort(() => Math.random() - 0.5)
        .slice(0, 27)
        .map(char => char.image);

      setShuffleImages(images);
      setCurrentImageIndex(0);

      // Change image every 150ms for 4 seconds
      let index = 0;
      intervalRef.current = setInterval(() => {
        index = (index + 1) % images.length;
        setCurrentImageIndex(index);
      }, 150);

      // Clear interval after 4 seconds
      setTimeout(() => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }, 4000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isShuffling, characterPool, playDrawSound]);

  if (isShuffling) {
    return (
      <div className="relative">
        <div className="w-full aspect-square bg-gradient-to-br from-indigo-200 via-purple-200 to-pink-200 rounded overflow-hidden shadow-lg">
          <AnimatePresence mode="wait">
            {shuffleImages[currentImageIndex] && (
              <motion.img
                key={currentImageIndex}
                src={shuffleImages[currentImageIndex]}
                alt="Shuffling"
                className="w-full h-full object-cover"
                initial={{ opacity: 0, scale: 0.85, rotate: -2 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 1.15, rotate: 2 }}
                transition={{
                  duration: 0.15,
                  ease: "easeInOut"
                }}
              />
            )}
          </AnimatePresence>
        </div>

        <div className="mt-1 text-center">
          <div className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-600 text-white rounded-full">
            <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="font-bold text-[8px]">Drawing...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={!disabled ? { scale: 1.05 } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      aria-label={disabled ? 'Draw character (disabled)' : 'Draw character'}
      className={`
        w-full aspect-square rounded shadow-lg transition-all duration-200 flex items-center justify-center
        focus:outline-none focus:ring-4 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-gray-800
        ${disabled
          ? 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
          : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700'
        }
      `}
    >
      <div className="flex flex-col items-center gap-1">
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
          <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
        </svg>
        <span className="text-[9px] font-bold leading-tight">Draw</span>
        <span className="text-[9px] font-bold leading-tight">Character</span>
      </div>
    </motion.button>
  );
};

export default DrawButton;
