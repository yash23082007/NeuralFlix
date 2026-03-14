import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const fetchMovies = async (skip = 0, limit = 20, search = '') => {
  try {
    const response = await api.get('/movies', {
      params: { skip, limit, search }
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching movies", error);
    return [];
  }
};

export const fetchMovieDetails = async (id) => {
  try {
    const response = await api.get(`/movies/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching movie details", error);
    return null;
  }
};

export const fetchRecommendations = async (id) => {
  try {
    const response = await api.get(`/recommendations/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching recommendations", error);
    return { recommendations: [] };
  }
};

export default api;
