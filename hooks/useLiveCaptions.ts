'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

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

interface Speakers {
  [key: string]: Speaker;
}

interface Transcripts {
  [key: string]: Transcript;
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'disconnecting' | 'error';

interface AssemblyAIMessage {
  type: string;
  text?: string;
  speaker?: string;
  created?: string;
  id?: string;
  turn_order?: number;
  transcript?: string;
}

export const useLiveCaptions = () => {
  const socket = useRef<WebSocket | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const microphone = useRef<MediaStreamAudioSourceNode | null>(null);
  const dataArray = useRef<Float32Array | null>(null);
  const mediaStream = useRef<MediaStream | null>(null);
  const animationId = useRef<number | null>(null);

  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcripts, setTranscripts] = useState<Transcripts>({});
  const [speakers, setSpeakers] = useState<Speakers>({});
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');

  // Get authentication token
  const getToken = async (): Promise<string | null> => {
    try {
      const response = await fetch('/api/assemblyToken');
      const data = await response.json();

      if (!data || !data.token) {
        throw new Error('Failed to get authentication token');
      }

      return data.token;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Token error: ${errorMessage}`);
      return null;
    }
  };

  // Convert Float32Array to Int16Array for AssemblyAI
  const float32ToInt16 = (float32Array: Float32Array): Int16Array => {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      // Clamp values to [-1, 1] range and convert to 16-bit integer
      const clampedValue = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = clampedValue * 0x7fff;
    }
    return int16Array;
  };

  // Process audio data and send to AssemblyAI
  const processAudio = (): void => {
    if (!analyser.current || !socket.current || socket.current.readyState !== WebSocket.OPEN) {
      return;
    }

    // Get audio data
    analyser.current.getFloatTimeDomainData(dataArray.current!);
    
    // Convert and send audio data
    const int16Data = float32ToInt16(dataArray.current!);
    socket.current.send(int16Data.buffer);

    // Continue processing
    animationId.current = requestAnimationFrame(processAudio);
  };

  // Start live transcription
  const startTranscription = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      setConnectionStatus('connecting');

      const token = await getToken();
      if (!token) return;

      // WebSocket URL with speaker diarization enabled
      const wsUrl = `wss://streaming.assemblyai.com/v3/ws?sample_rate=16000&speaker_diarization=true&formatted_finals=true&token=${token}`;
      
      socket.current = new WebSocket(wsUrl);

      socket.current.onopen = async () => {
        console.log('AssemblyAI WebSocket connected');
        setIsConnected(true);
        setConnectionStatus('connected');

        try {
          // Get user media with high quality audio settings
          mediaStream.current = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              sampleRate: 16000,
              channelCount: 1
            }
          });

          // Create audio context
          audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({
            sampleRate: 16000
          });

          // Create analyser node
          analyser.current = audioContext.current.createAnalyser();
          analyser.current.fftSize = 2048;
          
          // Create microphone source
          microphone.current = audioContext.current.createMediaStreamSource(mediaStream.current);
          microphone.current.connect(analyser.current);

          // Initialize data array
          dataArray.current = new Float32Array(analyser.current.fftSize);

          setIsListening(true);
          
          // Start processing audio
          processAudio();

        } catch (audioError) {
          console.error('Audio setup error:', audioError);
          const errorMessage = audioError instanceof Error ? audioError.message : 'Unknown audio error';
          setError(`Microphone access denied: ${errorMessage}`);
          stopTranscription();
        }
      };

      socket.current.onmessage = (event: MessageEvent) => {
        try {
          const message: AssemblyAIMessage = JSON.parse(event.data);
          
          if (message.type === 'PartialTranscript') {
            // Handle partial (real-time) transcripts
            const { text, speaker, created } = message;
            const timestamp = new Date(created || Date.now()).toLocaleTimeString();
            
            setTranscripts(prev => ({
              ...prev,
              partial: {
                text: text || '',
                speaker: speaker || 'Unknown',
                timestamp,
                type: 'partial'
              }
            }));
          }
          
          if (message.type === 'FinalTranscript') {
            // Handle final transcripts with speaker info
            const { text, speaker, created, id } = message;
            const timestamp = new Date(created || Date.now()).toLocaleTimeString();
            
            setTranscripts(prev => {
              const newTranscripts = { ...prev };
              delete newTranscripts.partial; // Remove partial transcript
              
              newTranscripts[id || Date.now().toString()] = {
                text: text || '',
                speaker: speaker || 'Unknown',
                timestamp,
                type: 'final',
                id: id || Date.now().toString()
              };
              
              return newTranscripts;
            });

            // Update speaker tracking
            if (speaker) {
              setSpeakers(prev => ({
                ...prev,
                [speaker]: {
                  name: `Speaker ${speaker}`,
                  lastSeen: timestamp,
                  totalMessages: (prev[speaker]?.totalMessages || 0) + 1
                }
              }));
            }
          }

          if (message.type === 'SessionBegins') {
            console.log('AssemblyAI session started:', message);
          }

          if (message.type === 'SessionTerminated') {
            console.log('AssemblyAI session ended:', message);
            setConnectionStatus('disconnected');
          }

        } catch (parseError) {
          console.error('Message parsing error:', parseError);
        }
      };

      socket.current.onerror = (err: Event) => {
        console.error('WebSocket error:', err);
        setError('Connection error occurred');
        setConnectionStatus('error');
        stopTranscription();
      };

      socket.current.onclose = (event: CloseEvent) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        setConnectionStatus('disconnected');
        
        if (event.code !== 1000) {
          setError(`Connection closed unexpectedly: ${event.reason || 'Unknown reason'}`);
        }
      };

    } catch (err) {
      console.error('Connection error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown connection error';
      setError(`Failed to connect: ${errorMessage}`);
      setConnectionStatus('error');
    }
  }, []);

  // Stop transcription
  const stopTranscription = useCallback((): void => {
    setIsListening(false);
    setConnectionStatus('disconnecting');

    // Stop audio processing
    if (animationId.current) {
      cancelAnimationFrame(animationId.current);
      animationId.current = null;
    }

    // Close audio context
    if (audioContext.current && audioContext.current.state !== 'closed') {
      audioContext.current.close().catch(console.error);
      audioContext.current = null;
    }

    // Stop media stream
    if (mediaStream.current) {
      mediaStream.current.getTracks().forEach(track => {
        if (track.readyState === 'live') {
          track.stop();
        }
      });
      mediaStream.current = null;
    }

    // Close WebSocket
    if (socket.current && socket.current.readyState === WebSocket.OPEN) {
      socket.current.send(JSON.stringify({ type: 'Terminate' }));
      socket.current.close(1000, 'User stopped transcription');
    }
    
    socket.current = null;
    microphone.current = null;
    analyser.current = null;
    dataArray.current = null;

    setIsConnected(false);
    setConnectionStatus('disconnected');
  }, []);

  // Clear transcripts
  const clearTranscripts = useCallback((): void => {
    setTranscripts({});
    setSpeakers({});
  }, []);

  // Get ordered transcripts for display
  const getOrderedTranscripts = useCallback((): Transcript[] => {
    return Object.values(transcripts)
      .filter(t => t.type === 'final')
      .sort((a, b) => (parseInt(a.id || '0') - parseInt(b.id || '0')));
  }, [transcripts]);

  // Get current partial transcript
  const getCurrentPartial = useCallback((): Transcript | null => {
    return transcripts.partial || null;
  }, [transcripts]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTranscription();
    };
  }, [stopTranscription]);

  return {
    // State
    isConnected,
    isListening,
    transcripts,
    speakers,
    error,
    connectionStatus,
    
    // Actions
    startTranscription,
    stopTranscription,
    clearTranscripts,
    
    // Helpers
    getOrderedTranscripts,
    getCurrentPartial
  };
};