import { Router } from 'express';
import {
  getReservations,
  getReservationById,
  createReservation,
  updateReservation,
  deleteReservation,
} from '../controllers/reservationController';

const router = Router();

router.get('/',    getReservations);
router.get('/:id', getReservationById);
router.post('/',   createReservation);
router.put('/:id', updateReservation);
router.delete('/:id', deleteReservation);

export default router;
