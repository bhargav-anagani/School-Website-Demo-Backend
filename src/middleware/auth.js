// ─────────────────────────────────────────────────────────────
// Auth Middleware — verify JWT from Authorization header or cookie
// ─────────────────────────────────────────────────────────────
const { verifyToken } = require('../utils/jwt');

const protect = (req, res, next) => {
  try {
    let token;

    // 1. Check Authorization header
    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // 2. Fall back to cookie
    else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authenticated. Please login.' });
    }

    const decoded = verifyToken(token);
    req.user = decoded; // { id, role, name, email }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

// ─────────────────────────────────────────────────────────────
// Role-based Authorization Middleware
// Usage: authorize('admin', 'teacher')
// ─────────────────────────────────────────────────────────────
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({
      success: false,
      message: `Access denied. Required role: ${roles.join(' or ')}.`,
    });
  }
  next();
};

module.exports = { protect, authorize };
