// hooks/useLiveCaptions.ts
'use client';

import { useRef, useState, useCallback, useEffect, createContext, ReactNode, useContext } from 'react';

interface Transcript {
  text: string;
  speaker: string;
  timestamp: string;
  type: 'partial' | 'final';
  id?: string;
}

interface Speaker {
  name: string;
  lastSeen: string;
  totalMessages: number;
}

interface Transcripts {
  [key: string]: Transcript;
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'disconnecting' | 'error';

interface LiveCaptionsContextType {
  isConnected: boolean;
  isListening: boolean;
  transcripts: Transcripts;
  speakers: { [key: string]: Speaker };
  error: string | null;
  connectionStatus: ConnectionStatus;
  startTranscription: () => Promise<void>;
  stopTranscription: () => void;
  getOrderedTranscripts: () => Transcript[];
  currentPartial: Transcript | null;
  minutesInSession: boolean;
  setMinutesInSession: (value: boolean) => void;
  minutesBuffer: Transcript[];
  setMinutesBuffer: (buffer: Transcript[]) => void;
  minutesInSessionRef: React.RefObject<boolean>;
}

export const LiveCaptionsContext = createContext<LiveCaptionsContextType | undefined>(undefined);

export const LiveCaptionsProvider = ({ children }: { children: ReactNode }) => {
  const socket = useRef<WebSocket | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const mediaStream = useRef<MediaStream | null>(null);
  const scriptProcessor = useRef<ScriptProcessorNode | null>(null);

  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcripts, setTranscripts] = useState<Transcripts>({});
  const [partialTranscript, setPartialTranscript] = useState<Transcript | null>(null);
  const [speakers, setSpeakers] = useState<{ [key: string]: Speaker }>({});
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [minutesInSession, setMinutesInSession] = useState(false);
  const minutesInSessionRef = useRef<boolean>(false);
  const [minutesBuffer, setMinutesBuffer] = useState<Transcript[]>([]);

  const getToken = async (): Promise<string | null> => {
    try {
      const response = await fetch('/api/assemblyToken');
      const data = await response.json();
      return data.token || null;
    } catch {
      setError('Failed to fetch token');
      return null;
    }
  };

  const startTranscription = useCallback(async () => {
    try {
      setError(null);
      setConnectionStatus('connecting');

      const token = await getToken();
      if (!token) return;

      const wsUrl = `wss://streaming.assemblyai.com/v3/ws?sample_rate=16000&speaker_diarization=true&formatted_finals=true&token=${token}`;
      socket.current = new WebSocket(wsUrl);

      socket.current.onopen = async () => {
        console.log('🔰🔰🔰AssemblyAI WebSocket connected');
        setIsConnected(true);
        setConnectionStatus('connected');
        setIsListening(true);

        mediaStream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext.current = new AudioContext({ sampleRate: 16000 });

        const source = audioContext.current.createMediaStreamSource(mediaStream.current);
        scriptProcessor.current = audioContext.current.createScriptProcessor(4096, 1, 1);

        source.connect(scriptProcessor.current);
        scriptProcessor.current.connect(audioContext.current.destination);

        scriptProcessor.current.onaudioprocess = (event) => {
        if (!socket.current || socket.current.readyState !== WebSocket.OPEN) return;

        const input = event.inputBuffer.getChannelData(0);
        const buffer = new ArrayBuffer(input.length * 2);
        const view = new DataView(buffer);

        for (let i = 0; i < input.length; i++) {
          const s = Math.max(-1, Math.min(1, input[i]));
          view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true); // little-endian
        }

        socket.current.send(buffer);
      };
      };

      socket.current.onmessage = (event) => {
        console.log("⬅️⬅️⬅️ AssemblyAI says:", event.data);

        try {
          const message = JSON.parse(event.data);

          // For partials (live caption)
          if (message.type === 'PartialTranscript') {
            const { text, speaker, created } = message;
            const timestamp = new Date(created || Date.now()).toLocaleTimeString();
            setPartialTranscript({
              text: text || '',
              speaker: speaker || 'Unknown',
              timestamp,
              type: 'partial'
            });
            return; // done
          }

          // For final full sentences (confirmed speaker turn)
          if (message.type === 'Turn' || message.message_type === 'FinalTranscript') {
            const transcriptText = message.transcript || message.text || '';
            const speaker = message.speaker || 'Unknown';
            const timestamp = new Date(message.created || Date.now()).toLocaleTimeString();
            const transcriptId = message.id || Date.now().toString();

            const finalTranscript: Transcript = {
              text: transcriptText,
              speaker,
              timestamp,
              id: transcriptId,
              type: 'final'
            };

            // Store in full transcript map
            setTranscripts(prev => ({
              ...prev,
              [transcriptId]: finalTranscript
            }));

            setPartialTranscript(null); // clear any partials

            // Speaker stats
            setSpeakers(prev => ({
              ...prev,
              [speaker]: {
                name: `Speaker ${speaker}`,
                lastSeen: timestamp,
                totalMessages: (prev[speaker]?.totalMessages || 0) + 1
              }
            }));

            // ➕ Also push to minutes buffer if minutesInSession is true
            if (minutesInSessionRef.current) {
              setMinutesBuffer(prev => [...prev, finalTranscript]);
            }

          }
        } catch (e) {
          console.error('Error parsing message:', e);
        }
      };

      socket.current.onerror = (e) => {
        console.error('WebSocket error:', e);
        setError('WebSocket error');
        stopTranscription();
      };

      socket.current.onclose = () => {
        console.log('WebSocket closed');
        setIsConnected(false);
        setConnectionStatus('disconnected');
      };
    } catch (err) {
      console.error('startTranscription error:', err);
      setError('Failed to start transcription');
    }
  }, []);

  const stopTranscription = useCallback(() => {
    setIsListening(false);
    setConnectionStatus('disconnecting');

    if (scriptProcessor.current) {
      scriptProcessor.current.disconnect();
      scriptProcessor.current = null;
    }

    if (audioContext.current) {
      audioContext.current.close().catch(console.error);
      audioContext.current = null;
    }

    if (mediaStream.current) {
      mediaStream.current.getTracks().forEach(track => track.stop());
      mediaStream.current = null;
    }

    if (socket.current && socket.current.readyState === WebSocket.OPEN) {
      socket.current.send(JSON.stringify({ type: 'Terminate' }));
      socket.current.close();
    }

    socket.current = null;
    setConnectionStatus('disconnected');
  }, []);

  
  useEffect(() => {
    startTranscription();
  }, [startTranscription]);

  useEffect(() => {
    return () => {
      stopTranscription();
    };
  }, [stopTranscription]);

  const getOrderedTranscripts = () => {
    return Object.values(transcripts)
      .filter(t => t.type === 'final')
      .sort((a, b) => (parseInt(a.id || '0') - parseInt(b.id || '0')));
  };


  const value = {
    isConnected,
    isListening,
    transcripts,
    speakers,
    error,
    connectionStatus,
    startTranscription,
    stopTranscription,
    getOrderedTranscripts,
    currentPartial: partialTranscript,
    minutesInSession,
    setMinutesInSession,
    minutesInSessionRef,
    minutesBuffer,
    setMinutesBuffer
  };

  
  return (
    <LiveCaptionsContext.Provider value={value}>
      {children}
    </LiveCaptionsContext.Provider>
  );
};


export const useLiveCaptionsContext = () => {
  const context = useContext(LiveCaptionsContext);
  if (!context) {
    throw new Error('useLiveCaptionsContext must be used within a LiveCaptionsProvider');
  }
  return context;
};
