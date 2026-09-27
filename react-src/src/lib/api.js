const API_BASE = import.meta.env.DEV
  ? ""
  : (
      import.meta.env.VITE_API_BASE_URL ||
      "https://api.cfpadvantage.com"
    );

export function apiUrl(path) {
  return `${API_BASE}${path}`;
}

export async function api(path) {
  const response = await fetch(apiUrl(path));

  if (!response.ok) {
    throw new Error(`${path} failed with ${response.status}`);
  }

  return response.json();
}
