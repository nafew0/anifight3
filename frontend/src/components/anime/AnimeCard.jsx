import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AnimeCard = ({ anime, onEdit, onDelete }) => {
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleCardClick = (e) => {
    // Don't navigate if clicking on action buttons
    if (e.target.closest('button')) {
      return;
    }
    navigate(`/anime/${anime.id}`);
  };

  const handleDelete = () => {
    setShowDeleteConfirm(false);
    onDelete(anime.id);
  };

  return (
    <div
      onClick={handleCardClick}
      className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-200 cursor-pointer overflow-hidden flex flex-col aspect-square"
    >
      {/* Anime Image */}
      <div className="relative flex-1 bg-neutral-200 overflow-hidden">
        {anime.image ? (
          <img
            src={anime.image}
            alt={anime.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-light to-secondary-light">
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
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
        {/* Badges */}
        <div className="absolute top-2 right-2 flex gap-1">
          {anime.is_public && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success text-white shadow-sm">
              Public
            </span>
          )}
          {!anime.is_public && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-500 text-white shadow-sm">
              Private
            </span>
          )}
        </div>
      </div>

      {/* Anime Info */}
      <div className="p-3">
        <h3 className="text-base font-bold text-neutral-900 mb-2 truncate">{anime.name}</h3>

        {/* Import Info */}
        {anime.original_creator_username && (
          <div className="mb-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-light bg-opacity-20 text-primary-dark">
              Imported from: {anime.original_creator_username}
            </span>
          </div>
        )}

        {/* Stats - Single Row */}
        <div className="flex justify-between items-center text-sm mb-3">
          <div className="flex items-center gap-1">
            <span className="text-neutral-600">Power Scale:</span>
            <span className="font-semibold text-neutral-900">{anime.anime_power_scale || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-neutral-600">Characters:</span>
            <span className="font-semibold text-primary">{anime.character_count || 0}</span>
          </div>
        </div>

        {/* Action Buttons */}
        {!showDeleteConfirm ? (
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(anime);
              }}
              className="flex-1 bg-primary text-white px-3 py-1.5 rounded-md hover:bg-primary-dark transition-colors duration-200 text-sm font-medium"
            >
              Edit
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteConfirm(true);
              }}
              className="flex-1 bg-danger text-white px-3 py-1.5 rounded-md hover:bg-danger-dark transition-colors duration-200 text-sm font-medium"
            >
              Delete
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-danger font-medium">Delete this anime and all its characters?</p>
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
                className="flex-1 bg-danger text-white px-3 py-1.5 rounded-md hover:bg-danger-dark transition-colors duration-200 text-sm font-medium"
              >
                Confirm
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(false);
                }}
                className="flex-1 bg-neutral-200 text-neutral-700 px-3 py-1.5 rounded-md hover:bg-neutral-300 transition-colors duration-200 text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnimeCard;
