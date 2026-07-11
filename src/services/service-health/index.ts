/**
 * Service Resilience Framework — public API.
 *
 * Feature code imports from here; nothing outside this directory should
 * inspect raw Supabase errors or invent its own availability rules.
 */

export * from './types';
export {
  translateProviderError,
  classifyProviderError,
  isAppError,
  getCategoryDefinition,
} from './errorTranslation';
export { CircuitBreaker, type CircuitState, type CircuitBreakerOptions } from './circuitBreaker';
export { BoundedLog, type BoundedLogEntry, type BoundedLogOptions } from './boundedLog';
export {
  ServiceHealthManager,
  getServiceHealthManager,
  type ServiceProbe,
  type ServiceHealthManagerOptions,
} from './serviceHealthManager';
export {
  FEATURE_CAPABILITIES,
  getFeatureCapability,
  getFeatureAvailability,
  isFeatureUsable,
} from './capabilities';
export {
  fetchRemoteIncident,
  parseIncidentPayload,
  type RemoteIncident,
} from './incidentStatus';
export { guardedCloudCall, type GuardedResult, type GuardedCallOptions } from './guardedCloudCall';
