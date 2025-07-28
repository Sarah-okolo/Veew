// components/LiveCaptions.tsx
'use client';

import { useLiveCaptionsContext } from "./liveCaptionContext";


const LiveCaptions: React.FC = () => {
  const {
    isListening,
    getOrderedTranscripts,
    currentPartial
  } = useLiveCaptionsContext();

  
  const orderedTranscripts = getOrderedTranscripts();
  const latestFinal = orderedTranscripts.at(-1);

  const caption = currentPartial?.text || latestFinal?.text || '';
  const showCaption = Boolean(caption);


  return (
    <div className="">
      {showCaption && (
        <div className="inline-block px-4 py-2 bg-black bg-opacity-70 text-white text-lg rounded shadow-md transition-opacity duration-300">
          {caption}
          {currentPartial && <span className="animate-pulse ml-1">|</span>}
        </div>
      )}
      {!caption && isListening && (
        <div className="text-center text-sm text-gray-400">Listening for speech...</div>
      )}
    </div>
  );
};

export default LiveCaptions;
