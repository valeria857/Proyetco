// GitHub Pages sirve el sitio en una subcarpeta con el nombre del repositorio.
// Sin la ruta base correcta, los enlaces y recursos apuntan a raíz y la página sale en blanco.

import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.BASE_PATH || "/tormenta/",
});
