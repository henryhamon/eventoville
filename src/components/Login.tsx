import { createSignal, Show } from 'solid-js';
import { api, setCurrentUser, homeFor, navigate, type User } from '../api';
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

          <div class="mt-6 text-center">
            <a href="#/" class="text-sm text-sage hover:text-forest">← Voltar à agenda pública</a>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;
