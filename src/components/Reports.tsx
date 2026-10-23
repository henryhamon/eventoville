import { createSignal, onMount, For, Show } from 'solid-js';
import { createStore } from 'solid-js/store';
import { api, formatDate, showToast, type EventStatus } from '../api';
import StatusBadge from './StatusBadge';

type Filters = { start_date: string, end_date: string, course_id: string, theme_id: string };

function Reports() {
  const [filters, setFilters] = createStore<Filters>({ start_date: '', end_date: '', course_id: '', theme_id: '' });
  // Filters actually applied to the table; the CSV uses these, not unsaved edits
  const [applied, setApplied] = createSignal('');
  const [rows, setRows] = createSignal<any[]>([]);
  const [courses, setCourses] = createSignal<any[]>([]);
  const [themes, setThemes] = createSignal<any[]>([]);
  const [loading, setLoading] = createSignal(true);

  const queryString = () => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
    return params.toString();
  };

  const run = async () => {
    if (filters.start_date && filters.end_date && filters.start_date > filters.end_date) {
      return showToast({ message: 'A data inicial deve ser anterior à data final', kind: 'error' });
    }
    setLoading(true);
    try {
      const qs = queryString();
      setRows(await api(`/api/admin/reports/events${qs ? `?${qs}` : ''}`));
      setApplied(qs);
    } catch (err) {
      showToast({ message: (err as Error).message, kind: 'error' });
    } finally {
      setLoading(false);
    }
  };

  onMount(async () => {
    const [c, t] = await Promise.all([api<any[]>('/api/meta/courses'), api<any[]>('/api/meta/themes')]);
    setCourses(c);
    setThemes(t);
    run();
  });

  const clear = () => {
    setFilters({ start_date: '', end_date: '', course_id: '', theme_id: '' });
    run();
  };

  const exportCsv = () => {
    window.location.href = `/api/admin/reports/events.csv${applied() ? `?${applied()}` : ''}`;
  };

  const dirty = () => queryString() !== applied();

  return (
    <div class="fade-up">
      <div class="mb-5">
        <h1 class="text-2xl font-semibold mb-1">Relatórios</h1>
        <p class="text-sm text-sage">Filtre os eventos e exporte exatamente o resultado exibido em CSV</p>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); run(); }} class="bg-white rounded-[20px] shadow-card p-5 mb-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <label>
          <span class="block text-sm font-medium mb-1">Data Inicial</span>
          <input type="date" class="field" value={filters.start_date} onInput={e => setFilters('start_date', e.currentTarget.value)} />
        </label>
        <label>
          <span class="block text-sm font-medium mb-1">Data Final</span>
          <input type="date" class="field" value={filters.end_date} onInput={e => setFilters('end_date', e.currentTarget.value)} />
        </label>
        <label>
          <span class="block text-sm font-medium mb-1">Curso / Coordenação</span>
          <select class="field" value={filters.course_id} onChange={e => setFilters('course_id', e.currentTarget.value)}>
            <option value="">Todos</option>
            <For each={courses()}>{c => <option value={c.id}>{c.name}</option>}</For>
          </select>
        </label>
        <label>
          <span class="block text-sm font-medium mb-1">Tema</span>
          <select class="field" value={filters.theme_id} onChange={e => setFilters('theme_id', e.currentTarget.value)}>
            <option value="">Todos</option>
            <For each={themes()}>{t => <option value={t.id}>{t.name}</option>}</For>
          </select>
        </label>
        <div class="md:col-span-4 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={clear} class="px-5 py-2.5 rounded-full text-sm bg-gray-100">Limpar filtros</button>
          <button type="submit" class="px-5 py-2.5 rounded-full text-sm font-medium bg-forest text-white hover:bg-ink">Filtrar</button>
        </div>
      </form>

      <div class="bg-white rounded-[20px] shadow-card overflow-hidden">
        <div class="flex items-center justify-between gap-4 p-4 border-b border-gray-100 flex-wrap">
          <span class="text-sm text-sage">
            {rows().length} evento(s) encontrado(s)
            <Show when={dirty()}><span class="text-amber-700"> · filtros alterados, clique em Filtrar para atualizar</span></Show>
          </span>
          <button type="button" onClick={exportCsv} disabled={loading()} class="px-4 py-2 rounded-full text-sm font-medium bg-mint text-forest hover:bg-forest hover:text-white transition">
            ⬇ Exportar CSV
          </button>
        </div>
        <Show when={!loading()} fallback={<div class="p-8 text-center text-sage">Carregando...</div>}>
          <Show when={rows().length} fallback={<div class="p-8 text-center text-sage">Nenhum evento encontrado</div>}>
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr class="border-b border-gray-100 text-left text-sm text-sage">
                    <th class="p-3 font-medium">Nome do evento</th>
                    <th class="p-3 font-medium">Data</th>
                    <th class="p-3 font-medium">Início</th>
                    <th class="p-3 font-medium">Fim</th>
                    <th class="p-3 font-medium">Tema</th>
                    <th class="p-3 font-medium">Curso/Coordenação</th>
                    <th class="p-3 font-medium">Centro de Custo</th>
                    <th class="p-3 font-medium">Local</th>
                    <th class="p-3 font-medium">Solicitante</th>
                    <th class="p-3 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={rows()}>
                    {(r) => (
                      <tr class="border-b border-gray-50 text-sm">
                        <td class="p-3 font-medium">{r.title}</td>
                        <td class="p-3 whitespace-nowrap">{formatDate(r.event_date)}</td>
                        <td class="p-3">{r.start_time ?? '—'}</td>
                        <td class="p-3">{r.end_time ?? '—'}</td>
                        <td class="p-3">{r.theme_name ?? '—'}</td>
                        <td class="p-3">{r.course_name ?? '—'}</td>
                        <td class="p-3">{r.cost_center ?? '—'}</td>
                        <td class="p-3">{r.location_name ?? '—'}</td>
                        <td class="p-3">{r.requester_name ?? '—'}</td>
                        <td class="p-3"><StatusBadge status={r.status as EventStatus} /></td>
                      </tr>
                    )}
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

export default Reports;
