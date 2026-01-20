import { createApiApp } from './api.server';
import { container } from './ioc';
import { IocInfrastructure } from './ioc/ioc.types';
import type { Logger } from '@mio/shared/server/logger';
import { ENV_DEFAULTS, environment } from '@mio/shared/constants/environment.constants';

// Export container for use in routes/handlers
export { container };

const app = createApiApp().listen(parseInt(environment.API_PORT ?? ENV_DEFAULTS.API_PORT, 10));

// Log server startup
const logger = container.get<Logger>(IocInfrastructure.LOGGER);
logger.info(`Mio API running at ${app.server?.hostname}:${app.server?.port}`);
logger.info(`Swagger docs at http://${app.server?.hostname}:${app.server?.port}/swagger`);

export type App = typeof app;
