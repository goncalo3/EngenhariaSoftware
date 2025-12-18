-- Create database if not exists
CREATE DATABASE IF NOT EXISTS im CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Select it
USE im;


CREATE TABLE IF NOT EXISTS users (
  id      INT NOT NULL AUTO_INCREMENT,
  name    VARCHAR(255) NOT NULL,
  email   VARCHAR(255) NOT NULL UNIQUE, -- No repeated emails
  pwd_hash VARCHAR(255) NOT NULL, -- Store hashed passwords
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_email (email)
);

CREATE TABLE IF NOT EXISTS team (
  id   INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS team_user (
  id      INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  team_id INT NOT NULL,
  role    ENUM('user', 'manager', 'admin') NOT NULL DEFAULT 'user',
  PRIMARY KEY (id),
  UNIQUE KEY uk_team_membership_user_team (user_id, team_id), -- one user can be in multiple teams but this prevents duplicates
  CONSTRAINT fk_team_membership_user
    FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_team_membership_team
    FOREIGN KEY (team_id) REFERENCES team(id)
);

CREATE TABLE IF NOT EXISTS incident (
  id                  INT NOT NULL AUTO_INCREMENT,
  title               VARCHAR(255) NOT NULL,
  description         TEXT,
  status              ENUM('pending', 'under_review', 'escalated', 'resolved') NOT NULL DEFAULT 'pending',
  team_id             INT NOT NULL,
  reported_by_user_id INT NOT NULL,
  assigned_to_user_id INT,
  PRIMARY KEY (id),
  CONSTRAINT fk_incident_team
    FOREIGN KEY (team_id) REFERENCES team(id),
  CONSTRAINT fk_incident_reported_by
    FOREIGN KEY (reported_by_user_id) REFERENCES users(id),
  CONSTRAINT fk_incident_assigned_to
    FOREIGN KEY (assigned_to_user_id) REFERENCES users(id)
);

-- Platform managers can manage teams and team memberships
CREATE TABLE IF NOT EXISTS platform_manager (
  user_id INT NOT NULL UNIQUE,
  CONSTRAINT fk_platform_manager_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
