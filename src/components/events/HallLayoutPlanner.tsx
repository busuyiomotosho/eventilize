
import React, { useEffect, useRef, useState } from 'react';
import Papa from 'papaparse';
import domtoimage from 'dom-to-image-more';
import type { Table, Guest } from '@/lib/types';

interface HallLayoutPlannerProps {
  eventId: string;
  tables: Table[];
  guests?: Guest[];
  readOnly?: boolean;
  onTableClick?: (table: Table, meta?: { fromDrag?: boolean }) => void;
  onTablesChange?: (tables: Table[]) => void;
}

export default function HallLayoutPlanner({ eventId, tables, guests = [], readOnly = false, onTableClick, onTablesChange }: HallLayoutPlannerProps) {
  const [renamingTableId, setRenamingTableId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  // Removed local loading state; parent controls data
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  // (history removed) component no longer tracks undo/redo
  // Drag state for guest assignment
  const [draggedGuestId, setDraggedGuestId] = useState<string | null>(null);
  // Drag state for table movement
  const [draggingTableId, setDraggingTableId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  // For click vs drag detection
  const mouseDownPos = useRef<{ x: number; y: number; tableId: string | null }>({ x: 0, y: 0, tableId: null });




  function addTable(shape: 'round' | 'rectangular', capacity: number) {
    const newTable: Table = {
      id: `table_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: `Table ${tables.length + 1}`,
      shape,
      capacity,
      x: 50 + (tables.length * 80) % 500,
      y: 50 + Math.floor(tables.length / 6) * 80,
      assignedGuests: [],
      rotation: 0,
    };
  if (readOnly) return;
  applyTables([...tables, newTable]);
  }

  function updateTable(id: string, updates: Partial<Table>) {
  applyTables(tables.map((t: Table) => t.id === id ? { ...t, ...updates } : t));
  }

  function removeTable(id: string) {
  if (readOnly) return;
  applyTables(tables.filter((t: Table) => t.id !== id));
  }

  async function saveLayout() {
    setSaving(true);
    if (onTablesChange) {
      await onTablesChange(tables);
    }
    setSaving(false);
  }

  // --- History helpers ---
  function deepCloneTables(src: Table[]) {
    return JSON.parse(JSON.stringify(src)) as Table[];
  }

  // UI state for toasts
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  // CSV import modal state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPreview, setImportPreview] = useState<any[] | null>(null);
  const [importErrors, setImportErrors] = useState<string | null>(null);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [csvText, setCsvText] = useState<string | null>(null);
  const [mapping, setMapping] = useState<{ guestName?: string; guestEmail?: string; tableId?: string; tableName?: string; seatIndex?: string }>({});
  const [createMissingTables, setCreateMissingTables] = useState(false);
  const [serverPreview, setServerPreview] = useState<any | null>(null);
  const [awaitingServerPreview, setAwaitingServerPreview] = useState(false);
  const [backgroundJobId, setBackgroundJobId] = useState<string | null>(null);
  const [backgroundJob, setBackgroundJob] = useState<any | null>(null);

  // Poll background job status
  useEffect(() => {
    if (!backgroundJobId) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/jobs/${backgroundJobId}`);
        if (!res.ok) throw new Error('Failed to fetch job');
        const data = await res.json();
        if (cancelled) return;
        setBackgroundJob(data.job);
        if (data.job?.status === 'done') {
          showToast('Background import finished');
          // refresh layout
          try {
            const layoutRes = await fetch(`/api/events/${eventId}/layout`);
            if (layoutRes.ok) {
              const layoutData = await layoutRes.json();
              if (onTablesChange) onTablesChange(layoutData.tables || []);
            }
          } catch (e) {}
          setBackgroundJobId(null);
        } else if (data.job?.status === 'failed') {
          showToast(`Import failed: ${data.job.errorMessage || 'unknown'}`);
          setBackgroundJobId(null);
        }
      } catch (err) {
        // ignore transient errors
      }
    };
    poll();
    const id = window.setInterval(poll, 1000);
    return () => { cancelled = true; window.clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backgroundJobId]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  function showToast(msg: string, ms = 1800) {
    setToastMessage(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    // @ts-ignore - window.setTimeout returns number in browsers
    toastTimerRef.current = window.setTimeout(() => setToastMessage(null), ms);
  }

  function applyTables(next: Table[]) {
    // Apply tables directly; history/undo has been removed.
    const nextClone = deepCloneTables(next);
    onTablesChange && onTablesChange(nextClone);
  }

  // No history initialization required; history removed

  // clearHistory removed

  // Keyboard history shortcuts removed

  // No local loading block; parent controls data

  // Export as SVG (vector) — crisp text
  const handleExportSVG = async () => {
    if (!canvasRef.current) return;
    const node = canvasRef.current;
    try {
      const svg = await domtoimage.toSvg(node);
      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = 'hall-layout.svg';
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('SVG export failed: ' + (err?.message || 'Unknown error'));
    }
  };

  // Export as high-DPI PNG by rendering the SVG to a scaled canvas with imageSmoothing disabled
  const handleExportPNG = async () => {
    if (!canvasRef.current) return;
    const node = canvasRef.current;
    try {
      // Obtain SVG markup first
      const svgString = await domtoimage.toSvg(node);
      // Create an image from the SVG
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        try {
          const rect = node.getBoundingClientRect();
          const w = Math.max(1, Math.round(rect.width));
          const h = Math.max(1, Math.round(rect.height));
          const scale = Math.max(2, window.devicePixelRatio || 2);
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(w * scale);
          canvas.height = Math.round(h * scale);
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('2D context not available');
          // Disable smoothing for crisper text rendering
          // @ts-ignore
          ctx.imageSmoothingEnabled = false;
          // @ts-ignore
          ctx.msImageSmoothingEnabled = false;
          // Scale the context so drawing keeps correct size
          ctx.setTransform(scale, 0, 0, scale, 0, 0);
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.download = 'hall-layout.png';
          link.href = dataUrl;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } catch (e: any) {
          alert('PNG export failed: ' + (e?.message || 'Unknown error'));
        } finally {
          URL.revokeObjectURL(url);
        }
      };
      img.onerror = async () => {
        // Fallback to domtoimage PNG with scale option
        URL.revokeObjectURL(url);
        const scale = Math.max(2, window.devicePixelRatio || 2);
        const dataUrl = await domtoimage.toPng(node, { scale });
        const link = document.createElement('a');
        link.download = 'hall-layout.png';
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      };
      img.src = url;
    } catch (err) {
      // If SVG creation failed entirely, try domtoimage toPng directly
      try {
        const scale = Math.max(2, window.devicePixelRatio || 2);
        const dataUrl = await domtoimage.toPng(node, { scale });
        const link = document.createElement('a');
        link.download = 'hall-layout.png';
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error: any) {
        alert('Export failed: ' + (error?.message || 'Unknown error'));
      }
    }
  };

  return (
    <div>
      {toastMessage && (
        <div className="fixed top-6 right-6 bg-black text-white px-4 py-2 rounded shadow-lg z-50 text-sm toast-entrance">
          {toastMessage}
        </div>
      )}
      {/* Background job progress modal */}
      {backgroundJobId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h4 className="text-lg font-bold mb-2">Background import status</h4>
            <div className="mb-2">Job: {backgroundJobId}</div>
            <div className="mb-2">Status: {backgroundJob?.status || 'pending'}</div>
            <div className="mb-2">Progress: {backgroundJob?.progress ?? 0}%</div>
            <div className="mb-2">Matched: {backgroundJob?.matchedCount ?? 0} — Unmatched: {backgroundJob?.unmatchedCount ?? 0}</div>
            <div className="flex gap-2 mt-4">
              <button className="bg-gray-200 px-3 py-2 rounded" onClick={() => setBackgroundJobId(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
      <div className="flex gap-2 mb-4">
        {!readOnly && (
          <>
            <button onClick={() => addTable('round', 8)} className="bg-blue-500 text-white px-3 py-2 rounded">Round Table (8)</button>
            <button onClick={() => addTable('round', 10)} className="bg-blue-500 text-white px-3 py-2 rounded">Round Table (10)</button>
            <button onClick={() => addTable('rectangular', 6)} className="bg-green-500 text-white px-3 py-2 rounded">Rectangular (6)</button>
            <button onClick={() => addTable('rectangular', 10)} className="bg-green-500 text-white px-3 py-2 rounded">Rectangular (10)</button>
          </>
        )}
    <button onClick={saveLayout} className="bg-purple-600 text-white px-3 py-2 rounded" disabled={saving || readOnly}>{saving ? 'Saving...' : 'Save Layout'}</button>
  <button onClick={handleExportSVG} className="bg-gray-700 text-white px-3 py-2 rounded">Export as SVG</button>
  <button onClick={handleExportPNG} className="bg-gray-700 text-white px-3 py-2 rounded">Export as PNG</button>
  <button onClick={() => window.open(`/events/${eventId}/print`, '_blank')} className="bg-gray-600 text-white px-3 py-2 rounded">Print</button>
  
  {!readOnly && (
    <>
  <button onClick={() => setShowClearConfirm(true)} className="bg-orange-500 text-white px-3 py-2 rounded">Clear Seats</button>
  <button onClick={() => setShowImportModal(true)} className="bg-teal-600 text-white px-3 py-2 rounded">Import CSV</button>
      <button onClick={() => {
        // Download CSV template for import
        const headers = ['tableId', 'tableName', 'seatIndex', 'guestName', 'guestEmail'];
        const rows: string[][] = [];
        // Sample row for each table
        tables.forEach(t => {
          rows.push([t.id, t.name, '', 'Full Name', 'email@example.com']);
        });
        const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `seating-template-${eventId}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }} className="bg-indigo-500 text-white px-3 py-2 rounded">Download CSV Template</button>
    </>
  )}
      </div>
      {/* Clear confirmation modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h4 className="text-lg font-bold mb-2">Confirm Clear All Seats</h4>
            <p className="text-sm text-gray-600 mb-4">This will remove all guest assignments from tables. You can undo this action using the Undo button, but please confirm.</p>
            <div className="flex gap-2">
              <button className="bg-red-600 text-white px-4 py-2 rounded" onClick={() => {
                const cleared = tables.map(t => ({ ...t, assignedGuests: [] }));
                applyTables(cleared);
                showToast('All seats cleared');
                setShowClearConfirm(false);
              }}>Confirm</button>
              <button className="bg-gray-200 px-4 py-2 rounded" onClick={() => setShowClearConfirm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl mx-4 max-h-[80vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-bold">Import Seating from CSV</h4>
              <button className="text-gray-600" onClick={() => { setShowImportModal(false); setImportPreview(null); setImportErrors(null); }}>×</button>
            </div>
            <p className="text-sm text-gray-600 mb-3">CSV columns: tableId, tableName, seatIndex (optional), guestName, guestEmail. Rows that match existing guests will be applied. Unmatched rows are listed below.</p>
            <div className="mb-3">
              <input
                type="file"
                accept=".csv, text/csv"
                onChange={async (e) => {
                  setImportErrors(null);
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const text = await file.text();
                    setCsvText(text);
                    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
                    const fields = (parsed.meta && (parsed.meta as any).fields) || [];
                    setImportHeaders(fields as string[]);
                    setImportPreview(parsed.data as any[]);
                    // set reasonable defaults for mapping
                    const findField = (cands: string[]) => fields.find((f: string) => cands.map(s => s.toLowerCase()).includes(f.toLowerCase()));
                    setMapping({
                      guestName: findField(['guestName', 'name', 'full name', 'Guest Name', 'Name']) || fields[0] || '',
                      guestEmail: findField(['guestEmail', 'email', 'Email']) || fields.find((f: string) => f.toLowerCase().includes('email')) || '',
                      tableId: findField(['tableId', 'table id', 'table_id']) || '',
                      tableName: findField(['tableName', 'table name', 'table']) || fields.find((f: string) => f.toLowerCase().includes('table')) || '',
                      seatIndex: findField(['seatIndex', 'seat index', 'seat']) || '',
                    });
                  } catch (err: any) {
                    setImportErrors(err?.message || 'Failed to read CSV');
                    setImportPreview(null);
                    setImportHeaders([]);
                    setCsvText(null);
                  }
                  // reset input value for re-upload
                  e.currentTarget.value = '';
                }}
              />
            </div>
            {/* Column mapping controls */}
            {importHeaders && importHeaders.length > 0 && (
              <div className="mb-3 grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-600">Guest name column</label>
                  <select className="w-full border rounded p-1" value={mapping.guestName || ''} onChange={e => setMapping(m => ({ ...m, guestName: e.target.value }))}>
                    <option value="">-- select column --</option>
                    {importHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-600">Guest email column</label>
                  <select className="w-full border rounded p-1" value={mapping.guestEmail || ''} onChange={e => setMapping(m => ({ ...m, guestEmail: e.target.value }))}>
                    <option value="">-- select column --</option>
                    {importHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-600">Table id column (optional)</label>
                  <select className="w-full border rounded p-1" value={mapping.tableId || ''} onChange={e => setMapping(m => ({ ...m, tableId: e.target.value }))}>
                    <option value="">-- select column --</option>
                    {importHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-600">Table name column</label>
                  <select className="w-full border rounded p-1" value={mapping.tableName || ''} onChange={e => setMapping(m => ({ ...m, tableName: e.target.value }))}>
                    <option value="">-- select column --</option>
                    {importHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-600">Seat index column (optional)</label>
                  <select className="w-full border rounded p-1" value={mapping.seatIndex || ''} onChange={e => setMapping(m => ({ ...m, seatIndex: e.target.value }))}>
                    <option value="">-- select column --</option>
                    {importHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={createMissingTables} onChange={e => setCreateMissingTables(e.target.checked)} />
                    <span className="text-sm">Create missing tables</span>
                  </label>
                </div>
              </div>
            )}
            {importErrors && <div className="text-red-600 mb-2">{importErrors}</div>}
            {importPreview && importPreview.length > 0 && (
              <div>
                <div className="mb-3">
                  <strong>Matched rows:</strong>
                  <div className="text-sm text-gray-700">{importPreview[0].matched.length} rows</div>
                </div>
                <div className="mb-3">
                  <strong>Unmatched rows:</strong>
                  <div className="text-sm text-gray-700">{importPreview[0].unmatched.length} rows</div>
                </div>
                <div className="mb-3">
                  <button className="bg-green-600 text-white px-3 py-2 rounded mr-2" onClick={() => {
                    // apply matched assignments (client-side)
                    const matched = importPreview?.[0]?.matched || [];
                    if (!matched.length) { showToast('No matched rows to apply'); return; }
                    // build a map of tableId => assignedGuests (new arrays)
                    const nextTables = tables.map(t => ({ ...t, assignedGuests: [...t.assignedGuests] }));
                    matched.forEach((m: any) => {
                      const t = nextTables.find(nt => nt.id === m.table.id);
                      if (!t) return;
                      // remove guest from other tables
                      for (const ot of nextTables) {
                        ot.assignedGuests = ot.assignedGuests.filter((id: string) => id !== m.guest._id);
                      }
                      // append if not already present
                      if (!t.assignedGuests.includes(m.guest._id)) t.assignedGuests.push(m.guest._id);
                    });
                    applyTables(nextTables);
                    showToast(`Applied ${matched.length} assignments`);
                    setShowImportModal(false);
                    setImportPreview(null);
                  }}>Apply Matched</button>
                  <button className="bg-blue-700 text-white px-3 py-2 rounded mr-2" onClick={async () => {
                    // Server preview first
                    if (!csvText) { showToast('Please upload a CSV first'); return; }
                    setAwaitingServerPreview(true);
                    try {
                      const resp = await fetch(`/api/events/${eventId}/import/preview`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ csvText, mapping })
                      });
                      if (!resp.ok) {
                        const d = await resp.json().catch(() => ({}));
                        showToast(d?.message || 'Preview failed');
                        setAwaitingServerPreview(false);
                        return;
                      }
                      const data = await resp.json();
                      setServerPreview(data);
                      setAwaitingServerPreview(false);
                    } catch (err: any) {
                      showToast(err?.message || 'Preview failed');
                      setAwaitingServerPreview(false);
                    }
                  }}>{awaitingServerPreview ? 'Previewing...' : 'Server: Preview'}</button>
                  {/* If preview returned, show confirm button */}
                  {serverPreview && (
                    <div className="mt-2 p-3 border rounded bg-gray-50">
                      <div className="mb-2 text-sm">Server preview: matched {serverPreview.matched?.length || 0}, unmatched {serverPreview.unmatched?.length || 0}, tablesNeeded {serverPreview.tablesNeeded?.length || 0}</div>
                      <div className="flex gap-2">
                        <button className="bg-blue-700 text-white px-3 py-2 rounded" onClick={async () => {
                          // confirm server apply
                          try {
                            const res = await fetch(`/api/events/${eventId}/import`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ csvText, mapping, createMissingTables })
                            });
                            if (!res.ok) {
                              const d = await res.json().catch(() => ({}));
                              showToast(d?.message || 'Server apply failed');
                              return;
                            }
                            const d = await res.json();
                            showToast(`Server applied ${d.matched?.length || 0} rows`);
                            // refresh layout
                            try {
                              const layoutRes = await fetch(`/api/events/${eventId}/layout`);
                              if (layoutRes.ok) {
                                const layoutData = await layoutRes.json();
                                if (onTablesChange) onTablesChange(layoutData.tables || []);
                              }
                            } catch (e) {}
                            setShowImportModal(false);
                            setImportPreview(null);
                            setServerPreview(null);
                          } catch (err: any) {
                            showToast(err?.message || 'Server apply failed');
                          }
                        }}>Confirm server apply</button>
                        <button className="bg-gray-200 px-3 py-2 rounded" onClick={() => setServerPreview(null)}>Cancel</button>
                      </div>
                    </div>
                  )}
                  <button className="bg-purple-700 text-white px-3 py-2 rounded" onClick={async () => {
                    // Start background job
                    if (!csvText) { showToast('Please upload a CSV first'); return; }
                    try {
                      const res = await fetch(`/api/events/${eventId}/import/background`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ csvText, mapping, createMissingTables })
                      });
                      if (!res.ok) { const d = await res.json().catch(() => ({})); showToast(d?.message || 'Failed to start background import'); return; }
                      const data = await res.json();
                      setBackgroundJobId(String(data.jobId));
                      setBackgroundJob(null);
                    } catch (err: any) { showToast(err?.message || 'Failed to start background import'); }
                  }}>Background import</button>
                  <button className="bg-gray-200 px-3 py-2 rounded" onClick={() => {
                    // download unmatched rows as CSV to import via guest import flow
                    const unmatched = importPreview?.[0]?.unmatched || [];
                    if (!unmatched.length) { showToast('No unmatched rows'); return; }
                    const headers = ['guestName', 'guestEmail', 'tableName'];
                    const rows = unmatched.map((u: any) => [u.guestName || '', u.guestEmail || '', u.tableName || '']);
                    const csv = [headers.join(','), ...rows.map((r: any) => r.map((c: any) => `"${String(c).replace(/"/g,'""')}"`).join(','))].join('\n');
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `unmatched-seating-${eventId}.csv`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                    showToast('Downloaded unmatched rows CSV');
                  }}>Download Unmatched</button>
                </div>
                <div className="mb-2">
                  <details className="mb-2">
                    <summary className="cursor-pointer">Preview matched rows</summary>
                    <div className="mt-2 text-sm">
                      {importPreview[0].matched.map((m: any, idx: number) => (
                        <div key={idx} className="py-1 border-b">{m.guest.name} ({m.guest.email || 'no email'}) → {m.table.name}</div>
                      ))}
                    </div>
                  </details>
                  <details>
                    <summary className="cursor-pointer">Preview unmatched rows</summary>
                    <div className="mt-2 text-sm">
                      {importPreview[0].unmatched.map((u: any, idx: number) => (
                        <div key={idx} className="py-1 border-b">{u.guestName || u.guestEmail} — {u.tableName || u.tableId} <span className="text-xs text-gray-500">({u.reason})</span></div>
                      ))}
                    </div>
                  </details>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Guest List for Drag-and-Drop Assignment */}
      <div className="mb-4 flex flex-wrap gap-2">
  {guests.filter((g: Guest) => !tables.some((t: Table) => t.assignedGuests.includes(g._id))).map((guest: Guest) => (
          <div
            key={guest._id || guest.email || guest.name}
            className="guest-item px-3 py-1 bg-gray-200 rounded cursor-move"
            draggable
            onDragStart={() => setDraggedGuestId(guest._id)}
            onDragEnd={() => setDraggedGuestId(null)}
          >
            {guest.name}
          </div>
        ))}
      </div>
      <div
        ref={canvasRef}
        className="hall-canvas border-2 border-gray-300 rounded-lg relative bg-gray-100 mx-auto"
        style={{ width: 1200, height: 800, maxWidth: '100%' }}
        onMouseMove={e => {
          if (!draggingTableId || !dragOffset) return;
          const rect = canvasRef.current?.getBoundingClientRect();
          if (!rect) return;
          const x = e.clientX - rect.left - dragOffset.x;
          const y = e.clientY - rect.top - dragOffset.y;
          updateTable(draggingTableId, {
            x: Math.max(0, Math.min(x, 1120)),
            y: Math.max(0, Math.min(y, 740)),
          });
        }}
        onMouseUp={() => {
          setDraggingTableId(null);
          setDragOffset(null);
        }}
      >
  {tables.map((table: Table) => (
          <div
            key={table.id || table.name}
            className="table-element absolute cursor-move"
            style={{
              left: table.x,
              top: table.y,
              width: table.shape === 'round' ? 80 : 80,
              height: table.shape === 'round' ? 80 : 60,
              borderRadius: table.shape === 'round' ? '50%' : 8,
              transform: `rotate(${table.rotation || 0}deg)`
            }}
            onMouseDown={e => {
              if (readOnly) return;
              if ((e.target as HTMLElement).closest('button')) return;
              const rect = canvasRef.current?.getBoundingClientRect();
              if (!rect) return;
              setDraggingTableId(table.id);
              setDragOffset({
                x: e.clientX - rect.left - table.x,
                y: e.clientY - rect.top - table.y,
              });
              mouseDownPos.current = { x: e.clientX, y: e.clientY, tableId: table.id };
            }}
            onMouseUp={e => {
              // Only treat as click if mouse didn't move much
              if (mouseDownPos.current.tableId === table.id) {
                const dx = Math.abs(e.clientX - mouseDownPos.current.x);
                const dy = Math.abs(e.clientY - mouseDownPos.current.y);
                if (dx < 5 && dy < 5 && onTableClick) {
                  onTableClick(tables.find(t => t.id === table.id) || table);
                }
              }
              setDraggingTableId(null);
              setDragOffset(null);
              mouseDownPos.current = { x: 0, y: 0, tableId: null };
            }}
            onTouchStart={e => {
              if (readOnly) return;
              if ((e.target as HTMLElement).closest('button')) return;
              if (e.touches.length === 1) {
                mouseDownPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, tableId: table.id };
              }
            }}
            onTouchEnd={e => {
              if (mouseDownPos.current.tableId === table.id && e.changedTouches.length === 1) {
                const dx = Math.abs(e.changedTouches[0].clientX - mouseDownPos.current.x);
                const dy = Math.abs(e.changedTouches[0].clientY - mouseDownPos.current.y);
                if (dx < 5 && dy < 5 && onTableClick) {
                  onTableClick(tables.find(t => t.id === table.id) || table);
                }
              }
              mouseDownPos.current = { x: 0, y: 0, tableId: null };
            }}
            // Guest assignment drop logic remains
            onDragOver={e => {
              if (readOnly) return;
              e.preventDefault();
            }}
              onDrop={e => {
              if (readOnly) return;
              e.preventDefault();
              if (!draggedGuestId) return;
              if (table.assignedGuests.includes(draggedGuestId)) return;
              const updatedTables = tables.map(t => t.id === table.id
                ? { ...t, assignedGuests: [...t.assignedGuests, draggedGuestId] }
                : { ...t, assignedGuests: t.assignedGuests.filter((gid: string) => gid !== draggedGuestId) }
              );
              applyTables(updatedTables);
              setDraggedGuestId(null);
            }}
          >
              <div className="text-xs text-center mb-2 relative" onDoubleClick={() => { setRenamingTableId(table.id); setRenameValue(table.name); }}>
                {renamingTableId === table.id ? (
                  <input
                    autoFocus
                    className="text-sm px-1 rounded border"
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (renameValue.trim()) {
                          updateTable(table.id, { name: renameValue.trim() });
                        }
                        setRenamingTableId(null);
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        setRenamingTableId(null);
                        setRenameValue('');
                      }
                    }}
                    onBlur={() => { setRenamingTableId(null); setRenameValue(''); }}
                  />
                ) : (
                  <span>{table.name}</span>
                )}
              <div>({table.capacity})</div>
              <div className="text-[10px] text-gray-200 mt-1">{table.assignedGuests.length} assigned</div>
            </div>
            <button className="absolute top-0 right-0 text-xs text-red-600 bg-white rounded-full px-1" onClick={e => { e.stopPropagation(); removeTable(table.id); }} title="Remove">×</button>
          </div>
        ))}
      </div>
    </div>
  );
}
