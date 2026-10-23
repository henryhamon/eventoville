import { STATUS_LABELS, type EventStatus } from '../api';

const STYLES: Record<EventStatus, string> = {
  RASCUNHO: 'bg-gray-100 text-gray-600',
  AGUARDANDO_APROVACAO: 'bg-cream text-amber-700',
  REJEITADO: 'bg-rose text-red-700',
  APROVADO: 'bg-mint text-forest',
  CANCELADO: 'bg-gray-100 text-gray-400 line-through',
};

function StatusBadge(props: { status: EventStatus }) {
  return (
    <span class={`inline-block whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-medium ${STYLES[props.status]}`}>
      {STATUS_LABELS[props.status]}
    </span>
  );
}

export default StatusBadge;
