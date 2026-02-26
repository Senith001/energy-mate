export const getReqUserId = (req) => {
  // supports different auth middleware styles
  return req.user?.id || req.user?._id || req.user?.userId;
};

export const isAdmin = (req) => req.user?.role === "admin";