import express from 'express';
import path from 'path';
import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env.js';
import router from './routes/index.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

const app = express();

const allowedOrigins = (env.corsOrigin || '')
	.split(',')
	.map((value) => value.trim())
	.filter(Boolean);

const corsOptions = {
	origin: (origin, callback) => {
		if (!origin) {
			return callback(null, true);
		}

		if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
			return callback(null, true);
		}

		return callback(new Error('CORS origin not allowed'));
	},
	credentials: true
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/v1', router);
app.use(notFound);
app.use(errorHandler);

export default app;
