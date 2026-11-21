-- One row per app install and month. "install" is a random id made on the device, not linked to anyone.
CREATE TABLE IF NOT EXISTS reports (
  install  TEXT    NOT NULL,
  month    TEXT    NOT NULL,   -- YYYY-MM of the trips
  sent     INTEGER NOT NULL,   -- claims sent
  paid     INTEGER NOT NULL,   -- claims paid
  rejected INTEGER NOT NULL,   -- claims rejected
  kr       REAL    NOT NULL,   -- kroner received
  updated  INTEGER NOT NULL,   -- ms since 1970, last report
  PRIMARY KEY (install, month)
);
