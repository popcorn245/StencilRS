export interface TaskPlan {
  id: string;
  action: 'create' | 'modify' | 'delete';
  category?: 'feat' | 'fix' | 'docs' | 'style' | 'refactor' | 'perf' | 'test' | 'build' | 'ci' | 'chore' | 'revert';
  filePath: string;
  instructions: string;
  acceptanceCriteria?: string;
  estimatedEffort?: 'sm' | 'md' | 'lg';
  riskLevel?: 'sm' | 'md' | 'lg';
  dependsOn?: string[];
  tags?: string[];
  subtasks?: TaskPlan[];
  completed?: boolean;
}

export interface GenerationPlan {
  summary?: string;
  plan: TaskPlan[];
}
