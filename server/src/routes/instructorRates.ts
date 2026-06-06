import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorizeRoles } from '../middleware/authorize';
import {
  getRates,
  getRateByInstructor,
  createRate,
  updateRate,
  deleteRate,
} from '../controllers/instructorRateController';

const router = Router();

// Anyone authenticated can view rates
router.get('/',                   authenticate, getRates);
router.get('/:instructorId',      authenticate, getRateByInstructor);

// Only Admin/Staff can create, update, or delete rates
router.post('/',                  authenticate, authorizeRoles('ADMIN', 'STAFF'), createRate);
router.put('/:instructorId',      authenticate, authorizeRoles('ADMIN', 'STAFF'), updateRate);
router.delete('/:instructorId',   authenticate, authorizeRoles('ADMIN', 'STAFF'), deleteRate);

export default router;
