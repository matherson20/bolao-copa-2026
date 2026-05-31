import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: para GitHub Pages o caminho precisa ser "/NOME-DO-REPO/".
// Definido via variavel de ambiente VITE_BASE no deploy (ver .github/workflows/deploy.yml).
// Em desenvolvimento local fica "/".
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE || "/",
});
