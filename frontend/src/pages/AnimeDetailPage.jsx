import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import CharacterCard from '../components/anime/CharacterCard';
import CharacterForm from '../components/anime/CharacterForm';
import { api } from '../services/api';

const AnimeDetailPage = () => {
  const { animeId } = useParams();
  const navigate = useNavigate();

  const [anime, setAnime] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCharacterForm, setShowCharacterForm] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState(null);
  const [notification, setNotification] = useState(null);

  // Anime edit state
  const [isEditingAnime, setIsEditingAnime] = useState(false);
  const [animeFormData, setAnimeFormData] = useState({
    name: '',
    anime_power_scale: '',
    is_public: false,
  });

  useEffect(() => {
    loadAnimeDetails();
    loadCharacters();
  }, [animeId]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const loadAnimeDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getMyAnime();
      const animeData = response.data.find((a) => a.id === parseInt(animeId));
      if (animeData) {
        setAnime(animeData);
        setAnimeFormData({
          name: animeData.name,
          anime_power_scale: animeData.anime_power_scale || '',
          is_public: animeData.is_public,
        });
      } else {
        setError('Anime not found');
      }
    } catch (err) {
      console.error('Error loading anime:', err);
      setError('Failed to load anime details');
    } finally {
      setLoading(false);
    }
  };

  const loadCharacters = async () => {
    try {
      const response = await api.getMyAnimeCharacters(animeId);
      setCharacters(response.data);
    } catch (err) {
      console.error('Error loading characters:', err);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
  };

  // Anime editing handlers
  const handleAnimeFieldChange = (e) => {
    const { name, value, type, checked } = e.target;
    setAnimeFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSaveAnime = async () => {
    try {
      const formData = new FormData();
      formData.append('name', animeFormData.name);
      if (animeFormData.anime_power_scale) {
        formData.append('anime_power_scale', animeFormData.anime_power_scale);
      }
      // Convert boolean to string that DRF accepts
      formData.append('is_public', animeFormData.is_public ? 'true' : 'false');

      await api.updateAnime(animeId, formData);
      showNotification('Anime updated successfully!');
      setIsEditingAnime(false);
      await loadAnimeDetails();
    } catch (err) {
      console.error('Error updating anime:', err);
      showNotification('Failed to update anime', 'error');
    }
  };

  const handleCancelAnimeEdit = () => {
    setIsEditingAnime(false);
    if (anime) {
      setAnimeFormData({
        name: anime.name,
        anime_power_scale: anime.anime_power_scale || '',
        is_public: anime.is_public,
      });
    }
  };

  // Character handlers
  const handleAddCharacter = () => {
    setEditingCharacter(null);
    setShowCharacterForm(true);
  };

  const handleEditCharacter = (character) => {
    setEditingCharacter(character);
    setShowCharacterForm(true);
  };

  const handleCharacterFormSubmit = async (formData) => {
    try {
      if (editingCharacter) {
        await api.updateCharacter(animeId, editingCharacter.id, formData);
        showNotification('Character updated successfully!');
      } else {
        await api.createCharacter(animeId, formData);
        showNotification('Character added successfully!');
      }

      await loadCharacters();
      setShowCharacterForm(false);
      setEditingCharacter(null);
    } catch (err) {
      console.error('Error saving character:', err);
      const errorMessage = err.response?.data?.detail || 'Failed to save character';
      showNotification(errorMessage, 'error');
      throw err;
    }
  };

  const handleCharacterFormCancel = () => {
    setShowCharacterForm(false);
    setEditingCharacter(null);
  };

  const handleDeleteCharacter = async (characterId) => {
    try {
      await api.deleteCharacter(animeId, characterId);
      showNotification('Character deleted successfully!');
      await loadCharacters();
    } catch (err) {
      console.error('Error deleting character:', err);
      showNotification('Failed to delete character', 'error');
    }
  };

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
              onClick={() => navigate('/anime')}
              className="mt-2 text-danger hover:text-red-800 underline"
            >
              Back to Anime List
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
          onClick={() => navigate('/anime')}
          className="mb-6 flex items-center text-neutral-600 hover:text-neutral-900 transition-colors"
        >
          <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Anime List
        </button>

        {/* Notification */}
        {notification && (
          <div
            className={`mb-6 p-4 rounded-md ${
              notification.type === 'error'
                ? 'bg-red-50 border border-red-200'
                : 'bg-green-50 border border-green-200'
            }`}
          >
            <p
              className={`text-sm font-medium ${
                notification.type === 'error' ? 'text-red-800' : 'text-green-800'
              }`}
            >
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
                  className="w-48 h-48 object-cover rounded-lg border-2 border-neutral-200"
                />
              ) : (
                <div className="w-48 h-48 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg border-2 border-neutral-200 flex items-center justify-center">
                  <svg className="w-20 h-20 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              )}
            </div>

            {/* Anime Info */}
            <div className="flex-1">
              {!isEditingAnime ? (
                <>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h1 className="text-3xl font-bold text-neutral-900 mb-2">{anime.name}</h1>
                      <div className="flex gap-2">
                        {anime.is_public && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Public
                          </span>
                        )}
                        {!anime.is_public && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-800">
                            Private
                          </span>
                        )}
                        {anime.original_creator_username && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-light bg-opacity-20 text-primary-dark">
                            Imported from: {anime.original_creator_username}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setIsEditingAnime(true)}
                      className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors text-sm font-medium"
                    >
                      Edit Anime
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center text-sm">
                      <span className="text-neutral-600 w-32">Power Scale:</span>
                      <span className="font-medium text-neutral-900">{anime.anime_power_scale || 'N/A'}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <span className="text-neutral-600 w-32">Characters:</span>
                      <span className="font-medium text-primary">{characters.length}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold text-neutral-900 mb-4">Edit Anime Details</h2>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Name</label>
                    <input
                      type="text"
                      name="name"
                      value={animeFormData.name}
                      onChange={handleAnimeFieldChange}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Power Scale</label>
                    <input
                      type="number"
                      name="anime_power_scale"
                      value={animeFormData.anime_power_scale}
                      onChange={handleAnimeFieldChange}
                      step="0.01"
                      min="0.01"
                      max="10.00"
                      className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="is_public"
                      id="is_public_edit"
                      checked={animeFormData.is_public}
                      onChange={handleAnimeFieldChange}
                      className="h-4 w-4 text-primary focus:ring-primary border-neutral-300 rounded"
                    />
                    <label htmlFor="is_public_edit" className="ml-2 text-sm text-neutral-700">
                      Make public
                    </label>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleSaveAnime}
                      className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors text-sm font-medium"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={handleCancelAnimeEdit}
                      className="px-4 py-2 bg-neutral-200 text-neutral-700 rounded-md hover:bg-neutral-300 transition-colors text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Characters Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-neutral-900">Characters ({characters.length})</h2>
            {!showCharacterForm && (
              <button
                onClick={handleAddCharacter}
                className="px-4 py-2 bg-success text-white rounded-md hover:bg-success-dark transition-colors font-medium"
              >
                + Add Character
              </button>
            )}
          </div>

          {/* Character Form */}
          {showCharacterForm && (
            <div className="mb-8">
              <CharacterForm
                character={editingCharacter}
                onSubmit={handleCharacterFormSubmit}
                onCancel={handleCharacterFormCancel}
              />
            </div>
          )}

          {/* Characters Grid */}
          {!showCharacterForm && (
            <>
              {characters.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                  <svg
                    className="mx-auto h-12 w-12 text-neutral-400"
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
                  <h3 className="mt-2 text-sm font-medium text-neutral-900">No characters yet</h3>
                  <p className="mt-1 text-sm text-neutral-500">
                    Add characters to this anime bundle.
                  </p>
                  <div className="mt-6">
                    <button
                      onClick={handleAddCharacter}
                      className="px-4 py-2 bg-success text-white rounded-md hover:bg-success-dark transition-colors font-medium"
                    >
                      Add First Character
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                  {characters.map((character) => (
                    <CharacterCard
                      key={character.id}
                      character={character}
                      onEdit={handleEditCharacter}
                      onDelete={handleDeleteCharacter}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnimeDetailPage;
