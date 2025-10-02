// src/api.js
import { useAuth } from "./auth/AuthContext";

export function useApi() {
  const { token } = useAuth();
  const base = import.meta.env.VITE_API_URL; // e.g., http://localhost:8000/api

  return async (path, options = {}) => {
    const method = options.method || "GET";
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      ...(options.headers || {}),
    };

    // Safely stringify body if it's a plain object
    const body =
      options.body && typeof options.body === "object"
        ? JSON.stringify(options.body)
        : options.body;

    const res = await fetch(`${base}${path}`, {
      method,
      headers,
      body,
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`API Error: ${res.status} ${res.statusText}\n${errorText}`);
    }

    // Handle empty responses (e.g., DELETE)
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return res.json();
    } else {
      return null;
    }
  };
}
