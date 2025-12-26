CREATE DATABASE IF NOT EXISTS hydrant_system;
USE hydrant_system;

CREATE TABLE IF NOT EXISTS history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  action ENUM('create', 'update', 'delete') NOT NULL,
  previous_event_id INT,
  hydrant VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL,
  inspection_date DATE,
  defects VARCHAR(255),
  checked_by VARCHAR(255)
);

INSERT INTO history (action, hydrant, location, inspection_date, defects, checked_by) VALUES
('create', 'Hydrant A1', 'Sector 5', '2025-09-01', 'Leakage', 'Ravi Kumar'),
('create', 'Hydrant B2', 'Main Street', '2025-08-25', NULL, 'Sunil Sharma'),
('create', 'Hydrant C3', 'Industrial Area', '2025-08-15', 'Low Pressure', 'Amit Singh'),
('create', 'Hydrant D4', 'City Center', '2025-09-10', NULL, 'Priya Verma'),
('create', 'Hydrant E5', 'Highway 21', '2025-09-05', 'Rust', 'Anjali Mehta');

CREATE TABLE IF NOT EXISTS hydrants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  history_id INT NOT NULL,
  hydrant VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL,
  inspection_date DATE,
  defects VARCHAR(255),
  checked_by VARCHAR(255),
  FOREIGN KEY (history_id) REFERENCES history(id) ON DELETE CASCADE
);

INSERT INTO hydrants (history_id, hydrant, location, inspection_date, defects, checked_by) VALUES
(1, 'Hydrant A1', 'Sector 5', '2025-09-01', 'Leakage', 'Ravi Kumar'),
(2, 'Hydrant B2', 'Main Street', '2025-08-25', NULL, 'Sunil Sharma'),
(3, 'Hydrant C3', 'Industrial Area', '2025-08-15', 'Low Pressure', 'Amit Singh'),
(4, 'Hydrant D4', 'City Center', '2025-09-10', NULL, 'Priya Verma'),
(5, 'Hydrant E5', 'Highway 21', '2025-09-05', 'Rust', 'Anjali Mehta');
