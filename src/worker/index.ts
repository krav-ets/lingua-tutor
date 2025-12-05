import process from 'node:process';

import { syncAllReminders } from '#root/services/reminder.service.js';
import { sendReminder } from '#root/worker/tasks/send-reminder.js';
import { run } from 'graphile-worker';

type RunnerHandle = Awaited<ReturnType<typeof run>>;

const connectionString = process.env.DATABASE_URL!;
let runner: RunnerHandle | undefined;

async function main() {
  runner = await run({
    connectionString,
    concurrency: 5,
    noHandleSignals: false,
    taskList: {
      send_reminder: sendReminder,
    },
  });

  // Sync all active reminders with the worker on startup
  await syncAllReminders();

  const stop = async () => {
    await runner?.stop();
    process.exit(0);
  };

  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
