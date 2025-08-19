
import React, { useRef, useState } from 'react';
import domtoimage from 'dom-to-image-more';
import type { Table, Guest } from '@/lib/types';

interface HallLayoutPlannerProps {
  eventId: string;
  tables: Table[];
  guests?: Guest[];
  onTableClick?: (table: Table, meta?: { fromDrag?: boolean }) => void;
  onTablesChange?: (tables: Table[]) => void;
}

export default function HallLayoutPlanner({ eventId, tables, guests = [], onTableClick, onTablesChange }: HallLayoutPlannerProps) {
  const [renamingTableId, setRenamingTableId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  // Removed local loading state; parent controls data
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
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
    onTablesChange && onTablesChange([...tables, newTable]);
  }

  function updateTable(id: string, updates: Partial<Table>) {
  onTablesChange && onTablesChange(tables.map((t: Table) => t.id === id ? { ...t, ...updates } : t));
  }

  function removeTable(id: string) {
  onTablesChange && onTablesChange(tables.filter((t: Table) => t.id !== id));
  }

  async function saveLayout() {
    setSaving(true);
    if (onTablesChange) {
      await onTablesChange(tables);
    }
    setSaving(false);
  }

  // No local loading block; parent controls data

  // Download hall layout as image
  const handleDownloadLayout = async () => {
    if (!canvasRef.current) return;
    const node = canvasRef.current;
    domtoimage.toPng(node)
      .then(function (dataUrl: string) {
        const link = document.createElement('a');
        link.download = 'hall-layout.png';
        link.href = dataUrl;
        link.click();
      })
      .catch(function (error: any) {
        alert('Export failed: ' + error.message);
      });
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button onClick={() => addTable('round', 8)} className="bg-blue-500 text-white px-3 py-2 rounded">Round Table (8)</button>
        <button onClick={() => addTable('round', 10)} className="bg-blue-500 text-white px-3 py-2 rounded">Round Table (10)</button>
        <button onClick={() => addTable('rectangular', 6)} className="bg-green-500 text-white px-3 py-2 rounded">Rectangular (6)</button>
        <button onClick={() => addTable('rectangular', 10)} className="bg-green-500 text-white px-3 py-2 rounded">Rectangular (10)</button>
        <button onClick={saveLayout} className="bg-purple-600 text-white px-3 py-2 rounded" disabled={saving}>{saving ? 'Saving...' : 'Save Layout'}</button>
        <button onClick={handleDownloadLayout} className="bg-gray-700 text-white px-3 py-2 rounded">Download Layout Image</button>
      </div>
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
              e.preventDefault();
            }}
              onDrop={e => {
              e.preventDefault();
              if (!draggedGuestId) return;
              if (table.assignedGuests.includes(draggedGuestId)) return;
              const updatedTables = tables.map(t => t.id === table.id
                ? { ...t, assignedGuests: [...t.assignedGuests, draggedGuestId] }
                : { ...t, assignedGuests: t.assignedGuests.filter((gid: string) => gid !== draggedGuestId) }
              );
              onTablesChange && onTablesChange(updatedTables);
              setDraggedGuestId(null);
            }}
          >
            <div className="text-xs text-center mb-2 relative">
              <span>{table.name}</span>
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
