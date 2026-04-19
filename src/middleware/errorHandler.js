// ─────────────────────────────────────────────────────────────
// Error Handler Middleware
// ─────────────────────────────────────────────────────────────
const errorHandler = (err, req, res, next) => {
  console.error('🔴 Error:', err.message);

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

// Create a custom error
const AppError = (message, statusCode = 400) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

module.exports = { errorHandler, AppError };
