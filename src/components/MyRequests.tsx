import { createSignal, onMount, For, Show } from 'solid-js';
import { api, formatDate, showToast, type EventStatus } from '../api';
import StatusBadge from './StatusBadge';

function MyRequests() {
  const [events, setEvents] = createSignal<any[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [expanded, setExpanded] = createSignal<number | null>(null);

  const load = async () => {
    try {
      setEvents(await api('/api/events'));
    } catch (err) {
      showToast({ message: (err as Error).message, kind: 'error' });
    } finally {
      setLoading(false);
    }
  };
  onMount(load);

  const act = async (label: string, request: () => Promise<unknown>, confirmText?: string) => {
    if (confirmText && !confirm(confirmText)) return;
    try {
      await request();
      showToast({ message: label, kind: 'success' });
      await load();
    } catch (err) {
      showToast({ message: (err as Error).message, kind: 'error' });
    }
  };

  const submit = (id: number) => act('Solicitação enviada para aprovação', () => api(`/api/events/${id}/submit`, { method: 'PUT' }));
  const cancel = (id: number) => act('Solicitação cancelada', () => api(`/api/events/${id}/cancel`, { method: 'PUT' }), 'Cancelar esta solicitação?');
  const remove = (id: number) => act('Rascunho eliminado', () => api(`/api/events/${id}`, { method: 'DELETE' }), 'Eliminar este rascunho? Esta ação não pode ser desfeita.');

  const btn = 'px-3 py-1.5 rounded-full text-xs font-medium transition';

  return (
    <div class="fade-up">
      <div class="flex items-center justify-between mb-5 gap-4 flex-wrap">
        <div>
          <h1 class="text-2xl font-semibold mb-1">Minhas Solicitações</h1>
          <p class="text-sm text-sage">Acompanhe o andamento dos pedidos de evento que você registrou</p>
        </div>
        <a href="#/nova" class="px-5 py-2.5 rounded-full text-sm font-medium bg-forest text-white hover:bg-ink transition">+ Nova Solicitação</a>
      </div>

      <div class="bg-white rounded-[20px] shadow-card overflow-hidden">
        <Show when={!loading()} fallback={<div class="p-8 text-center text-sage">Carregando...</div>}>
          <Show when={events().length} fallback={<div class="p-8 text-center text-sage">Você ainda não registrou solicitações.</div>}>
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr class="border-b border-gray-100 text-left text-sm text-sage">
                    <th class="p-4 font-medium">Evento</th>
                    <th class="p-4 font-medium">Data</th>
                    <th class="p-4 font-medium">Horário</th>
                    <th class="p-4 font-medium">Local</th>
                    <th class="p-4 font-medium">Estado</th>
                    <th class="p-4 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={events()}>
                    {(e) => {
                      const status = e.status as EventStatus;
                      return (
                        <>
                          <tr class="border-b border-gray-50 text-sm align-middle">
                            <td class="p-4 font-medium">
                              <a href={`#/editar/${e.id}`} class="hover:text-forest">{e.title}</a>
                              <Show when={status === 'REJEITADO'}>
                                <button type="button" onClick={() => setExpanded(expanded() === e.id ? null : e.id)} class="block text-xs text-red-700 mt-1 hover:underline">
                                  {expanded() === e.id ? 'Ocultar motivo' : 'Ver motivo da rejeição'}
                                </button>
                              </Show>
                            </td>
                            <td class="p-4">{formatDate(e.event_date)}</td>
                            <td class="p-4 whitespace-nowrap">{e.start_time && e.end_time ? `${e.start_time}–${e.end_time}` : '—'}</td>
                            <td class="p-4">{e.location_name ?? '—'}</td>
                            <td class="p-4"><StatusBadge status={status} /></td>
                            <td class="p-4">
                              <div class="flex justify-end gap-2 flex-wrap">
                                <Show when={status === 'RASCUNHO' || status === 'REJEITADO' || status === 'AGUARDANDO_APROVACAO'}>
                                  <a href={`#/editar/${e.id}`} class={`${btn} bg-mint text-forest hover:bg-forest hover:text-white`}>Editar</a>
                                </Show>
                                <Show when={status === 'RASCUNHO' || status === 'REJEITADO'}>
                                  <button type="button" onClick={() => submit(e.id)} class={`${btn} bg-forest text-white hover:bg-ink`}>Enviar</button>
                                </Show>
                                <Show when={status === 'AGUARDANDO_APROVACAO'}>
                                  <button type="button" onClick={() => cancel(e.id)} class={`${btn} bg-gray-100 text-gray-700 hover:bg-gray-200`}>Cancelar</button>
                                </Show>
                                <Show when={status === 'RASCUNHO'}>
                                  <button type="button" onClick={() => remove(e.id)} class={`${btn} bg-rose text-red-700 hover:bg-red-100`}>Eliminar</button>
                                </Show>
                                <Show when={status === 'APROVADO' || status === 'CANCELADO'}>
                                  <a href={`#/editar/${e.id}`} class={`${btn} bg-gray-100 text-gray-700 hover:bg-gray-200`}>Ver</a>
                                </Show>
                              </div>
                            </td>
                          </tr>
                          <Show when={expanded() === e.id}>
                            <tr class="bg-rose/60 text-sm"><td colSpan={6} class="px-4 py-3 text-red-800"><b>Motivo:</b> {e.rejection_reason}</td></tr>
                          </Show>
                        </>
                      );
                    }}
                  </For>
                </tbody>
              </table>
            </div>
          </Show>
        </Show>
      </div>
    </div>
  );
}

export default MyRequests;
