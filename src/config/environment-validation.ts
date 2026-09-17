import { parseDatabaseEnvironment } from "./database-environment";
import { validateStorageEnvironment } from "./storage.config";

export function validateApplicationEnvironment(
  env: Record<string, unknown>,
): Record<string, unknown> {
  validateStorageEnvironment(env);
  parseDatabaseEnvironment(env);
  return env;
}
