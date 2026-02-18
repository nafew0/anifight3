import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import AnimeCard from '../components/anime/AnimeCard';
import AnimeForm from '../components/anime/AnimeForm';
import { api } from '../services/api';

const AnimePage = () => {
  const navigate = useNavigate();
  const [animeList, setAnimeList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAnime, setEditingAnime] = useState(null);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    loadAnime();
  }, []);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const loadAnime = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getMyAnime();
      setAnimeList(response.data);
    } catch (err) {
      console.error('Error loading anime:', err);
      setError('Failed to load anime. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
  };

  const handleCreateNew = () => {
    setEditingAnime(null);
    setShowForm(true);
  };

  const handleEdit = (anime) => {
    setEditingAnime(anime);
    setShowForm(true);
  };

  const handleFormSubmit = async (formData) => {
    try {
      if (editingAnime) {
        await api.updateAnime(editingAnime.id, formData);
        showNotification('Anime updated successfully!');
        await loadAnime();
        setShowForm(false);
        setEditingAnime(null);
      } else {
        const response = await api.createAnime(formData);
        showNotification('Anime created successfully!');
        // Redirect to detail page to add characters
        navigate(`/anime/${response.data.id}`);
      }
    } catch (err) {
      console.error('Error saving anime:', err);
      console.error('Error response:', err.response?.data);
      const errorMessage = err.response?.data?.detail ||
                          JSON.stringify(err.response?.data) ||
                          'Failed to save anime. Please try again.';
      showNotification(errorMessage, 'error');
      throw err;
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingAnime(null);
  };

  const handleDelete = async (animeId) => {
    try {
      await api.deleteAnime(animeId);
      showNotification('Anime deleted successfully!');
      await loadAnime();
    } catch (err) {
      console.error('Error deleting anime:', err);
      const errorMessage = err.response?.data?.detail || 'Failed to delete anime. Please try again.';
      showNotification(errorMessage, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navigation />

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">My Anime Bundles</h1>
          <p className="text-neutral-600">
            Create and manage your anime collections with characters.
          </p>
        </div>

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

        {/* Form View */}
        {showForm ? (
          <div className="mb-8">
            <AnimeForm anime={editingAnime} onSubmit={handleFormSubmit} onCancel={handleFormCancel} />
          </div>
        ) : (
          <>
            {/* Create New Button */}
            <div className="mb-6">
              <button
                onClick={handleCreateNew}
                className="px-6 py-3 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors duration-200 font-medium shadow-sm"
              >
                + Create New Anime
              </button>
            </div>

            {/* Loading State */}
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : animeList.length === 0 ? (
              /* Empty State */
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
                    d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-neutral-900">No anime bundles</h3>
                <p className="mt-1 text-sm text-neutral-500">
                  Get started by creating your first anime bundle.
                </p>
                <div className="mt-6">
                  <button
                    onClick={handleCreateNew}
                    className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors duration-200 font-medium"
                  >
                    Create Anime
                  </button>
                </div>
              </div>
            ) : (
              /* Anime Grid */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {animeList.map((anime) => (
                  <AnimeCard key={anime.id} anime={anime} onEdit={handleEdit} onDelete={handleDelete} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AnimePage;
