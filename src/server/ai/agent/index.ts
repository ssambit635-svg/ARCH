/**
 * ARCH Agent — the self-contained agent layer (planner, native tools, self-correction loop).
 *
 * Everything in this directory is ARCH's own code: raw-prompt chain-of-thought planning, a plain
 * dictionary of native tool functions, and a Python self-correction loop that runs generated
 * scripts in a sandboxed subprocess and feeds failures back to ARCH's native engine. There is no
 * dependency on Ollama, OpenAI, Anthropic or any other model anywhere in the path.
 */
export { PLANNER_SYSTEM_PROMPT, interceptPrompt, needsPlanning, parsePlannedOutput, stripAgentTags, type ParsedPlan } from './planner';
export {
  buildToolInstruction,
  createNativeTools,
  detectToolRequest,
  evaluateExpression,
  executeToolCall,
  parseToolCall,
  type ToolCall,
  type ToolDefinition,
  type ToolExecResult,
} from './tools';
export {
  DEFAULT_SCRIPT_TIMEOUT_MS,
  errorStringFrom,
  extractPythonCode,
  findPython,
  runPythonScript,
  withSelfCorrection,
  type CorrectionAttempt,
  type CorrectionOutcome,
  type ScriptRun,
} from './self-correct';
export { runAgentTurn, type AgentLoopOptions, type AgentModel, type AgentResult, type AgentStep } from './loop';
export { createNativeChatAgentModel, type NativeAgentContext } from './native';
export { repairScript, scriptForTask, type ScriptDraft } from './script';
