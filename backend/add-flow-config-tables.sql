-- Add tables for dynamic flow configuration

-- Departments table
CREATE TABLE IF NOT EXISTS "FlowDepartment" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Locations table
CREATE TABLE IF NOT EXISTS "FlowLocation" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Time slots table
CREATE TABLE IF NOT EXISTS "FlowTimeSlot" (
  "id" SERIAL PRIMARY KEY,
  "time" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "isEnabled" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Insert sample data
INSERT INTO "FlowDepartment" (name, title) VALUES
  ('shopping', 'Shopping & Groceries'),
  ('clothing', 'Clothing & Apparel'),
  ('home', 'Home Goods & Decor'),
  ('electronics', 'Electronics & Appliances'),
  ('beauty', 'Beauty & Personal Care');

INSERT INTO "FlowLocation" (name, title) VALUES
  ('1', 'King''s Cross, London'),
  ('2', 'Oxford Street, London'),
  ('3', 'Covent Garden, London'),
  ('4', 'Piccadilly Circus, London');

INSERT INTO "FlowTimeSlot" (time, title, "isEnabled") VALUES
  ('10:30', '10:30', true),
  ('11:00', '11:00', false),
  ('11:30', '11:30', true),
  ('12:00', '12:00', false),
  ('12:30', '12:30', true),
  ('13:00', '13:00', true),
  ('13:30', '13:30', true),
  ('14:00', '14:00', true);
