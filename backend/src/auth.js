import jwt from 'jsonwebtoken';
const prod = process.env.NODE_ENV === 'production';

const cookieOpts = {
  httpOnly: true,
  secure: true,
  sameSite: 'none',
  maxAge: 7 * 24 * 3600 * 1000,
};

export function signIn(res, user) {
  const token = jwt.sign({ id: String(user._id), name: user.name }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.cookie('token', token, cookieOpts);
  return token;
}

export function requireAuth(req, res, next) {
  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Please sign in as an owner' });
  }
}
