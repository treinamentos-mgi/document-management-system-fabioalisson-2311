// Cliente da API do backend. Todas as chamadas usam o prefixo /api (proxy do Vite).
const API_PREFIX = '/api';

async function readErrorMessage(response) {
  const fallbackMessage = `Erro na requisição (HTTP ${response.status}).`;
  try {
    const body = await response.json();
    return body.error || fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

async function request(path, options) {
  let response;
  try {
    response = await fetch(`${API_PREFIX}${path}`, options);
  } catch {
    throw new Error('Não foi possível conectar ao servidor. Tente novamente.');
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  return response;
}

export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await request('/upload', { method: 'POST', body: formData });
  return response.json();
}

export async function listDocuments() {
  const response = await request('/documents');
  return response.json();
}

export async function downloadDocument(id) {
  const response = await request(`/documents/${encodeURIComponent(id)}/download`);
  return response.blob();
}
