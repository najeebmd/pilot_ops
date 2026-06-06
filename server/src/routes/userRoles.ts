import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorizeRoles } from '../middleware/authorize';
import {
  getUserRoles,
  assignUserRole,
  removeUserRole,
} from '../controllers/userRoleController';

// Mounted under /api/users/:userId/roles
const router = Router({ mergeParams: true });

router.use(authenticate, authorizeRoles('ADMIN', 'STAFF'));

router.get('/',           getUserRoles);
router.post('/',          assignUserRole);
router.delete('/:roleId', removeUserRole);

export default router;
