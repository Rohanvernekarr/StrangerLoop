'use client';

import { useEffect, useRef, useState } from 'react';
import { getSocket } from '../lib/socket';
import { SignalingData, ChatMessage } from '../../../shared/types';
import Controls from './Controls';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export default function VideoChat() {
  const [isConnected, setIsConnected] = useState(false);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [isWaiting, setIsWaiting] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [hasRemoteStream, setHasRemoteStream] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef(getSocket());

  // Initialize media and socket
  useEffect(() => {
    const socket = socketRef.current;

    const initMedia = async () => {
      // Connect socket first, regardless of media access
      socket.connect();
      
      socket.on('connect', () => {
        console.log('Socket connected:', socket.id);
        setIsConnected(true);
      });
      
      socket.on('disconnect', () => {
        console.log('Socket disconnected');
        setIsConnected(false);
      });

      // Try to get media, but don't block if unavailable
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });

        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        console.log('✅ Media access granted:', stream.getTracks().map(t => `${t.kind}:${t.enabled}`));
      } catch (error) {
        console.log('⚠️ Media access denied, creating dummy video stream');
        
        // Create a canvas-based dummy video stream for testing
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 640;
          canvas.height = 480;
          const ctx = canvas.getContext('2d');
          
          // Draw a simple pattern
          if (ctx) {
            ctx.fillStyle = '#4F46E5';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'white';
            ctx.font = '48px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Camera Off', canvas.width/2, canvas.height/2);
          }
          
          const dummyStream = canvas.captureStream(30);
          localStreamRef.current = dummyStream;
          
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = dummyStream;
          }
          
          console.log('✅ Dummy video stream created:', dummyStream.getTracks().map(t => t.kind));
        } catch (dummyError) {
          console.error('❌ Failed to create dummy stream:', dummyError);
          localStreamRef.current = null;
        }
      }
    };

    initMedia();

    // Socket event listeners
    socket.on('waiting', () => {
      console.log('⏳ Waiting for match...');
      setIsWaiting(true);
      setPartnerId(null);
    });

    socket.on('match-found', ({ partnerId: newPartnerId, shouldInitiate }) => {
      console.log('🎉 Match found:', newPartnerId, 'Should initiate:', shouldInitiate);
      setIsWaiting(false);
      setPartnerId(newPartnerId);
      createPeerConnection(newPartnerId, shouldInitiate);
    });

    socket.on('offer', async (data: SignalingData) => {
      console.log('Received offer from:', data.from);
      
      try {
        // Only create peer connection if we don't have one yet
        if (!peerConnectionRef.current) {
          await createPeerConnection(data.from, false);
        }
        
        if (peerConnectionRef.current && data.offer) {
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(data.offer)
          );
          
          const answer = await peerConnectionRef.current.createAnswer();
          await peerConnectionRef.current.setLocalDescription(answer);
          
          socket.emit('answer', {
            to: data.from,
            from: socket.id!,
            answer,
            type: 'answer' as const
          });
        }
      } catch (error) {
        console.error('Error handling offer:', error);
      }
    });

    socket.on('answer', async (data: SignalingData) => {
      console.log('Received answer from:', data.from);
      
      try {
        if (peerConnectionRef.current && data.answer) {
          const currentState = peerConnectionRef.current.signalingState;
          console.log('Current signaling state:', currentState);
          
          if (currentState === 'have-local-offer') {
            await peerConnectionRef.current.setRemoteDescription(
              new RTCSessionDescription(data.answer)
            );
          } else {
            console.warn('Ignoring answer in state:', currentState);
          }
        }
      } catch (error) {
        console.error('Error handling answer:', error);
      }
    });

    socket.on('ice-candidate', async (data: SignalingData) => {
      console.log('Received ICE candidate from:', data.from);
      
      try {
        if (peerConnectionRef.current && data.candidate) {
          await peerConnectionRef.current.addIceCandidate(
            new RTCIceCandidate(data.candidate)
          );
        }
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    });

    socket.on('chat-message', (data: ChatMessage) => {
      setMessages(prev => [...prev, data]);
    });

    socket.on('partner-disconnected', () => {
      console.log('Partner disconnected');
      closePeerConnection();
      setPartnerId(null);
      setMessages([]);
      alert('Partner disconnected. Click "Find Match" to continue.');
    });

    return () => {
      socket.off('waiting');
      socket.off('match-found');
      socket.off('offer');
      socket.off('answer');
      socket.off('ice-candidate');
      socket.off('chat-message');
      socket.off('partner-disconnected');
      
      closePeerConnection();
      
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      socket.disconnect();
    };
  }, []);

  const createPeerConnection = async (peerId: string, isInitiator: boolean) => {
    try {
      const peerConnection = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = peerConnection;

      // Add local stream tracks
      if (localStreamRef.current) {
        console.log('📤 Adding local tracks to peer connection:');
        localStreamRef.current.getTracks().forEach(track => {
          console.log(`  - ${track.kind}: ${track.enabled ? 'enabled' : 'disabled'}`);
          peerConnection.addTrack(track, localStreamRef.current!);
        });
      } else {
        console.log('⚠️ No local stream available to add to peer connection');
      }

      // Handle incoming tracks
      peerConnection.ontrack = (event) => {
        console.log('📺 Received remote track:', event.track.kind, 'enabled:', event.track.enabled, 'readyState:', event.track.readyState);
        console.log('📺 Remote stream:', event.streams[0]);
        console.log('📺 Stream tracks:', event.streams[0]?.getTracks().map(t => `${t.kind}:${t.enabled}:${t.readyState}`));
        
        if (remoteVideoRef.current && event.streams[0]) {
          console.log('📺 Setting remote video srcObject...');
          remoteVideoRef.current.srcObject = event.streams[0];
          setHasRemoteStream(true);
          
          // Force video to play and trigger a re-render
          setTimeout(() => {
            if (remoteVideoRef.current) {
              remoteVideoRef.current.play().catch(e => console.log('Video play error:', e));
            }
          }, 100);
          
          console.log('✅ Remote video element updated');
        } else {
          console.error('❌ No remote video element or stream');
        }
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('🧊 Sending ICE candidate:', event.candidate.type);
          socketRef.current.emit('ice-candidate', {
            to: peerId,
            from: socketRef.current.id!,
            candidate: event.candidate.toJSON(),
            type: 'ice-candidate' as const
          });
        } else {
          console.log('🧊 ICE gathering completed');
        }
      };

      peerConnection.onconnectionstatechange = () => {
        console.log('🔗 Connection state:', peerConnection.connectionState);
        if (peerConnection.connectionState === 'connected') {
          console.log('🎉 WebRTC connection established successfully!');
        } else if (peerConnection.connectionState === 'failed') {
          console.error('❌ WebRTC connection failed');
        }
      };

      peerConnection.oniceconnectionstatechange = () => {
        console.log('🧊 ICE connection state:', peerConnection.iceConnectionState);
      };

      peerConnection.onicegatheringstatechange = () => {
        console.log('📡 ICE gathering state:', peerConnection.iceGatheringState);
      };

      // Create offer if initiator
      if (isInitiator) {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        
        socketRef.current.emit('offer', {
          to: peerId,
          from: socketRef.current.id!,
          offer,
          type: 'offer' as const
        });
      }
    } catch (error) {
      console.error('Error creating peer connection:', error);
    }
  };

  const closePeerConnection = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    
    setHasRemoteStream(false);
  };

  const findMatch = () => {
    console.log('Find Match clicked, socket connected:', socketRef.current.connected);
    closePeerConnection();
    setMessages([]);
    setPartnerId(null);
    setIsWaiting(false);
    socketRef.current.emit('find-match');
    console.log('find-match event emitted');
  };

  const skipPartner = () => {
    closePeerConnection();
    setMessages([]);
    socketRef.current.emit('skip');
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const sendMessage = (message: string) => {
    if (!message.trim() || !partnerId) return;
    
    const chatMessage: ChatMessage = {
      from: socketRef.current.id!,
      message,
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, { ...chatMessage, from: 'You' }]);
    socketRef.current.emit('chat-message', chatMessage);
  };

  return (
   <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-950 to-gray-900 text-white font-inter">
  {/* Header */}
  <header className="w-full py-6 shadow-lg bg-gradient-to-b from-slate-900 to-transparent">
    <h1 className="text-4xl font-extrabold text-center tracking-tight text-blue-400">
      StrangerLoop <span className="text-white font-light">— Random Video Chat</span>
    </h1>
    <p className="text-center text-blue-300 text-md mt-2">Connect, chat, and meet new people instantly.</p>
  </header>

  {/* Main Layout */}
  <main className="flex-1 container mx-auto grid lg:grid-cols-2 gap-8 px-4 py-8">
    {/* Local Video Card */}
    <div className="relative group bg-black rounded-xl overflow-hidden shadow-xl aspect-video border-4 border-blue-700">
      <video
        ref={localVideoRef}
        autoPlay
        muted
        playsInline
        className="w-full h-full object-cover transition group-hover:scale-105 duration-300"
      />
      <div className="absolute bottom-4 left-4 bg-blue-700/60 px-4 py-2 rounded-xl text-lg font-semibold shadow-lg">
        <span className="inline-flex items-center gap-2"><span className="text-green-400 animate-pulse">●</span> You</span>
      </div>
      <div className="absolute top-4 right-4 bg-black/70 px-2 py-1 rounded text-xs text-blue-300">
        Your Camera
      </div>
    </div>

    {/* Remote Video Card */}
    <div className="relative group bg-black rounded-xl overflow-hidden shadow-xl aspect-video border-1 ">
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        muted={false}
        controls={false}
        className="w-full h-full object-cover transition group-hover:scale-105 duration-300"
        onLoadedMetadata={() => console.log('📺 Remote video metadata loaded')}
        onCanPlay={() => console.log('📺 Remote video can play')}
        onPlay={() => console.log('📺 Remote video started playing')}
        onError={(e) => console.error('📺 Remote video error:', e)}
      />
      {isWaiting && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center">
          <span className="animate-spin border-1  rounded-full h-10 w-10 mb-6"></span>
          <p className="text-lg font-semibold text-blue-300">Looking for a stranger...</p>
        </div>
      )}
      {!partnerId && !isWaiting && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center">
          <p className="text-lg font-semibold text-fuchsia-200">Click "Find Match" to start</p>
        </div>
      )}
      {partnerId && !hasRemoteStream && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center">
          <p className="text-lg font-bold text-fuchsia-200">Connected!</p>
          <p className="text-base text-gray-300 mt-1">Waiting for stream…</p>
          <p className="text-xs text-gray-400 mt-2 italic">Check your camera permissions</p>
        </div>
      )}
      {partnerId && (
        <div className="absolute bottom-4 left-4 bg-fuchsia-600/80 px-4 py-2 rounded-xl text-lg font-semibold shadow-lg">
          Stranger
        </div>
      )}
      <div className="absolute top-4 right-4 bg-black/70 px-2 py-1 rounded text-xs text-fuchsia-200">
        Stranger's Camera
      </div>
    </div>
  </main>

  {/* Controls and Chat */}
  <section className="container mx-auto mb-8 px-4">
    <Controls
      onFindMatch={findMatch}
      onSkip={skipPartner}
      onToggleMute={toggleMute}
      onToggleVideo={toggleVideo}
      onSendMessage={sendMessage}
      isMuted={isMuted}
      isVideoOff={isVideoOff}
      hasPartner={!!partnerId}
      messages={messages}
      
    />
  </section>
</div>

  );
}
