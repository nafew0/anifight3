import { useDroppable } from '@dnd-kit/core';
import { motion } from 'framer-motion';
import CharacterCard from './CharacterCard';

const RoleSlot = ({
  roleKey,
  roleName = '',
  character,
  isActive = true,
  isHighlighted = false,
  isKeyboardSelected = false,
  onClick = null,
  playerNumber,
  slotHeight = 80,
  slotWidth = 80
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${playerNumber}-${roleKey}`,
    data: { roleKey, playerNumber },
    disabled: !isActive || !!character, // Disable if inactive or already filled
  });

  const isEmpty = !character;
  const canDrop = isActive && isEmpty;

  return (
    <div
      ref={setNodeRef}
      onClick={onClick && isEmpty ? onClick : undefined}
      style={{ width: `${slotWidth}px`, height: `${slotHeight}px` }}
      role="button"
      tabIndex={-1}
      aria-label={isEmpty ? `${roleName} slot, empty` : `${roleName} slot, filled with ${character?.name}`}
      className={`
        relative rounded border transition-all duration-200 flex items-center justify-center
        ${canDrop && isOver ? 'border-green-500 bg-green-900/30' : ''}
        ${canDrop && isHighlighted ? 'border-indigo-500 bg-indigo-900/30 animate-pulse' : ''}
        ${canDrop && !isOver && !isHighlighted ? 'border-dashed border-gray-600 bg-neutral-900/30' : ''}
        ${!canDrop && isEmpty ? 'border-gray-700 bg-neutral-900/20 opacity-50' : ''}
        ${!isEmpty ? 'border-solid border-gray-700 bg-neutral-900/40' : ''}
        ${onClick && isEmpty ? 'cursor-pointer hover:border-indigo-400' : ''}
      `}
    >
      {/* Content */}
      {isEmpty ? (
        <div className="flex flex-col items-center justify-center text-center px-1">
          {canDrop ? (
            <>
              <p className="text-xs font-bold text-neutral-500 leading-tight opacity-50">
                {roleName}
              </p>
              <p className="text-[7px] text-neutral-600 leading-tight mt-1">
                Tap to place
              </p>
            </>
          ) : (
            <p className="text-xs font-bold text-neutral-600 leading-tight opacity-30">
              {roleName}
            </p>
          )}
        </div>
      ) : (
        <motion.div
          style={{ width: '100%', height: '100%' }}
          initial={{ scale: 0, rotate: -180, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
            duration: 0.6
          }}
        >
          <CharacterCard character={character} isDraggable={false} isCompact={true} />
        </motion.div>
      )}

      {/* Drag Over Indicator */}
      {isOver && canDrop && (
        <div className="absolute inset-0 border-2 border-green-500 rounded bg-success/10 pointer-events-none" />
      )}
    </div>
  );
};

export default RoleSlot;
