import { RsdoctorSDKController } from '../sdk';

export interface RsdoctorBuildSessionOptions {
  multiCompiler: {
    enabled: boolean;
    group?: string;
  };
  output: {
    mode: string;
    reportDir: string;
  };
  server: {
    port?: number;
  };
}

interface PendingSession {
  controller: RsdoctorSDKController;
  timer: ReturnType<typeof setTimeout>;
}

const pendingSessions = new Map<string, PendingSession>();

function getSessionKey(options: RsdoctorBuildSessionOptions): string {
  const root = process.cwd();
  const { group } = options.multiCompiler;

  if (group) {
    return ['group', root, group].join('\0');
  }

  return [
    'auto',
    root,
    options.output.mode,
    options.output.reportDir,
    options.server.port ?? '',
  ].join('\0');
}

export interface RsdoctorBuildSessionLease {
  controller: RsdoctorSDKController;
  release(): void;
}

export function acquireBuildSession(
  options: RsdoctorBuildSessionOptions,
): RsdoctorBuildSessionLease {
  if (!options.multiCompiler.enabled) {
    return {
      controller: new RsdoctorSDKController(),
      release() {},
    };
  }

  const key = getSessionKey(options);
  let session = pendingSessions.get(key);

  if (!session) {
    const controller = new RsdoctorSDKController();
    const timer = setTimeout(() => {
      if (pendingSessions.get(key)?.controller === controller) {
        pendingSessions.delete(key);
      }
    }, 0);
    timer.unref?.();
    session = { controller, timer };
    pendingSessions.set(key, session);
  }

  const { controller } = session;
  return {
    controller,
    release() {
      const current = pendingSessions.get(key);
      if (current?.controller === controller) {
        clearTimeout(current.timer);
        pendingSessions.delete(key);
      }
    },
  };
}
