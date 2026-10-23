import { createSignal, onCleanup, onMount, Show, Switch, Match, createEffect } from 'solid-js';
import { currentUser, loadSession, homeFor, navigate, toast } from './api';
import PublicPortal from './components/PublicPortal';
import Login, { ForgotPassword, ResetPassword } from './components/Login';
import Shell from './components/Shell';
import MyRequests from './components/MyRequests';
import EventForm from './components/EventForm';
import AdminQueue from './components/AdminQueue';
import AdminCatalog from './components/AdminCatalog';
import Reports from './components/Reports';
import Outbox from './components/Outbox';

const readRoute = () => location.hash.replace(/^#/, '') || '/';

function App() {
  const [route, setRoute] = createSignal(readRoute());
  const onHashChange = () => setRoute(readRoute());

  onMount(() => {
    window.addEventListener('hashchange', onHashChange);
    loadSession();
  });
  onCleanup(() => window.removeEventListener('hashchange', onHashChange));

  const resetToken = () => route().match(/^\/redefinir\/([0-9a-f]+)$/)?.[1];
  const isPublic = () => ['/', '/login', '/esqueci'].includes(route()) || !!resetToken();
  const editId = () => route().match(/^\/editar\/(\d+)$/)?.[1];

  // Route guard: restricted areas need a session, admin area needs ADMIN
  createEffect(() => {
    const user = currentUser();
    if (user === undefined) return;
    const path = route();
    if (path === '/login' && user) return navigate(homeFor(user));
    if (isPublic()) return;
    if (!user) return navigate('/login');
    if (path.startsWith('/admin') && user.role !== 'ADMIN') return navigate('/minhas');
  });

  return (
    <>
    <Show when={toast()}>
      {(t) => (
        <div role="status" class={`fixed bottom-6 right-6 z-[60] max-w-sm px-5 py-3 rounded-2xl shadow-card text-sm font-medium fade-up ${t().kind === 'success' ? 'bg-forest text-white' : 'bg-red-600 text-white'}`}>
          {t().message}
          <Show when={t().link}>{(l) => <a href={l().href} class="ml-2 underline">{l().label}</a>}</Show>
        </div>
      )}
    </Show>
    <Show when={currentUser() !== undefined} fallback={<div class="p-8 text-center text-sage">Carregando...</div>}>
      <Switch>
        <Match when={route() === '/'}><PublicPortal /></Match>
        <Match when={route() === '/login'}><Login /></Match>
        <Match when={route() === '/esqueci'}><ForgotPassword /></Match>
        <Match when={resetToken()}>{(token) => <ResetPassword token={token()} />}</Match>
        <Match when={currentUser()}>
          <Shell route={route()}>
            <Switch fallback={<MyRequests />}>
              <Match when={route() === '/nova'}><EventForm /></Match>
              <Match when={editId()}>{(id) => <EventForm id={Number(id())} />}</Match>
              <Match when={route() === '/admin/cadastros' && currentUser()?.role === 'ADMIN'}><AdminCatalog /></Match>
              <Match when={route() === '/admin/relatorios' && currentUser()?.role === 'ADMIN'}><Reports /></Match>
              <Match when={route() === '/admin/emails' && currentUser()?.role === 'ADMIN'}><Outbox /></Match>
              <Match when={route().startsWith('/admin') && currentUser()?.role === 'ADMIN'}><AdminQueue route={route()} /></Match>
            </Switch>
          </Shell>
        </Match>
      </Switch>
    </Show>
    </>
  );
}

export default App;
