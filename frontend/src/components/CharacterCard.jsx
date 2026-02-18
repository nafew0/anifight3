import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

const CharacterCard = ({ character, isDraggable = true, isCompact = false, showSpecialties = true }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `character-${character.id}`,
    data: { character },
    disabled: !isDraggable,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    cursor: isDraggable ? 'grab' : 'default',
  };

  // Handle null values and convert to numbers
  const animePowerScale = parseFloat(character.anime_power_scale) || 0;
  const characterPower = parseFloat(character.character_power) || 0;
  const drawScore = (characterPower * animePowerScale).toFixed(2);

  if (isCompact) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...(isDraggable ? listeners : {})}
        {...(isDraggable ? attributes : {})}
        className="bg-neutral-900 rounded shadow-sm overflow-hidden w-full h-full flex flex-col border border-gray-700"
      >
        <div className="relative flex-1">
          {character.image ? (
            <img
              src={character.image}
              alt={character.name}
              className="w-full h-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
              <span className="text-neutral-400 text-[8px]">No Image</span>
            </div>
          )}
        </div>
        <div className="p-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white flex-none">
          <p className="text-[8px] font-bold truncate leading-tight">{character.name}</p>
          <p className="text-[7px] opacity-90 truncate leading-tight">{character.anime?.name || 'Unknown'}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(isDraggable ? listeners : {})}
      {...(isDraggable ? attributes : {})}
      className="bg-white rounded-lg shadow-xl overflow-hidden transform transition-transform hover:scale-105"
    >
      {/* Character Image */}
      <div className="relative aspect-square bg-gradient-to-br from-indigo-100 to-purple-100">
        {character.image ? (
          <img
            src={character.image}
            alt={character.name}
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto text-neutral-300" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
              <p className="text-neutral-400 text-xs mt-1">No Image</p>
            </div>
          </div>
        )}

        {/* Specialty Badges */}
        {showSpecialties && character.specialties && character.specialties.length > 0 && (
          <div className="absolute top-1 left-1 flex flex-wrap gap-1">
            {character.specialties.slice(0, 2).map((specialty, index) => (
              <span
                key={index}
                className="px-1 py-0.5 bg-yellow-500 text-white text-[10px] font-bold rounded-full shadow-md"
              >
                {specialty}
              </span>
            ))}
            {character.specialties.length > 2 && (
              <span className="px-1 py-0.5 bg-yellow-500 text-white text-[10px] font-bold rounded-full shadow-md">
                +{character.specialties.length - 2}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Character Info */}
      <div className="p-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <h3 className="text-sm font-bold truncate mb-0.5">{character.name}</h3>
        <p className="text-xs opacity-90 truncate">{character.anime?.name || 'Unknown Anime'}</p>
      </div>
    </div>
  );
};

export default CharacterCard;
