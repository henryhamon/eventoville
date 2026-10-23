import { createSignal, createEffect, onMount, For, Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import { api, formatDate, navigate, showToast, STATUS_LABELS, type EventStatus } from '../api';
import StatusBadge from './StatusBadge';

const FILTERS: (EventStatus | '')[] = ['AGUARDANDO_APROVACAO', 'APROVADO', 'REJEITADO', 'RASCUNHO', 'CANCELADO', ''];

const AUDIT_LABELS: Record<string, string> = {
  CRIADO: 'Criou a solicitação',
  EDITADO: 'Editou os dados',
  ENVIADO: 'Enviou para aprovação',
  APROVADO: 'Aprovou e publicou',
  REJEITADO: 'Rejeitou',
  CANCELADO: 'Cancelou',
};

function AdminQueue(props: { route: string }) {
  const [filter, setFilter] = createSignal<EventStatus | ''>('AGUARDANDO_APROVACAO');
  const [events, setEvents] = createSignal<any[]>([]);
  const [counts, setCounts] = createSignal<Record<string, number>>({});
  const [loading, setLoading] = createSignal(true);

  const detailId = () => props.route.match(/^\/admin\/evento\/(\d+)$/)?.[1];

  const load = async () => {
    try {
      const query = filter() ? `?status=${filter()}` : '';
      const [list, c] = await Promise.all([api<any[]>(`/api/events${query}`), api('/api/events/counts')]);
      setEvents(list);
      setCounts(c);
    } catch (err) {
      showToast({ message: (err as Error).message, kind: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Runs on mount and whenever the status filter changes
  createEffect(() => { filter(); load(); });

  const total = () => Object.values(counts()).reduce((a, b) => a + b, 0);

  return (
    <div class="fade-up">
      <div class="mb-5">
        <h1 class="text-2xl font-semibold mb-1">Solicitações de Eventos</h1>
        <p class="text-sm text-sage">Analise, aprove ou rejeite pedidos. Eventos aprovados são publicados na agenda pública imediatamente.</p>
      </div>

      <Show when={counts().AGUARDANDO_APROVACAO}>
        <button type="button" onClick={() => setFilter('AGUARDANDO_APROVACAO')} class="mb-4 w-full text-left p-4 rounded-2xl bg-cream border border-amber-200 flex items-center justify-between">
          <span class="font-medium text-amber-900">Aguardando aprovação</span>
          <span class="text-sm text-amber-800">{counts().AGUARDANDO_APROVACAO} pendente(s)</span>
        </button>
      </Show>

      <div class="flex flex-wrap gap-2 mb-4">
        <For each={FILTERS}>
          {(s) => (
            <button type="button" onClick={() => setFilter(s)} classList={{ active: filter() === s }} class="chip px-4 py-1.5 rounded-full text-sm bg-white border border-gray-200">
              {s ? STATUS_LABELS[s] : 'Todos'} <span class="opacity-70">({s ? counts()[s] ?? 0 : total()})</span>
            </button>
          )}
        </For>
      </div>

      <div class="bg-white rounded-[20px] shadow-card overflow-hidden">
        <Show when={!loading()} fallback={<div class="p-8 text-center text-sage">Carregando...</div>}>
          <Show when={events().length} fallback={<div class="p-8 text-center text-sage">Nenhuma solicitação neste estado.</div>}>
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr class="border-b border-gray-100 text-left text-sm text-sage">
                    <th class="p-4 font-medium">Evento</th>
                    <th class="p-4 font-medium">Data</th>
                    <th class="p-4 font-medium">Horário</th>
                    <th class="p-4 font-medium">Local</th>
                    <th class="p-4 font-medium">Curso</th>
                    <th class="p-4 font-medium">Solicitante</th>
                    <th class="p-4 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={events()}>
                    {(e) => (
                      <tr onClick={() => navigate(`/admin/evento/${e.id}`)} class="border-b border-gray-50 text-sm cursor-pointer hover:bg-mint/40 transition">
                        <td class="p-4 font-medium">{e.title}</td>
                        <td class="p-4">{formatDate(e.event_date)}</td>
                        <td class="p-4 whitespace-nowrap">{e.start_time && e.end_time ? `${e.start_time}–${e.end_time}` : '—'}</td>
                        <td class="p-4">{e.location_name ?? '—'}</td>
                        <td class="p-4">{e.course_name ?? '—'}</td>
                        <td class="p-4">{e.requester_name ?? '—'}</td>
                        <td class="p-4"><StatusBadge status={e.status} /></td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </Show>
        </Show>
      </div>

      {/* Portal keeps the overlay fixed to the viewport despite the animated (transformed) container */}
      <Show when={detailId()} keyed>
        {(id) => <Portal><EventDetail id={Number(id)} onChanged={load} /></Portal>}
      </Show>
    </div>
  );
}

function EventDetail(props: { id: number, onChanged: () => void }) {
  const [event, setEvent] = createSignal<any>(null);
  const [resources, setResources] = createSignal<Record<number, string>>({});
  const [error, setError] = createSignal<string | null>(null);
  const [rejecting, setRejecting] = createSignal(false);
  const [reason, setReason] = createSignal('');
  const [busy, setBusy] = createSignal(false);

  const load = async () => {
    try {
      const [e, r] = await Promise.all([api(`/api/events/${props.id}`), api<any[]>('/api/meta/resources')]);
      setEvent(e);
      setResources(Object.fromEntries(r.map(x => [x.id, x.name])));
    } catch (err) {
      setError((err as Error).message);
    }
  };
  onMount(load);

  const close = () => navigate('/admin');

  const act = async (request: () => Promise<unknown>, toast: Parameters<typeof showToast>[0]) => {
    setError(null);
    setBusy(true);
    try {
      await request();
      showToast(toast);
      props.onChanged();
      setRejecting(false);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const approve = () => act(() => api(`/api/events/${props.id}/approve`, { method: 'PUT' }),
    { message: 'Evento aprovado e publicado na agenda pública', kind: 'success', link: { href: '#/', label: 'Ver agenda' } });
  const reject = () => {
    if (!reason().trim()) return setError('Informe a justificativa da rejeição');
    act(() => api(`/api/events/${props.id}/reject`, { method: 'PUT', body: { rejection_reason: reason() } }),
      { message: 'Solicitação rejeitada; a justificativa ficou visível ao solicitante', kind: 'success' });
  };
  const cancel = () => {
    if (!confirm('Cancelar este evento? Ele sairá da agenda pública, mas continuará no histórico.')) return;
    act(() => api(`/api/events/${props.id}/cancel`, { method: 'PUT' }),
      { message: 'Evento cancelado e removido da agenda pública', kind: 'success' });
  };

  const row = (label: string, value: unknown) => (
    <div>
      <div class="text-xs text-sage">{label}</div>
      <div class="text-sm">{value === null || value === undefined || value === '' ? '—' : String(value)}</div>
    </div>
  );

  return (
    <div class="fixed inset-0 z-50 modal-overlay flex justify-end" onClick={(e) => e.target === e.currentTarget && close()}>
      <div class="bg-white w-full max-w-xl h-full overflow-y-auto p-6 shadow-2xl fade-up">
        <div class="flex items-start justify-between gap-4 mb-4">
          <div>
            <div class="text-xs text-sage mb-1">Solicitação #{props.id}</div>
            <h2 class="text-xl font-semibold">{event()?.title ?? 'Carregando...'}</h2>
          </div>
          <button type="button" onClick={close} class="text-2xl leading-none text-gray-400 hover:text-ink" aria-label="Fechar">×</button>
        </div>

        <Show when={error()}>
          <div role="alert" class="mb-4 p-3 rounded-xl bg-cream text-amber-900 border border-amber-300 text-sm font-medium">{error()}</div>
        </Show>

        <Show when={event()}>
          {(e) => (
            <>
              <div class="mb-5"><StatusBadge status={e().status} /></div>

              <Show when={e().status === 'REJEITADO' && e().rejection_reason}>
                <div class="mb-4 p-3 rounded-xl bg-rose text-sm text-red-800"><b>Justificativa:</b> {e().rejection_reason}</div>
              </Show>

              <div class="grid grid-cols-2 gap-4 mb-6">
                {row('Data', formatDate(e().event_date))}
                {row('Horário', e().start_time ? `${e().start_time}–${e().end_time}` : null)}
                {row('Local', e().location_name)}
                {row('Tema', e().theme_name)}
                {row('Curso / Coordenação', e().course_name)}
                {row('Centro de Custo', e().cost_center)}
                {row('Solicitante', e().requester_name)}
                {row('Registrado por', e().author_name)}
                {row('Palestrante', e().speaker)}
                {row('Público-alvo', e().target_audience)}
                {row('Recursos', (e().resource_ids as number[]).map(id => resources()[id]).filter(Boolean).join(', '))}
                {row('Cerimonial / Inscrições', e().needs_ceremonial ? 'Sim' : 'Não')}
                {row('Declarações / Certificados', e().needs_certificates ? 'Sim' : 'Não')}
                <div class="col-span-2">{row('Justificativa', e().justification)}</div>
                <div class="col-span-2">{row('Objetivo', e().objective)}</div>
                <div class="col-span-2">{row('Observações', e().observations)}</div>
              </div>

              <Show when={rejecting()}>
                <div class="mb-4">
                  <label class="block text-sm font-medium mb-1" for="reason">Justificativa da rejeição <span class="text-red-600">*</span></label>
                  <textarea id="reason" rows={3} class="field" value={reason()} onInput={ev => setReason(ev.currentTarget.value)} placeholder="Explique ao solicitante o que precisa ser corrigido" />
                  <div class="flex justify-end gap-2 mt-2">
                    <button type="button" onClick={() => setRejecting(false)} class="px-4 py-2 rounded-full text-sm bg-gray-100">Voltar</button>
                    <button type="button" disabled={busy()} onClick={reject} class="px-4 py-2 rounded-full text-sm font-medium bg-red-600 text-white hover:bg-red-700">Confirmar rejeição</button>
                  </div>
                </div>
              </Show>

              <Show when={!rejecting()}>
                <div class="flex flex-wrap gap-2 mb-8">
                  <Show when={e().status === 'AGUARDANDO_APROVACAO'}>
                    <button type="button" disabled={busy()} onClick={approve} class="px-5 py-2.5 rounded-full text-sm font-medium bg-forest text-white hover:bg-ink">Aprovar e publicar</button>
                    <button type="button" disabled={busy()} onClick={() => { setError(null); setRejecting(true); }} class="px-5 py-2.5 rounded-full text-sm font-medium bg-rose text-red-700 hover:bg-red-100">Rejeitar</button>
                  </Show>
                  <Show when={e().can_edit}>
                    <a href={`#/editar/${props.id}`} class="px-5 py-2.5 rounded-full text-sm font-medium bg-mint text-forest hover:bg-forest hover:text-white">Editar</a>
                  </Show>
                  <Show when={e().status === 'APROVADO' || e().status === 'AGUARDANDO_APROVACAO'}>
                    <button type="button" disabled={busy()} onClick={cancel} class="px-5 py-2.5 rounded-full text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200">Cancelar evento</button>
                  </Show>
                </div>
              </Show>

              <h3 class="text-sm font-semibold mb-3">Histórico</h3>
              <ol class="border-l-2 border-mint ml-1 space-y-3">
                <For each={e().audit}>
                  {(a: any) => (
                    <li class="pl-4 relative">
                      <span class="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-brand"></span>
                      <div class="text-sm"><b>{a.user_name}</b> · {AUDIT_LABELS[a.action] ?? a.action}</div>
                      <div class="text-xs text-gray-500">{new Date(a.created_at.replace(' ', 'T') + 'Z').toLocaleString('pt-BR')}</div>
                      <Show when={a.comment}><div class="text-xs text-gray-700 mt-1 italic">“{a.comment}”</div></Show>
                    </li>
                  )}
                </For>
              </ol>
            </>
          )}
        </Show>
      </div>
    </div>
  );
}

export default AdminQueue;
