'use client';

import { useLiveCaptionsContext } from "./liveCaptionContext"; 
import { useEffect, useState } from "react";

const LiveCaptions: React.FC = () => {
  const {
    isListening,
    getOrderedTranscripts,
    currentPartial
  } = useLiveCaptionsContext();

  const orderedTranscripts = getOrderedTranscripts();
  const latestFinal = orderedTranscripts.at(-1);
  const [display, setDisplay] = useState(true);

  // Get speaker and text from either partial or final
  const speaker = currentPartial?.speaker || latestFinal?.speaker || '';
  let text = currentPartial?.text || latestFinal?.text || '';
  const showCaption = Boolean(text);

  useEffect(() => {
    if (showCaption) {
      setDisplay(true);
      const timeout = setTimeout(() => setDisplay(false), 4000); // Hide after 4 seconds
      return () => clearTimeout(timeout);
    } else {
      setDisplay(false);
      text = ''; // Clear text if no caption to show
    }
  }, [showCaption, text]);


  return (
    <div className="">
      {showCaption && isListening && (
        <div className={`${display ? 'inline-block' : 'hidden' } px-4 py-2 bg-black bg-opacity-70 text-white text-lg rounded shadow-md transition-opacity duration-300`}>
          {speaker && <div className="text-sm font-semibold text-purple-400 mb-1 uppercase tracking-wide">{speaker}:</div>}
          <div className="inline-block">
            {text}
            {currentPartial && <span className="animate-pulse ml-1">|</span>}
          </div>
        </div>
      )}
      {!text && isListening && (
        <div className="text-center text-sm text-gray-400 bg-background max-w-max p-1 mx-auto">Listening...</div>
      )}
    </div>
  );
};

export default LiveCaptions;
