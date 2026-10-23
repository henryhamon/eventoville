import { createSignal } from 'solid-js';

// undefined = session still loading, null = visitor
const [currentUser, setCurrentUser] = createSignal<User | null | undefined>(undefined);
export { currentUser, setCurrentUser };

export async function loadSession() {
  try {
    const { user } = await api<{ user: User }>('/api/auth/me');
    setCurrentUser(user);
  } catch {
    setCurrentUser(null);
  }
}

export async function logout() {
  await api('/api/auth/logout', { method: 'POST' }).catch(() => {});
  setCurrentUser(null);
  navigate('/');
}

export function homeFor(user: User) {
  return user.role === 'ADMIN' ? '/admin' : '/minhas';
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public body: any) {
    super(message);
  }
}

export async function api<T = any>(path: string, options: { method?: string, body?: unknown } = {}): Promise<T> {
  const response = await fetch(path, {
    method: options.method ?? 'GET',
    credentials: 'include',
    headers: options.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(response.status, body.error ?? 'Erro inesperado', body);
  }
  return body as T;
}

export type User = { id: number, name: string, email: string, role: 'SOLICITANTE' | 'ADMIN' };

export type EventStatus = 'RASCUNHO' | 'AGUARDANDO_APROVACAO' | 'REJEITADO' | 'APROVADO' | 'CANCELADO';

export const STATUS_LABELS: Record<EventStatus, string> = {
  RASCUNHO: 'Rascunho',
  AGUARDANDO_APROVACAO: 'Aguardando aprovação',
  REJEITADO: 'Rejeitado',
  APROVADO: 'Aprovado',
  CANCELADO: 'Cancelado',
};

export function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR');
}

export type Toast = { message: string, kind: 'success' | 'error', link?: { href: string, label: string } };
const [toast, setToast] = createSignal<Toast | null>(null);
export { toast };
let toastTimer: ReturnType<typeof setTimeout> | undefined;

export function showToast(next: Toast) {
  setToast(next);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => setToast(null), 6000);
}

export function navigate(path: string) {
  location.hash = path;
}
