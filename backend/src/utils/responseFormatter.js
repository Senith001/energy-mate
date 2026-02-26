// src/utils/responseFormatter.js

export const success = (
  res,
  data,
  message = "Success",
  statusCode = 200,
  meta = null
) => {
  const payload = {
    success: true,
    message,
    data,
  };

  if (meta) payload.meta = meta;

  return res.status(statusCode).json(payload);
};

export const error = (
  res,
  message = "Internal Server Error",
  statusCode = 500,
  err = null
) => {
  return res.status(statusCode).json({
    success: false,
    message,
    error: err ? (err.message || err.toString()) : null,
  });
};

const rf = { success, error };
export default rf;