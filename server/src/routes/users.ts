import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorizeRoles } from '../middleware/authorize';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} from '../controllers/userController';

const router = Router();

// All user-management endpoints require a valid token + Admin or Staff role
router.use(authenticate, authorizeRoles('ADMIN', 'STAFF'));

router.get('/',    getUsers);
router.get('/:id', getUserById);
router.post('/',   createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;
