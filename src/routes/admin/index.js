import { Router } from 'express';
import checkAdminRole from '../../middleware/admin.js';
import { PrismaClient } from '@prisma/client';


const router = Router();


const prisma = new PrismaClient();
router.use(checkAdminRole);

router.get('/', (req, res) => {
    res.json({ message: 'Admin dashboard' });
});

router.post('/class', async (req, res) => {
    const { name, description, date, time, capacity } = req.body;

    if (!name || !description || !date || !time || !capacity) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const dateTime = new Date(`${date}T${time}`);

    const { userId } = req.auth;
    const newClass = await prisma.class.create({
        data: { name, description, date: dateTime, time: dateTime, capacity, createdById: userId }
    });
    res.json({ message: 'Class created successfully', class: newClass });
});



export default router;
