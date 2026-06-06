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
import profileRouter   from './routes/profile';
import usersRouter     from './routes/users';
import rolesRouter     from './routes/roles';
import userLoginsRouter from './routes/userLogins';
import userRolesRouter            from './routes/userRoles';
import instructorScheduleRouter   from './routes/instructorSchedule';
import aircraftRouter             from './routes/aircraft';
import instructorRatesRouter      from './routes/instructorRates';
import reservationsRouter         from './routes/reservations';
import aircraftScheduleRouter     from './routes/aircraftSchedule';

app.use('/api/auth',                      authRouter);
app.use('/api/profile',                   profileRouter);
app.use('/api/users',                     usersRouter);
app.use('/api/roles',                     rolesRouter);
app.use('/api/users/:userId/login',       userLoginsRouter);
app.use('/api/users/:userId/roles',       userRolesRouter);
app.use('/api/instructor-schedule',       instructorScheduleRouter);
app.use('/api/aircraft',                  aircraftRouter);
app.use('/api/instructor-rates',          instructorRatesRouter);
app.use('/api/reservations',              reservationsRouter);
app.use('/api/aircraft-schedule',         aircraftScheduleRouter);

export default app;
