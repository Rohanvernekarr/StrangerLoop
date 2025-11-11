'use client';

import { useState } from 'react';
import { ChatMessage } from '../types/types';

interface ControlsProps {
  onFindMatch: () => void;
  onSkip: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onSendMessage: (message: string) => void;
  isMuted: boolean;
  isVideoOff: boolean;
  hasPartner: boolean;
  messages: ChatMessage[];
}

export default function Controls({
  onFindMatch,
  onSkip,
  onToggleMute,
  onToggleVideo,
  onSendMessage,
  isMuted,
  isVideoOff,
  hasPartner,
  messages
}: ControlsProps) {
  const [messageInput, setMessageInput] = useState('');

  const handleSend = () => {
    if (messageInput.trim()) {
      onSendMessage(messageInput);
      setMessageInput('');
    }
  };

  return (
    <div className="space-y-4">
      
      <div className="flex flex-wrap gap-2 justify-center">
        <button
          onClick={onFindMatch}
          className="px-4 py-2 bg-zinc-200 hover:bg-zinc-300 text-zinc-900 rounded-md font-medium transition-colors"
        >
          Find Match
        </button>

        <button
          onClick={onSkip}
          disabled={!hasPartner}
          className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>

        <button
          onClick={onToggleMute}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            isMuted
              ? 'bg-zinc-800 text-zinc-400'
              : 'bg-zinc-700 text-zinc-300'
          }`}
        >
          {isMuted ? ' Muted' : ' Audio'}
        </button>

        <button
          onClick={onToggleVideo}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            isVideoOff
              ? 'bg-zinc-800 text-zinc-400'
              : 'bg-zinc-700 text-zinc-300'
          }`}
        >
          {isVideoOff ? 'Off' : 'Video'}
        </button>
      </div>

      {/* Chat Section */}
     <div className=" rounded-xl p-2 border border-zinc-800 shadow-sm">
   
  <div className="bg-zinc-950 rounded-lg p-1 h-48 overflow-y-auto  ">
    {messages.length === 0 ? (
      <p className="text-zinc-500 text-sm text-center py-8">Start a conversation…</p>
    ) : (
      messages.map((msg, idx) => (
        <div key={idx} className={`flex ${msg.from === 'You' ? 'justify-end' : 'justify-start'} mb-2`}>
          <div
            className={`inline-block rounded-2xl px-4 py-1 text-[15px] max-w-xs break-words shadow-sm transition-all
              ${msg.from === 'You'
                ? 'bg-zinc-700 text-zinc-100 border border-zinc-700'
                : 'bg-zinc-800 text-zinc-300 border border-zinc-800'
              }
              hover:scale-[1.02] focus:scale-[1.03]`}
            tabIndex={0}
          >
            <div className="flex items-center gap-2 ">
              <span className="font-medium text-xs text-zinc-400">
                {msg.from === 'You' ? 'You' : 'Stranger'}
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div>{msg.message}</div>
          </div>
        </div>
      ))
    )}
  </div>

  <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); handleSend(); }}>
    <input
      type="text"
      value={messageInput}
      onChange={(e) => setMessageInput(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && handleSend()}
      placeholder="Type a message…"
      disabled={!hasPartner}
      className="flex-1 px-2 py-2 text-sm bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-500 placeholder:text-zinc-500 disabled:opacity-40"
    />
    <button
      onClick={handleSend}
      disabled={!hasPartner || !messageInput.trim()}
      className="px-5 py-2 bg-zinc-700 hover:bg-zinc-800 text-zinc-300 text-sm rounded-lg font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      type="submit"
    >
      Send
    </button>
  </form>
</div>

    </div>

  );
}
