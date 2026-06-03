import type { User } from '../types/user';
import './UserViewDrawer.css';

interface Props {
  user: User;
  onClose: () => void;
  onEdit: () => void;
}

function row(label: string, value: string | null | undefined) {
  if (!value) return null;
  return (
    <div className="detail-row">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value}</span>
    </div>
  );
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function UserViewDrawer({ user, onClose, onEdit }: Props) {
  const address = [user.address_line1, user.address_line2, user.city, user.state, user.postal_code, user.country]
    .filter(Boolean).join(', ');

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div>
            <h2>{user.first_name} {user.last_name}</h2>
            <p className="drawer-email">{user.email}</p>
          </div>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        <div className="drawer-body">
          <section>
            <h3>Personal</h3>
            {row('Phone', user.phone)}
            {row('Date of Birth', formatDate(user.date_of_birth))}
          </section>

          <section>
            <h3>Address</h3>
            {address ? <p className="detail-address">{address}</p> : <p className="detail-empty">No address on file</p>}
          </section>

          <section>
            <h3>Record</h3>
            {row('Created', formatDate(user.date_created))}
            {row('Last Updated', formatDate(user.date_updated))}
            {row('ID', String(user.id))}
          </section>
        </div>

        <div className="drawer-footer">
          <button className="btn btn-primary" onClick={onEdit}>Edit</button>
        </div>
      </div>
    </div>
  );
}
