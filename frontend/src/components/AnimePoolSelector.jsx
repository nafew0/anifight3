import { useState, useEffect } from 'react';
import { api } from '../services/api';

const AnimePoolSelector = ({ selectedAnimeIds, onSelect, selectedTemplate }) => {
  const [allAnime, setAllAnime] = useState([]);
  const [characterCounts, setCharacterCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingCounts, setLoadingCounts] = useState(false);

  useEffect(() => {
    fetchAnime();
  }, []);

  useEffect(() => {
    if (selectedAnimeIds.length > 0) {
      fetchCharacterCounts();
    }
  }, [selectedAnimeIds]);

  const fetchAnime = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getAnime();
      setAllAnime(response.data);
    } catch (err) {
      console.error('Failed to fetch anime:', err);
      setError('Failed to load anime list. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCharacterCounts = async () => {
    try {
      setLoadingCounts(true);
      const response = await api.getCharacters(selectedAnimeIds);
      const characters = response.data;

      // Count characters per anime
      const counts = {};
      characters.forEach(char => {
        if (char.anime) {
          counts[char.anime.id] = (counts[char.anime.id] || 0) + 1;
        }
      });

      setCharacterCounts(counts);
    } catch (err) {
      console.error('Failed to fetch character counts:', err);
    } finally {
      setLoadingCounts(false);
    }
  };

  const handleToggleAnime = (animeId) => {
    if (selectedAnimeIds.includes(animeId)) {
      onSelect(selectedAnimeIds.filter(id => id !== animeId));
    } else {
      onSelect([...selectedAnimeIds, animeId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedAnimeIds.length === allAnime.length) {
      // Deselect all
      onSelect([]);
    } else {
      // Select all
      onSelect(allAnime.map(anime => anime.id));
    }
  };

  const getTotalCharacters = () => {
    return Object.values(characterCounts).reduce((sum, count) => sum + count, 0);
  };

  const getMinimumRequired = () => {
    return selectedTemplate ? selectedTemplate.roles.length * 2 : 12;
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-neutral-700">
          Select Anime Pool
        </label>
        <div className="w-full px-4 py-3 border border-neutral-300 rounded-lg bg-neutral-50">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-neutral-300 rounded w-full"></div>
            <div className="h-4 bg-neutral-300 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-neutral-700">
          Select Anime Pool
        </label>
        <div className="w-full px-4 py-3 border border-red-300 rounded-lg bg-red-50 text-danger-dark">
          <p className="text-sm">{error}</p>
          <button
            onClick={fetchAnime}
            className="mt-2 text-sm font-medium text-red-800 hover:text-red-900 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (allAnime.length === 0) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-neutral-700">
          Select Anime Pool
        </label>
        <div className="w-full px-4 py-3 border border-yellow-300 rounded-lg bg-yellow-50 text-yellow-800">
          <p className="text-sm">No anime available. Please contact the admin to add anime.</p>
        </div>
      </div>
    );
  }

  const totalCharacters = getTotalCharacters();
  const minimumRequired = getMinimumRequired();
  const hasEnoughCharacters = totalCharacters >= minimumRequired;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-neutral-700">
          Select Anime Pool
        </label>
        <button
          onClick={handleSelectAll}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          {selectedAnimeIds.length === allAnime.length ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      <div className="border border-neutral-300 rounded-lg max-h-64 overflow-y-auto bg-white">
        {allAnime.map((anime) => {
          const isSelected = selectedAnimeIds.includes(anime.id);
          const characterCount = characterCounts[anime.id] || 0;

          return (
            <label
              key={anime.id}
              className={`flex items-center space-x-3 px-4 py-3 hover:bg-neutral-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors ${
                isSelected ? 'bg-indigo-50' : ''
              }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => handleToggleAnime(anime.id)}
                className="w-4 h-4 text-indigo-600 border-neutral-300 rounded focus:ring-indigo-500"
              />
              <div className="flex-1 flex items-center justify-between">
                <span className={`text-sm font-medium ${isSelected ? 'text-indigo-900' : 'text-neutral-900'}`}>
                  {anime.name}
                </span>
                {isSelected && characterCount > 0 && (
                  <span className="text-xs text-indigo-600 bg-indigo-100 px-2 py-1 rounded-full">
                    {characterCount} {characterCount === 1 ? 'character' : 'characters'}
                  </span>
                )}
                {isSelected && loadingCounts && characterCount === 0 && (
                  <span className="text-xs text-neutral-500">Loading...</span>
                )}
              </div>
            </label>
          );
        })}
      </div>

      {/* Character count summary */}
      {selectedAnimeIds.length > 0 && (
        <div className={`p-4 rounded-lg border ${
          hasEnoughCharacters
            ? 'bg-green-50 border-green-200'
            : 'bg-yellow-50 border-yellow-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-semibold ${
                hasEnoughCharacters ? 'text-green-900' : 'text-yellow-900'
              }`}>
                {loadingCounts ? 'Counting characters...' : `Total Characters: ${totalCharacters}`}
              </p>
              <p className={`text-xs mt-1 ${
                hasEnoughCharacters ? 'text-green-700' : 'text-yellow-700'
              }`}>
                Minimum required: {minimumRequired}
              </p>
            </div>
            {!loadingCounts && (
              <div>
                {hasEnoughCharacters ? (
                  <svg className="w-8 h-8 text-success" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            )}
          </div>
          {!hasEnoughCharacters && !loadingCounts && (
            <p className="text-xs text-yellow-700 mt-2">
              Please select more anime to meet the minimum character requirement.
            </p>
          )}
        </div>
      )}

      {selectedAnimeIds.length === 0 && (
        <p className="text-sm text-neutral-500 italic">
          Select at least one anime to see available characters
        </p>
      )}
    </div>
  );
};

export default AnimePoolSelector;
