import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { getProfile, updateProfile, changePassword } from '../controllers/profileController';

const router = Router();

router.use(authenticate);

router.get('/',          getProfile);
router.put('/',          updateProfile);
router.put('/password',  changePassword);

export default router;
