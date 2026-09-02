(function () {
  /* Conexión con el backend. Todos los demás archivos JS usan esta función
     en vez de leer/escribir directamente en localStorage. */

  // Mientras probás en tu computadora, apunta a localhost. Cuando subas el
  // backend a Render, cambiá esta URL en index.html (ver NOVA_API_URL).
  const API_URL = window.NOVA_API_URL || "http://localhost:4000";

  const getToken = () => sessionStorage.getItem("novatech-admin-token");

  async function apiFetch(path, options = {}) {
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    let response;
    try {
      response = await fetch(`${API_URL}${path}`, { ...options, headers });
    } catch {
      throw new Error("No se pudo conectar con el servidor. Revisá tu conexión.");
    }

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Ocurrió un error inesperado.");
    }
    if (response.status === 204) return null;
    return response.json();
  }

  // Para subir archivos (FormData). No seteamos Content-Type: el navegador
  // arma el header "multipart/form-data; boundary=..." automáticamente.
  async function apiUpload(path, formData) {
    const headers = {};
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    let response;
    try {
      response = await fetch(`${API_URL}${path}`, { method: "POST", headers, body: formData });
    } catch {
      throw new Error("No se pudo conectar con el servidor. Revisá tu conexión.");
    }

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Ocurrió un error inesperado.");
    }
    return response.json();
  }

  window.NovaApi = { apiFetch, apiUpload, getToken };
})();
