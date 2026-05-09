import CONFIG from '../config';

const BASE = CONFIG.BASE_URL;

/* ---- Auth ---- */
export const getToken  = () => localStorage.getItem('kisah_token');
export const setToken  = (t) => localStorage.setItem('kisah_token', t);
export const clearToken= () => { localStorage.removeItem('kisah_token'); localStorage.removeItem('kisah_user'); };
export const isLoggedIn= () => !!getToken();
export const getUser   = () => { try { return JSON.parse(localStorage.getItem('kisah_user')); } catch { return null; } };

export async function register(name, email, password) {
  const res  = await fetch(`${BASE}/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Registrasi gagal');
  return data;
}

export async function login(email, password) {
  const res  = await fetch(`${BASE}/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Login gagal');
  setToken(data.loginResult.token);
  localStorage.setItem('kisah_user', JSON.stringify(data.loginResult));
  return data;
}

export async function getStories(page = 1, size = 20) {
  const res  = await fetch(`${BASE}/stories?page=${page}&size=${size}&location=1`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Gagal memuat cerita');
  return data.listStory;
}

export async function getStoryById(id) {
  const res  = await fetch(`${BASE}/stories/${id}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Cerita tidak ditemukan');
  return data.story;
}

export async function addStory(formData) {
  const res  = await fetch(`${BASE}/stories`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Gagal menambah cerita');
  return data;
}
