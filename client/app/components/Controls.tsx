'use client';

import { useState } from 'react';
import { ChatMessage } from '../../../shared/types';

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
   <div className="space-y-6 font-inter">
  {/* Control Buttons */}
  <div className="flex flex-wrap gap-3 justify-center">
    <button
      onClick={onFindMatch}
      className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-50 rounded-lg font-semibold transition focus:outline-none focus:ring-2 focus:ring-zinc-600"
    >
      Find Match
    </button>

    <button
      onClick={onSkip}
      disabled={!hasPartner}
      className="px-6 py-3 bg-zinc-700 hover:bg-zinc-600 text-zinc-400 font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-zinc-500"
    >
      Next
    </button>

    <button
      onClick={onToggleMute}
      className={`px-6 py-3 font-semibold rounded-lg transition focus:outline-none focus:ring-2 ${
        isMuted
          ? 'bg-zinc-900 text-zinc-400 ring-zinc-700'
          : 'bg-zinc-800 text-zinc-50 ring-zinc-600'
      }`}
    >
      {isMuted ? '🔇 Unmute' : '🔊 Mute'}
    </button>

    <button
      onClick={onToggleVideo}
      className={`px-6 py-3 font-semibold rounded-lg transition focus:outline-none focus:ring-2 ${
        isVideoOff
          ? 'bg-zinc-900 text-zinc-400 ring-zinc-700'
          : 'bg-zinc-800 text-zinc-50 ring-zinc-600'
      }`}
    >
      {isVideoOff ? '📹 Video Off' : '📹 Video On'}
    </button>
  </div>

  {/* Chat Section */}
  <div className="bg-zinc-900/80 rounded-xl shadow-sm p-6">
    <h3 className="text-lg font-bold mb-4 tracking-tight text-zinc-200">Chat</h3>
    
    <div className="bg-zinc-950 rounded-xl p-3 h-48 overflow-y-auto mb-4 border border-zinc-800">
      {messages.length === 0 ? (
        <p className="text-zinc-500 text-center">No messages yet…</p>
      ) : (
        messages.map((msg, idx) => (
          <div
            key={idx}
            className={`mb-2 flex ${msg.from === 'You' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`rounded-2xl px-4 py-2 max-w-xs break-words shadow ${
                msg.from === 'You'
                  ? 'bg-zinc-700 text-zinc-100'
                  : 'bg-zinc-800 text-zinc-300'
              }`}
            >
              <span className="font-semibold text-zinc-400">{msg.from === 'You' ? 'You' : 'Stranger'}:</span>{' '}
              {msg.message}
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
        className="flex-1 px-4 py-2 text-zinc-100 bg-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-500"
      />
      <button
        onClick={handleSend}
        disabled={!hasPartner || !messageInput.trim()}
        className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-50 font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-zinc-700"
      >
        Send
      </button>
    </form>
  </div>
</div>

  );
}
