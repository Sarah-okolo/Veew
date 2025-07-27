'use client';

import React, { useEffect, useState } from 'react';
import { useLiveCaptions } from '../hooks/useLiveCaptions';

interface LiveCaptionsProps {
  className?: string;
  maxCaptions?: number;
}

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

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'disconnecting' | 'error';

const LiveCaptions: React.FC<LiveCaptionsProps> = ({ className = '', maxCaptions = 5 }) => {
  const {
    isConnected,
    isListening,
    speakers,
    error,
    connectionStatus,
    startTranscription,
    stopTranscription,
    clearTranscripts,
    getOrderedTranscripts,
    getCurrentPartial
  } = useLiveCaptions();

  const [showSpeakers, setShowSpeakers] = useState<boolean>(false);

  useEffect(() => {
    // Automatically start transcription when component mounts
    if (isConnected && !isListening) {
      startTranscription();
    }
    if (!isListening) {
      console.log('📢📢📢Starting live captions...', speakers);
    }
  }, [isListening, startTranscription]);

  const orderedTranscripts: Transcript[] = getOrderedTranscripts();
  const currentPartial: Transcript | null = getCurrentPartial();
  const recentTranscripts: Transcript[] = orderedTranscripts.slice(-maxCaptions);

  // Get speaker color for consistent UI
  const getSpeakerColor = (speaker: string): string => {
    const colors = [
      'bg-blue-100 text-blue-800',
      'bg-green-100 text-green-800',
      'bg-purple-100 text-purple-800',
      'bg-yellow-100 text-yellow-800',
      'bg-pink-100 text-pink-800',
      'bg-indigo-100 text-indigo-800'
    ];
    const speakerNum = speaker ? parseInt(speaker.replace(/\D/g, '')) || 0 : 0;
    return colors[speakerNum % colors.length];
  };

  const getStatusColor = (): string => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-600';
      case 'connecting': return 'text-yellow-600';
      case 'disconnecting': return 'text-orange-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusText = (): string => {
    switch (connectionStatus) {
      case 'connected': return isListening ? 'Live' : 'Connected';
      case 'connecting': return 'Connecting...';
      case 'disconnecting': return 'Disconnecting...';
      case 'error': return 'Error';
      default: return 'Disconnected';
    }
  };

  return (
    <div className={`live-captions ${className}`}>
      {/* Control Panel */}

      {/* Speaker Panel */}
      {showSpeakers && Object.keys(speakers).length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
          <h4 className="font-semibold text-gray-800 mb-3">Active Speakers</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {Object.entries(speakers).map(([speakerId, speakerInfo]: [string, Speaker]) => (
              <div key={speakerId} className="flex items-center space-x-2 p-2 bg-gray-50 rounded-md">
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${getSpeakerColor(speakerId)}`}>
                  {speakerInfo.name}
                </div>
                <span className="text-xs text-gray-600">
                  {speakerInfo.totalMessages} messages
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Captions Display */}
      <div className="bg-black bg-opacity-75 rounded-lg p-4 min-h-[200px] max-h-[400px] overflow-y-auto">
        {/* Recent Final Transcripts */}
        {recentTranscripts.map((transcript: Transcript) => (
          <div
            key={transcript.id}
            className="mb-3 p-3 bg-white bg-opacity-10 rounded-md"
          >
            <div className="flex items-center space-x-2 mb-1">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSpeakerColor(transcript.speaker)}`}>
                {speakers[transcript.speaker]?.name || `Speaker ${transcript.speaker}`}
              </span>
              <span className="text-xs text-gray-300">{transcript.timestamp}</span>
            </div>
            <p className="text-white text-lg leading-relaxed">{transcript.text}</p>
          </div>
        ))}

        {/* Current Partial Transcript */}
        {currentPartial && (
          <div className="p-3 bg-yellow-500 bg-opacity-20 rounded-md border-l-4 border-yellow-400">
            <div className="flex items-center space-x-2 mb-1">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSpeakerColor(currentPartial.speaker)}`}>
                {speakers[currentPartial.speaker]?.name || `Speaker ${currentPartial.speaker}`}
              </span>
              <span className="text-xs text-gray-300">Live</span>
            </div>
            <p className="text-white text-lg leading-relaxed opacity-80">
              {currentPartial.text}
              <span className="animate-pulse ml-1">|</span>
            </p>
          </div>
        )}

        {/* Empty State */}
        {!isListening && recentTranscripts.length === 0 && !currentPartial && (
          <div className="flex items-center justify-center h-32">
            <p className="text-gray-400 text-center">
              Click "Start Captions" to begin live transcription
            </p>
          </div>
        )}

        {/* Listening State */}
        {isListening && recentTranscripts.length === 0 && !currentPartial && (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="animate-pulse text-green-400 mb-2">🎤</div>
              <p className="text-gray-400">Listening for speech...</p>
            </div>
          </div>
        )}
      </div>

      {/* Caption Count */}
      {recentTranscripts.length > 0 && (
        <div className="mt-2 text-center">
          <span className="text-xs text-gray-500">
            Showing {recentTranscripts.length} recent captions
            {orderedTranscripts.length > maxCaptions && 
              ` (${orderedTranscripts.length - maxCaptions} older captions hidden)`
            }
          </span>
        </div>
      )}
    </div>
  );
};

export default LiveCaptions;