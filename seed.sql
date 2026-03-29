-- Seed Data for permian-pulse-water

-- 20 Permian Basin Formations
INSERT INTO formations (formation_name, geological_age, typical_depth_range_ft) VALUES
  ('Spraberry', 'Permian', '6500-8000');
INSERT INTO formations (formation_name, geological_age, typical_depth_range_ft) VALUES
  ('Dean', 'Permian', '7500-8500');
INSERT INTO formations (formation_name, geological_age, typical_depth_range_ft) VALUES
  ('Wolfcamp A', 'Permian', '8000-9500');
INSERT INTO formations (formation_name, geological_age, typical_depth_range_ft) VALUES
  ('Wolfcamp B', 'Permian', '9000-10500');
INSERT INTO formations (formation_name, geological_age, typical_depth_range_ft) VALUES
  ('Wolfcamp C', 'Permian', '10000-11000');
INSERT INTO formations (formation_name, geological_age, typical_depth_range_ft) VALUES
  ('Wolfcamp D', 'Permian', '10500-12000');
INSERT INTO formations (formation_name, geological_age, typical_depth_range_ft) VALUES
  ('Bone Spring 1', 'Permian', '8500-10000');
INSERT INTO formations (formation_name, geological_age, typical_depth_range_ft) VALUES
  ('Bone Spring 2', 'Permian', '9500-11000');
INSERT INTO formations (formation_name, geological_age, typical_depth_range_ft) VALUES
  ('Bone Spring 3', 'Permian', '10500-12000');
INSERT INTO formations (formation_name, geological_age, typical_depth_range_ft) VALUES
  ('Delaware', 'Permian', '4000-5500');
INSERT INTO formations (formation_name, geological_age, typical_depth_range_ft) VALUES
  ('San Andres', 'Permian', '4000-5000');
INSERT INTO formations (formation_name, geological_age, typical_depth_range_ft) VALUES
  ('Clearfork', 'Permian', '5500-7000');
INSERT INTO formations (formation_name, geological_age, typical_depth_range_ft) VALUES
  ('Glorieta', 'Permian', '4500-5500');
INSERT INTO formations (formation_name, geological_age, typical_depth_range_ft) VALUES
  ('Yeso', 'Permian', '5000-6000');
INSERT INTO formations (formation_name, geological_age, typical_depth_range_ft) VALUES
  ('Strawn', 'Pennsylvanian', '10000-12000');
INSERT INTO formations (formation_name, geological_age, typical_depth_range_ft) VALUES
  ('Ellenburger', 'Ordovician', '12000-15000');
INSERT INTO formations (formation_name, geological_age, typical_depth_range_ft) VALUES
  ('Canyon', 'Pennsylvanian', '8500-10000');
INSERT INTO formations (formation_name, geological_age, typical_depth_range_ft) VALUES
  ('Cisco', 'Pennsylvanian', '7500-9000');
INSERT INTO formations (formation_name, geological_age, typical_depth_range_ft) VALUES
  ('Avalon', 'Permian', '7000-8500');
INSERT INTO formations (formation_name, geological_age, typical_depth_range_ft) VALUES
  ('Bell Canyon', 'Permian', '3500-5000');

-- 2 Labs
INSERT INTO labs (lab_name, lab_code, city, state) VALUES
  ('DownHole SAT', 'DHSAT', 'Midland', 'TX');
INSERT INTO labs (lab_name, lab_code, city, state) VALUES
  ('Stim-Lab', 'STIMLAB', 'Duncan', 'OK');

-- Admin User
INSERT INTO users (email, display_name, role) VALUES
  ('admin@jp.echo-op.com', 'JP Admin', 'admin');
