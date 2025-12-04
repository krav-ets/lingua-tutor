import process from 'node:process';
import { makeWorkerUtils } from 'graphile-worker';

type WorkerUtils = Awaited<ReturnType<typeof makeWorkerUtils>>;

let singleton: Promise<WorkerUtils> | null = null;

export function getWorkerUtils(): Promise<WorkerUtils> {
  if (!singleton) {
    const connectionString = process.env.DATABASE_URL!;
    singleton = (async () => {
      const wu = await makeWorkerUtils({ connectionString });
      await wu.migrate(); // ensure graphile_worker schema is ready
      return wu;
    })();
  }
  return singleton;
}
