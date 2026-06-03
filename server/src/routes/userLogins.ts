import { Router } from 'express';
import {
  getUserLogin,
  createUserLogin,
  updateUserLogin,
  deleteUserLogin,
} from '../controllers/userLoginController';

// Mounted under /api/users/:userId/login
const router = Router({ mergeParams: true });

router.get('/',    getUserLogin);
router.post('/',   createUserLogin);
router.put('/',    updateUserLogin);
router.delete('/', deleteUserLogin);

export default router;
