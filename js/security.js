(function (root) {
  // Escapa los 5 caracteres que importan para HTML. Sirve tanto para texto
  // suelto como para valores dentro de atributos (value="...", href="...")
  // porque también escapa comillas dobles y simples.
  //
  // Por qué hace falta: en app.js y admin.js, nombres/descripciones/emails
  // que vienen de la base de datos (cargados por el admin, o escritos por
  // un cliente en el checkout) se insertan directo dentro de innerHTML con
  // template strings, ej: `<strong>${p.name}</strong>`. Si alguien carga un
  // producto con nombre `<img src=x onerror=alert(1)>`, o un cliente hace
  // el checkout con nombre `<script>...</script>`, eso se ejecuta tal cual
  // en el navegador de cualquiera que vea esa pantalla (la tienda pública,
  // o el panel de admin). escapeHtml() convierte esos caracteres en
  // entidades HTML para que se muestren como texto plano, nunca como código.
  function escapeHtml(value) {
    if (value === null || value === undefined) return "";
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  const api = { escapeHtml };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api; // para poder testear con Node
  }
  if (root) {
    root.NovaSecurity = api; // para el navegador
  }
})(typeof window !== "undefined" ? window : globalThis);
