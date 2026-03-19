import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

// ── Movies ────────────────────────────────────────────────────
export const fetchMovies = async (page = 1, limit = 20, language = '') => {
  try {
    const params = { page, limit };
    if (language) params.language = language;
    const response = await api.get('/movies', { params });
    return response.data?.results || response.data || [];
  } catch (error) {
    console.error('Error fetching movies', error);
    return [];
  }
};

export const fetchTrending = async () => {
  try {
    const response = await api.get('/movies/trending');
    return response.data?.results || [];
  } catch (error) {
    console.error('Error fetching trending', error);
    return [];
  }
};

export const fetchTopRated = async (page = 1) => {
  try {
    const response = await api.get('/movies/toprated', { params: { page } });
    return response.data?.results || [];
  } catch (error) {
    console.error('Error fetching top rated', error);
    return [];
  }
};

export const fetchNowPlaying = async (page = 1) => {
  try {
    const response = await api.get('/movies/nowplaying', { params: { page } });
    return response.data?.results || [];
  } catch (error) {
    console.error('Error fetching now playing', error);
    return [];
  }
};

export const fetchBollywood = async () => {
  try {
    const response = await api.get('/movies/bollywood');
    return response.data?.results || [];
  } catch (error) {
    console.error('Error fetching bollywood', error);
    return [];
  }
};

export const fetchAnime = async () => {
  try {
    const response = await api.get('/movies/anime');
    return response.data?.results || [];
  } catch (error) {
    console.error('Error fetching anime', error);
    return [];
  }
};

export const fetchSeries = async (page = 1, language = '') => {
  try {
    const params = { page };
    if (language) params.language = language;
    const response = await api.get('/movies/series', { params });
    return response.data?.results || [];
  } catch (error) {
    console.error('Error fetching series', error);
    return [];
  }
};

export const fetchByGenre = async (genre, page = 1, language = '') => {
  try {
    const params = { page };
    if (language) params.language = language;
    const response = await api.get(`/movies/genre/${encodeURIComponent(genre)}`, { params });
    return response.data?.results || [];
  } catch (error) {
    console.error('Error fetching by genre', error);
    return [];
  }
};

export const fetchMovieDetails = async (id) => {
  try {
    const response = await api.get(`/movies/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching movie details', error);
    return null;
  }
};

// ── Recommendations ───────────────────────────────────────────
export const fetchRecommendations = async (id) => {
  try {
    const response = await api.get(`/recommendations/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching recommendations', error);
    return { recommendations: [] };
  }
};

// ── Genres ────────────────────────────────────────────────────
export const fetchGenres = async () => {
  try {
    const response = await api.get('/genres');
    return response.data?.genres || [];
  } catch (error) {
    console.error('Error fetching genres', error);
    return [];
  }
};

// ── Search ────────────────────────────────────────────────────
export const searchMovies = async (query, language = '', page = 1) => {
  try {
    const params = { q: query, page };
    if (language) params.language = language;
    const response = await api.get('/search', { params });
    return response.data?.results || [];
  } catch (error) {
    console.error('Error searching movies', error);
    return [];
  }
};

export default api;
