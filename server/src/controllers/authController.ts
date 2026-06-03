import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../lib/prisma';
import { signToken } from '../lib/jwt';

export async function login(req: Request, res: Response) {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ message: 'username and password are required' });
    return;
  }

  const login = await prisma.userLogin.findUnique({
    where: { username },
    include: {
      user: true,
    },
  });

  if (!login || !(await bcrypt.compare(password, login.password))) {
    res.status(401).json({ message: 'Invalid username or password' });
    return;
  }

  const roles = await prisma.userRole.findMany({
    where: { user_id: login.user_id },
    include: { role: true },
  });

  const token = signToken({ userId: login.user_id, username: login.username });

  res.json({
    token,
    user: {
      id:         login.user.id,
      first_name: login.user.first_name,
      last_name:  login.user.last_name,
      email:      login.user.email,
      username:   login.username,
      roles:      roles.map((r) => r.role.name),
    },
  });
}

export async function register(req: Request, res: Response) {
  const { first_name, last_name, email, username, password } = req.body;

  if (!first_name || !last_name || !email || !username || !password) {
    res.status(400).json({ message: 'first_name, last_name, email, username and password are required' });
    return;
  }

  const emailTaken = await prisma.user.findUnique({ where: { email } });
  if (emailTaken) {
    res.status(409).json({ message: 'Email is already registered' });
    return;
  }

  const usernameTaken = await prisma.userLogin.findUnique({ where: { username } });
  if (usernameTaken) {
    res.status(409).json({ message: 'Username is already taken' });
    return;
  }

  const hashed = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      first_name,
      last_name,
      email,
      login: {
        create: { username, password: hashed },
      },
    },
  });

  // Assign STUDENT role by default
  const studentRole = await prisma.role.findUnique({ where: { name: 'STUDENT' } });
  if (studentRole) {
    await prisma.userRole.create({ data: { user_id: user.id, role_id: studentRole.id } });
  }

  const token = signToken({ userId: user.id, username });

  res.status(201).json({
    token,
    user: {
      id:         user.id,
      first_name: user.first_name,
      last_name:  user.last_name,
      email:      user.email,
      username,
      roles:      ['STUDENT'],
    },
  });
}
