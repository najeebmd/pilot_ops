import { Router } from 'express';
import {
  getUserRoles,
  assignUserRole,
  removeUserRole,
} from '../controllers/userRoleController';

// Mounted under /api/users/:userId/roles
const router = Router({ mergeParams: true });

router.get('/',           getUserRoles);
router.post('/',          assignUserRole);
router.delete('/:roleId', removeUserRole);

export default router;
