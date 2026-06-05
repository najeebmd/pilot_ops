import { useEffect, useRef, useState } from 'react';
import { fetchUsers } from '../api/users';
import './StudentSearch.css';

export interface StudentOption {
  id:         number;
  first_name: string;
  last_name:  string;
  email:      string;
}

interface Props {
  value:    StudentOption | null;
  onChange: (student: StudentOption | null) => void;
}

export default function StudentSearch({ value, onChange }: Props) {
  const [query,    setQuery]    = useState('');
  const [results,  setResults]  = useState<StudentOption[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [open,     setOpen]     = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Debounced search
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (query.trim().length < 2) { setResults([]); setOpen(false); return; }

    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetchUsers({ role: 'STUDENT', search: query.trim(), pageSize: 10 });
        setResults(res.data as any as StudentOption[]);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [query]);

  function select(s: StudentOption) {
    onChange(s);
    setQuery('');
    setResults([]);
    setOpen(false);
  }

  function clear() {
    onChange(null);
    setQuery('');
    setResults([]);
    setOpen(false);
  }

  return (
    <div className="student-search" ref={wrapperRef}>
      {value ? (
        /* ── Selected state ── */
        <div className="student-selected">
          <div className="student-selected-avatar">
            {value.first_name[0]}{value.last_name[0]}
          </div>
          <div className="student-selected-info">
            <span className="student-selected-name">{value.first_name} {value.last_name}</span>
            <span className="student-selected-email">{value.email}</span>
          </div>
          <button type="button" className="student-clear-btn" onClick={clear} title="Clear selection">✕</button>
        </div>
      ) : (
        /* ── Search input ── */
        <div className="student-input-wrap">
          <span className="student-search-icon">🔍</span>
          <input
            className="student-search-input"
            type="text"
            placeholder="Search by name or email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            autoComplete="off"
          />
          {loading && <span className="student-searching">Searching…</span>}
        </div>
      )}

      {/* ── Results dropdown ── */}
      {open && !value && results.length > 0 && (
        <ul className="student-results">
          {results.map((s) => (
            <li key={s.id} className="student-result-item" onMouseDown={() => select(s)}>
              <span className="student-result-avatar">{s.first_name[0]}{s.last_name[0]}</span>
              <span className="student-result-name">{s.first_name} {s.last_name}</span>
              <span className="student-result-email">{s.email}</span>
            </li>
          ))}
        </ul>
      )}
      {open && !value && !loading && query.length >= 2 && results.length === 0 && (
        <div className="student-no-results">No students found for "{query}"</div>
      )}
    </div>
  );
}
