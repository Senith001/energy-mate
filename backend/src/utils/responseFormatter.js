function success(res, data = null, message = 'OK', status = 200) {
  return res.status(status).json({ success: true, message, data });
}

function error(res, message = 'Error', status = 500, details = null) {
  const payload = { success: false, message };
  if (details) payload.error = details;
  return res.status(status).json(payload);
}

export { success, error };
