import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { ZodError } from 'zod';
import { connect } from './db.js';
import routes from './routes.js';

if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required');

const DEFAULT_CLIENTS = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://0.0.0.0:5173', 'http://[::1]:5173'];
const CLIENT_ORIGINS = Array.from(new Set([
  ...(process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',').map((v) => v.trim()).filter(Boolean) : []),
  ...DEFAULT_CLIENTS,
]));
const isAllowedOrigin = (origin) => !!origin && CLIENT_ORIGINS.some((allowed) => allowed.replace(/\/$/, '') === origin.replace(/\/$/, ''));
const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || isAllowedOrigin(origin)) return callback(null, true);
    callback(null, false);
  },
  credentials: true,
}));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

app.use((req, res, next) => {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !isAllowedOrigin(req.headers.origin)) {
    return res.status(403).json({ error: 'Blocked origin' });
  }
  next();
});

app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/api', routes);

app.use((err, req, res, next) => {
  if (err instanceof ZodError) return res.status(400).json({ error: err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') });
  if (err.status) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

await connect();
console.log('MongoDB connected');
app.listen(process.env.PORT || 4000, () => console.log('API running on port', process.env.PORT || 4000));
