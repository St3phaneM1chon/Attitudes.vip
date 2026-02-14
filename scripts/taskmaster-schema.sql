
-- Extension des tables existantes pour Taskmaster
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS automation_config JSONB DEFAULT '{}';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_pattern VARCHAR(255);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS dependencies JSONB DEFAULT '[]';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS trigger_conditions JSONB DEFAULT '[]';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS execution_history JSONB DEFAULT '[]';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS ai_metadata JSONB DEFAULT '{}';

-- Table des workflows
CREATE TABLE IF NOT EXISTS taskmaster_workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  steps JSONB NOT NULL,
  config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id),
  last_executed TIMESTAMP,
  execution_count INTEGER DEFAULT 0
);

-- Table des exécutions de workflows
CREATE TABLE IF NOT EXISTS taskmaster_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID REFERENCES taskmaster_workflows(id),
  wedding_id UUID REFERENCES weddings(id),
  status VARCHAR(50) NOT NULL,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  context JSONB DEFAULT '{}',
  results JSONB DEFAULT '{}',
  error TEXT
);

-- Table des templates de tâches
CREATE TABLE IF NOT EXISTS taskmaster_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(100),
  category VARCHAR(100),
  priority VARCHAR(50),
  automation JSONB NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des métriques Taskmaster
CREATE TABLE IF NOT EXISTS taskmaster_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_type VARCHAR(100) NOT NULL,
  metric_value JSONB NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  wedding_id UUID REFERENCES weddings(id),
  metadata JSONB DEFAULT '{}'
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_tasks_automation ON tasks(status) WHERE automation_config != '{}';
CREATE INDEX IF NOT EXISTS idx_workflows_active ON taskmaster_workflows(is_active);
CREATE INDEX IF NOT EXISTS idx_executions_status ON taskmaster_executions(status, workflow_id);
CREATE INDEX IF NOT EXISTS idx_metrics_type_time ON taskmaster_metrics(metric_type, timestamp);

-- Vues pour le monitoring
CREATE OR REPLACE VIEW taskmaster_dashboard AS
SELECT 
  COUNT(DISTINCT w.id) as total_workflows,
  COUNT(DISTINCT e.id) as total_executions,
  COUNT(DISTINCT t.id) FILTER (WHERE t.automation_config != '{}') as automated_tasks,
  AVG(EXTRACT(EPOCH FROM (e.completed_at - e.started_at))) as avg_execution_time,
  COUNT(e.id) FILTER (WHERE e.status = 'completed') as successful_executions,
  COUNT(e.id) FILTER (WHERE e.status = 'failed') as failed_executions
FROM taskmaster_workflows w
LEFT JOIN taskmaster_executions e ON w.id = e.workflow_id
LEFT JOIN tasks t ON t.wedding_id = e.wedding_id
WHERE w.is_active = true;

-- Triggers pour l'automatisation
CREATE OR REPLACE FUNCTION trigger_task_automation()
RETURNS TRIGGER AS $$
BEGIN
  -- Si la tâche a une configuration d'automatisation
  IF NEW.automation_config != '{}' AND NEW.automation_config IS NOT NULL THEN
    -- Notifier le service Taskmaster
    PERFORM pg_notify('taskmaster_automation', json_build_object(
      'task_id', NEW.id,
      'action', 'check_automation',
      'config', NEW.automation_config
    )::text);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_automation_trigger
AFTER INSERT OR UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION trigger_task_automation();

-- Fonction pour calculer les prochaines tâches
CREATE OR REPLACE FUNCTION get_next_tasks(p_wedding_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  task_id UUID,
  title VARCHAR(255),
  due_date DATE,
  priority VARCHAR(50),
  ai_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.title,
    t.due_date,
    t.priority,
    COALESCE((t.ai_metadata->>'priority_score')::NUMERIC, 50) as ai_score
  FROM tasks t
  WHERE t.wedding_id = p_wedding_id
    AND t.status IN ('pending', 'in_progress')
  ORDER BY 
    CASE t.priority 
      WHEN 'urgent' THEN 1
      WHEN 'high' THEN 2
      WHEN 'medium' THEN 3
      WHEN 'low' THEN 4
      ELSE 5
    END,
    t.due_date ASC NULLS LAST,
    ai_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
