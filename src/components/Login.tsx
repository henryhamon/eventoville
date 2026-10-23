import { createSignal, Show, type JSX } from 'solid-js';
import { api, setCurrentUser, homeFor, navigate, showToast, type User } from '../api';
import Header from './Header';

function Login() {
  const [email, setEmail] = createSignal('');
  const [password, setPassword] = createSignal('');
  const [error, setError] = createSignal('');
  const [loading, setLoading] = createSignal(false);

  const submit = async (e: SubmitEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { user } = await api<{ user: User }>('/api/auth/login', { method: 'POST', body: { email: email(), password: password() } });
      setCurrentUser(user);
      navigate(homeFor(user));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="min-h-screen flex flex-col">
      <div class="max-w-[1400px] w-full mx-auto px-6 pt-8">
        <a href="#/"><Header /></a>
      </div>
      <div class="flex-1 flex items-center justify-center px-6 py-12">
        <form onSubmit={submit} class="bg-white rounded-[20px] shadow-card p-8 w-full max-w-md">
          <h1 class="text-2xl font-semibold mb-1">Entrar</h1>
          <p class="text-sm text-sage mb-6">Acesso para solicitantes e administradores</p>

          <label class="block text-sm font-medium mb-1" for="email">E-mail institucional</label>
          <input id="email" type="email" required autocomplete="username" value={email()} onInput={(e) => setEmail(e.currentTarget.value)}
            class="w-full mb-4 px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-brand" placeholder="nome@univille.br" />

          <label class="block text-sm font-medium mb-1" for="password">Senha</label>
          <input id="password" type="password" required autocomplete="current-password" value={password()} onInput={(e) => setPassword(e.currentTarget.value)}
            class="w-full mb-4 px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-brand" />

          <Show when={error()}>
            <div role="alert" class="mb-4 px-4 py-2.5 rounded-xl bg-rose text-red-700 text-sm">{error()}</div>
          </Show>

          <button type="submit" disabled={loading()} class="w-full py-2.5 rounded-full bg-forest text-white font-medium hover:bg-ink transition disabled:opacity-60">
            {loading() ? 'Entrando...' : 'Entrar'}
          </button>

          <div class="mt-4 text-center">
            <a href="#/esqueci" class="text-sm text-forest hover:underline">Esqueci minha senha</a>
          </div>
          <div class="mt-4 text-center">
            <a href="#/" class="text-sm text-sage hover:text-forest">← Voltar à agenda pública</a>
          </div>
        </form>
      </div>
    </div>
  );
}

function AuthCard(props: { title: string, subtitle: string, onSubmit: () => void, children: JSX.Element }) {
  return (
    <div class="min-h-screen flex flex-col">
      <div class="max-w-[1400px] w-full mx-auto px-6 pt-8">
        <a href="#/"><Header /></a>
      </div>
      <div class="flex-1 flex items-center justify-center px-6 py-12">
        <form onSubmit={(e) => { e.preventDefault(); props.onSubmit(); }} class="bg-white rounded-[20px] shadow-card p-8 w-full max-w-md">
          <h1 class="text-2xl font-semibold mb-1">{props.title}</h1>
          <p class="text-sm text-sage mb-6">{props.subtitle}</p>
          {props.children}
          <div class="mt-6 text-center">
            <a href="#/login" class="text-sm text-sage hover:text-forest">← Voltar ao login</a>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ForgotPassword() {
  const [email, setEmail] = createSignal('');
  const [message, setMessage] = createSignal('');
  const [error, setError] = createSignal('');
  const [loading, setLoading] = createSignal(false);

  const submit = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await api<{ message: string }>('/api/auth/forgot-password', { method: 'POST', body: { email: email() } });
      setMessage(result.message);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard title="Recuperar senha" subtitle="Informe seu e-mail institucional para receber o link de redefinição" onSubmit={submit}>
      <Show when={!message()} fallback={
        <div role="status" class="px-4 py-3 rounded-xl bg-mint text-forest text-sm">{message()}</div>
      }>
        <label class="block text-sm font-medium mb-1" for="forgot-email">E-mail institucional</label>
        <input id="forgot-email" type="email" required value={email()} onInput={(e) => setEmail(e.currentTarget.value)}
          class="field mb-4" placeholder="nome@univille.br" />
        <Show when={error()}>
          <div role="alert" class="mb-4 px-4 py-2.5 rounded-xl bg-rose text-red-700 text-sm">{error()}</div>
        </Show>
        <button type="submit" disabled={loading()} class="w-full py-2.5 rounded-full bg-forest text-white font-medium hover:bg-ink transition disabled:opacity-60">
          {loading() ? 'Enviando...' : 'Enviar link'}
        </button>
      </Show>
    </AuthCard>
  );
}

export function ResetPassword(props: { token: string }) {
  const [password, setPassword] = createSignal('');
  const [confirmation, setConfirmation] = createSignal('');
  const [error, setError] = createSignal('');
  const [loading, setLoading] = createSignal(false);

  const submit = async () => {
    setError('');
    if (password() !== confirmation()) return setError('As senhas não conferem');
    setLoading(true);
    try {
      const result = await api<{ message: string }>('/api/auth/reset-password', { method: 'POST', body: { token: props.token, newPassword: password() } });
      setCurrentUser(null);
      showToast({ message: result.message, kind: 'success' });
      navigate('/login');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard title="Redefinir senha" subtitle="Escolha uma nova senha com ao menos 6 caracteres" onSubmit={submit}>
      <label class="block text-sm font-medium mb-1" for="new-password">Nova senha</label>
      <input id="new-password" type="password" required minLength={6} autocomplete="new-password" value={password()}
        onInput={(e) => setPassword(e.currentTarget.value)} class="field mb-4" />
      <label class="block text-sm font-medium mb-1" for="confirm-password">Confirmar nova senha</label>
      <input id="confirm-password" type="password" required minLength={6} autocomplete="new-password" value={confirmation()}
        onInput={(e) => setConfirmation(e.currentTarget.value)} class="field mb-4" />
      <Show when={error()}>
        <div role="alert" class="mb-4 px-4 py-2.5 rounded-xl bg-rose text-red-700 text-sm">{error()}</div>
      </Show>
      <button type="submit" disabled={loading()} class="w-full py-2.5 rounded-full bg-forest text-white font-medium hover:bg-ink transition disabled:opacity-60">
        {loading() ? 'Salvando...' : 'Redefinir senha'}
      </button>
    </AuthCard>
  );
}

export default Login;
