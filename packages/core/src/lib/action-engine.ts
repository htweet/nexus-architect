/**
 * NexusActionEngine — executes ActionPipeline steps at runtime.
 *
 * Design:
 *   - In edit mode (isPreviewMode=false): only setVariable steps run.
 *     navigate, webhookCall, showModal, showInstallPrompt are no-ops to prevent side effects.
 *   - In preview/compile mode: full execution.
 *   - customJS: premium gate — opens UpgradeModal if not licensed.
 *   - webhookCall: auto-sets __loading_<stepId> variable during fetch.
 *   - _interpolatePayload: supports {{varName}}, $trigger.value, $form.fields.<name>
 *
 * Usage:
 *   actionEngine.execute(pipeline, { event, nodeProps });
 */

import type { ActionPipeline, ActionStep } from '../types/action-node.js';

// ─── JSONPath accessor (no external lib) ────────────────────────────────────

function getNestedValue(obj: unknown, path: string): unknown {
  // Supports: $.data.total, data.total, $.items[0].name
  const parts = path
    .replace(/^\$\.?/, '')
    .split(/[.[\]]/)
    .filter(Boolean);

  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

// ─── Context ─────────────────────────────────────────────────────────────────

export interface ActionContext {
  event?: Event;
  nodeProps?: Record<string, unknown>;
}

/** Extract trigger value from native event (input change, form submit, etc.) */
function extractTriggerValue(event: Event | undefined): string {
  if (!event) return '';
  const target = (event as Event & { target?: unknown }).target;
  if (target && typeof (target as HTMLInputElement).value === 'string') {
    return (target as HTMLInputElement).value;
  }
  return '';
}

/** Extract all form field values from a submit event */
function extractFormFields(event: Event | undefined): Record<string, string> {
  if (!event) return {};
  const form = (event as SubmitEvent).target as HTMLFormElement | null;
  if (!form || typeof form.elements === 'undefined') return {};
  const result: Record<string, string> = {};
  Array.from(form.elements).forEach((el) => {
    const input = el as HTMLInputElement;
    if (input.name) result[input.name] = input.value ?? '';
  });
  return result;
}

// ─── Install prompt deferred reference ───────────────────────────────────────
// The pwa.ts head script captures beforeinstallprompt on window.__nexusDeferredPrompt
// so the action engine can trigger it later on user interaction.

declare global {
  interface Window {
    __nexusDeferredPrompt?: { prompt: () => void; userChoice: Promise<{ outcome: string }> };
  }
}

// ─── Engine class ─────────────────────────────────────────────────────────────

class NexusActionEngine {
  async execute(pipeline: ActionPipeline, ctx: ActionContext = {}): Promise<void> {
    // Check edit mode — lazy import to avoid circular dependency
    const { useUIStore } = await import('../store/ui.store.js');
    const isPreviewMode = useUIStore.getState().isPreviewMode;

    if (pipeline.runAsync) {
      this._runPipeline(pipeline, ctx, isPreviewMode).catch(console.error);
    } else {
      await this._runPipeline(pipeline, ctx, isPreviewMode);
    }
  }

  private async _runPipeline(
    pipeline: ActionPipeline,
    ctx: ActionContext,
    isPreviewMode: boolean,
  ): Promise<void> {
    for (const step of pipeline.steps) {
      const shouldAbort = await this._executeStep(step, ctx, isPreviewMode);
      if (shouldAbort) break;
    }
  }

  /** Returns true if execution should abort. */
  private async _executeStep(
    step: ActionStep,
    ctx: ActionContext,
    isPreviewMode: boolean,
  ): Promise<boolean> {
    const { useDataBindStore } = await import('../store/dataBind.store.js');
    const { useUIStore } = await import('../store/ui.store.js');

    switch (step.type) {
      case 'setVariable': {
        if (step.variableId) {
          useDataBindStore.getState().setVariable(step.variableId, step.setValue);
        }
        return false;
      }

      case 'navigate': {
        // No-op in edit mode
        if (!isPreviewMode) return false;
        if (!step.destination) return false;
        if (step.newTab) {
          window.open(step.destination, '_blank', 'noopener,noreferrer');
        } else {
          window.location.href = step.destination;
        }
        return false;
      }

      case 'showModal': {
        // No-op in edit mode
        if (!isPreviewMode) return false;
        if (!step.targetNodeId) return false;
        useUIStore.getState().toggleModalNode(step.targetNodeId, step.modalAction ?? 'toggle');
        return false;
      }

      case 'showInstallPrompt': {
        // No-op in edit mode
        if (!isPreviewMode) return false;
        const deferred = window.__nexusDeferredPrompt;
        if (!deferred) {
          console.warn('[NexusActionEngine] showInstallPrompt: no deferred beforeinstallprompt event captured yet.');
          return false;
        }
        deferred.prompt();
        deferred.userChoice
          .then(({ outcome }) => {
            console.info('[NexusActionEngine] PWA install prompt outcome:', outcome);
          })
          .catch(() => {})
          .finally(() => {
            // Clear after use — can only be shown once
            delete window.__nexusDeferredPrompt;
          });
        return false;
      }

      case 'webhookCall': {
        // No-op in edit mode
        if (!isPreviewMode) return false;
        if (!step.url) return false;

        const loadingKey = `__loading_${step.id}`;
        useDataBindStore.getState().setSystemVariable(loadingKey, true);

        try {
          const body = step.payloadTemplate
            ? this._interpolatePayload(step.payloadTemplate, useDataBindStore.getState().values, ctx)
            : undefined;

          const response = await this._fetchWithRetry(step, body ?? null);

          if (!response.ok) {
            if (step.onError === 'abort') {
              useDataBindStore.getState().setSystemVariable(loadingKey, false);
              return true;
            }
          } else {
            const data = await response.json().catch(() => null);
            if (data && step.responseMapping) {
              for (const mapping of step.responseMapping) {
                const value = getNestedValue(data, mapping.jsonPath);
                useDataBindStore.getState().setVariable(mapping.variableId, value);
              }
            }
          }
        } catch {
          if (step.onError === 'abort') {
            useDataBindStore.getState().setSystemVariable(loadingKey, false);
            return true;
          }
        } finally {
          useDataBindStore.getState().setSystemVariable(loadingKey, false);
        }
        return false;
      }

      case 'customJS': {
        // Premium feature guard — open upgrade modal instead of silent warn
        if (!isPreviewMode) return false;
        if (!step.code) return false;

        const isPremium = this._isPremiumEnabled('customJS');
        if (!isPremium) {
          useUIStore.getState().openUpgradeModal('customJS');
          return false;
        }

        try {
          // eslint-disable-next-line no-new-func
          const fn = new Function('store', 'ctx', step.code);
          const { useDataBindStore: dbs } = await import('../store/dataBind.store.js');
          fn(dbs.getState(), ctx);
        } catch (err) {
          console.error('[NexusActionEngine] customJS error:', err);
        }
        return false;
      }

      default:
        return false;
    }
  }

  private async _fetchWithRetry(step: ActionStep, body: string | null): Promise<Response> {
    const maxAttempts = (step.retryCount ?? 0) + 1;
    let lastError: unknown;

    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(step.url!, {
          method: step.method ?? 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(step.headers ?? {}),
          },
          ...(body !== null ? { body } : {}),
        });
        return response;
      } catch (err) {
        lastError = err;
        if (i < maxAttempts - 1) {
          await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
        }
      }
    }

    throw lastError;
  }

  /**
   * Interpolate a payload template string.
   *
   * Supported placeholders:
   *   {{variableId}}         — dataBind store variable value
   *   $trigger.value         — value of the input/select that fired the event
   *   $form.fields.<name>    — named field from a parent <form> submit event
   */
  private _interpolatePayload(
    template: string,
    values: Record<string, unknown>,
    ctx: ActionContext,
  ): string {
    const triggerValue = extractTriggerValue(ctx.event);
    const formFields   = extractFormFields(ctx.event);

    return template
      // Literal $trigger.value
      .replace(/\$trigger\.value/g, triggerValue)
      // $form.fields.<fieldName>
      .replace(/\$form\.fields\.(\w+)/g, (_, fieldName: string) => formFields[fieldName] ?? '')
      // {{variableId}} from data-bind store
      .replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
        const val = values[key];
        return val !== undefined ? String(val) : '';
      });
  }

  private _isPremiumEnabled(_feature: string): boolean {
    // TODO: wire to addon/license store in Phase 12
    return false;
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

export const actionEngine = new NexusActionEngine();
