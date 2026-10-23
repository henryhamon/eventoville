import { createSignal, onMount, For } from 'solid-js';

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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div class="view active pt-8 pb-16" style={{ "background": "#EFEFEF", "min-height": "100vh" }}>
      <div class="max-w-[1400px] mx-auto px-6 mb-6">
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-forest flex items-center justify-center" style={{ "background": "#0E6641" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07"/>
              </svg>
            </div>
            <div>
              <div class="text-lg font-semibold">evently</div>
              <div class="text-xs text-sage" style={{ "color": "#50916B" }}>Descubra experiências</div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button class="px-4 py-2 rounded-full text-sm font-medium text-forest hover:bg-mint transition" style={{ "color": "#0E6641" }}>Entrar</button>
            <button class="px-4 py-2 rounded-full text-sm font-medium bg-forest text-white hover:bg-ink transition" style={{ "background": "#0E6641" }}>Criar Conta</button>
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
