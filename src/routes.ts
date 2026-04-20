import { Router } from 'express';
import packageJson from '../package.json' with { type: 'json' };
import { AuthController } from './controllers/auth.controller.js';
import { FocusTimeController } from './controllers/focusTime.controller.js';
import { HabitsController } from './controllers/habits.controller.js';
import { authMiddleware } from './middlewares/auth.middleware.js';

export const routes = Router();

const habitsController = new HabitsController();
const focusTimeController = new FocusTimeController();
const authController = new AuthController();

// biome-ignore lint/correctness/noUnusedFunctionParameters: req is provided by Express
routes.get('/', (req, res) => {
  const { name, description, version } = packageJson;

  return res.status(200).json({ name, description, version });
});

routes.get('/auth', authController.auth);
routes.get('/auth/callback', authController.authCallback);

routes.use(authMiddleware);

routes.post('/habits', habitsController.store);
routes.get('/habits', habitsController.index);
routes.get('/habits/:id/metrics', habitsController.metrics);
routes.delete('/habits/:id', habitsController.remove);
routes.patch('/habits/:id/toggle', habitsController.toggle);

routes.post('/focus-time', focusTimeController.store);
routes.get('/focus-time', focusTimeController.index);
routes.get('/focus-time/metrics', focusTimeController.metricsByMonth);
