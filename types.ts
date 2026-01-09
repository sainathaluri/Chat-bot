export interface AudioVisualizerProps {
  isPlaying: boolean;
  volume: number;
}

export type LiveSessionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface UseLiveSessionReturn {
  status: LiveSessionStatus;
  connect: () => Promise<void>;
  disconnect: () => void;
  volume: number; // For visualization
}
