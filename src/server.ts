import cors from 'cors';
import express from 'express';
import { setupMongo } from './database/index.js';
import { routes } from './routes.js';

setupMongo()
  .then(() => {
    const port = Number(process.env.PORT) || 4000;
    const app = express();
    app.use(express.json());
    app.use(
      cors({
        origin: process.env.CORS_ORIGIN,
      }),
    );
    app.use(routes);

    app.listen(port, () => {
      console.log(`🚀 Server is running at port ${port}!`);
    });
  })
  .catch((err) => {
    console.error(err.message);
  });
