import { jobHandlers } from './jobs';
import { webhookHandlers } from './webhooks';
import { teamHandlers } from './team';
import { settingsHandlers } from './settings';

export const handlers = [
  ...jobHandlers,
  ...webhookHandlers,
  ...teamHandlers,
  ...settingsHandlers,
];
