(function () {
  /* Sesión de usuario opcional. Las compras pueden realizarse sin iniciar sesión. */
  const userLogged = () =>
    JSON.parse(localStorage.getItem("novatech-user") || "null");
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
