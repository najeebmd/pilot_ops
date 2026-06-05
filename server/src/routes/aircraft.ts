import { Router } from 'express';
import {
  getAircraft,
  getAircraftById,
  createAircraft,
  updateAircraft,
  deleteAircraft,
} from '../controllers/aircraftController';

const router = Router();

router.get('/',    getAircraft);
router.get('/:id', getAircraftById);
router.post('/',   createAircraft);
router.put('/:id', updateAircraft);
router.delete('/:id', deleteAircraft);

export default router;
