import type { Aircraft } from '../types/aircraft';
import './AircraftDetailModal.css';

interface Props {
  aircraft: Aircraft;
  onClose:  () => void;
}

const STATUS_META = {
  READY:         { label: 'Ready',         bg: '#dcfce7', color: '#15803d' },
  MAINTENANCE:   { label: 'Maintenance',   bg: '#fef9c3', color: '#a16207' },
  NOT_AVAILABLE: { label: 'Not Available', bg: '#fee2e2', color: '#b91c1c' },
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === '') return null;
  return (
    <div className="ad-row">
      <span className="ad-label">{label}</span>
      <span className="ad-value">{value}</span>
    </div>
  );
}

export default function AircraftDetailModal({ aircraft, onClose }: Props) {
  const meta = STATUS_META[aircraft.status];
  const inspDate = aircraft.next_inspection_date
    ? new Date(aircraft.next_inspection_date)
    : null;
  const inspSoon = inspDate && (inspDate.getTime() - Date.now()) < 30 * 24 * 60 * 60 * 1000;

  return (
    <div className="modal-backdrop">
      <div className="modal ad-modal">
        {/* Header */}
        <div className="ad-header">
          <div className="ad-title-block">
            <span className="ad-tail">{aircraft.tail_number}</span>
            <span
              className="ad-status-badge"
              style={{ background: meta.bg, color: meta.color }}
            >
              {meta.label}
            </span>
          </div>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        <div className="ad-body">
          {/* Aircraft */}
          <p className="ad-section-label">Aircraft</p>
          <Row label="Make"          value={aircraft.make} />
          <Row label="Model"         value={aircraft.model} />
          <Row label="Year Built"    value={aircraft.year_built} />
          <Row label="Serial No."    value={aircraft.serial_number} />

          {/* Performance */}
          <p className="ad-section-label">Performance &amp; Specs</p>
          <Row label="Flight Hours"  value={`${aircraft.flight_hours.toLocaleString(undefined, { maximumFractionDigits: 1 })} h`} />
          <Row label="Fuel Capacity" value={aircraft.fuel_capacity != null ? `${aircraft.fuel_capacity} gal` : null} />
          <Row label="Weight"        value={aircraft.weight        != null ? `${aircraft.weight.toLocaleString()} lbs` : null} />

          {/* Operations */}
          <p className="ad-section-label">Operations</p>
          <Row label="Rental Rate"   value={aircraft.rental_rate != null ? `$${aircraft.rental_rate}/hr` : null} />
          <Row
            label="Next Inspection"
            value={inspDate
              ? <span style={{ color: inspSoon ? '#dc2626' : undefined, fontWeight: inspSoon ? 600 : undefined }}>
                  {inspDate.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                  {inspSoon && ' ⚠ Due soon'}
                </span>
              : null}
          />

          {/* Record */}
          <p className="ad-section-label">Record</p>
          <Row label="Created"       value={new Date(aircraft.date_created).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })} />
          <Row label="Last Updated"  value={new Date(aircraft.date_updated).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })} />
          <Row label="ID"            value={aircraft.id} />
        </div>

        <div className="ad-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
