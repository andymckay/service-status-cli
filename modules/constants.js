export const loggingLevels = {
  info: 30, // If set to verbose, will log at this level.
  warn: 40, // Default.
  error: 50, // If set to quiet, will log at this level.
};

export const statusLevels = {
  ok: "Operational",
  partial: "Partial Outage",
  major: "Major Outage",
  maintenance: "Maintenance",
};

export const exitCodes = {
  ok: 0,
  error: 1,
  partial: 2,
  major: 3,
  maintenance: 4,
};
