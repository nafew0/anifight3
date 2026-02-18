import { useState, useEffect } from 'react';
import Navigation from '../components/Navigation';
import LibraryAnimeCard from '../components/library/LibraryAnimeCard';
import { api } from '../services/api';

const LibraryPage = () => {
  const [animeList, setAnimeList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    loadAnime();
  }, [sortBy]);

  const loadAnime = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getLibraryAnime(sortBy);
      setAnimeList(response.data);
    } catch (err) {
      console.error('Error loading library anime:', err);
      setError('Failed to load anime library. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'highest_rated', label: 'Highest Rated' },
    { value: 'most_rated', label: 'Most Rated' },
  ];

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navigation />

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">Anime Library</h1>
          <p className="text-neutral-600">
            Browse and rate anime bundles from the community and official content.
          </p>
        </div>

        {/* Sorting Controls */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor="sort" className="text-sm font-medium text-neutral-700">
              Sort by:
            </label>
            <select
              id="sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="text-sm text-neutral-600">
            {animeList.length} {animeList.length === 1 ? 'anime' : 'anime'} found
          </div>
        </div>

        {/* Error State */}
        {error && !loading && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
            <button
              onClick={loadAnime}
              className="mt-2 text-sm text-danger hover:text-red-800 underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : animeList.length === 0 ? (
          /* Empty State */
          <div className="text-center py-20 bg-white rounded-lg shadow-sm">
            <svg
              className="mx-auto h-16 w-16 text-neutral-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-neutral-900">No anime available</h3>
            <p className="mt-2 text-sm text-neutral-500">
              The library is empty. Anime marked as public will appear here.
            </p>
          </div>
        ) : (
          /* Anime Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {animeList.map((anime) => (
              <LibraryAnimeCard key={anime.id} anime={anime} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LibraryPage;
