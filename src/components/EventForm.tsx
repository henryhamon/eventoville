import { createSignal, createMemo, onMount, For, Show } from 'solid-js';
import { createStore } from 'solid-js/store';
import { api, ApiError, currentUser, navigate, showToast, type EventStatus } from '../api';
import StatusBadge from './StatusBadge';

type Meta = { id: number, name: string };
type Course = Meta & { cost_center: string };
type Location = Meta & { capacity: number, resource_ids: number[] };

type FormData = {
  title: string, theme_id: string, course_id: string, event_date: string, start_time: string, end_time: string,
  location_id: string, resource_ids: number[], speaker: string, target_audience: string, justification: string,
  objective: string, requester_name: string, needs_ceremonial: boolean, needs_certificates: boolean, observations: string,
};

// Mirrors the server-side list used to validate submissions
const REQUIRED: (keyof FormData)[] = [
  'title', 'theme_id', 'course_id', 'event_date', 'start_time', 'end_time', 'location_id',
  'requester_name', 'target_audience', 'justification', 'objective',
];

const emptyForm = (): FormData => ({
  title: '', theme_id: '', course_id: '', event_date: '', start_time: '', end_time: '', location_id: '',
  resource_ids: [], speaker: '', target_audience: '', justification: '', objective: '', requester_name: '',
  needs_ceremonial: false, needs_certificates: false, observations: '',
});

function EventForm(props: { id?: number }) {
  const [form, setForm] = createStore<FormData>(emptyForm());
  const [courses, setCourses] = createSignal<Course[]>([]);
  const [themes, setThemes] = createSignal<Meta[]>([]);
  const [locations, setLocations] = createSignal<Location[]>([]);
  const [resources, setResources] = createSignal<Meta[]>([]);
  const [event, setEvent] = createSignal<any>(null);
  const [invalid, setInvalid] = createSignal<Set<string>>(new Set());
  const [error, setError] = createSignal<{ message: string, conflict: boolean } | null>(null);
  const [busy, setBusy] = createSignal(false);
  const [loading, setLoading] = createSignal(true);

  const isAdmin = () => currentUser()?.role === 'ADMIN';
  const status = (): EventStatus | null => event()?.status ?? null;
  const readOnly = () => !!event() && !event().can_edit;
  const backTo = () => (isAdmin() ? (props.id ? `/admin/evento/${props.id}` : '/admin') : '/minhas');

  onMount(async () => {
    try {
      const [c, t, l, r] = await Promise.all([
        api<Course[]>('/api/meta/courses'), api<Meta[]>('/api/meta/themes'),
        api<Location[]>('/api/meta/locations'), api<Meta[]>('/api/meta/resources'),
      ]);
      setCourses(c); setThemes(t); setLocations(l); setResources(r);
      if (props.id) {
        const e = await api(`/api/events/${props.id}`);
        setEvent(e);
        setForm({
          title: e.title ?? '', theme_id: String(e.theme_id ?? ''), course_id: String(e.course_id ?? ''),
          event_date: e.event_date ?? '', start_time: e.start_time ?? '', end_time: e.end_time ?? '',
          location_id: String(e.location_id ?? ''), resource_ids: e.resource_ids ?? [], speaker: e.speaker ?? '',
          target_audience: e.target_audience ?? '', justification: e.justification ?? '', objective: e.objective ?? '',
          requester_name: e.requester_name ?? '', needs_ceremonial: !!e.needs_ceremonial,
          needs_certificates: !!e.needs_certificates, observations: e.observations ?? '',
        });
      }
    } catch (err) {
      setError({ message: (err as Error).message, conflict: false });
    } finally {
      setLoading(false);
    }
  });

  const costCenter = createMemo(() => courses().find(c => String(c.id) === form.course_id)?.cost_center ?? '');
  const availableResources = createMemo(() => {
    const location = locations().find(l => String(l.id) === form.location_id);
    return location ? resources().filter(r => location.resource_ids.includes(r.id)) : [];
  });

  const changeLocation = (value: string) => {
    const allowed = locations().find(l => String(l.id) === value)?.resource_ids ?? [];
    setForm({ location_id: value, resource_ids: form.resource_ids.filter(id => allowed.includes(id)) });
  };

  const toggleResource = (id: number) => {
    setForm('resource_ids', ids => (ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]));
  };

  const payload = () => ({
    ...form,
    theme_id: form.theme_id ? Number(form.theme_id) : null,
    course_id: form.course_id ? Number(form.course_id) : null,
    location_id: form.location_id ? Number(form.location_id) : null,
  });

  // Client-side check for immediate feedback; the server validates again
  const checkRequired = (full: boolean) => {
    const missing = new Set<string>(full ? REQUIRED.filter(k => !String(form[k] ?? '').trim()) : (form.title.trim() ? [] : ['title']));
    if (form.start_time && form.end_time && form.start_time >= form.end_time) missing.add('end_time');
    setInvalid(missing);
    if (missing.size) {
      setError({ message: missing.has('end_time') && missing.size === 1 ? 'A hora de fim deve ser posterior à hora de início' : 'Preencha os campos destacados', conflict: false });
      return false;
    }
    return true;
  };

  const run = async (full: boolean, action: () => Promise<void>) => {
    setError(null);
    if (!checkRequired(full)) return;
    setBusy(true);
    try {
      await action();
    } catch (err) {
      const conflict = err instanceof ApiError && err.status === 409;
      setError({ message: (err as Error).message, conflict });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setBusy(false);
    }
  };

  const saveDraft = () => run(false, async () => {
    if (props.id) await api(`/api/events/${props.id}`, { method: 'PUT', body: payload() });
    else await api('/api/events', { method: 'POST', body: payload() });
    showToast({ message: 'Rascunho guardado', kind: 'success' });
    navigate('/minhas');
  });

  const submit = () => run(true, async () => {
    if (props.id) {
      await api(`/api/events/${props.id}`, { method: 'PUT', body: payload() });
      await api(`/api/events/${props.id}/submit`, { method: 'PUT' });
    } else {
      await api('/api/events', { method: 'POST', body: { ...payload(), submit: true } });
    }
    showToast({ message: 'Solicitação enviada para aprovação', kind: 'success' });
    navigate('/minhas');
  });

  const saveChanges = () => run(true, async () => {
    await api(`/api/events/${props.id}`, { method: 'PUT', body: payload() });
    showToast(status() === 'APROVADO'
      ? { message: 'Evento atualizado na agenda pública', kind: 'success', link: { href: '#/', label: 'Ver agenda' } }
      : { message: 'Alterações salvas', kind: 'success' });
    navigate(backTo());
  });

  const canSubmit = () => !isAdmin() && (!status() || status() === 'RASCUNHO' || status() === 'REJEITADO');
  const isPendingEdit = () => status() === 'AGUARDANDO_APROVACAO' || status() === 'APROVADO';

  const cls = (key: string) => `field ${invalid().has(key) ? 'invalid' : ''}`;
  const label = (text: string, key?: keyof FormData) => (
    <span class="block text-sm font-medium mb-1">{text}{key && REQUIRED.includes(key) ? <span class="text-red-600"> *</span> : null}</span>
  );

  return (
    <div class="fade-up">
      <div class="flex items-center justify-between mb-5 gap-4 flex-wrap">
        <div>
          <a href={`#${backTo()}`} class="text-sm text-sage hover:text-forest">← Voltar</a>
          <h1 class="text-2xl font-semibold mt-1">{props.id ? (readOnly() ? 'Detalhes da Solicitação' : 'Editar Solicitação') : 'Nova Solicitação de Evento'}</h1>
        </div>
        <Show when={status()}><StatusBadge status={status()!} /></Show>
      </div>

      <Show when={!loading()} fallback={<div class="p-8 text-center text-sage">Carregando...</div>}>
        <Show when={status() === 'REJEITADO' && event()?.rejection_reason}>
          <div class="mb-4 p-4 rounded-2xl bg-rose border border-red-200">
            <div class="text-sm font-semibold text-red-700 mb-1">Solicitação rejeitada pelo Administrador</div>
            <div class="text-sm text-red-800">{event().rejection_reason}</div>
            <div class="text-xs text-red-700 mt-2">Corrija os dados e envie novamente para aprovação.</div>
          </div>
        </Show>

        <Show when={readOnly()}>
          <div class="mb-4 p-4 rounded-2xl bg-sky text-sm text-blue-900">
            {status() === 'APROVADO' ? 'Eventos aprovados só podem ser alterados pelo Administrador.' : 'Esta solicitação não pode ser editada no estado atual.'}
          </div>
        </Show>

        <Show when={error()}>
          <div role="alert" class={`mb-4 p-4 rounded-2xl text-sm font-medium flex items-start gap-3 ${error()!.conflict ? 'bg-cream text-amber-900 border border-amber-300' : 'bg-rose text-red-700'}`}>
            <span class="text-lg leading-none">{error()!.conflict ? '⚠' : '!'}</span>
            <div>
              <Show when={error()!.conflict}><div class="font-semibold">Conflito de agenda</div></Show>
              {error()!.message}
            </div>
          </div>
        </Show>

        <fieldset disabled={readOnly() || busy()} class="bg-white rounded-[20px] shadow-card p-6 grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
          <label class="md:col-span-2">{label('Nome do Evento', 'title')}
            <input class={cls('title')} value={form.title} onInput={e => setForm('title', e.currentTarget.value)} />
          </label>

          <label>{label('Tema', 'theme_id')}
            <select class={cls('theme_id')} value={form.theme_id} onChange={e => setForm('theme_id', e.currentTarget.value)}>
              <option value="">Selecione...</option>
              <For each={themes()}>{t => <option value={t.id}>{t.name}</option>}</For>
            </select>
          </label>

          <label>{label('Curso / Coordenação (Realização)', 'course_id')}
            <select class={cls('course_id')} value={form.course_id} onChange={e => setForm('course_id', e.currentTarget.value)}>
              <option value="">Selecione...</option>
              <For each={courses()}>{c => <option value={c.id}>{c.name}</option>}</For>
            </select>
          </label>

          <label>{label('Centro de Custo')}
            <input class="field" value={costCenter()} disabled placeholder="Definido pelo curso" />
          </label>

          <label>{label('Data do Evento', 'event_date')}
            <input type="date" class={cls('event_date')} value={form.event_date} onInput={e => setForm('event_date', e.currentTarget.value)} />
          </label>

          <div class="grid grid-cols-2 gap-3">
            <label>{label('Hora de Início', 'start_time')}
              <input type="time" class={cls('start_time')} value={form.start_time} onInput={e => setForm('start_time', e.currentTarget.value)} />
            </label>
            <label>{label('Hora de Fim', 'end_time')}
              <input type="time" class={cls('end_time')} value={form.end_time} onInput={e => setForm('end_time', e.currentTarget.value)} />
            </label>
          </div>

          <label>{label('Local / Ambiente', 'location_id')}
            <select class={cls('location_id')} value={form.location_id} onChange={e => changeLocation(e.currentTarget.value)}>
              <option value="">Selecione...</option>
              <For each={locations()}>{l => <option value={l.id}>{l.name} ({l.capacity} lugares)</option>}</For>
            </select>
          </label>

          <div class="md:col-span-2">
            {label('Recursos necessários')}
            <Show when={form.location_id} fallback={<div class="text-sm text-gray-400">Selecione um local para ver os recursos disponíveis.</div>}>
              <div class="flex flex-wrap gap-2">
                <For each={availableResources()} fallback={<span class="text-sm text-gray-400">Nenhum recurso cadastrado neste local.</span>}>
                  {r => (
                    <label class={`chip cursor-pointer px-3 py-1.5 rounded-full text-sm border ${form.resource_ids.includes(r.id) ? 'active border-forest' : 'border-gray-200 bg-white'}`}>
                      <input type="checkbox" class="sr-only" checked={form.resource_ids.includes(r.id)} onChange={() => toggleResource(r.id)} />
                      {r.name}
                    </label>
                  )}
                </For>
              </div>
            </Show>
          </div>

          <label>{label('Palestrante')}
            <input class="field" value={form.speaker} onInput={e => setForm('speaker', e.currentTarget.value)} />
          </label>

          <label>{label('Público-alvo', 'target_audience')}
            <input class={cls('target_audience')} value={form.target_audience} onInput={e => setForm('target_audience', e.currentTarget.value)} />
          </label>

          <label class="md:col-span-2">{label('Nome do Solicitante', 'requester_name')}
            <input class={cls('requester_name')} value={form.requester_name} onInput={e => setForm('requester_name', e.currentTarget.value)} placeholder="Responsável pelo pedido (pode ser diferente de quem está registrando)" />
          </label>

          <label>{label('Justificativa', 'justification')}
            <textarea rows={3} class={cls('justification')} value={form.justification} onInput={e => setForm('justification', e.currentTarget.value)} />
          </label>

          <label>{label('Objetivo', 'objective')}
            <textarea rows={3} class={cls('objective')} value={form.objective} onInput={e => setForm('objective', e.currentTarget.value)} />
          </label>

          <YesNo label="Necessita de apoio do Cerimonial / Inscrições?" value={form.needs_ceremonial} onChange={v => setForm('needs_ceremonial', v)} />
          <YesNo label="Necessita de Declarações / Certificados?" value={form.needs_certificates} onChange={v => setForm('needs_certificates', v)} />

          <label class="md:col-span-2">{label('Observações')}
            <textarea rows={2} class="field" value={form.observations} onInput={e => setForm('observations', e.currentTarget.value)} />
          </label>
        </fieldset>

        <Show when={!readOnly()}>
          <div class="flex flex-wrap justify-end gap-3 mt-5">
            <Show when={canSubmit()}>
              <button type="button" disabled={busy()} onClick={saveDraft} class="px-5 py-2.5 rounded-full text-sm font-medium bg-white text-forest border border-forest hover:bg-mint transition">Guardar Rascunho</button>
              <button type="button" disabled={busy()} onClick={submit} class="px-5 py-2.5 rounded-full text-sm font-medium bg-forest text-white hover:bg-ink transition">Enviar para Aprovação</button>
            </Show>
            <Show when={isPendingEdit()}>
              <button type="button" disabled={busy()} onClick={saveChanges} class="px-5 py-2.5 rounded-full text-sm font-medium bg-forest text-white hover:bg-ink transition">Salvar alterações</button>
            </Show>
          </div>
        </Show>
      </Show>
    </div>
  );
}

function YesNo(props: { label: string, value: boolean, onChange: (value: boolean) => void }) {
  return (
    <div>
      <span class="block text-sm font-medium mb-1">{props.label}</span>
      <div class="inline-flex rounded-full bg-gray-100 p-1">
        <button type="button" onClick={() => props.onChange(true)} class={`px-4 py-1 rounded-full text-sm ${props.value ? 'bg-forest text-white' : 'text-gray-600'}`}>Sim</button>
        <button type="button" onClick={() => props.onChange(false)} class={`px-4 py-1 rounded-full text-sm ${!props.value ? 'bg-forest text-white' : 'text-gray-600'}`}>Não</button>
      </div>
    </div>
  );
}

export default EventForm;
