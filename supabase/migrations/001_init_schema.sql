-- Create tenant & tenancy tables

CREATE TABLE agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Main workflow tables

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE inputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  raw_text TEXT,
  facets JSONB, -- {category, signature_items, target_audience, key_features, vibes, amenities, price_range, intent}
  place JSONB, -- {address, poi_aliases}
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id) -- Per project, only latest
);

CREATE TABLE keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phrase TEXT NOT NULL,
  
  -- Metrics
  sv_exact NUMERIC,
  sv_variant_max NUMERIC,
  sv_effective NUMERIC,
  doc_total NUMERIC,
  doc_30d NUMERIC,
  serp_d NUMERIC,
  
  -- Scores
  lc_score NUMERIC,
  final_score NUMERIC,
  conf NUMERIC,
  
  -- Metadata
  rationale JSONB, -- {exceeds_threshold, threshold_rule, exception_reason}
  substituted_from TEXT,
  selected BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, phrase)
);

CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  main4 TEXT[],
  backup4 TEXT[],
  tone TEXT DEFAULT 'neutral', -- neutral, emotional, professional
  deadline DATE,
  status TEXT DEFAULT 'draft', -- draft, in_progress, published
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id)
);

-- Cache for API responses

CREATE TABLE api_cache (
  key TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  ttl_at TIMESTAMPTZ NOT NULL,
  source TEXT, -- gemini, naver-search, etc.
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance

CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_inputs_project_id ON inputs(project_id);
CREATE INDEX idx_keywords_project_id ON keywords(project_id);
CREATE INDEX idx_keywords_final_score ON keywords(project_id, final_score DESC);
CREATE INDEX idx_campaigns_project_id ON campaigns(project_id);
CREATE INDEX idx_api_cache_ttl ON api_cache(ttl_at);

-- Enable RLS

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Projects (via client->agency)

CREATE POLICY "projects_select_agency"
  ON projects FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM clients 
      WHERE agency_id = (
        SELECT user_metadata->>'agency_id'::uuid 
        FROM auth.users 
        WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "projects_insert_agency"
  ON projects FOR INSERT
  WITH CHECK (
    client_id IN (
      SELECT id FROM clients 
      WHERE agency_id = (
        SELECT user_metadata->>'agency_id'::uuid 
        FROM auth.users 
        WHERE id = auth.uid()
      )
    )
  );

-- RLS Policies: Inputs

CREATE POLICY "inputs_select_agency"
  ON inputs FOR SELECT
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN clients c ON p.client_id = c.id
      WHERE c.agency_id = (
        SELECT user_metadata->>'agency_id'::uuid 
        FROM auth.users 
        WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "inputs_insert_agency"
  ON inputs FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN clients c ON p.client_id = c.id
      WHERE c.agency_id = (
        SELECT user_metadata->>'agency_id'::uuid 
        FROM auth.users 
        WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "inputs_update_agency"
  ON inputs FOR UPDATE
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN clients c ON p.client_id = c.id
      WHERE c.agency_id = (
        SELECT user_metadata->>'agency_id'::uuid 
        FROM auth.users 
        WHERE id = auth.uid()
      )
    )
  );

-- RLS Policies: Keywords (same as inputs)

CREATE POLICY "keywords_select_agency"
  ON keywords FOR SELECT
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN clients c ON p.client_id = c.id
      WHERE c.agency_id = (
        SELECT user_metadata->>'agency_id'::uuid 
        FROM auth.users 
        WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "keywords_insert_agency"
  ON keywords FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN clients c ON p.client_id = c.id
      WHERE c.agency_id = (
        SELECT user_metadata->>'agency_id'::uuid 
        FROM auth.users 
        WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "keywords_update_agency"
  ON keywords FOR UPDATE
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN clients c ON p.client_id = c.id
      WHERE c.agency_id = (
        SELECT user_metadata->>'agency_id'::uuid 
        FROM auth.users 
        WHERE id = auth.uid()
      )
    )
  );

-- RLS Policies: Campaigns (same pattern)

CREATE POLICY "campaigns_select_agency"
  ON campaigns FOR SELECT
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN clients c ON p.client_id = c.id
      WHERE c.agency_id = (
        SELECT user_metadata->>'agency_id'::uuid 
        FROM auth.users 
        WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "campaigns_insert_agency"
  ON campaigns FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN clients c ON p.client_id = c.id
      WHERE c.agency_id = (
        SELECT user_metadata->>'agency_id'::uuid 
        FROM auth.users 
        WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "campaigns_update_agency"
  ON campaigns FOR UPDATE
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN clients c ON p.client_id = c.id
      WHERE c.agency_id = (
        SELECT user_metadata->>'agency_id'::uuid 
        FROM auth.users 
        WHERE id = auth.uid()
      )
    )
  );

-- API Cache: Service role only (no RLS)
ALTER TABLE api_cache DISABLE ROW LEVEL SECURITY;
