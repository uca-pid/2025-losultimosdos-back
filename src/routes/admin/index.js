import { Router } from 'express';
import checkAdminRole from '../../middleware/admin.js';
import { prisma } from '../../../prisma';

const router = Router();

router.use(checkAdminRole);

router.get('/', (req, res) => {
    res.json({ message: 'Admin dashboard' });
});

router.post('/create-class', async (req, res) => {
    const { name, description, hour, capacity } = req.body;
    const { userId } = req.auth;
    const newClass = await prisma.class.create({
        data: { name, description, hour, capacity, createdById: userId }
    });
    res.json({ message: 'Class created successfully', class: newClass });
});



export default router;
