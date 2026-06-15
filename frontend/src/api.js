import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000'; // FastAPI running here

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const getTrendingFeed = async () => {
  const response = await api.get('/feed/trending');
  return response.data;
};

export const getBestFeed = async () => {
  const response = await api.get('/feed/best');
  return response.data;
};

export const createQuestion = async (data) => {
  const response = await api.post('/questions/', data);
  return response.data;
};

export const createInteraction = async (data) => {
  const response = await api.post('/interactions/', data);
  return response.data;
};

export default api;
