import { runServer } from './server.ts';

runServer().catch((error) => {
  console.error('Fatal error running server:', error);
  process.exit(1);
});
