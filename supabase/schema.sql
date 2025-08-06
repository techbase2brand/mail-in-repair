-- Create database schema for PRC Repair Mail-In Management System

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255),
  contact_email VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100),
  logo_url TEXT,
  website VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, active, suspended
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Repair categories table
CREATE TABLE IF NOT EXISTS repair_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100),
  customer_type VARCHAR(50) NOT NULL DEFAULT 'retail', -- retail, business
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Technicians table
CREATE TABLE IF NOT EXISTS technicians (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  specialization TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Repair tickets table
CREATE TABLE IF NOT EXISTS repair_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_number VARCHAR(50) NOT NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  category_id UUID REFERENCES repair_categories(id) ON DELETE SET NULL,
  technician_id UUID REFERENCES technicians(id) ON DELETE SET NULL,
  device_type VARCHAR(100) NOT NULL,
  device_model VARCHAR(100),
  serial_number VARCHAR(100),
  issue_description TEXT NOT NULL,
  diagnosis TEXT,
  solution TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'received', -- received, diagnosed, waiting_for_parts, in_progress, completed, delivered, cancelled
  priority VARCHAR(50) DEFAULT 'normal', -- low, normal, high, urgent
  is_urgent BOOLEAN DEFAULT FALSE,
  estimated_completion_date TIMESTAMP WITH TIME ZONE,
  actual_completion_date TIMESTAMP WITH TIME ZONE,
  actual_cost DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Repair ticket status history
CREATE TABLE IF NOT EXISTS repair_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repair_ticket_id UUID NOT NULL REFERENCES repair_tickets(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Repair parts table
CREATE TABLE IF NOT EXISTS repair_parts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repair_ticket_id UUID NOT NULL REFERENCES repair_tickets(id) ON DELETE CASCADE,
  part_name VARCHAR(255) NOT NULL,
  part_number VARCHAR(100),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2),
  status VARCHAR(50) DEFAULT 'needed', -- needed, ordered, received, installed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Repair media (photos/videos)
CREATE TABLE IF NOT EXISTS repair_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repair_ticket_id UUID NOT NULL REFERENCES repair_tickets(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_type VARCHAR(50) NOT NULL, -- image, video
  description TEXT,
  is_before BOOLEAN DEFAULT TRUE, -- before or after repair
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Repair conversations
CREATE TABLE IF NOT EXISTS repair_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repair_ticket_id UUID NOT NULL REFERENCES repair_tickets(id) ON DELETE CASCADE,
  sender_type VARCHAR(50) NOT NULL, -- customer, technician, system
  sender_id UUID,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number VARCHAR(50) NOT NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  total_amount DECIMAL(10, 2) NOT NULL,
  tax_amount DECIMAL(10, 2) DEFAULT 0,
  shipping_amount DECIMAL(10, 2) DEFAULT 0,
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, paid, cancelled
  payment_method VARCHAR(50),
  payment_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoice items table
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  repair_ticket_id UUID REFERENCES repair_tickets(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Warranty table
CREATE TABLE IF NOT EXISTS warranties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repair_ticket_id UUID NOT NULL REFERENCES repair_tickets(id) ON DELETE CASCADE,
  warranty_type VARCHAR(50) NOT NULL, -- standard, extended
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  terms TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Buyback tickets table
CREATE TABLE IF NOT EXISTS buyback_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_number VARCHAR(50) NOT NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  technician_id UUID REFERENCES technicians(id) ON DELETE SET NULL,
  device_type VARCHAR(100) NOT NULL,
  device_model VARCHAR(100) NOT NULL,
  device_condition VARCHAR(50) NOT NULL DEFAULT 'unknown',
  device_description TEXT,
  offered_amount DECIMAL(10, 2),
  final_price DECIMAL(10, 2),
  status VARCHAR(50) NOT NULL DEFAULT 'submitted', -- submitted, received, evaluated, pending_payment, completed, rejected, returned
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- device_condition column is already defined in the table creation
-- No need to add it again

-- Buyback media (photos/videos)
CREATE TABLE IF NOT EXISTS buyback_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyback_ticket_id UUID NOT NULL REFERENCES buyback_tickets(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_type VARCHAR(50) NOT NULL, -- image, video
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Refurbishing tickets table
CREATE TABLE IF NOT EXISTS refurbishing_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_number VARCHAR(50) NOT NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  technician_id UUID REFERENCES technicians(id) ON DELETE SET NULL,
  device_type VARCHAR(100) NOT NULL,
  device_model VARCHAR(100) NOT NULL,
  screen_condition_before VARCHAR(50), -- A, B, C, D, F
  screen_condition_after VARCHAR(50), -- A, B
  refurbishing_cost DECIMAL(10, 2),
  status VARCHAR(50) NOT NULL DEFAULT 'submitted', -- submitted, received, graded, in_progress, completed, shipped, cancelled
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Refurbishing media (photos/videos)
CREATE TABLE IF NOT EXISTS refurbishing_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  refurbishing_ticket_id UUID NOT NULL REFERENCES refurbishing_tickets(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_type VARCHAR(50) NOT NULL, -- image, video
  description TEXT,
  is_before BOOLEAN DEFAULT TRUE, -- before or after refurbishing
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Refurbishing conversations
CREATE TABLE IF NOT EXISTS refurbishing_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  refurbishing_ticket_id UUID NOT NULL REFERENCES refurbishing_tickets(id) ON DELETE CASCADE,
  sender_type VARCHAR(50) NOT NULL, -- customer, technician, system
  sender_id UUID,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pricing sheets table
CREATE TABLE IF NOT EXISTS pricing_sheets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pricing items table
CREATE TABLE IF NOT EXISTS pricing_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pricing_sheet_id UUID NOT NULL REFERENCES pricing_sheets(id) ON DELETE CASCADE,
  device_type VARCHAR(100) NOT NULL,
  device_model VARCHAR(100) NOT NULL,
  repair_type VARCHAR(100) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  cost DECIMAL(10, 2),
  estimated_time INTEGER, -- in minutes
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  setting_key VARCHAR(100) NOT NULL,
  setting_value TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, setting_key)
);

-- Refurbished inventory table
CREATE TABLE IF NOT EXISTS refurbished_inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_id VARCHAR(50) NOT NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  device_type VARCHAR(100) NOT NULL,
  device_model VARCHAR(100) NOT NULL,
  condition_grade VARCHAR(50) NOT NULL,
  acquisition_source VARCHAR(100) NOT NULL,
  acquisition_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  acquisition_cost DECIMAL(10, 2) NOT NULL,
  refurbishment_status VARCHAR(50) NOT NULL DEFAULT 'received', -- received, in_progress, refurbished, listed, sold
  selling_price DECIMAL(10, 2),
  is_sold BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_repair_tickets_company_id') THEN
  CREATE INDEX idx_repair_tickets_company_id ON repair_tickets(company_id);
END IF;
END $$;
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_repair_tickets_customer_id') THEN
  CREATE INDEX idx_repair_tickets_customer_id ON repair_tickets(customer_id);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_repair_tickets_technician_id') THEN
  CREATE INDEX idx_repair_tickets_technician_id ON repair_tickets(technician_id);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_repair_tickets_status') THEN
  CREATE INDEX idx_repair_tickets_status ON repair_tickets(status);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_customers_company_id') THEN
  CREATE INDEX idx_customers_company_id ON customers(company_id);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_technicians_company_id') THEN
  CREATE INDEX idx_technicians_company_id ON technicians(company_id);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_invoices_company_id') THEN
  CREATE INDEX idx_invoices_company_id ON invoices(company_id);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_invoices_customer_id') THEN
  CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_buyback_tickets_company_id') THEN
  CREATE INDEX idx_buyback_tickets_company_id ON buyback_tickets(company_id);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_refurbishing_tickets_company_id') THEN
  CREATE INDEX idx_refurbishing_tickets_company_id ON refurbishing_tickets(company_id);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_refurbished_inventory_company_id') THEN
  CREATE INDEX idx_refurbished_inventory_company_id ON refurbished_inventory(company_id);
END IF;
END $$;

-- Create RLS (Row Level Security) policies
-- This ensures that companies can only access their own data

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranties ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyback_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyback_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE refurbishing_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE refurbishing_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE refurbishing_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE refurbished_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranties ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyback_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyback_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE refurbishing_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE refurbishing_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE refurbishing_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create policies for companies table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'companies' AND policyname = 'Users can view their own company') THEN
    CREATE POLICY "Users can view their own company" ON companies
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'companies' AND policyname = 'Users can update their own company') THEN
    CREATE POLICY "Users can update their own company" ON companies
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'companies' AND policyname = 'Users can insert their own company') THEN
    CREATE POLICY "Users can insert their own company" ON companies
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'companies' AND policyname = 'New users can create company profiles') THEN
    CREATE POLICY "New users can create company profiles" ON companies
      FOR INSERT WITH CHECK (true);
  END IF;
END
$$;

-- Create policies for customers table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'Companies can view their own customers') THEN
    CREATE POLICY "Companies can view their own customers" ON customers
      FOR SELECT USING (
        company_id IN (
          SELECT id FROM companies WHERE user_id = auth.uid()
        )
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'Companies can insert their own customers') THEN
    CREATE POLICY "Companies can insert their own customers" ON customers
      FOR INSERT WITH CHECK (
        company_id IN (
          SELECT id FROM companies WHERE user_id = auth.uid()
        )
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'Companies can update their own customers') THEN
    CREATE POLICY "Companies can update their own customers" ON customers
      FOR UPDATE USING (
        company_id IN (
          SELECT id FROM companies WHERE user_id = auth.uid()
        )
      );
  END IF;
END
$$;

-- Create policies for technicians table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'technicians' AND policyname = 'Companies can view their own technicians') THEN
    CREATE POLICY "Companies can view their own technicians" ON technicians
      FOR SELECT USING (
        company_id IN (
          SELECT id FROM companies WHERE user_id = auth.uid()
        )
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'technicians' AND policyname = 'Companies can insert their own technicians') THEN
    CREATE POLICY "Companies can insert their own technicians" ON technicians
      FOR INSERT WITH CHECK (
        company_id IN (
          SELECT id FROM companies WHERE user_id = auth.uid()
        )
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'technicians' AND policyname = 'Companies can update their own technicians') THEN
    CREATE POLICY "Companies can update their own technicians" ON technicians
      FOR UPDATE USING (
        company_id IN (
          SELECT id FROM companies WHERE user_id = auth.uid()
        )
      );
  END IF;
END
$$;

-- Create policies for repair_tickets table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'repair_tickets' AND policyname = 'Companies can view their own repair tickets') THEN
    CREATE POLICY "Companies can view their own repair tickets" ON repair_tickets
      FOR SELECT USING (
        company_id IN (
          SELECT id FROM companies WHERE user_id = auth.uid()
        )
      );
  END IF;
END
$$;

-- Create policies for repair_status_history table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'repair_status_history' AND policyname = 'Companies can view repair status history for their tickets') THEN
    CREATE POLICY "Companies can view repair status history for their tickets" ON repair_status_history
      FOR SELECT USING (
        repair_ticket_id IN (
          SELECT id FROM repair_tickets WHERE company_id IN (
            SELECT id FROM companies WHERE user_id = auth.uid()
          )
        )
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'repair_status_history' AND policyname = 'Companies can insert repair status history for their tickets') THEN
    CREATE POLICY "Companies can insert repair status history for their tickets" ON repair_status_history
      FOR INSERT WITH CHECK (
        repair_ticket_id IN (
          SELECT id FROM repair_tickets WHERE company_id IN (
            SELECT id FROM companies WHERE user_id = auth.uid()
          )
        )
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'repair_tickets' AND policyname = 'Companies can insert their own repair tickets') THEN
    CREATE POLICY "Companies can insert their own repair tickets" ON repair_tickets
      FOR INSERT WITH CHECK (
        company_id IN (
          SELECT id FROM companies WHERE user_id = auth.uid()
        )
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'repair_tickets' AND policyname = 'Companies can update their own repair tickets') THEN
    CREATE POLICY "Companies can update their own repair tickets" ON repair_tickets
      FOR UPDATE USING (
        company_id IN (
          SELECT id FROM companies WHERE user_id = auth.uid()
        )
      );
  END IF;
END
$$;

-- Create policies for buyback_tickets table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'buyback_tickets' AND policyname = 'Companies can view their own buyback tickets') THEN
    CREATE POLICY "Companies can view their own buyback tickets" ON buyback_tickets
      FOR SELECT USING (
        company_id IN (
          SELECT id FROM companies WHERE user_id = auth.uid()
        )
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'buyback_tickets' AND policyname = 'Companies can insert their own buyback tickets') THEN
    CREATE POLICY "Companies can insert their own buyback tickets" ON buyback_tickets
      FOR INSERT WITH CHECK (
        company_id IN (
          SELECT id FROM companies WHERE user_id = auth.uid()
        )
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'buyback_tickets' AND policyname = 'Companies can update their own buyback tickets') THEN
    CREATE POLICY "Companies can update their own buyback tickets" ON buyback_tickets
      FOR UPDATE USING (
        company_id IN (
          SELECT id FROM companies WHERE user_id = auth.uid()
        )
      );
  END IF;
END
$$;

-- Create policies for refurbishing_tickets table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'refurbishing_tickets' AND policyname = 'Companies can view their own refurbishing tickets') THEN
    CREATE POLICY "Companies can view their own refurbishing tickets" ON refurbishing_tickets
      FOR SELECT USING (
        company_id IN (
          SELECT id FROM companies WHERE user_id = auth.uid()
        )
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'refurbishing_tickets' AND policyname = 'Companies can insert their own refurbishing tickets') THEN
    CREATE POLICY "Companies can insert their own refurbishing tickets" ON refurbishing_tickets
      FOR INSERT WITH CHECK (
        company_id IN (
          SELECT id FROM companies WHERE user_id = auth.uid()
        )
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'refurbishing_tickets' AND policyname = 'Companies can update their own refurbishing tickets') THEN
    CREATE POLICY "Companies can update their own refurbishing tickets" ON refurbishing_tickets
      FOR UPDATE USING (
        company_id IN (
          SELECT id FROM companies WHERE user_id = auth.uid()
        )
      );
  END IF;
END
$$;

-- Create policies for refurbished_inventory table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'refurbished_inventory' AND policyname = 'Companies can view their own refurbished inventory') THEN
    CREATE POLICY "Companies can view their own refurbished inventory" ON refurbished_inventory
      FOR SELECT USING (
        company_id IN (
          SELECT id FROM companies WHERE user_id = auth.uid()
        )
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'refurbished_inventory' AND policyname = 'Companies can insert their own refurbished inventory') THEN
    CREATE POLICY "Companies can insert their own refurbished inventory" ON refurbished_inventory
      FOR INSERT WITH CHECK (
        company_id IN (
          SELECT id FROM companies WHERE user_id = auth.uid()
        )
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'refurbished_inventory' AND policyname = 'Companies can update their own refurbished inventory') THEN
    CREATE POLICY "Companies can update their own refurbished inventory" ON refurbished_inventory
      FOR UPDATE USING (
        company_id IN (
          SELECT id FROM companies WHERE user_id = auth.uid()
        )
      );
  END IF;
END
$$;

-- Create policies for invoices table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invoices' AND policyname = 'Companies can view their own invoices') THEN
    CREATE POLICY "Companies can view their own invoices" ON invoices
      FOR SELECT USING (
        company_id IN (
          SELECT id FROM companies WHERE user_id = auth.uid()
        )
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invoices' AND policyname = 'Companies can insert their own invoices') THEN
    CREATE POLICY "Companies can insert their own invoices" ON invoices
      FOR INSERT WITH CHECK (
        company_id IN (
          SELECT id FROM companies WHERE user_id = auth.uid()
        )
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invoices' AND policyname = 'Companies can update their own invoices') THEN
    CREATE POLICY "Companies can update their own invoices" ON invoices
      FOR UPDATE USING (
        company_id IN (
          SELECT id FROM companies WHERE user_id = auth.uid()
        )
      );
  END IF;
END
$$;

-- Create policies for other tables based on company_id
-- Example for customers table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'Companies can view their own customers') THEN
    CREATE POLICY "Companies can view their own customers" 
      ON customers FOR SELECT 
      USING (
        company_id IN (
          SELECT id FROM companies WHERE user_id = auth.uid()
        )
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'Companies can insert their own customers') THEN
    CREATE POLICY "Companies can insert their own customers" 
      ON customers FOR INSERT 
      WITH CHECK (
        company_id IN (
          SELECT id FROM companies WHERE user_id = auth.uid()
        )
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'Companies can update their own customers') THEN
    CREATE POLICY "Companies can update their own customers" 
      ON customers FOR UPDATE 
      USING (
        company_id IN (
          SELECT id FROM companies WHERE user_id = auth.uid()
        )
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'Companies can delete their own customers') THEN
    CREATE POLICY "Companies can delete their own customers" 
      ON customers FOR DELETE 
      USING (
        company_id IN (
          SELECT id FROM companies WHERE user_id = auth.uid()
        )
      );
  END IF;
END
$$;

-- Similar policies should be created for all other tables
-- This is just an example for the customers table
-- In a production environment, you would create policies for all tables

-- Create functions for generating sequential ticket numbers
CREATE OR REPLACE FUNCTION generate_repair_ticket_number()
 RETURNS TRIGGER AS $$
BEGIN
  NEW.ticket_number := 'REP-' || to_char(NOW(), 'YYYY') || '-' || 
                      LPAD(CAST((SELECT COUNT(*) + 1 FROM repair_tickets 
                                 WHERE company_id = NEW.company_id AND 
                                 EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())) AS TEXT), 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_repair_ticket_number
  BEFORE INSERT ON repair_tickets
  FOR EACH ROW
  EXECUTE FUNCTION generate_repair_ticket_number();

CREATE OR REPLACE FUNCTION generate_buyback_ticket_number()
 RETURNS TRIGGER AS $$
BEGIN
  NEW.ticket_number := 'BUY-' || to_char(NOW(), 'YYYY') || '-' || 
                      LPAD(CAST((SELECT COUNT(*) + 1 FROM buyback_tickets 
                                 WHERE company_id = NEW.company_id AND 
                                 EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())) AS TEXT), 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_buyback_ticket_number
  BEFORE INSERT ON buyback_tickets
  FOR EACH ROW
  EXECUTE FUNCTION generate_buyback_ticket_number();

CREATE OR REPLACE FUNCTION generate_refurbishing_ticket_number()
 RETURNS TRIGGER AS $$
BEGIN
  NEW.ticket_number := 'REF-' || to_char(NOW(), 'YYYY') || '-' || 
                      LPAD(CAST((SELECT COUNT(*) + 1 FROM refurbishing_tickets 
                                 WHERE company_id = NEW.company_id AND 
                                 EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())) AS TEXT), 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_refurbishing_ticket_number
  BEFORE INSERT ON refurbishing_tickets
  FOR EACH ROW
  EXECUTE FUNCTION generate_refurbishing_ticket_number();

CREATE OR REPLACE FUNCTION generate_invoice_number()
 RETURNS TRIGGER AS $$
BEGIN
  NEW.invoice_number := 'INV-' || to_char(NOW(), 'YYYY') || '-' || 
                      LPAD(CAST((SELECT COUNT(*) + 1 FROM invoices 
                                 WHERE company_id = NEW.company_id AND 
                                 EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())) AS TEXT), 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_invoice_number
  BEFORE INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION generate_invoice_number();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_timestamp()
 RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to update timestamps on all tables
CREATE TRIGGER update_companies_timestamp
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_repair_categories_timestamp
  BEFORE UPDATE ON repair_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_customers_timestamp
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_technicians_timestamp
  BEFORE UPDATE ON technicians
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_repair_tickets_timestamp
  BEFORE UPDATE ON repair_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_repair_parts_timestamp
  BEFORE UPDATE ON repair_parts
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_invoices_timestamp
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_warranties_timestamp
  BEFORE UPDATE ON warranties
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_buyback_tickets_timestamp
  BEFORE UPDATE ON buyback_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_refurbishing_tickets_timestamp
  BEFORE UPDATE ON refurbishing_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_pricing_sheets_timestamp
  BEFORE UPDATE ON pricing_sheets
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_pricing_items_timestamp
  BEFORE UPDATE ON pricing_items
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_settings_timestamp
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

-- Create function to track repair status changes
CREATE OR REPLACE FUNCTION track_repair_status_change()
 RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS NULL OR NEW.status <> OLD.status THEN
    -- Use security definer to bypass RLS
    INSERT INTO repair_status_history (repair_ticket_id, status, created_by)
    VALUES (NEW.id, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER track_repair_status
  AFTER INSERT OR UPDATE ON repair_tickets
  FOR EACH ROW
  EXECUTE FUNCTION track_repair_status_change();