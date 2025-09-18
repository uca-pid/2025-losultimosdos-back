import { Router } from 'express';
import checkUserRole from '../../middleware/user.js';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.use(checkUserRole);

router.get('/', (req, res) => {
    res.json({ message: 'User dashboard' });
});

router.post('/enroll', async (req, res) => {
    const { classId } = req.body;
    const { userId } = req.auth;

    if (!classId) {
        return res.status(400).json({ error: 'classId is required' });
    }

    try {
        const gymClass = await prisma.class.findUnique({ where: { id: classId } });
        if (!gymClass) {
            return res.status(404).json({ error: 'Class not found' });
        }
        if (gymClass.users.includes(userId)) {
            return res.status(400).json({ error: 'Already enrolled in this class' });
        }
        const updatedClass = await prisma.class.update({
            where: { id: classId },
            data: {
                enrolled: { increment: 1 },
                users: { push: userId }
            }
        });

        res.json({ message: 'Enrolled successfully', class: updatedClass });
    } catch (error) {
        res.status(500).json({ error: 'Enrollment failed', details: error.message });
    }
});


router.post('/unenroll', async (req, res) => {
    const { classId } = req.body;
    const { userId } = req.auth;

    if (!classId) {
        return res.status(400).json({ error: 'classId is required' });
    }

    const gymClass = await prisma.class.findUnique({ where: { id: classId } });
    if (!gymClass) {
        return res.status(404).json({ error: 'Class not found' });
    }

    const newUsers = gymClass.users.filter(user => user !== userId);


    const updatedClass = await prisma.class.update({
        where: { id: classId },
        data: { users: newUsers, enrolled: { decrement: 1 } }
    });

    res.json({ message: 'Unenrolled successfully', class: updatedClass });

});


router.get('/my-classes', async (req, res) => {
    const { userId } = req.auth;
    try {
        const classes = await prisma.class.findMany({
            where: {
                users: { has: userId }
            }
        });
        res.json({ classes });
    } catch (error) {
        res.status(500).json({ error: 'Could not fetch enrolled classes' });
    }
});

// Add more user routes here
// Example:
// router.get('/profile', (req, res) => {
//   // Handle user profile
// });

export default router;
