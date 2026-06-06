import { Router } from 'express';
import {
  getAircraftSchedules,
  getAircraftScheduleById,
  createAircraftSchedule,
  updateAircraftSchedule,
  deleteAircraftSchedule,
} from '../controllers/aircraftScheduleController';

const router = Router();

router.get('/',    getAircraftSchedules);
router.get('/:id', getAircraftScheduleById);
router.post('/',   createAircraftSchedule);
router.put('/:id', updateAircraftSchedule);
router.delete('/:id', deleteAircraftSchedule);

export default router;
