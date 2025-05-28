import jwt from 'jsonwebtoken';
import 'dotenv/config';

const secretKey = process.env.SECRET_KEY;

const auth = (req, res, next) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        const decodedToken = jwt.verify(token, secretKey);
        req.userData = { id: decodedToken.id, email: decodedToken.email };
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Authentication failed' });
    }
};

export { auth as AuthMiddleware };