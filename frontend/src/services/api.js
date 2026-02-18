import axios from 'axios';

// API base URL - from environment variable
const API_BASE_URL = import.meta.env.VITE_API_URL;

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor - add auth token to all requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // If sending FormData, remove Content-Type to let axios set it with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle token refresh on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        // Try to refresh the token
        const response = await axios.post(
          `${API_BASE_URL}/api/auth/token/refresh/`,
          { refresh: refreshToken }
        );

        const newAccessToken = response.data.access;
        localStorage.setItem('accessToken', newAccessToken);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear auth and redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// API endpoints
export const api = {
  // Templates
  getTemplates: () => apiClient.get('/api/templates/'),

  // Anime
  getAnime: () => apiClient.get('/api/anime/'),

  // Characters
  getCharacters: (animeIds) => {
    const params = animeIds?.length ? `?anime_ids=${animeIds.join(',')}` : '';
    return apiClient.get(`/api/characters/${params}`);
  },

  // Draw
  drawCharacter: (remainingCharacterIds, seed = null) => {
    return apiClient.post('/api/draw/', {
      remainingCharacterIds,
      seed,
    });
  },

  // Score (optional)
  calculateScore: (leftAssignments, rightAssignments, templateId) => {
    return apiClient.post('/api/score/', {
      leftAssignments,
      rightAssignments,
      templateId,
    });
  },

  // User Templates (requires authentication)
  getMyTemplates: () => apiClient.get('/api/my/templates/'),
  createTemplate: (templateData) => apiClient.post('/api/my/templates/', templateData),
  updateTemplate: (id, templateData) => apiClient.put(`/api/my/templates/${id}/`, templateData),
  deleteTemplate: (id) => apiClient.delete(`/api/my/templates/${id}/`),

  // User Anime (requires authentication)
  getMyAnime: () => apiClient.get('/api/my/anime/'),
  createAnime: (animeData) => apiClient.post('/api/my/anime/', animeData),
  updateAnime: (id, animeData) => apiClient.put(`/api/my/anime/${id}/`, animeData),
  deleteAnime: (id) => apiClient.delete(`/api/my/anime/${id}/`),
  importAnime: (id) => apiClient.post(`/api/my/anime/import/${id}/`),

  // User Anime Characters (requires authentication)
  getMyAnimeCharacters: (animeId) => apiClient.get(`/api/my/anime/${animeId}/characters/`),
  createCharacter: (animeId, characterData) => apiClient.post(`/api/my/anime/${animeId}/characters/`, characterData),
  updateCharacter: (animeId, charId, characterData) => apiClient.put(`/api/my/anime/${animeId}/characters/${charId}/`, characterData),
  deleteCharacter: (animeId, charId) => apiClient.delete(`/api/my/anime/${animeId}/characters/${charId}/`),

  // Public Library
  getLibraryAnime: (sortBy = 'newest') => apiClient.get(`/api/library/anime/?sort=${sortBy}`),
  getLibraryAnimeDetail: (id) => apiClient.get(`/api/library/anime/${id}/`),
  rateAnime: (id, rating) => apiClient.post(`/api/library/anime/${id}/rate/`, { rating }),
  getMyAnimeRating: (id) => apiClient.get(`/api/library/anime/${id}/my-rating/`),
};

export default apiClient;
