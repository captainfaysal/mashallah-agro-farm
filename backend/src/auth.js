import jwt from 'jsonwebtoken';
const prod = process.env.NODE_ENV === 'production';

export function signIn(res, user) {
  const token = jwt.sign({ id: user.id, name: user.name }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.cookie('token', token, {
    httpOnly: true,
    secure: prod,
    sameSite: prod ? 'none' : 'lax', // Vercel and Render are different sites
    maxAge: 7 * 24 * 3600 * 1000,
  });
}

export function requireAuth(req, res, next) {
  try {
    req.user = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Please sign in as an owner' });
  }
}
