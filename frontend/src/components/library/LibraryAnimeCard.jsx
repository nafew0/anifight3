import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import StarRating from './StarRating';

const LibraryAnimeCard = ({ anime }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleClick = () => {
    navigate(`/library/${anime.id}`);
  };

  // Determine badge type: Official (admin), Self (current user), or Username (other user)
  const isOfficial = !anime.owner; // owner is null for admin anime
  const isSelf = user && anime.owner === user.id;

  return (
    <div
      onClick={handleClick}
      className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-200 cursor-pointer overflow-hidden"
    >
      {/* Anime Image */}
      <div className="relative h-48 bg-neutral-200 overflow-hidden">
        {anime.image ? (
          <img
            src={anime.image}
            alt={anime.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100">
            <svg
              className="w-20 h-20 text-neutral-400"
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

        {/* Creator Badge */}
        <div className="absolute top-2 right-2">
          {isOfficial ? (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md">
              OFFICIAL
            </span>
          ) : isSelf ? (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md">
              YOURS
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md">
              {anime.owner_username}
            </span>
          )}
        </div>
      </div>

      {/* Anime Info */}
      <div className="p-4">
        <h3 className="text-lg font-bold text-neutral-900 mb-2 truncate">{anime.name}</h3>

        {/* Import Info Badge - Show if anime was imported and made public */}
        {anime.original_creator_username && (
          <div className="mb-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-light bg-opacity-20 text-primary-dark">
              Imported from: {anime.original_creator_username}
            </span>
          </div>
        )}

        {/* Creator Info and Character Count - Single Row */}
        <div className="flex items-center justify-between text-xs text-neutral-500 mb-3">
          <span className="truncate">
            {isOfficial ? 'Official Content' : isSelf ? 'Created by You' : `By ${anime.owner_username}`}
          </span>
          <div className="flex items-center ml-2 flex-shrink-0">
            <svg
              className="w-3.5 h-3.5 mr-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
            <span>{anime.character_count}</span>
          </div>
        </div>

        {/* Rating - Stars, Number, and Count in one row */}
        <div className="flex items-center gap-2">
          <StarRating rating={parseFloat(anime.average_rating) || 0} readonly size="sm" />
          <span className="text-sm font-medium text-neutral-700">
            {parseFloat(anime.average_rating || 0).toFixed(1)}
          </span>
          <span className="text-xs text-neutral-500">
            ({anime.total_ratings})
          </span>
        </div>
      </div>
    </div>
  );
};

export default LibraryAnimeCard;
