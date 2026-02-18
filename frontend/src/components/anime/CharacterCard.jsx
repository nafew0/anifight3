import { useState } from 'react';

const CharacterCard = ({ character, onEdit, onDelete }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = () => {
    setShowDeleteConfirm(false);
    onDelete(character.id);
  };

  const specialtyColors = [
    'bg-secondary text-white',
    'bg-primary text-white',
    'bg-success text-white',
    'bg-danger-light text-white',
    'bg-neutral-600 text-white',
  ];

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-200 overflow-hidden aspect-square flex flex-col">
      {/* Character Image - Square */}
      <div className="relative flex-1 bg-neutral-200 overflow-hidden">
        {character.image ? (
          <img
            src={character.image}
            alt={character.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary-light to-primary-light">
            <svg
              className="w-16 h-16 text-neutral-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
        )}

        {/* Specialties - Top Left as Tags */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 max-w-[70%]">
          {character.specialties && character.specialties.length > 0 && (
            character.specialties.slice(0, 3).map((specialty, index) => (
              <span
                key={index}
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium shadow-sm ${specialtyColors[index % specialtyColors.length]}`}
              >
                {specialty}
              </span>
            ))
          )}
        </div>

        {/* Delete Button - Top Right */}
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="absolute top-2 right-2 p-1.5 bg-danger text-white rounded-md hover:bg-danger-dark transition-colors shadow-md"
            title="Delete"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        ) : (
          <div className="absolute top-2 right-2 bg-white rounded-md shadow-lg p-2 flex gap-1">
            <button
              onClick={handleDelete}
              className="p-1.5 bg-danger text-white rounded hover:bg-danger-dark transition-colors"
              title="Confirm Delete"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="p-1.5 bg-neutral-300 text-neutral-700 rounded hover:bg-neutral-400 transition-colors"
              title="Cancel"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Edit Button - Bottom Right */}
        <button
          onClick={() => onEdit(character)}
          className="absolute bottom-2 right-2 p-1.5 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors shadow-md"
          title="Edit"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      </div>

      {/* Character Info - Under Image */}
      <div className="p-3 bg-white">
        <div className="flex justify-between items-center">
          <h4 className="text-sm font-bold text-neutral-900 truncate flex-1 pr-2">{character.name}</h4>
          <span className="text-sm font-semibold text-primary">{character.character_power || 'N/A'}</span>
        </div>
      </div>
    </div>
  );
};

export default CharacterCard;
