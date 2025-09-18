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

    const dateTime = new Date(`${date}`);

    const { userId } = req.auth;
    const newClass = await prisma.class.create({
        data: { name, description, date: dateTime, time, capacity, createdById: userId }
    });
    res.json({ message: 'Class created successfully', class: newClass });
});


router.put('/class/:id', async (req, res) => {
    const { id } = req.params;
    const { name, description, date, time, capacity } = req.body;
    if (!id) {
        return res.status(400).json({ error: 'id is required' });
    }
    if (!name || !description || !date || !time || !capacity) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    const numberId = parseInt(id);
    const gymClass = await prisma.class.findUnique({ where: { id: numberId } });
    if (!gymClass) {
        return res.status(404).json({ error: 'Class not found' });
    }
    const dateTime = new Date(`${date}`);
    const updatedClass = await prisma.class.update({
        where: { id: numberId },
        data: { name, description, date: dateTime, time, capacity }
    });
    res.json({ message: 'Class updated successfully', class: updatedClass });
});



router.delete('/class/:id', async (req, res) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({ error: 'id is required' });
    }
    const numberId = parseInt(id);
    const gymClass = await prisma.class.findUnique({ where: { id: numberId } });
    if (!gymClass) {
        return res.status(404).json({ error: 'Class not found' });
    }


    await prisma.class.delete({ where: { id: numberId } });
    res.json({ message: 'Class deleted successfully' });
});



export default router;
