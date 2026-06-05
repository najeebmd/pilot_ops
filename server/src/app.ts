import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

import authRouter      from './routes/auth';
import usersRouter     from './routes/users';
import rolesRouter     from './routes/roles';
import userLoginsRouter from './routes/userLogins';
import userRolesRouter            from './routes/userRoles';
import instructorScheduleRouter   from './routes/instructorSchedule';
import aircraftRouter             from './routes/aircraft';

app.use('/api/auth',                      authRouter);
app.use('/api/users',                     usersRouter);
app.use('/api/roles',                     rolesRouter);
app.use('/api/users/:userId/login',       userLoginsRouter);
app.use('/api/users/:userId/roles',       userRolesRouter);
app.use('/api/instructor-schedule',       instructorScheduleRouter);
app.use('/api/aircraft',                  aircraftRouter);

export default app;
