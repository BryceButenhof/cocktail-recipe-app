import jwt from 'jsonwebtoken';
import 'dotenv/config';

const secretKey = process.env.SECRET_KEY;

const auth = (req, res, next) => {
    try {
        // GET requests without authorization header are allowed
        // But content will be filtered in the controller
        if (!req.headers.authorization && req.method === 'GET') {
            return next();
        }
        const token = req.headers.authorization.split(' ')[1];
        const decodedToken = jwt.verify(token, secretKey);
        req.user = { _id: decodedToken._id, id: decodedToken.id, role: decodedToken.role };
        return next();
    } catch (error) {
        return res.status(401).json({ error: 'Authentication failed' });
    }
};

export { auth as AuthMiddleware };