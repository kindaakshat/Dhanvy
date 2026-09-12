function getBaseApiUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:3001';
    }
    if (host.startsWith('192.168.') || host.startsWith('10.') || host.startsWith('172.') || host.includes('.local')) {
      return `http://${host}:3001`;
    }
  }
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3001';
  }
  return 'https://dhanvy-api.vercel.app';
}

function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  const localToken = localStorage.getItem('auth_token');
  if (localToken) return localToken;

  // Fallback to cookie
  const match = document.cookie.match(/(?:^|;\s*)auth_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const baseUrl = getBaseApiUrl();
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };

  const token = getStoredToken();
  if (token && !headers['Authorization'] && !headers['authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(url, {
      ...options,
      credentials: 'include',
      headers,
      cache: 'no-store',
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error?.message || errData?.message || `API error ${res.status}: ${res.statusText}`);
    }

    const json = await res.json();
    return json.data !== undefined ? json.data : json;
  } catch (err: any) {
    console.error(`[LEO API Fetch Error] ${endpoint}:`, err);
    throw err;
  }
}
