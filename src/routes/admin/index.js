import { Router } from 'express';
import checkAdminRole from '../../middleware/admin.js';

const router = Router();

router.use(checkAdminRole);

router.get('/', (req, res) => {
    res.json({ message: 'Admin dashboard' });
});



export default router;
