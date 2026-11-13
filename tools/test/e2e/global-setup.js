// Baut Testseite und dist/ und startet je einen Server. Die Adressen gehen über Umgebungsvariablen an die Tests.
const { startServer, build, targets } = require('../server');

module.exports = async () => {
  build('test');
  build('dist');
  const test = await startServer(targets.test), dist = await startServer(targets.dist);
  process.env.E2E_ORIGIN_TESTSEITE = test.origin;
  process.env.E2E_ORIGIN_DIST = dist.origin;
  return async () => { await test.close(); await dist.close(); };
};
