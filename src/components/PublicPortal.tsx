import { createSignal, onMount, For, Show } from 'solid-js';
import Header from './Header';
import { currentUser, homeFor } from '../api';

interface Event {
  id: number;
  title: string;
  description: string;
  event_date: string;
  start_time: string;
  end_time: string;
  theme_id: number;
  theme_name: string;
  location_id: number;
  location_name: string;
  speaker: string;
  realization: string;
  status: string;
}

function PublicPortal() {
  const [events, setEvents] = createSignal<Event[]>([]);
  const [searchTerm, setSearchTerm] = createSignal('');
  const [loading, setLoading] = createSignal(true);

  onMount(async () => {
    try {
      const response = await fetch('/api/public/events');
      const data = await response.json();
      setEvents(data);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  });

  const filteredEvents = () => {
    const term = searchTerm().toLowerCase();
    if (!term) return events();
    
    return events().filter(event => 
      event.title.toLowerCase().includes(term) ||
      event.theme_name?.toLowerCase().includes(term) ||
      event.speaker?.toLowerCase().includes(term) ||
      event.location_name?.toLowerCase().includes(term) ||
      event.realization?.toLowerCase().includes(term)
    );
  };

  // Today's approved events (local date), the one still running or next to start first
  const todayEvents = () => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const time = now.toTimeString().slice(0, 5);
    return events()
      .filter(e => e.event_date === today)
      .sort((a, b) => Number(a.end_time <= time) - Number(b.end_time <= time) || a.start_time.localeCompare(b.start_time));
  };

  const isLive = (event: Event) => {
    const time = new Date().toTimeString().slice(0, 5);
    return event.start_time <= time && time < event.end_time;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div class="view active pt-8 pb-16" style={{ "background": "#EFEFEF", "min-height": "100vh" }}>
      <div class="max-w-[1400px] mx-auto px-6 mb-6">
        <div class="flex items-center justify-between mb-6">
          <Header />
          <div class="flex items-center gap-2">
            <a href={currentUser() ? `#${homeFor(currentUser()!)}` : '#/login'} class="px-4 py-2 rounded-full text-sm font-medium bg-forest text-white hover:bg-ink transition">
              {currentUser() ? 'Meu painel' : 'Entrar'}
            </a>
          </div>
        </div>

        <div class="bg-white rounded-full px-4 py-2.5 shadow-soft flex items-center gap-2 flex-wrap" style={{ "box-shadow": "0 2px 16px rgba(14, 102, 65, 0.06)" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#328347" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.3-4.3"/>
          </svg>
          <input 
            type="text" 
            placeholder="Buscar eventos, palestrantes, locais..." 
            class="flex-1 min-w-[180px] outline-none text-sm bg-transparent" 
            value={searchTerm()}
            onInput={(e) => setSearchTerm(e.currentTarget.value)}
          />
        </div>
      </div>

      <Show when={todayEvents()[0]}>
        {(featured) => (
          <div class="max-w-[1400px] mx-auto px-6 mb-10">
            <div class="relative rounded-[28px] overflow-hidden min-h-[300px] shadow-card" style={{ "background": "linear-gradient(135deg, #0E6641 0%, #328347 50%, #50916B 100%)" }}>
              <div class="absolute inset-0 opacity-30" style={{ "background-image": "radial-gradient(circle at 20% 50%, rgba(255,255,255,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.2) 0%, transparent 40%)" }}></div>
              <div class="absolute top-6 right-6 bg-white/15 backdrop-blur-md rounded-full px-4 py-1.5 text-white text-xs font-medium flex items-center gap-2">
                <Show when={isLive(featured())} fallback={<>Hoje às {featured().start_time}</>}>
                  <span class="w-2 h-2 rounded-full bg-white animate-pulse"></span> Acontecendo agora
                </Show>
              </div>
              <div class="relative z-10 p-8 md:p-10 min-h-[300px] flex flex-col justify-between gap-8">
                <div>
                  <div class="text-white/80 text-sm font-medium mb-2">Evento em Destaque Hoje</div>
                  <h1 class="text-white text-3xl md:text-5xl font-bold mb-3 leading-tight max-w-3xl">{featured().title}</h1>
                  <p class="text-white/85 text-base max-w-2xl">
                    {featured().description || [featured().theme_name, featured().realization].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <div class="flex items-end justify-between flex-wrap gap-4">
                  <div class="flex items-center gap-6 md:gap-8 text-white flex-wrap">
                    <div><div class="text-white/70 text-xs">Data</div><div class="font-semibold">{formatDate(featured().event_date)}</div></div>
                    <div><div class="text-white/70 text-xs">Horário</div><div class="font-semibold">{featured().start_time}–{featured().end_time}</div></div>
                    <div><div class="text-white/70 text-xs">Local</div><div class="font-semibold">{featured().location_name}</div></div>
                    <Show when={featured().speaker}>
                      <div><div class="text-white/70 text-xs">Palestrante</div><div class="font-semibold">{featured().speaker}</div></div>
                    </Show>
                  </div>
                  <Show when={todayEvents().length > 1}>
                    <div class="bg-white text-forest px-5 py-2.5 rounded-full text-sm font-semibold shadow-lg">
                      +{todayEvents().length - 1} outro(s) evento(s) hoje na agenda
                    </div>
                  </Show>
                </div>
              </div>
            </div>
          </div>
        )}
      </Show>

      <div class="max-w-[1400px] mx-auto px-6 mb-10">
        <div class="flex items-center justify-between mb-5">
          <div>
            <h2 class="text-2xl font-semibold mb-1">Agenda Institucional</h2>
            <p class="text-sage text-sm" style={{ "color": "#50916B" }}>Eventos aprovados - Mês atual e próximos 2 meses</p>
          </div>
        </div>

        <div class="bg-white rounded-[20px] shadow-card overflow-hidden" style={{ "box-shadow": "0 1px 2px rgba(0,0,0,0.03), 0 8px 24px rgba(14, 102, 65, 0.06)" }}>
          {loading() ? (
            <div class="p-8 text-center text-sage" style={{ "color": "#50916B" }}>Carregando...</div>
          ) : filteredEvents().length === 0 ? (
            <div class="p-8 text-center text-sage" style={{ "color": "#50916B" }}>Nenhum evento encontrado</div>
          ) : (
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr class="border-b border-gray-100">
                    <th class="text-left p-4 text-sm font-medium text-sage" style={{ "color": "#50916B" }}>Data</th>
                    <th class="text-left p-4 text-sm font-medium text-sage" style={{ "color": "#50916B" }}>Evento</th>
                    <th class="text-left p-4 text-sm font-medium text-sage" style={{ "color": "#50916B" }}>Tema</th>
                    <th class="text-left p-4 text-sm font-medium text-sage" style={{ "color": "#50916B" }}>Início</th>
                    <th class="text-left p-4 text-sm font-medium text-sage" style={{ "color": "#50916B" }}>Local</th>
                    <th class="text-left p-4 text-sm font-medium text-sage" style={{ "color": "#50916B" }}>Palestrante</th>
                    <th class="text-left p-4 text-sm font-medium text-sage" style={{ "color": "#50916B" }}>Realização</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={filteredEvents()}>
                    {(event) => (
                      <tr class="border-b border-gray-50 hover:bg-mint/30 transition" style={{ "border-color": "#f9f9f9" }}>
                        <td class="p-4 text-sm">{formatDate(event.event_date)}</td>
                        <td class="p-4 text-sm font-medium">{event.title}</td>
                        <td class="p-4 text-sm">{event.theme_name || '-'}</td>
                        <td class="p-4 text-sm">{event.start_time}</td>
                        <td class="p-4 text-sm">{event.location_name}</td>
                        <td class="p-4 text-sm">{event.speaker || '-'}</td>
                        <td class="p-4 text-sm">{event.realization}</td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PublicPortal;
