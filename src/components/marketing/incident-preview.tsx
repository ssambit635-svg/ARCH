'use client';

import { useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { usePrefersReducedMotion } from '@/lib/motion';

type PreviewView = 'overview' | 'timeline' | 'services';

const SERVICES = [
  { name: 'checkout-api', detail: 'p95 2.41 s', state: 'Investigating', tone: 'critical' },
  { name: 'payments-db', detail: 'p95 184 ms', state: 'Degraded', tone: 'warning' },
  { name: 'cart-worker', detail: 'p95 42 ms', state: 'Operational', tone: 'ok' },
] as const;

const TIMELINE = [
  { time: '09:42:18', title: 'Alert received', detail: 'checkout-api · latency threshold exceeded', type: 'alert' },
  { time: '09:42:24', title: 'Incident opened', detail: 'INC-2048 · severity high', type: 'event' },
  { time: '09:43:02', title: 'On-call responder notified', detail: 'Primary rotation · 2 responders', type: 'event' },
  { time: '09:44:31', title: 'Database pressure correlated', detail: 'payments-db · connection pool saturation', type: 'warning' },
] as const;

const VIEWS: { id: PreviewView; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'services', label: 'Services' },
];

function ViewIcon({ view }: { view: PreviewView }) {
  if (view === 'overview') {
    return <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="2.25" y="2.25" width="11.5" height="11.5" rx="2" stroke="currentColor" strokeWidth="1.2" /><path d="M5 10.5V8m3 2.5V5.5m3 5V7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>;
  }
  if (view === 'timeline') {
    return <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="4" cy="4" r="1.3" stroke="currentColor" strokeWidth="1.2" /><circle cx="4" cy="8" r="1.3" stroke="currentColor" strokeWidth="1.2" /><circle cx="4" cy="12" r="1.3" stroke="currentColor" strokeWidth="1.2" /><path d="M7 4h5m-5 4h5m-5 4h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>;
  }
  return <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="2.2" y="2.2" width="4.4" height="4.4" rx="1" stroke="currentColor" strokeWidth="1.2" /><rect x="9.4" y="2.2" width="4.4" height="4.4" rx="1" stroke="currentColor" strokeWidth="1.2" /><rect x="5.8" y="9.4" width="4.4" height="4.4" rx="1" stroke="currentColor" strokeWidth="1.2" /><path d="M6.7 4.4h2.6m-4.1 2.2 1.5 2.8m3.8-2.8-1.5 2.8" stroke="currentColor" strokeWidth="1.1" /></svg>;
}

function Chart() {
  return (
    <div className="arch-preview-chart-card">
      <div className="arch-preview-card-head">
        <div>
          <p className="arch-preview-overline">Request latency <span>· p95</span></p>
          <p className="arch-preview-chart-value">2.41 <span>s</span> <small>+188%</small></p>
        </div>
        <span className="arch-preview-range">LAST 30 MIN</span>
      </div>
      <div className="arch-preview-chart-wrap" aria-label="Sample latency chart, with a rise in latency near the end of the period">
        <svg className="arch-preview-chart" viewBox="0 0 640 170" preserveAspectRatio="none" role="img" aria-hidden="true">
          <path d="M0 26H640M0 64H640M0 102H640M0 140H640" stroke="rgba(194,211,225,.075)" strokeWidth="1" />
          <path d="M64 10V152M192 10V152M320 10V152M448 10V152M576 10V152" stroke="rgba(194,211,225,.055)" strokeWidth="1" />
          <path d="M0 119 C36 120 44 116 72 118 S112 115 144 116 S186 119 218 115 S259 119 286 116 S329 120 360 113 S394 117 424 111 S456 110 480 104 S514 110 534 100 S558 76 579 70 S606 40 640 26 L640 152 L0 152Z" fill="rgba(95,145,183,.08)" />
          <path d="M0 119 C36 120 44 116 72 118 S112 115 144 116 S186 119 218 115 S259 119 286 116 S329 120 360 113 S394 117 424 111 S456 110 480 104 S514 110 534 100 S558 76 579 70 S606 40 640 26" fill="none" stroke="#75a9cc" strokeWidth="2.2" vectorEffect="non-scaling-stroke" />
          <path d="M0 127 C52 126 58 128 106 124 S189 129 236 125 S312 124 354 127 S419 124 460 121 S530 127 565 118 S615 115 640 111" fill="none" stroke="rgba(151,174,192,.34)" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
          <path d="M579 10V152" stroke="rgba(241,109,95,.48)" strokeWidth="1" strokeDasharray="3 4" />
          <circle cx="579" cy="70" r="4" fill="#ed7569" stroke="#0c1218" strokeWidth="2" />
        </svg>
      </div>
      <div className="arch-preview-axis"><span>09:15</span><span>09:25</span><span>09:35</span><span>09:45</span></div>
    </div>
  );
}

function Overview({ onViewServices }: { onViewServices: () => void }) {
  return (
    <div className="arch-preview-overview">
      <Chart />
      <div className="arch-preview-service-card">
        <div className="arch-preview-card-head">
          <div>
            <p className="arch-preview-overline">Affected services</p>
            <p className="arch-preview-muted-label">2 need attention</p>
          </div>
          <button type="button" className="arch-preview-text-button" onClick={onViewServices}>View all <span aria-hidden="true">→</span></button>
        </div>
        <div className="arch-preview-service-list">
          {SERVICES.map((service) => (
            <div className="arch-preview-service-row" key={service.name}>
              <span className={`arch-preview-service-dot is-${service.tone}`} aria-hidden="true" />
              <span className="arch-preview-service-name">{service.name}</span>
              <span className="arch-preview-service-value">{service.detail}</span>
            </div>
          ))}
        </div>
        <div className="arch-preview-response-note">
          <span className="arch-preview-note-mark" aria-hidden="true">A</span>
          <span><strong>ARCH note</strong> · Database saturation is the likely cause.</span>
        </div>
      </div>
    </div>
  );
}

function Timeline({ acknowledged }: { acknowledged: boolean }) {
  return (
    <div className="arch-preview-timeline" aria-label="Sample incident timeline">
      {TIMELINE.map((event, index) => (
        <div className="arch-preview-timeline-row" key={event.time}>
          <div className="arch-preview-timeline-rail" aria-hidden="true">
            <span className={`arch-preview-timeline-dot is-${event.type}`} />
            {index < TIMELINE.length - 1 && <span className="arch-preview-timeline-line" />}
          </div>
          <span className="arch-preview-timeline-time">{event.time}</span>
          <div className="arch-preview-timeline-copy">
            <strong>{event.title}</strong>
            <span>{event.detail}</span>
          </div>
        </div>
      ))}
      <div className="arch-preview-timeline-row arch-preview-timeline-next">
        <div className="arch-preview-timeline-rail" aria-hidden="true"><span className="arch-preview-timeline-dot is-next" /></div>
        <span className="arch-preview-timeline-time">NOW</span>
        <div className="arch-preview-timeline-copy">
          <strong>{acknowledged ? 'Responder acknowledged' : 'Waiting for responder update'}</strong>
          <span>{acknowledged ? 'Acknowledgement recorded in the incident timeline' : 'New actions will appear here as the incident progresses'}</span>
        </div>
      </div>
    </div>
  );
}

function Services() {
  const [selected, setSelected] = useState('checkout-api');
  return (
    <div className="arch-preview-services-view">
      <div className="arch-preview-service-table-head"><span>Service</span><span>Latency</span><span>Status</span></div>
      {SERVICES.map((service) => (
        <button
          type="button"
          className={`arch-preview-service-table-row ${selected === service.name ? 'is-selected' : ''}`}
          key={service.name}
          onClick={() => setSelected(service.name)}
          aria-pressed={selected === service.name}
        >
          <span className="arch-preview-table-service"><span className={`arch-preview-service-dot is-${service.tone}`} aria-hidden="true" />{service.name}</span>
          <span className="arch-preview-table-latency">{service.detail.replace('p95 ', '')}</span>
          <span className={`arch-preview-table-state is-${service.tone}`}>{service.state}</span>
        </button>
      ))}
      <div className="arch-preview-services-foot">
        <span className="arch-preview-services-foot-mark" aria-hidden="true">i</span>
        <span>Service status is linked to the incident timeline and dependency map.</span>
      </div>
    </div>
  );
}

export function IncidentPreview() {
  const [view, setView] = useState<PreviewView>('overview');
  const [acknowledged, setAcknowledged] = useState(false);
  const stage = useRef<HTMLDivElement | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (reducedMotion || event.pointerType !== 'mouse' || !stage.current) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    stage.current.dataset.pointerActive = 'true';
    stage.current.style.setProperty('--tilt-x', `${-y * 2.8}deg`);
    stage.current.style.setProperty('--tilt-y', `${x * 3.4}deg`);
  };

  const resetTilt = () => {
    if (!stage.current) return;
    stage.current.dataset.pointerActive = 'false';
    stage.current.style.setProperty('--tilt-x', '0deg');
    stage.current.style.setProperty('--tilt-y', '0deg');
  };

  return (
    <div
      ref={stage}
      className="arch-preview-stage"
      role="group"
      onPointerMove={handlePointerMove}
      onPointerLeave={resetTilt}
      onBlur={resetTilt}
      aria-label="Interactive sample incident response workspace"
    >
      <div className="arch-preview-depth" aria-hidden="true" />
      <div className="arch-preview-window">
        <header className="arch-preview-topbar">
          <div className="arch-preview-brand">
            <span className="arch-preview-brand-mark" aria-hidden="true"><span /></span>
            <span className="arch-preview-brand-name">ARCH</span>
            <span className="arch-preview-topbar-divider" aria-hidden="true" />
            <span className="arch-preview-workspace-name">Incident workspace</span>
          </div>
          <div className="arch-preview-topbar-right">
            <span className="arch-preview-sample-tag"><span aria-hidden="true" /> Sample data</span>
            <span className="arch-preview-avatar" aria-label="Responder avatar">R</span>
          </div>
        </header>

        <div className="arch-preview-workspace">
          <aside className="arch-preview-sidebar" aria-label="Preview workspace navigation">
            {VIEWS.map((item) => (
              <button
                key={item.id}
                type="button"
                title={item.label}
                aria-label={`Show ${item.label.toLowerCase()}`}
                aria-pressed={view === item.id}
                className={`arch-preview-sidebar-button ${view === item.id ? 'is-active' : ''}`}
                onClick={() => setView(item.id)}
              >
                <ViewIcon view={item.id} />
              </button>
            ))}
            <span className="arch-preview-sidebar-spacer" />
            <span className="arch-preview-sidebar-separator" />
            <span className="arch-preview-sidebar-help" aria-hidden="true">?</span>
          </aside>

          <div className="arch-preview-main">
            <div className="arch-preview-breadcrumb"><span>Incidents</span><span aria-hidden="true">/</span><strong>INC-2048</strong></div>
            <div className="arch-preview-incident-heading">
              <div className="arch-preview-title-block">
                <div className="arch-preview-active-label"><span aria-hidden="true" /> Active incident <span className="arch-preview-high-pill">HIGH</span></div>
                <h2>Checkout latency elevated</h2>
                <p>Opened 09:42 UTC <span aria-hidden="true">·</span> checkout-api <span aria-hidden="true">·</span> us-east-1</p>
              </div>
              <button
                type="button"
                className={`arch-preview-ack ${acknowledged ? 'is-acknowledged' : ''}`}
                onClick={() => setAcknowledged((value) => !value)}
                aria-pressed={acknowledged}
              >
                {acknowledged ? <span aria-hidden="true">✓</span> : <span className="arch-preview-ack-icon" aria-hidden="true">↗</span>}
                {acknowledged ? 'Acknowledged' : 'Acknowledge'}
              </button>
            </div>

            <div className="arch-preview-content-topline">
              <div className="arch-preview-view-switch" role="group" aria-label="Sample incident views">
                {VIEWS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setView(item.id)}
                    aria-pressed={view === item.id}
                    className={`arch-preview-view-button ${view === item.id ? 'is-active' : ''}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <span className="arch-preview-updated"><span aria-hidden="true" /> Demo view</span>
            </div>

            <div className="arch-preview-view-content" key={view}>
              {view === 'overview' && <Overview onViewServices={() => setView('services')} />}
              {view === 'timeline' && <Timeline acknowledged={acknowledged} />}
              {view === 'services' && <Services />}
            </div>

            <footer className="arch-preview-statusbar">
              <span><span className="arch-preview-status-dot" aria-hidden="true" /> 2 responders assigned</span>
              <span className="arch-preview-status-separator" aria-hidden="true" />
              <span>Audit trail · enabled</span>
              <span className="arch-preview-status-right">DEMO · not connected to live services</span>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
