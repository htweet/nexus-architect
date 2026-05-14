/**
 * Action Node Engine — types for the visual event/action pipeline system.
 *
 * ActionPipeline: a trigger (click/submit/etc.) + ordered list of ActionSteps.
 * ActionStep: a single operation (setVariable, webhookCall, navigate, etc.)
 *
 * Pipelines live on NexusNode.actions[] and are executed by action-engine.ts.
 */

export type ActionTrigger = 'click' | 'submit' | 'change' | 'focus' | 'blur' | 'load';

export type ActionStepType =
  | 'setVariable'
  | 'webhookCall'
  | 'navigate'
  | 'showModal'
  | 'showInstallPrompt'
  | 'customJS';

export interface ActionStep {
  id: string;
  type: ActionStepType;
  label?: string;

  // -- setVariable ---------------------------------------------------------
  variableId?: string;
  setValue?: unknown;

  // -- webhookCall ---------------------------------------------------------
  url?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  payloadTemplate?: string;
  responseMapping?: Array<{ jsonPath: string; variableId: string }>;
  onError?: 'continue' | 'abort' | 'retry';
  retryCount?: number;

  // -- navigate ------------------------------------------------------------
  destination?: string;
  newTab?: boolean;

  // -- showModal -----------------------------------------------------------
  targetNodeId?: string;
  modalAction?: 'open' | 'close' | 'toggle';

  // -- customJS (premium) --------------------------------------------------
  code?: string;
}

export interface ActionPipeline {
  id: string;
  trigger: ActionTrigger;
  steps: ActionStep[];
  runAsync: boolean;
  /** Optional human-readable label shown in the pipeline card header */
  label?: string;
}

/** A reusable named pipeline stored at page level, referenced by nodes. */
export interface SharedPipeline extends ActionPipeline {
  /** Display name for the shared pipeline selector */
  name: string;
}
