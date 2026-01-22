import { createApiApp } from './api.server';
import { container, initializeContainer, getInstance, IocConnection } from './ioc';
import type { Logger } from '@mio/shared/server/logger';
import { ENV_DEFAULTS, environment } from '@mio/shared/constants/environment.constants';

// Export container for use in routes/handlers
export { container };

async function main() {
    // Initialize IoC container (creates Logger asynchronously)
    await initializeContainer();

    const app = createApiApp().listen(parseInt(environment.API_PORT ?? ENV_DEFAULTS.API_PORT, 10));

    // Log server startup
    const logger = getInstance<Logger>(IocConnection.LOGGER);
    logger.info(`Mio API running at ${app.server?.hostname}:${app.server?.port}`);
    logger.info(`Swagger docs at http://${app.server?.hostname}:${app.server?.port}/swagger`);

    return app;
}

const app = main();
void app; // Start server (used for type export)

export type App = Awaited<typeof app>;
