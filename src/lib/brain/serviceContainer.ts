/**
 * Smarkin OS — Service Container
 *
 * Honest scope note: for Phase 1's six stateless, pure-function services,
 * a full DI container's real value (scoped/singleton lifecycles, lazy
 * construction) isn't exercised. What IS real and load-bearing now:
 * registration validation and cycle detection — cheap to build correctly
 * today, before either is ever actually needed, which is exactly when
 * they're cheapest to get right.
 */
import { SmarkinService } from "./smarkinService";

const services = new Map<string, SmarkinService>();

export function registerService(service: SmarkinService): void {
  if (!service.serviceId || !service.serviceType || !service.version) {
    throw new Error(`Malformed service registration — serviceId, serviceType, and version are all required. Got: ${JSON.stringify(service)}`);
  }
  if (services.has(service.serviceId)) {
    throw new Error(`Service "${service.serviceId}" is already registered — duplicate registration is not allowed.`);
  }
  // Register first, then check — this is deliberate: detectCycle needs the
  // new service present in the map to correctly find a path back to it,
  // since a cycle through the not-yet-registered service is exactly what a
  // lookup-based walk would otherwise silently miss (the bug caught by
  // audit_container.ts's cycle test). Roll back on detection.
  services.set(service.serviceId, service);
  try {
    detectCycleFrom(service.serviceId, service.serviceId, new Set());
  } catch (err) {
    services.delete(service.serviceId);
    throw err;
  }
}

function detectCycleFrom(startId: string, currentId: string, visited: Set<string>): void {
  if (visited.has(currentId)) return; // already walked this branch, not a cycle back to start
  visited.add(currentId);
  const current = services.get(currentId);
  if (!current) return; // dependency not registered yet — not this function's concern
  for (const depId of [...current.dependsOn, ...current.optionalDependsOn]) {
    if (depId === startId) {
      throw new Error(`Circular dependency detected: "${startId}" is reachable from its own dependency "${currentId}" -> "${depId}".`);
    }
    detectCycleFrom(startId, depId, visited);
  }
}

export function resolveService(serviceId: string): SmarkinService {
  const service = services.get(serviceId);
  if (!service) {
    throw new Error(`No service registered with id "${serviceId}".`);
  }
  return service;
}

export function isServiceRegistered(serviceId: string): boolean {
  return services.has(serviceId);
}

// Test-only escape hatch — never used by production code, exists so the
// Container's cycle-detection and duplicate-registration guards can be
// tested in isolation without permanently polluting the real registry.
export function _clearRegistryForTesting(): void {
  services.clear();
}
