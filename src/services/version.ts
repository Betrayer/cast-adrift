// Injected by Vite from package.json at build time; the fallback keeps unit
// tests and any non-Vite consumer (the sim, the content lint) compiling.
export const APP_VERSION: string =
  typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "0.0.0-dev";
