import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Navigation from '../components/Navigation';
import StarRating from '../components/library/StarRating';
import CharacterCard from '../components/anime/CharacterCard';
import { api } from '../services/api';

const LibraryDetailPage = () => {
  const { animeId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const [anime, setAnime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [myRating, setMyRating] = useState(null);
  const [selectedRating, setSelectedRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    loadAnimeDetails();
    if (isAuthenticated) {
      loadMyRating();
    }
  }, [animeId, isAuthenticated]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const loadAnimeDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getLibraryAnimeDetail(animeId);
      setAnime(response.data);
    } catch (err) {
      console.error('Error loading anime:', err);
      setError('Failed to load anime details');
    } finally {
      setLoading(false);
    }
  };

  const loadMyRating = async () => {
    try {
      const response = await api.getMyAnimeRating(animeId);
      setMyRating(response.data.rating);
      setSelectedRating(response.data.rating);
    } catch (err) {
      // User hasn't rated yet
      setMyRating(null);
      setSelectedRating(0);
    }
  };

  const handleSubmitRating = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (selectedRating === 0) {
      setNotification({ message: 'Please select a rating', type: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      await api.rateAnime(animeId, selectedRating);
      setNotification({ message: 'Rating submitted successfully!', type: 'success' });
      setMyRating(selectedRating);
      // Reload anime to get updated average
      await loadAnimeDetails();
    } catch (err) {
      console.error('Error submitting rating:', err);
      setNotification({ message: 'Failed to submit rating', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleImportAnime = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    setImporting(true);
    try {
      await api.importAnime(animeId);
      setNotification({ message: 'Anime imported successfully!', type: 'success' });
      // Redirect to user's anime collection after 1 second
      setTimeout(() => {
        navigate('/anime');
      }, 1000);
    } catch (err) {
      console.error('Error importing anime:', err);
      const errorMessage = err.response?.data?.detail || 'Failed to import anime';
      setNotification({ message: errorMessage, type: 'error' });
    } finally {
      setImporting(false);
    }
  };

  const isOfficial = anime && !anime.owner;
  const isSelf = anime && user && anime.owner === user.id;
  const canImport = anime && !isOfficial && !isSelf;

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Navigation />
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error || !anime) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Navigation />
        <div className="max-w-7xl mx-auto py-12 px-4">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800">{error || 'Anime not found'}</p>
            <button
              onClick={() => navigate('/library')}
              className="mt-2 text-danger hover:text-red-800 underline"
            >
              Back to Library
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navigation />

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/library')}
          className="mb-6 flex items-center text-neutral-600 hover:text-neutral-900 transition-colors"
        >
          <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Library
        </button>

        {/* Notification */}
        {notification && (
          <div className={`mb-6 p-4 rounded-md ${notification.type === 'error' ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
            <p className={`text-sm font-medium ${notification.type === 'error' ? 'text-red-800' : 'text-green-800'}`}>
              {notification.message}
            </p>
          </div>
        )}

        {/* Anime Details Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Anime Image */}
            <div className="flex-shrink-0">
              {anime.image ? (
                <img
                  src={anime.image}
                  alt={anime.name}
                  className="w-64 h-64 object-cover rounded-lg border-2 border-neutral-200"
                />
              ) : (
                <div className="w-64 h-64 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg border-2 border-neutral-200 flex items-center justify-center">
                  <svg className="w-24 h-24 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Anime Info */}
            <div className="flex-1">
              <div className="mb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-3xl font-bold text-neutral-900 mb-2">{anime.name}</h1>
                    {isOfficial ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                        OFFICIAL
                      </span>
                    ) : isSelf ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                        YOURS
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
                          {anime.owner_username}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Import Button */}
                  {canImport && isAuthenticated && (
                    <button
                      onClick={handleImportAnime}
                      disabled={importing}
                      className={`px-4 py-2 rounded-md font-medium transition-colors flex items-center gap-2 ${
                        importing
                          ? 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
                          : 'bg-success text-white hover:bg-success-dark'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      {importing ? 'Importing...' : 'Import to My Collection'}
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center text-sm">
                  <span className="text-neutral-600 w-40">Power Scale:</span>
                  <span className="font-medium text-neutral-900">{anime.anime_power_scale || 'N/A'}</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-neutral-600 w-40">Characters:</span>
                  <span className="font-medium text-neutral-900">{anime.characters?.length || 0}</span>
                </div>
              </div>

              {/* Rating Display */}
              <div className="bg-neutral-50 rounded-lg p-4 mb-4">
                <h3 className="text-sm font-medium text-neutral-700 mb-2">Average Rating</h3>
                <div className="flex items-center gap-3">
                  <StarRating rating={parseFloat(anime.average_rating) || 0} readonly size="lg" />
                  <div>
                    <p className="text-2xl font-bold text-neutral-900">{parseFloat(anime.average_rating || 0).toFixed(1)}</p>
                    <p className="text-xs text-neutral-500">({anime.total_ratings} ratings)</p>
                  </div>
                </div>
              </div>

              {/* Rate This Anime */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-neutral-700 mb-3">
                  {myRating ? 'Your Rating' : 'Rate This Anime'}
                </h3>
                <div className="flex items-center gap-4">
                  <StarRating
                    rating={selectedRating}
                    onRate={setSelectedRating}
                    readonly={!isAuthenticated}
                    size="lg"
                  />
                  {isAuthenticated ? (
                    <button
                      onClick={handleSubmitRating}
                      disabled={submitting || selectedRating === 0}
                      className={`px-4 py-2 rounded-md font-medium transition-colors ${
                        submitting || selectedRating === 0
                          ? 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
                          : 'bg-primary text-white hover:bg-primary-dark'
                      }`}
                    >
                      {submitting ? 'Submitting...' : myRating ? 'Update Rating' : 'Submit Rating'}
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate('/login')}
                      className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark font-medium"
                    >
                      Login to Rate
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Characters Section */}
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 mb-6">
            Characters ({anime.characters?.length || 0})
          </h2>

          {!anime.characters || anime.characters.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm">
              <p className="text-neutral-500">No characters in this anime yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {anime.characters.map((character) => (
                <div key={character.id} className="bg-white rounded-lg shadow-md p-4">
                  {/* Character Image */}
                  <div className="relative h-32 bg-neutral-200 rounded-md overflow-hidden mb-3">
                    {character.image ? (
                      <img src={character.image} alt={character.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100">
                        <svg className="w-12 h-12 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Character Info */}
                  <h4 className="text-md font-bold text-neutral-900 mb-1 truncate">{character.name}</h4>
                  <div className="flex justify-between text-sm text-neutral-600 mb-2">
                    <span>Power:</span>
                    <span className="font-medium text-neutral-900">{character.character_power || 'N/A'}</span>
                  </div>

                  {/* Specialties */}
                  <div className="mb-2">
                    <p className="text-xs font-medium text-neutral-700 mb-1">Specialties:</p>
                    <div className="flex flex-wrap gap-1">
                      {character.specialties && character.specialties.length > 0 ? (
                        character.specialties.map((specialty, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary-light bg-opacity-20 text-secondary-dark"
                          >
                            {specialty}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-neutral-500 italic">No specialties</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LibraryDetailPage;
