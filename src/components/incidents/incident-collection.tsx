import Link from 'next/link';
import { Table, SeverityBadge, StatusBadge } from '@/components/ui';
import { IncidentRow, type IncidentRowData } from '@/components/incident/incident-row';
import { timeAgo, formatDateTime } from '@/lib/format';

/** Readable response rows on narrow screens; the full comparison table remains available on desktop. */
export function IncidentCollection({
  incidents,
  compact = false,
  showProject = true,
}: {
  incidents: IncidentRowData[];
  compact?: boolean;
  showProject?: boolean;
}) {
  return (
    <>
      {!compact ? (
        <div className="workspace-incident-table">
          <Table
            head={['Incident', 'Severity', 'Status', 'Service', 'Assignee', 'Updated']}
            label="Incidents"
          >
            <>
              {incidents.map((incident) => (
                <IncidentRow key={incident.id} incident={incident} showProject={showProject} />
              ))}
            </>
          </Table>
        </div>
      ) : null}
      <ul
        className={`workspace-incident-feed${compact ? '' : ' workspace-incident-feed--mobile'}`}
        aria-label="Incidents"
      >
        {incidents.map((incident) => (
          <li key={incident.id} className="workspace-incident-item">
            <div className="workspace-incident-item-heading">
              <SeverityBadge severity={incident.severity} />
              <StatusBadge status={incident.status} />
            </div>
            <Link href={`/dashboard/incidents/${incident.id}`} className="workspace-incident-title">
              {incident.title}
            </Link>
            <div className="workspace-incident-meta">
              <span>
                {showProject
                  ? incident.project.name
                  : (incident.service?.name ?? 'No service linked')}
                {showProject && incident.service ? ` / ${incident.service.name}` : ''}
              </span>
              <time
                dateTime={incident.updatedAt.toISOString()}
                title={formatDateTime(incident.updatedAt)}
              >
                {timeAgo(incident.updatedAt)}
              </time>
            </div>
            <p className="workspace-incident-owner">
              {incident.assignedTo
                ? `Assigned to ${incident.assignedTo.name ?? incident.assignedTo.email}`
                : 'Unassigned'}
            </p>
          </li>
        ))}
      </ul>
    </>
  );
}
