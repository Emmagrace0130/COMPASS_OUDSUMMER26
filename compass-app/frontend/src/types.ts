export interface Source {
  file: string;
  topic: string;
  page: number | string;
  excerpt: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  error?: boolean;
}

export interface HealthStatus {
  index_ready: boolean;
  ollama_reachable: boolean;
  chain_loaded: boolean;
}
