export interface TestRuntime {
  owner: string;
  repository: string;
  runId: string;
  projectId: string;
  runtime: string;
}
export const testPorts: Readonly<{
  api: number;
  database: number;
  shadow: number;
  frontend: number;
}>;
export function buildTestConfig(config: string, projectId: string): string;
export function createTestRuntime(repositoryRoot?: string): TestRuntime;
export function testRuntimeBase(repositoryRoot?: string): string;
export function assertTestContext(
  env?: NodeJS.ProcessEnv,
  repositoryRoot?: string,
): TestRuntime;
export function assertTestUrl(url: string): void;
export function removeTestRuntime(context: TestRuntime): void;
