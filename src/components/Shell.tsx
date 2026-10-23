import { For, type JSX } from 'solid-js';
import { currentUser, logout } from '../api';

type NavItem = { href: string, label: string, icon: JSX.Element, match: (route: string) => boolean };

const icon = (path: JSX.Element) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">{path}</svg>
);

const requesterNav: NavItem[] = [
  { href: '#/minhas', label: 'Minhas Solicitações', match: r => r === '/minhas' || r.startsWith('/editar'), icon: icon(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h4"/></>) },
  { href: '#/nova', label: 'Nova Solicitação', match: r => r === '/nova', icon: icon(<><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></>) },
];

const adminNav: NavItem[] = [
  { href: '#/admin', label: 'Solicitações', match: r => r === '/admin' || r.startsWith('/admin/evento') || r.startsWith('/editar'), icon: icon(<><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>) },
  { href: '#/admin/cadastros', label: 'Cadastros', match: r => r === '/admin/cadastros', icon: icon(<><path d="M4 6h16M4 12h16M4 18h10"/></>) },
  { href: '#/admin/relatorios', label: 'Relatórios', match: r => r === '/admin/relatorios', icon: icon(<><path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/></>) },
];

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

function Shell(props: { route: string, children: JSX.Element }) {
  const user = () => currentUser()!;
  const nav = () => (user().role === 'ADMIN' ? adminNav : requesterNav);

  return (
    <div class="pt-8 pb-16">
      <div class="max-w-[1400px] mx-auto px-6 flex flex-col md:flex-row gap-6">
        <aside class="md:w-[260px] shrink-0 bg-ink rounded-[28px] p-5 text-white h-fit md:sticky md:top-8">
          <a href="#/" class="block bg-white rounded-2xl p-3 mb-4">
            <img src="/univille-logo.png" alt="Univille" class="h-10 w-auto mx-auto" />
          </a>
          <div class="text-sm font-semibold leading-tight mb-8 px-1">Sistema de Gestão de Eventos Institucionais</div>

          <div class="text-[11px] uppercase tracking-wider text-white/50 mb-3 px-3">
            {user().role === 'ADMIN' ? 'Administração' : 'Solicitante'}
          </div>
          <nav class="space-y-1">
            <For each={nav()}>
              {(item) => (
                <a href={item.href} classList={{ active: item.match(props.route) }} class="sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm">
                  {item.icon}{item.label}
                </a>
              )}
            </For>
          </nav>

          <div class="text-[11px] uppercase tracking-wider text-white/50 mb-3 mt-6 px-3">Geral</div>
          <nav class="space-y-1">
            <a href="#/" class="sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm">
              {icon(<><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></>)}Agenda Pública
            </a>
            <button type="button" onClick={logout} class="sidebar-link w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/70">
              {icon(<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>)}Sair
            </button>
          </nav>

          <div class="mt-8 p-3 rounded-2xl bg-white/5 border border-white/10">
            <div class="flex items-center gap-2">
              <div class="w-9 h-9 rounded-full bg-gradient-to-br from-brand to-sage flex items-center justify-center font-semibold text-sm">{initials(user().name)}</div>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-semibold truncate">{user().name}</div>
                <div class="text-xs text-white/60 truncate">{user().email}</div>
              </div>
            </div>
          </div>
        </aside>

        <main class="flex-1 min-w-0">{props.children}</main>
      </div>
    </div>
  );
}

export default Shell;
