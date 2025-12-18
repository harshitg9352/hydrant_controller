-- seed.sql for Hydrant Controller Dashboard
CREATE DATABASE IF NOT EXISTS hydrant_system;
USE hydrant_system;

CREATE TABLE IF NOT EXISTS hydrants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  hydrant VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL,
  inspection_date DATE,
  defects VARCHAR(255),
  checked_by VARCHAR(255)
);

INSERT INTO hydrants (hydrant, location, inspection_date, defects, checked_by) VALUES
('Hydrant A1', 'Sector 5', '2025-09-01', 'Leakage', 'Ravi Kumar'),
('Hydrant B2', 'Main Street', '2025-08-25', NULL, 'Sunil Sharma'),
('Hydrant C3', 'Industrial Area', '2025-08-15', 'Low Pressure', 'Amit Singh'),
('Hydrant D4', 'City Center', '2025-09-10', NULL, 'Priya Verma'),
('Hydrant E5', 'Highway 21', '2025-09-05', 'Rust', 'Anjali Mehta');
