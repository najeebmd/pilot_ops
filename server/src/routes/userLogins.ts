import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorizeRoles } from '../middleware/authorize';
import {
  getUserLogin,
  createUserLogin,
  updateUserLogin,
  deleteUserLogin,
} from '../controllers/userLoginController';

// Mounted under /api/users/:userId/login
const router = Router({ mergeParams: true });

router.use(authenticate, authorizeRoles('ADMIN', 'STAFF'));

router.get('/',    getUserLogin);
router.post('/',   createUserLogin);
router.put('/',    updateUserLogin);
router.delete('/', deleteUserLogin);

export default router;
