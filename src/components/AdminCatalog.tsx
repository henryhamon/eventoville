import { createSignal, createEffect, For, Show, type JSX } from 'solid-js';
import { createStore } from 'solid-js/store';
import { api, currentUser, showToast } from '../api';

type Field = {
  name: string, label: string, required?: boolean,
  type?: 'text' | 'email' | 'number' | 'password' | 'role' | 'course' | 'resources',
};
type Entity = { key: string, label: string, singular: string, fields: Field[], columns: { name: string, label: string }[] };

const ENTITIES: Entity[] = [
  {
    key: 'users', label: 'Usuários', singular: 'usuário',
    fields: [
      { name: 'name', label: 'Nome', required: true },
      { name: 'email', label: 'E-mail', required: true, type: 'email' },
      { name: 'role', label: 'Perfil', required: true, type: 'role' },
      { name: 'course_id', label: 'Curso / Coordenação', type: 'course' },
      { name: 'password', label: 'Senha', type: 'password' },
    ],
    columns: [{ name: 'name', label: 'Nome' }, { name: 'email', label: 'E-mail' }, { name: 'role', label: 'Perfil' }, { name: 'course_id', label: 'Curso' }],
  },
  {
    key: 'courses', label: 'Cursos / Coordenações', singular: 'curso',
    fields: [
      { name: 'name', label: 'Nome', required: true },
      { name: 'code', label: 'Código', required: true },
      { name: 'cost_center', label: 'Centro de Custo', required: true },
    ],
    columns: [{ name: 'name', label: 'Nome' }, { name: 'code', label: 'Código' }, { name: 'cost_center', label: 'Centro de Custo' }],
  },
  {
    key: 'themes', label: 'Temas', singular: 'tema',
    fields: [{ name: 'name', label: 'Nome', required: true }],
    columns: [{ name: 'name', label: 'Nome' }],
  },
  {
    key: 'locations', label: 'Locais', singular: 'local',
    fields: [
      { name: 'name', label: 'Nome', required: true },
      { name: 'capacity', label: 'Capacidade', type: 'number' },
      { name: 'description', label: 'Descrição' },
      { name: 'resource_ids', label: 'Recursos disponíveis', type: 'resources' },
    ],
    columns: [{ name: 'name', label: 'Nome' }, { name: 'capacity', label: 'Capacidade' }, { name: 'resource_ids', label: 'Recursos' }],
  },
  {
    key: 'resources', label: 'Recursos', singular: 'recurso',
    fields: [{ name: 'name', label: 'Nome', required: true }, { name: 'description', label: 'Descrição' }],
    columns: [{ name: 'name', label: 'Nome' }, { name: 'description', label: 'Descrição' }],
  },
];

const ROLE_LABELS: Record<string, string> = { SOLICITANTE: 'Solicitante', ADMIN: 'Administrador' };

function AdminCatalog() {
  const [entity, setEntity] = createSignal(ENTITIES[0]);
  const [rows, setRows] = createSignal<any[]>([]);
  const [courses, setCourses] = createSignal<any[]>([]);
  const [resources, setResources] = createSignal<any[]>([]);
  const [editing, setEditing] = createSignal<number | 'new' | null>(null);
  const [form, setForm] = createStore<Record<string, any>>({});
  const [error, setError] = createSignal<string | null>(null);
  const [busy, setBusy] = createSignal(false);

  const load = async () => {
    try {
      const [list, c, r] = await Promise.all([
        api<any[]>(`/api/admin/${entity().key}`), api<any[]>('/api/meta/courses'), api<any[]>('/api/meta/resources'),
      ]);
      setRows(list); setCourses(c); setResources(r);
    } catch (err) {
      showToast({ message: (err as Error).message, kind: 'error' });
    }
  };

  // Reload whenever the selected tab changes; clear rows first so the new
  // columns never render against the previous entity's rows
  createEffect(() => { entity(); setRows([]); setEditing(null); load(); });

  const openForm = (row?: any) => {
    setError(null);
    const values: Record<string, any> = {};
    for (const f of entity().fields) {
      values[f.name] = f.type === 'resources' ? [...(row?.resource_ids ?? [])] : f.type === 'password' ? '' : row?.[f.name] ?? (f.type === 'role' ? 'SOLICITANTE' : '');
    }
    setForm(values);
    setEditing(row ? row.id : 'new');
  };

  const save = async () => {
    setError(null);
    const isNew = editing() === 'new';
    if (entity().key === 'users' && isNew && !form.password) return setError('Informe a senha inicial do usuário');
    setBusy(true);
    try {
      const path = `/api/admin/${entity().key}${isNew ? '' : `/${editing()}`}`;
      await api(path, { method: isNew ? 'POST' : 'PUT', body: { ...form } });
      showToast({ message: isNew ? `${capitalize(entity().singular)} cadastrado` : 'Cadastro atualizado', kind: 'success' });
      setEditing(null);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row: any) => {
    if (!confirm(`Remover "${row.name}"?`)) return;
    try {
      await api(`/api/admin/${entity().key}/${row.id}`, { method: 'DELETE' });
      showToast({ message: 'Cadastro removido', kind: 'success' });
      await load();
    } catch (err) {
      showToast({ message: (err as Error).message, kind: 'error' });
    }
  };

  const display = (row: any, column: string): JSX.Element => {
    const value = row[column];
    if (column === 'role') return ROLE_LABELS[value] ?? value;
    if (column === 'course_id') return courses().find(c => c.id === value)?.name ?? '—';
    if (column === 'resource_ids') return ((value ?? []) as number[]).map(id => resources().find(r => r.id === id)?.name).filter(Boolean).join(', ') || '—';
    return value === null || value === '' ? '—' : value;
  };

  const input = (f: Field) => {
    const isNew = editing() === 'new';
    switch (f.type) {
      case 'role':
        return (
          <select class="field" value={form.role} onChange={e => setForm('role', e.currentTarget.value)}>
            <option value="SOLICITANTE">Solicitante</option>
            <option value="ADMIN">Administrador</option>
          </select>
        );
      case 'course':
        return (
          <select class="field" value={form.course_id ?? ''} onChange={e => setForm('course_id', e.currentTarget.value)}>
            <option value="">Nenhum</option>
            <For each={courses()}>{c => <option value={c.id}>{c.name}</option>}</For>
          </select>
        );
      case 'resources':
        return (
          <div class="flex flex-wrap gap-2">
            <For each={resources()}>
              {r => {
                const checked = () => ((form.resource_ids ?? []) as number[]).includes(r.id);
                return (
                  <label class={`chip cursor-pointer px-3 py-1.5 rounded-full text-sm border ${checked() ? 'active border-forest' : 'border-gray-200 bg-white'}`}>
                    <input type="checkbox" class="sr-only" checked={checked()}
                      onChange={() => setForm('resource_ids', (ids: number[]) => (ids.includes(r.id) ? ids.filter(x => x !== r.id) : [...ids, r.id]))} />
                    {r.name}
                  </label>
                );
              }}
            </For>
          </div>
        );
      default:
        return (
          <input class="field" type={f.type ?? 'text'} min={f.type === 'number' ? 0 : undefined} value={form[f.name] ?? ''}
            placeholder={f.type === 'password' && !isNew ? 'Deixe em branco para manter a senha atual' : ''}
            onInput={e => setForm(f.name, e.currentTarget.value)} />
        );
    }
  };

  return (
    <div class="fade-up">
      <div class="mb-5">
        <h1 class="text-2xl font-semibold mb-1">Cadastros</h1>
        <p class="text-sm text-sage">Dados usados no formulário de solicitação e nos relatórios</p>
      </div>

      <div class="flex flex-wrap gap-2 mb-4">
        <For each={ENTITIES}>
          {(e) => (
            <button type="button" onClick={() => setEntity(e)} classList={{ active: entity().key === e.key }} class="chip px-4 py-1.5 rounded-full text-sm bg-white border border-gray-200">
              {e.label}
            </button>
          )}
        </For>
      </div>

      <Show when={editing() !== null}>
        <div class="bg-white rounded-[20px] shadow-card p-6 mb-4">
          <h2 class="font-semibold mb-4">{editing() === 'new' ? `Novo ${entity().singular}` : `Editar ${entity().singular}`}</h2>
          <Show when={error()}>
            <div role="alert" class="mb-4 px-4 py-2.5 rounded-xl bg-rose text-red-700 text-sm">{error()}</div>
          </Show>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <For each={entity().fields}>
              {(f) => (
                <label classList={{ 'md:col-span-2': f.type === 'resources' }}>
                  <span class="block text-sm font-medium mb-1">
                    {f.label}{f.required || (f.type === 'password' && editing() === 'new') ? <span class="text-red-600"> *</span> : null}
                  </span>
                  {input(f)}
                </label>
              )}
            </For>
          </div>
          <div class="flex justify-end gap-2 mt-5">
            <button type="button" onClick={() => setEditing(null)} class="px-5 py-2.5 rounded-full text-sm bg-gray-100">Cancelar</button>
            <button type="button" disabled={busy()} onClick={save} class="px-5 py-2.5 rounded-full text-sm font-medium bg-forest text-white hover:bg-ink">Salvar</button>
          </div>
        </div>
      </Show>

      <div class="bg-white rounded-[20px] shadow-card overflow-hidden">
        <div class="flex items-center justify-between p-4 border-b border-gray-100">
          <span class="text-sm text-sage">{rows().length} registro(s)</span>
          <button type="button" onClick={() => openForm()} class="px-4 py-2 rounded-full text-sm font-medium bg-forest text-white hover:bg-ink">+ Novo {entity().singular}</button>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-gray-100 text-left text-sm text-sage">
                <For each={entity().columns}>{c => <th class="p-4 font-medium">{c.label}</th>}</For>
                <th class="p-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              <For each={rows()}>
                {(row) => (
                  <tr class="border-b border-gray-50 text-sm">
                    <For each={entity().columns}>{c => <td class="p-4">{display(row, c.name)}</td>}</For>
                    <td class="p-4">
                      <div class="flex justify-end gap-2">
                        <button type="button" onClick={() => openForm(row)} class="px-3 py-1.5 rounded-full text-xs font-medium bg-mint text-forest hover:bg-forest hover:text-white">Editar</button>
                        <Show when={!(entity().key === 'users' && row.id === currentUser()?.id)}>
                          <button type="button" onClick={() => remove(row)} class="px-3 py-1.5 rounded-full text-xs font-medium bg-rose text-red-700 hover:bg-red-100">Remover</button>
                        </Show>
                      </div>
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default AdminCatalog;
