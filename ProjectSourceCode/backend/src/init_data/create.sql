CREATE TABLE balloons (
  id TEXT,
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  altitude DOUBLE PRECISION,
  timestamp TIMESTAMPTZ,
  hour_index INT,
  PRIMARY KEY (id, hour_index)
);