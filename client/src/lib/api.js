const configuredApiUrl = import.meta.env.VITE_API_URL;
const apiBase = !configuredApiUrl
  ? '/api'
  : /^https?:\/\//i.test(configuredApiUrl)
    ? configuredApiUrl.replace(/\/$/, '')
    : `https://${configuredApiUrl.replace(/\/$/, '')}/api`;

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${apiBase}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
  } catch {
    throw new Error('The task service is unavailable. Check that the API is running.');
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error = new Error(body.error ?? 'Could not complete that request.');
    error.fields = body.fields;
    throw error;
  }
  if (response.status === 204) return null;
  return response.json();
}

export const taskApi = {
  list: async (search = '') => {
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    const result = await request(`/tasks${params.size ? `?${params}` : ''}`);
    return result.data;
  },
  create: async (task) =>
    (await request('/tasks', { method: 'POST', body: JSON.stringify(task) })).data,
  update: async (id, changes) =>
    (await request(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(changes) })).data,
  remove: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),
};
