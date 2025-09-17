import { clerkClient } from '@clerk/express';

const checkUserRole = async (req, res, next) => {
    if (!req.auth.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const user = await clerkClient.users.getUser(req.auth.userId);
        const userRole = user.publicMetadata.role;

        if (userRole !== 'user' && userRole !== 'admin') {
            return res.status(403).json({
                error: 'Access denied',
                message: 'This route requires user privileges'
            });
        }

        next();
    } catch (error) {
        console.error('Error checking user role:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export default checkUserRole;
