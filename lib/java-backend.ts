const DEFAULT_JAVA_BACKEND_URL = "http://127.0.0.1:8080";

function backendUrl() {
  return (process.env.JAVA_BACKEND_URL?.trim() || DEFAULT_JAVA_BACKEND_URL).replace(/\/+$/, "");
}

async function readJavaResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data && typeof data.error === "string" ? data.error : `Java backend failed: ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}

export async function javaGet<T>(path: string): Promise<T> {
  const response = await fetch(`${backendUrl()}${path}`, {
    method: "GET",
    cache: "no-store"
  });
  return readJavaResponse<T>(response);
}

export async function javaPostJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${backendUrl()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {})
  });
  return readJavaResponse<T>(response);
}

export async function javaPostForm<T>(path: string, form: FormData): Promise<T> {
  const response = await fetch(`${backendUrl()}${path}`, {
    method: "POST",
    body: form
  });
  return readJavaResponse<T>(response);
}
