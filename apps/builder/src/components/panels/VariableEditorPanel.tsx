/**
 * VariableEditorPanel — Data-Bind variable manager.
 *
 * VAE Task 144 — Executive Dark spec:
 * - Lists page variables with name, type pill, default value preview
 * - Add Variable, inline edit (name/type/default/description), delete
 * - Saves via updatePageVariables → isDirty → auto-save → DB persistent
 */

import { useState, useCallback } from 'react';
import { Trash2, Plus, Database } from 'lucide-react';
import { useCanvasStore, useDataBindStore } from '@nexus/core';
import type { NexusVariable } from '@nexus/core';

// ─── Types ────────────────────────────────────────────────────────────────────

type VarType = 'string' | 'number' | 'boolean' | 'array' | 'object';

const TYPE_OPTIONS: VarType[] = ['string', 'number', 'boolean', 'array', 'object'];

const TYPE_COLORS: Record<VarType, string> = {
  string:  'rgba(16,183,127,0.10)',
  number:  'rgba(99,102,241,0.15)',
  boolean: 'rgba(245,158,11,0.15)',
  array:   'rgba(236,72,153,0.15)',
  object:  'rgba(6,182,212,0.15)',
};

const TYPE_TEXT: Record<VarType, string> = {
  string:  '#10b77f',
  number:  '#818cf8',
  boolean: '#fbbf24',
  array:   '#f472b6',
  object:  '#22d3ee',
};

// ─── Slugify helper ───────────────────────────────────────────────────────────

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/^[^a-z_]/, '_$&')
    .replace(/__+/g, '_');
}

// ─── Default value input ──────────────────────────────────────────────────────

function DefaultValueInput({ type, value, onChange }: {
  type: VarType;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  if (type === 'boolean') {
    return (
      <select
        value={String(value)}
        onChange={(e) => onChange(e.target.value === 'true')}
        style={{
          flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 4, color: '#dde4dd', fontSize: 11, padding: '2px 4px', outline: 'none',
        }}
      >
        <option value="false">false</option>
        <option value="true">true</option>
      </select>
    );
  }
  if (type === 'number') {
    return (
      <input
        type="number"
        value={String(value ?? '')}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        placeholder="0"
        style={{
          flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 4, color: '#dde4dd', fontSize: 11, padding: '2px 6px', outline: 'none',
        }}
      />
    );
  }
  if (type === 'array' || type === 'object') {
    return (
      <input
        type="text"
        value={typeof value === 'string' ? value : JSON.stringify(value ?? (type === 'array' ? [] : {}))}
        onChange={(e) => {
          try { onChange(JSON.parse(e.target.value)); } catch { onChange(e.target.value); }
        }}
        placeholder={type === 'array' ? '[]' : '{}'}
        style={{
          flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 4, color: '#dde4dd', fontSize: 11, padding: '2px 6px', outline: 'none',
          fontFamily: "'JetBrains Mono', monospace",
        }}
      />
    );
  }
  return (
    <input
      type="text"
      value={String(value ?? '')}
      onChange={(e) => onChange(e.target.value)}
      placeholder="value"
      style={{
        flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: 4, color: '#dde4dd', fontSize: 11, padding: '2px 6px', outline: 'none',
      }}
    />
  );
}

// ─── Variable Row ─────────────────────────────────────────────────────────────

function VariableRow({
  variable,
  onUpdate,
  onDelete,
}: {
  variable: NexusVariable;
  onUpdate: (id: string, updates: Partial<NexusVariable>) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [nameEdit, setNameEdit] = useState(variable.name);

  const handleNameBlur = () => {
    const slugged = slugify(nameEdit) || variable.name;
    setNameEdit(slugged);
    onUpdate(variable.id, { name: slugged });
  };

  const varType = (variable.type ?? 'string') as VarType;

  return (
    <div
      style={{
        background: '#0d1117',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 6,
        overflow: 'hidden',
        marginBottom: 4,
      }}
    >
      {/* Row header */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 10px', cursor: 'pointer',
        }}
        onClick={() => setExpanded((v) => !v)}
      >
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            color: '#dde4dd',
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {variable.name}
        </span>
        <span
          style={{
            background: TYPE_COLORS[varType],
            color: TYPE_TEXT[varType],
            fontSize: 10,
            padding: '1px 6px',
            borderRadius: 3,
            flexShrink: 0,
          }}
        >
          {varType}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(variable.id); }}
          title="Delete variable"
          style={{
            background: 'none', border: 'none', padding: 2, cursor: 'pointer',
            color: '#4a5f4e', display: 'flex', alignItems: 'center', flexShrink: 0,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#ef4444'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#4a5f4e'; }}
        >
          <Trash2 size={12} strokeWidth={1.5} />
        </button>
      </div>

      {/* Inline edit */}
      {expanded && (
        <div style={{ padding: '6px 10px 10px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* Name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, color: '#4a5f4e', width: 52, flexShrink: 0 }}>Name</span>
            <input
              value={nameEdit}
              onChange={(e) => setNameEdit(e.target.value)}
              onBlur={handleNameBlur}
              style={{
                flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
                borderRadius: 4, color: '#dde4dd', fontSize: 11, padding: '2px 6px', outline: 'none',
                fontFamily: "'JetBrains Mono', monospace",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#10b77f'; }}
              onBlurCapture={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; }}
            />
          </div>

          {/* Type */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, color: '#4a5f4e', width: 52, flexShrink: 0 }}>Type</span>
            <select
              value={varType}
              onChange={(e) => onUpdate(variable.id, { type: e.target.value as VarType })}
              style={{
                flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
                borderRadius: 4, color: '#dde4dd', fontSize: 11, padding: '2px 4px', outline: 'none',
              }}
            >
              {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Default value */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, color: '#4a5f4e', width: 52, flexShrink: 0 }}>Default</span>
            <DefaultValueInput
              type={varType}
              value={variable.defaultValue}
              onChange={(v) => onUpdate(variable.id, { defaultValue: v })}
            />
          </div>

          {/* Description */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, color: '#4a5f4e', width: 52, flexShrink: 0 }}>Desc</span>
            <input
              value={variable.description ?? ''}
              onChange={(e) => onUpdate(variable.id, { description: e.target.value })}
              placeholder="Optional description…"
              style={{
                flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
                borderRadius: 4, color: '#dde4dd', fontSize: 11, padding: '2px 6px', outline: 'none',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function VariableEditorPanel() {
  const variables         = useCanvasStore((s) => s.page?.variables ?? []);
  const updatePageVariables = useCanvasStore((s) => s.updatePageVariables);
  const initFromPage      = useDataBindStore((s) => s.initFromPage);

  const save = useCallback((updated: NexusVariable[]) => {
    updatePageVariables(updated);
    initFromPage(updated);
  }, [updatePageVariables, initFromPage]);

  const handleAdd = () => {
    const varName = `variable_${variables.length + 1}`;
    const newVar: NexusVariable = {
      id:           crypto.randomUUID(),
      name:         varName,
      label:        varName,
      type:         'string',
      defaultValue: '',
      description:  '',
      readonly:     false,
    };
    save([...variables, newVar]);
  };

  const handleUpdate = useCallback((id: string, updates: Partial<NexusVariable>) => {
    save(variables.map((v) => (v.id === id ? { ...v, ...updates } : v)));
  }, [variables, save]);

  const handleDelete = useCallback((id: string) => {
    save(variables.filter((v) => v.id !== id));
  }, [variables, save]);

  return (
    <div
      style={{
        background: '#121821',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: '#0d1117',
          padding: '10px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Database size={13} strokeWidth={1.5} style={{ color: '#10b77f' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#dde4dd' }}>Variables</span>
          {variables.length > 0 && (
            <span
              style={{
                background: 'rgba(16,183,127,0.12)',
                color: '#10b77f',
                fontSize: 10,
                padding: '0px 5px',
                borderRadius: 3,
              }}
            >
              {variables.length}
            </span>
          )}
        </div>
        <button
          onClick={handleAdd}
          style={{
            background: 'rgba(16,183,127,0.12)',
            border: '1px solid #10b77f',
            color: '#10b77f',
            fontSize: 11,
            padding: '3px 8px',
            borderRadius: 4,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(16,183,127,0.22)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(16,183,127,0.12)'; }}
        >
          <Plus size={11} strokeWidth={1.5} />
          Add Variable
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 10 }}>
        {variables.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              color: '#4a5f4e',
              fontSize: 11,
              lineHeight: 1.6,
              padding: '32px 16px',
            }}
          >
            No variables yet. Add one to start binding data to widgets.
          </div>
        ) : (
          variables.map((v) => (
            <VariableRow
              key={v.id}
              variable={v}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}
