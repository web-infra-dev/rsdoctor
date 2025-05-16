import { runServer } from './server.js';

runServer().catch((error) => {
  console.error('Fatal error running server:', error);
  process.exit(1);
});
