import React, { useCallback, useEffect, useState } from 'react';
import { Bot, Play, RefreshCw, Trash2, Square } from 'lucide-react';

/**
 * OpenMolt Console — thin client over the Bitty Box server-side bridge at
 * /api/openmolt/*. The OpenMolt daemon token lives ONLY on the server; the
 * browser never sees it. Minimal read/run/delete oriented UI.
 */
interface AgentSummary {
  id: string;
  name: string;
  model?: string;
  integrations?: string[];
  activeRunCount?: number;
  totalRuns?: number;
}

async function api(path: string, init?: RequestInit) {
  const res = await fetch(`/api/openmolt${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`${res.status} ${t.slice(0, 200)}`);
  }
  return res.json();
}

export function OpenMoltConsole() {
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [runInput, setRunInput] = useState('');
  const [running, setRunning] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api('/agents');
      setAgents(Array.isArray(data.agents) ? data.agents : []);
    } catch (e: any) {
      setError(String(e?.message ?? e));
      setAgents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const runAgent = useCallback(
    async (id: string) => {
      setError(null);
      try {
        const r = await api(`/agents/${id}/run`, {
          method: 'POST',
          body: JSON.stringify({ input: runInput || 'Ping from Bitty Box console.' }),
        });
        setRunning((prev) => ({ ...prev, [id]: r.runId }));
        setTimeout(load, 1500);
      } catch (e: any) {
        setError(String(e?.message ?? e));
      }
    },
    [runInput, load],
  );

  const removeAgent = useCallback(
    async (id: string) => {
      if (!confirm('Delete this agent from the OpenMolt daemon?')) return;
      setError(null);
      try {
        await api(`/agents/${id}`, { method: 'DELETE' });
        load();
      } catch (e: any) {
        setError(String(e?.message ?? e));
      }
    },
    [load],
  );

  return (
    <div className="openmolt-console" style={{ maxWidth: 980, margin: '1.5rem auto 0', padding: '0 1.5rem 2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Bot size={20} /> OpenMolt Agents
        </h2>
        <button onClick={load} disabled={loading} style={btn}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>
      <p style={{ opacity: 0.7, fontSize: '0.9rem' }}>
        Live agents managed by the OpenMolt daemon, reached through the Bitty Box server-side bridge.
      </p>
      {error && (
        <div style={{ ...panel, borderColor: 'rgba(251,191,36,0.4)', color: '#fbbf24' }}>{error}</div>
      )}
      <div style={{ margin: '0.75rem 0' }}>
        <input
          value={runInput}
          onChange={(e) => setRunInput(e.target.value)}
          placeholder="Run input (sent to any agent you trigger)…"
          style={{ ...input, width: '100%' }}
        />
      </div>
      {agents.length === 0 && !loading && (
        <div style={panel}>No agents registered yet. Create one via the OpenMolt daemon or API.</div>
      )}
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {agents.map((a) => (
          <div key={a.id} style={panel}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
              <div>
                <strong>{a.name}</strong>{' '}
                <span style={{ opacity: 0.6, fontSize: '0.8rem' }}>· {a.model ?? '—'}</span>
                <div style={{ opacity: 0.6, fontSize: '0.78rem' }}>
                  runs: {a.totalRuns ?? 0} · active: {a.activeRunCount ?? 0}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => runAgent(a.id)} style={btn}>
                  <Play size={16} /> Run
                </button>
                <button onClick={() => removeAgent(a.id)} style={{ ...btn, borderColor: 'rgba(244,63,94,0.4)' }}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            {running[a.id] && (
              <div style={{ opacity: 0.7, fontSize: '0.78rem', marginTop: '0.5rem' }}>
                <Square size={12} /> run {running[a.id]}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const btn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.4rem',
  borderRadius: 999,
  padding: '0.5rem 0.8rem',
  border: '1px solid rgba(125,211,252,0.25)',
  background: 'rgba(255,255,255,0.05)',
  color: 'inherit',
  cursor: 'pointer',
};
const panel: React.CSSProperties = {
  border: '1px solid rgba(125,211,252,0.2)',
  borderRadius: 16,
  padding: '1rem',
  background: 'rgba(12,18,38,0.6)',
};
const input: React.CSSProperties = {
  borderRadius: 12,
  border: '1px solid rgba(125,211,252,0.2)',
  background: 'rgba(3,7,18,0.7)',
  color: 'inherit',
  padding: '0.7rem 0.9rem',
  fontSize: '0.95rem',
};
