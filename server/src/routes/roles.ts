import { Router } from 'express';
import { getRoles, getRoleById } from '../controllers/roleController';

const router = Router();

router.get('/', getRoles);
router.get('/:id', getRoleById);

export default router;
