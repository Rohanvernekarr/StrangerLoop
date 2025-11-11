export interface User {
  socketId: string;
  peerId?: string;
  timestamp: number;
}

export interface SignalingData {
  from: string;
  to: string;
  type: 'offer' | 'answer' | 'ice-candidate';
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

export interface MatchResult {
  matched: boolean;
  partnerId?: string;
}

export interface ChatMessage {
  from: string;
  message: string;
  timestamp: number;
}
