import type { IOType } from 'node:child_process';
import * as childProcess from 'node:child_process';

import { getProcessEnv } from '@mio/shared/constants/environment.constants';

type ExecuteOptions = {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  stdio?: IOType | Array<IOType | number | null | undefined>;
};

class CommandError extends Error {
  stderr: string;

  constructor(message: string, stderr: string) {
    super(message);
    this.stderr = stderr;
    this.name = 'CommandError'; // Custom name for the error type
    Error.captureStackTrace(this, this.constructor);
  }
}

export async function executeProcess(cmd: string, options: ExecuteOptions = {}): Promise<void> {
  const { cwd, env, stdio } = {
    cwd: process.cwd(),
    env: getProcessEnv(),
    stdio: [0, 1, 2],
    ...options
  };
  await exec(cmd, { shell: true, cwd, env, stdio });
}

export async function executeProcessAndReturn(cmd: string, options: ExecuteOptions = {}): Promise<string> {
  const { cwd, env, stdio } = {
    cwd: process.cwd(),
    env: getProcessEnv(),
    stdio: [],
    ...options
  };
  return exec(cmd, { shell: true, cwd, env, stdio });
}

async function exec(cmd: string, options: childProcess.SpawnOptions = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    let output = '';
    let stderr = '';

    // With `shell: true`, pass the full command string (keeps quoting intact).
    const proc = childProcess.spawn(cmd, { ...options, shell: true });

    proc.stdout?.on('data', (data: Buffer) => {
      output += data.toString();
    });

    proc.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString();
      output += data.toString();
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        const error = new CommandError(`Command '${cmd}' failed with code ${code}`, stderr);
        reject(error);
        return;
      }
      resolve(output);
    });
  });
}
