import { createSignal, onMount, For, Show } from 'solid-js';
import { api, showToast } from '../api';

// Renders URLs inside a plain-text e-mail body as clickable links
function linkify(text: string) {
  return text.split(/(https?:\/\/\S+)/g).map((part) =>
    /^https?:\/\//.test(part) ? <a href={part} class="text-forest underline break-all">{part}</a> : part
  );
}

function Outbox() {
  const [emails, setEmails] = createSignal<any[]>([]);
  const [loading, setLoading] = createSignal(true);

  const load = async () => {
    setLoading(true);
    try {
      setEmails(await api('/api/admin/outbox'));
    } catch (err) {
      showToast({ message: (err as Error).message, kind: 'error' });
    } finally {
      setLoading(false);
    }
  };
  onMount(load);

  return (
    <div class="fade-up">
      <div class="flex items-center justify-between mb-5 gap-4 flex-wrap">
        <div>
          <h1 class="text-2xl font-semibold mb-1">Caixa de Saída</h1>
          <p class="text-sm text-sage">E-mails enviados pelo sistema (ambiente local, sem servidor de e-mail externo)</p>
        </div>
        <button type="button" onClick={load} class="px-4 py-2 rounded-full text-sm font-medium bg-white border border-gray-200 hover:bg-mint">Atualizar</button>
      </div>

      <Show when={!loading()} fallback={<div class="p-8 text-center text-sage">Carregando...</div>}>
        <Show when={emails().length} fallback={<div class="bg-white rounded-[20px] shadow-card p-8 text-center text-sage">Nenhum e-mail enviado ainda.</div>}>
          <div class="space-y-3">
            <For each={emails()}>
              {(email) => (
                <article class="bg-white rounded-[20px] shadow-card p-5">
                  <div class="flex items-start justify-between gap-4 flex-wrap mb-2">
                    <div>
                      <div class="font-medium">{email.subject}</div>
                      <div class="text-xs text-sage">Para: {email.to_email}</div>
                    </div>
                    <div class="text-xs text-gray-500">{new Date(email.created_at.replace(' ', 'T') + 'Z').toLocaleString('pt-BR')}</div>
                  </div>
                  <pre class="whitespace-pre-wrap font-sans text-sm text-gray-700">{linkify(email.body)}</pre>
                </article>
              )}
            </For>
          </div>
        </Show>
      </Show>
    </div>
  );
}

export default Outbox;
