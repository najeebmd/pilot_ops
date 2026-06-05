import { Router } from 'express';
import {
  getSchedules,
  getScheduleById,
  createSchedule,
  updateSchedule,
  deleteSchedule,
} from '../controllers/instructorScheduleController';

const router = Router();

router.get('/',    getSchedules);
router.get('/:id', getScheduleById);
router.post('/',   createSchedule);
router.put('/:id', updateSchedule);
router.delete('/:id', deleteSchedule);

export default router;
