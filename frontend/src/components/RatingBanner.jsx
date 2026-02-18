import { motion } from 'framer-motion';

const getTierConfig = (tier) => {
  const configs = {
    S: {
      gradient: 'from-yellow-400 via-orange-500 to-red-500',
      textColor: 'text-white',
      label: 'INSANE PULL!',
      glow: 'shadow-[0_0_30px_rgba(251,191,36,0.8)]',
    },
    A: {
      gradient: 'from-purple-500 via-pink-500 to-purple-600',
      textColor: 'text-white',
      label: 'GREAT PULL!',
      glow: 'shadow-[0_0_20px_rgba(168,85,247,0.6)]',
    },
    B: {
      gradient: 'from-blue-500 via-cyan-500 to-blue-600',
      textColor: 'text-white',
      label: 'Good Pull',
      glow: 'shadow-[0_0_15px_rgba(59,130,246,0.5)]',
    },
    C: {
      gradient: 'from-green-500 via-emerald-500 to-green-600',
      textColor: 'text-white',
      label: 'Decent Pull',
      glow: 'shadow-[0_0_10px_rgba(34,197,94,0.4)]',
    },
    D: {
      gradient: 'from-gray-500 via-gray-600 to-gray-700',
      textColor: 'text-white',
      label: 'Weak Pull',
      glow: 'shadow-[0_0_10px_rgba(107,114,128,0.4)]',
    },
  };

  return configs[tier] || configs.D;
};

const RatingBanner = ({ tier, show = false, onAnimationComplete }) => {
  if (!show) return null;

  const config = getTierConfig(tier);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.5, y: 10 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 20,
      }}
      onAnimationComplete={onAnimationComplete}
      className={`
        relative inline-block px-2 py-1 rounded bg-gradient-to-r ${config.gradient}
        ${config.textColor}
        transform-gpu
      `}
    >
      {/* Shine Effect */}
      <motion.div
        initial={{ x: '-100%' }}
        animate={{ x: '200%' }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          repeatDelay: 2,
        }}
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
        style={{ transform: 'skewX(-20deg)' }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Tier */}
        <motion.div
          initial={{ rotate: -180, scale: 0 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="text-2xl font-black drop-shadow-lg"
        >
          {tier}
        </motion.div>

        {/* Label */}
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-[8px] font-bold uppercase tracking-tight drop-shadow-lg leading-tight"
        >
          {config.label}
        </motion.div>
      </div>

      {/* Particles */}
      {tier === 'S' && (
        <>
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, x: 0, y: 0 }}
              animate={{
                scale: [0, 1, 0],
                x: [0, (Math.random() - 0.5) * 30],
                y: [0, (Math.random() - 0.5) * 30],
              }}
              transition={{
                duration: 1,
                delay: i * 0.1,
                ease: 'easeOut',
              }}
              className="absolute top-1/2 left-1/2 w-1 h-1 bg-yellow-300 rounded-full"
              style={{
                boxShadow: '0 0 5px rgba(253, 224, 71, 0.8)',
              }}
            />
          ))}
        </>
      )}
    </motion.div>
  );
};

export default RatingBanner;
