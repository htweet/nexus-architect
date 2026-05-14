/**
 * ActionsPipelineEditor — Visual event/action pipeline builder.
 *
 * VAE Task 146 — Executive Dark spec.
 * VAE Gap E additions:
 *   • showInstallPrompt step type
 *   • Step drag-to-reorder via ↑↓ arrow buttons
 *   • customJS locked badge (premium gate handled by engine)
 *   • Shared Pipelines section — page-level reusable pipelines
 *
 * Lists ActionPipeline cards per node, with trigger + steps + inline editing.
 * Saves via updateNodeActions() → isDirty → auto-save → DB persistent.
 */

import { useState, useEffect } from 'react';
import {
  Plus, Trash2, Zap, ChevronDown, ChevronRight,
  Globe, Navigation, Eye, Lock, Share2, Smartphone,
  ArrowUp, ArrowDown,
} from 'lucide-react';
import { useCanvasStore } from '@nexus/core';
import type { ActionPipeline, ActionStep, ActionTrigger, ActionStepType, SharedPipeline } from '@nexus/core';

// ─── Constants ────────────────────────────────────────────────────────────────

const TRIGGERS: { value: ActionTrigger; label: string }[] = [
  { value: 'click',  label: 'Click'  },
  { value: 'submit', label: 'Submit' },
  { value: 'change', label: 'Change' },
  { value: 'focus',  label: 'Focus'  },
  { value: 'blur',   label: 'Blur'   },
  { value: 'load',   label: 'Load'   },
];

const STEP_TYPES: { value: ActionStepType; label: string; icon: React.ReactNode; premium?: boolean }[] = [
  { value: 'setVariable',      label: 'Set Variable',      icon: <Zap size={10} strokeWidth={1.5} /> },
  { value: 'webhookCall',      label: 'Webhook',           icon: <Globe size={10} strokeWidth={1.5} /> },
  { value: 'navigate',         label: 'Navigate',          icon: <Navigation size={10} strokeWidth={1.5} /> },
  { value: 'showModal',        label: 'Show Modal',        icon: <Eye size={10} strokeWidth={1.5} /> },
  { value: 'showInstallPrompt',label: 'Install PWA',       icon: <Smartphone size={10} strokeWidth={1.5} /> },
  { value: 'customJS',         label: 'Custom JS',         icon: <Zap size={10} strokeWidth={1.5} />, premium: true },
];

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

// ─── Shared input style ───────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  flex: 1,
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 4,
  color: '#dde4dd',
  fontSize: 11,
  padding: '3px 6px',
  outline: 'none',
  width: '100%',
};

const monoInputStyle: React.CSSProperties = {
  ...inputStyle,
  fontFamily: "'JetBrains Mono', monospace",
};

// ─── Step editor ─────────────────────────────────────────────────────────────

function StepEditor({ step, variables, onChange, onDelete, onMoveUp, onMoveDown, isFirst, isLast }: {
  step: ActionStep;
  variables: { id: string; name: string }[];
  onChange: (updates: Partial<ActionStep>) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const typeInfo = STEP_TYPES.find((t) => t.value === step.type);

  // ── Optimistic local state for variable picker ────────────────────────────
  // The controlled-select flickers back to "— select —" during the Zustand
  // re-render cycle if the options list is momentarily stale. We hold a local
  // copy and sync it from props; the visual update therefore happens instantly.
  const [localVariableId, setLocalVariableId] = useState(step.variableId ?? '');
  useEffect(() => { setLocalVariableId(step.variableId ?? ''); }, [step.variableId]);

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 5,
      padding: '6px 8px',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      marginBottom: 4,
    }}>
      {/* Step header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {/* Reorder buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <button
            onClick={onMoveUp}
            disabled={isFirst}
            style={{
              background: 'none', border: 'none', cursor: isFirst ? 'default' : 'pointer',
              color: isFirst ? '#2a3a2e' : '#4a5f4e', padding: 1, lineHeight: 1,
            }}
            title="Move step up"
          >
            <ArrowUp size={8} strokeWidth={2} />
          </button>
          <button
            onClick={onMoveDown}
            disabled={isLast}
            style={{
              background: 'none', border: 'none', cursor: isLast ? 'default' : 'pointer',
              color: isLast ? '#2a3a2e' : '#4a5f4e', padding: 1, lineHeight: 1,
            }}
            title="Move step down"
          >
            <ArrowDown size={8} strokeWidth={2} />
          </button>
        </div>

        <span style={{
          background: typeInfo?.premium ? 'rgba(251,191,36,0.10)' : 'rgba(16,183,127,0.10)',
          color: typeInfo?.premium ? '#fbbf24' : '#10b77f',
          fontSize: 9, padding: '1px 5px', borderRadius: 3,
          display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0,
        }}>
          {typeInfo?.icon}
          {typeInfo?.label ?? step.type}
          {typeInfo?.premium && <Lock size={7} strokeWidth={2.5} />}
        </span>
        <select
          value={step.type}
          onChange={(e) => onChange({ type: e.target.value as ActionStepType })}
          style={{ ...inputStyle, flex: 'none', width: 'auto', fontSize: 10 }}
        >
          {STEP_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}{t.premium ? ' (Pro)' : ''}
            </option>
          ))}
        </select>
        <button
          onClick={onDelete}
          style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#4a5f4e', padding: 2, flexShrink: 0 }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#ef4444'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#4a5f4e'; }}
        >
          <Trash2 size={11} strokeWidth={1.5} />
        </button>
      </div>

      {/* Step-type-specific fields */}
      {step.type === 'setVariable' && (
        <>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: '#4a5f4e', width: 44 }}>Variable</span>
            <select
              value={localVariableId}
              onChange={(e) => {
                const val = e.target.value;
                setLocalVariableId(val);   // optimistic — instant visual update
                onChange({ variableId: val });
              }}
              style={{ ...inputStyle }}
            >
              <option value="">— select —</option>
              {variables.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: '#4a5f4e', width: 44 }}>Value</span>
            <input
              style={inputStyle}
              value={String(step.setValue ?? '')}
              onChange={(e) => onChange({ setValue: e.target.value })}
              placeholder="new value or {{variable}}"
            />
          </div>
        </>
      )}

      {step.type === 'navigate' && (
        <>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: '#4a5f4e', width: 44 }}>URL</span>
            <input
              style={monoInputStyle}
              value={step.destination ?? ''}
              onChange={(e) => onChange({ destination: e.target.value })}
              placeholder="https://... or /path"
            />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#bbcabf' }}>
            <input type="checkbox" checked={!!step.newTab} onChange={(e) => onChange({ newTab: e.target.checked })} />
            Open in new tab
          </label>
        </>
      )}

      {step.type === 'showModal' && (
        <>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: '#4a5f4e', width: 44 }}>Node ID</span>
            <input
              style={monoInputStyle}
              value={step.targetNodeId ?? ''}
              onChange={(e) => onChange({ targetNodeId: e.target.value })}
              placeholder="modal node ID"
            />
          </div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: '#4a5f4e', width: 44 }}>Action</span>
            <select
              value={step.modalAction ?? 'toggle'}
              onChange={(e) => onChange({ modalAction: e.target.value as 'open' | 'close' | 'toggle' })}
              style={inputStyle}
            >
              <option value="open">Open</option>
              <option value="close">Close</option>
              <option value="toggle">Toggle</option>
            </select>
          </div>
        </>
      )}

      {step.type === 'showInstallPrompt' && (
        <p style={{ fontSize: 10, color: '#bbcabf', margin: 0 }}>
          Triggers the browser's native PWA install prompt. Only fires if the
          page has PWA enabled and the browser has deferred the prompt.
        </p>
      )}

      {step.type === 'webhookCall' && (
        <>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: '#4a5f4e', width: 44 }}>URL</span>
            <input
              style={monoInputStyle}
              value={step.url ?? ''}
              onChange={(e) => onChange({ url: e.target.value })}
              placeholder="https://api.example.com/..."
            />
          </div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: '#4a5f4e', width: 44 }}>Method</span>
            <div style={{ display: 'flex', gap: 2 }}>
              {METHODS.map((m) => (
                <button
                  key={m}
                  onClick={() => onChange({ method: m })}
                  style={{
                    fontSize: 9, padding: '2px 5px', borderRadius: 3, cursor: 'pointer',
                    background: step.method === m ? 'rgba(16,183,127,0.15)' : 'rgba(255,255,255,0.05)',
                    color: step.method === m ? '#10b77f' : '#bbcabf',
                    border: `1px solid ${step.method === m ? 'rgba(16,183,127,0.30)' : 'rgba(255,255,255,0.08)'}`,
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ fontSize: 10, color: '#4a5f4e' }}>Payload template</span>
            <textarea
              value={step.payloadTemplate ?? ''}
              onChange={(e) => onChange({ payloadTemplate: e.target.value })}
              placeholder={'{\n  "key": "{{variable_name}}",\n  "input": "$trigger.value"\n}'}
              rows={3}
              style={{
                ...monoInputStyle,
                resize: 'vertical',
                minHeight: 72,
                padding: '4px 6px',
              }}
            />
            <span style={{ fontSize: 9, color: '#4a5f4e' }}>
              Use {'{{varId}}'} for store vars, $trigger.value for the event input, $form.fields.name for form fields.
            </span>
          </div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: '#4a5f4e', width: 44 }}>On error</span>
            <select
              value={step.onError ?? 'continue'}
              onChange={(e) => onChange({ onError: e.target.value as 'continue' | 'abort' | 'retry' })}
              style={inputStyle}
            >
              <option value="continue">Continue</option>
              <option value="abort">Abort</option>
              <option value="retry">Retry</option>
            </select>
          </div>
        </>
      )}

      {step.type === 'customJS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Lock size={9} strokeWidth={2} style={{ color: '#fbbf24' }} />
            <span style={{ fontSize: 10, color: '#fbbf24' }}>
              Premium — upgrade to unlock Custom JS execution.
            </span>
          </div>
          <textarea
            value={step.code ?? ''}
            onChange={(e) => onChange({ code: e.target.value })}
            placeholder="// store = DataBindStore state&#10;// ctx = { event, nodeProps }"
            rows={4}
            style={{ ...monoInputStyle, resize: 'vertical', minHeight: 80, padding: '4px 6px', opacity: 0.5 }}
          />
        </div>
      )}
    </div>
  );
}

// ─── Pipeline card ────────────────────────────────────────────────────────────

function PipelineCard({ pipeline, variables, onChange, onDelete }: {
  pipeline: ActionPipeline;
  variables: { id: string; name: string }[];
  onChange: (updates: Partial<ActionPipeline>) => void;
  onDelete: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const addStep = () => {
    const newStep: ActionStep = { id: crypto.randomUUID(), type: 'setVariable' };
    onChange({ steps: [...pipeline.steps, newStep] });
  };

  const updateStep = (idx: number, updates: Partial<ActionStep>) => {
    const steps = [...pipeline.steps];
    steps[idx] = { ...steps[idx]!, ...updates };
    onChange({ steps });
  };

  const deleteStep = (idx: number) => {
    onChange({ steps: pipeline.steps.filter((_, i) => i !== idx) });
  };

  const moveStep = (idx: number, direction: 'up' | 'down') => {
    const steps = [...pipeline.steps];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= steps.length) return;
    // Swap
    [steps[idx], steps[targetIdx]] = [steps[targetIdx]!, steps[idx]!];
    onChange({ steps });
  };

  return (
    <div style={{
      background: '#0d1117',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 6,
      marginBottom: 6,
      overflow: 'hidden',
    }}>
      {/* Card header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px' }}>
        <button onClick={() => setCollapsed((v) => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbcabf', padding: 0 }}>
          {collapsed ? <ChevronRight size={12} strokeWidth={1.5} /> : <ChevronDown size={12} strokeWidth={1.5} />}
        </button>
        <span style={{ fontSize: 10, color: '#4a5f4e' }}>Trigger</span>
        <select
          value={pipeline.trigger}
          onChange={(e) => onChange({ trigger: e.target.value as ActionTrigger })}
          onClick={(e) => e.stopPropagation()}
          style={{ ...inputStyle, flex: 'none', width: 'auto' }}
        >
          {TRIGGERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <span style={{ fontSize: 10, color: '#4a5f4e', marginLeft: 4 }}>
          {pipeline.steps.length} step{pipeline.steps.length !== 1 ? 's' : ''}
        </span>
        <button
          onClick={onDelete}
          style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#4a5f4e', padding: 2 }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#ef4444'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#4a5f4e'; }}
        >
          <Trash2 size={11} strokeWidth={1.5} />
        </button>
      </div>

      {/* Steps */}
      {!collapsed && (
        <div style={{ padding: '0 8px 8px' }}>
          {pipeline.steps.map((step, idx) => (
            <StepEditor
              key={step.id}
              step={step}
              variables={variables}
              onChange={(updates) => updateStep(idx, updates)}
              onDelete={() => deleteStep(idx)}
              onMoveUp={() => moveStep(idx, 'up')}
              onMoveDown={() => moveStep(idx, 'down')}
              isFirst={idx === 0}
              isLast={idx === pipeline.steps.length - 1}
            />
          ))}
          <button
            onClick={addStep}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: 'none', border: '1px dashed rgba(255,255,255,0.12)',
              borderRadius: 4, color: '#4a5f4e', fontSize: 10,
              padding: '4px 8px', cursor: 'pointer', width: '100%',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#bbcabf'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#4a5f4e'; }}
          >
            <Plus size={10} strokeWidth={1.5} />
            Add Step
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Shared Pipelines panel ───────────────────────────────────────────────────

function SharedPipelinesPanel() {
  const sharedPipelines    = useCanvasStore((s) => s.page?.sharedPipelines ?? []);
  const updateSharedPipelines = useCanvasStore((s) => s.updateSharedPipelines);
  const variables          = useCanvasStore((s) => s.page?.variables ?? []);
  const [collapsed, setCollapsed] = useState(true);
  const [newName, setNewName] = useState('');

  const varList = variables.map((v) => ({ id: v.id, name: v.name }));

  const addSharedPipeline = () => {
    const name = newName.trim() || `Pipeline ${sharedPipelines.length + 1}`;
    const newP: SharedPipeline = {
      id:       crypto.randomUUID(),
      name,
      trigger:  'click',
      steps:    [],
      runAsync: false,
    };
    updateSharedPipelines([...sharedPipelines, newP]);
    setNewName('');
  };

  const updateSharedPipeline = (id: string, updates: Partial<SharedPipeline>) => {
    updateSharedPipelines(
      sharedPipelines.map((p) => p.id === id ? { ...p, ...updates } : p),
    );
  };

  const deleteSharedPipeline = (id: string) => {
    updateSharedPipelines(sharedPipelines.filter((p) => p.id !== id));
  };

  return (
    <div style={{
      marginTop: 8,
      border: '1px solid rgba(16,183,127,0.15)',
      borderRadius: 6,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, width: '100%',
          background: 'rgba(16,183,127,0.05)', border: 'none',
          padding: '6px 10px', cursor: 'pointer',
        }}
      >
        <Share2 size={10} strokeWidth={1.5} style={{ color: '#10b77f' }} />
        <span style={{ fontSize: 10, color: '#10b77f', fontWeight: 600 }}>
          Shared Pipelines ({sharedPipelines.length})
        </span>
        {collapsed ? <ChevronRight size={10} style={{ marginLeft: 'auto', color: '#4a5f4e' }} />
                   : <ChevronDown  size={10} style={{ marginLeft: 'auto', color: '#4a5f4e' }} />}
      </button>

      {!collapsed && (
        <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <p style={{ fontSize: 9, color: '#4a5f4e', margin: 0 }}>
            Page-level reusable pipelines. Reference them from multiple nodes.
          </p>

          {sharedPipelines.map((sp) => (
            <PipelineCard
              key={sp.id}
              pipeline={sp}
              variables={varList}
              onChange={(updates) => updateSharedPipeline(sp.id, { ...updates })}
              onDelete={() => deleteSharedPipeline(sp.id)}
            />
          ))}

          {/* Add new shared pipeline */}
          <div style={{ display: 'flex', gap: 4 }}>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Pipeline name…"
              style={{ ...inputStyle, flex: 1 }}
              onKeyDown={(e) => { if (e.key === 'Enter') addSharedPipeline(); }}
            />
            <button
              onClick={addSharedPipeline}
              style={{
                background: 'rgba(16,183,127,0.10)', border: '1px solid rgba(16,183,127,0.20)',
                borderRadius: 4, color: '#10b77f', fontSize: 10, padding: '3px 8px', cursor: 'pointer',
              }}
            >
              <Plus size={10} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ActionsPipelineEditorProps {
  nodeId: string;
}

export function ActionsPipelineEditor({ nodeId }: ActionsPipelineEditorProps) {
  const node            = useCanvasStore((s) => s.page?.nodeMap?.[nodeId]);
  const updateNodeActions = useCanvasStore((s) => s.updateNodeActions);
  const variables       = useCanvasStore((s) => s.page?.variables ?? []);

  const pipelines = node?.actions ?? [];

  const addPipeline = () => {
    const newPipeline: ActionPipeline = {
      id:       crypto.randomUUID(),
      trigger:  'click',
      steps:    [],
      runAsync: false,
    };
    updateNodeActions(nodeId, [...pipelines, newPipeline]);
  };

  const updatePipeline = (id: string, updates: Partial<ActionPipeline>) => {
    updateNodeActions(
      nodeId,
      pipelines.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    );
  };

  const deletePipeline = (id: string) => {
    updateNodeActions(nodeId, pipelines.filter((p) => p.id !== id));
  };

  const varList = variables.map((v) => ({ id: v.id, name: v.name }));

  return (
    <div style={{ padding: '8px 10px' }}>
      {pipelines.length === 0 ? (
        <p style={{ fontSize: 11, color: '#4a5f4e', textAlign: 'center', padding: '16px 0' }}>
          No action pipelines. Add one to make this widget interactive.
        </p>
      ) : (
        pipelines.map((p) => (
          <PipelineCard
            key={p.id}
            pipeline={p}
            variables={varList}
            onChange={(updates) => updatePipeline(p.id, updates)}
            onDelete={() => deletePipeline(p.id)}
          />
        ))
      )}

      <button
        onClick={addPipeline}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          width: '100%', padding: '6px 0',
          background: 'rgba(16,183,127,0.08)',
          border: '1px solid rgba(16,183,127,0.20)',
          borderRadius: 5, color: '#10b77f', fontSize: 11, cursor: 'pointer',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(16,183,127,0.15)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(16,183,127,0.08)'; }}
      >
        <Plus size={11} strokeWidth={1.5} />
        Add Pipeline
      </button>

      {/* Shared Pipelines section */}
      <SharedPipelinesPanel />
    </div>
  );
}
