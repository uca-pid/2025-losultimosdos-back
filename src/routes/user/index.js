import { Router } from 'express';
import checkUserRole from '../../middleware/user.js';

const router = Router();

router.use(checkUserRole);

router.get('/', (req, res) => {
    res.json({ message: 'User dashboard' });
});

// Add more user routes here
// Example:
// router.get('/profile', (req, res) => {
//   // Handle user profile
// });

export default router;
