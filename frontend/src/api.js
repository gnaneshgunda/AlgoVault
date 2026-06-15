import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Attach auth token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('algovault_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('algovault_token');
      localStorage.removeItem('algovault_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// --- Auth ---
export const register = async (data) => {
  const res = await api.post('/auth/register', data);
  return res.data;
};

export const login = async (data) => {
  const res = await api.post('/auth/login', data);
  return res.data;
};

// --- Feed ---
export const getTrendingFeed = async (skip = 0, limit = 20) => {
  const res = await api.get('/feed/trending', { params: { skip, limit } });
  return res.data;
};

export const getBestFeed = async (skip = 0, limit = 20) => {
  const res = await api.get('/feed/best', { params: { skip, limit } });
  return res.data;
};

// --- Questions ---
export const createQuestion = async (data) => {
  const res = await api.post('/questions/', data);
  return res.data;
};

export const listQuestions = async (skip = 0, limit = 50) => {
  const res = await api.get('/questions/', { params: { skip, limit } });
  return res.data;
};

export const registerQuestionView = async (questionId) => {
  const res = await api.post(`/questions/${questionId}/view`);
  return res.data;
};

export const parseQuestionTitle = async (url) => {
  const res = await api.get('/questions/parse-title', { params: { url } });
  return res.data;
};

// --- Interactions ---
export const createInteraction = async (data) => {
  const res = await api.post('/interactions/', data);
  return res.data;
};

export const getMyInteractions = async () => {
  const res = await api.get('/interactions/my');
  return res.data;
};

export const deleteInteraction = async (questionId, interactionType) => {
  const res = await api.delete('/interactions/', {
    params: {
      question_id: questionId,
      interaction_type: interactionType
    }
  });
  return res.data;
};

// --- Lists ---
export const createList = async (data) => {
  const res = await api.post('/lists/', data);
  return res.data;
};

export const getMyLists = async () => {
  const res = await api.get('/lists/my');
  return res.data;
};

export const getListsContainingQuestion = async (questionId) => {
  const res = await api.get(`/lists/containing-question/${questionId}`);
  return res.data;
};

export const getPublicLists = async (skip = 0, limit = 20) => {
  const res = await api.get('/lists/public', { params: { skip, limit } });
  return res.data;
};

export const getListDetail = async (listId) => {
  const res = await api.get(`/lists/${listId}`);
  return res.data;
};

export const updateList = async (listId, data) => {
  const res = await api.put(`/lists/${listId}`, data);
  return res.data;
};

export const addQuestionToList = async (listId, data) => {
  const res = await api.post(`/lists/${listId}/questions`, data);
  return res.data;
};

export const removeQuestionFromList = async (listId, questionId) => {
  const res = await api.delete(`/lists/${listId}/questions/${questionId}`);
  return res.data;
};

export const forkList = async (listId) => {
  const res = await api.post(`/lists/${listId}/fork`);
  return res.data;
};

// --- Users ---
export const getMe = async () => {
  const res = await api.get('/users/me');
  return res.data;
};

export const updateMyStats = async (data) => {
  const res = await api.put('/users/me/stats', data);
  return res.data;
};

export const getUserProfile = async (userId) => {
  const res = await api.get(`/users/${userId}/profile`);
  return res.data;
};

export default api;
