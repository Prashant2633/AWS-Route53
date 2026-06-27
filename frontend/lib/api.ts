const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
}

export class APIError extends Error {
  status: number;
  errorDetail: any;

  constructor(message: string, status: number, errorDetail?: any) {
    super(message);
    this.name = "APIError";
    this.status = status;
    this.errorDetail = errorDetail;
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers, ...restOptions } = options;

  const baseUrl = API_BASE_URL.replace(/\/+$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  let url = `${baseUrl}${cleanPath}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        searchParams.append(key, String(val));
      }
    });
    const queryStr = searchParams.toString();
    if (queryStr) {
      url += `?${queryStr}`;
    }
  }

  const defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (typeof window !== "undefined") {
    const token = localStorage.getItem("route53_token");
    if (token) {
      defaultHeaders["Authorization"] = `Bearer ${token}`;
    }
  }

  const mergedHeaders = { ...defaultHeaders, ...headers };

  try {
    const response = await fetch(url, {
      ...restOptions,
      headers: mergedHeaders,
    });

    if (response.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("route53_token");
        if (!window.location.pathname.startsWith("/login")) {
          window.location.href = "/login";
        }
      }
      throw new APIError("Session expired. Please log in again.", 401);
    }

    const json = await response.json();

    if (!response.ok) {
      const errorMsg = json?.message || json?.error || `Request failed with status ${response.status}`;
      throw new APIError(errorMsg, response.status, json?.detail);
    }

    return json.data as T;
  } catch (err) {
    if (err instanceof APIError) {
      throw err;
    }
    throw new APIError((err as Error).message || "Network connection error", 500);
  }
}

export const api = {
  get: <T>(path: string, params?: Record<string, any>, options?: RequestOptions) =>
    request<T>(path, { method: "GET", params, ...options }),

  post: <T>(path: string, body?: any, options?: RequestOptions) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body), ...options }),

  put: <T>(path: string, body?: any, options?: RequestOptions) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body), ...options }),

  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { method: "DELETE", ...options }),
};
