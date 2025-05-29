import jwt from 'jsonwebtoken';
import 'dotenv/config';

const secretKey = process.env.SECRET_KEY;

const auth = (req, res, next) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        const decodedToken = jwt.verify(token, secretKey);
        req.user = { _id: decodedToken._id, id: decodedToken.id, role: decodedToken.role };
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Authentication failed' });
    }
};

export { auth as AuthMiddleware };