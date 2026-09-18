(function () {
  /* Sesión de usuario opcional. Las compras pueden realizarse sin iniciar sesión. */
  // CORREGIDO: mismo problema que en cart.js — un JSON corrupto acá rompía
  // toda la app porque userLogged() se llama en cada render().
  function userLogged() {
    try {
      const raw = localStorage.getItem("novatech-user");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || !parsed.email) return null;
      return parsed;
    } catch {
      localStorage.removeItem("novatech-user");
      return null;
    }
  }
  function loginUser(form) {
    const data = Object.fromEntries(new FormData(form));
    localStorage.setItem(
      "novatech-user",
      JSON.stringify({
        name: data.name || data.email.split("@")[0],
        email: data.email,
      }),
    );
    return userLogged();
  }
  function logoutUser() {
    localStorage.removeItem("novatech-user");
  }
  window.NovaLogin = { userLogged, loginUser, logoutUser };
})();
