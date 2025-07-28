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

  // Get speaker and text from either partial or final
  const speaker = currentPartial?.speaker || latestFinal?.speaker || '';
  const text = currentPartial?.text || latestFinal?.text || '';
  const showCaption = Boolean(text);

  return (
    <div className="">
      {showCaption && (
        <div className="inline-block px-4 py-2 bg-black bg-opacity-70 text-white text-lg rounded shadow-md transition-opacity duration-300">
          {speaker && <div className="text-sm font-semibold text-purple-400 mb-1 uppercase tracking-wide">{speaker}:</div>}
          <div className="inline-block">
            {text}
            {currentPartial && <span className="animate-pulse ml-1">|</span>}
          </div>
        </div>
      )}
      {!text && isListening && (
        <div className="text-center text-sm text-gray-400">No one is speaking...</div>
      )}
    </div>
  );
};

export default LiveCaptions;
