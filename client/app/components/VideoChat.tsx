'use client';

import { useEffect, useRef, useState } from 'react';
import { getSocket } from '../lib/socket';
import { SignalingData, ChatMessage } from '../types/types';
import Controls from './Controls';
import Link from 'next/link';

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
  const [liveStats, setLiveStats] = useState({
    totalConnected: 0,
    usersInQueue: 0,
    activeChats: 0,
    totalActiveUsers: 0
  });

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef(getSocket());

  // Initialize media and socket
  useEffect(() => {
    const socket = socketRef.current;

    const initMedia = async () => {
      console.log('Attempting to connect to socket server...');
      socket.connect();
      
      socket.on('connect', () => {
        console.log('Socket connected successfully:', socket.id);
        setIsConnected(true);
      });
      
      socket.on('connect_error', (error) => {
        console.error('Socket connection failed:', error);
        setIsConnected(false);
      });
      
      socket.on('disconnect', () => {
        console.log('🔌 Socket disconnected');
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
        console.log('Media access granted:', stream.getTracks().map(t => `${t.kind}:${t.enabled}`));
      } catch (error) {
        console.log('Media access denied, creating dummy video stream');
        
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 640;
          canvas.height = 480;
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'white';
            ctx.font = '48px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('0/0/0', canvas.width/2, canvas.height/2);
          }
          
          const dummyStream = canvas.captureStream(30);
          localStreamRef.current = dummyStream;
          
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = dummyStream;
          }
          
          console.log('Dummy video stream created:', dummyStream.getTracks().map(t => t.kind));
        } catch (dummyError) {
          console.error('Failed to create dummy stream:', dummyError);
          localStreamRef.current = null;
        }
      }
    };

    initMedia();

    // Socket event listeners
    socket.on('waiting', () => {
      console.log('Waiting for match...');
      setIsWaiting(true);
      setPartnerId(null);
    });

    socket.on('search-stopped', () => {
      console.log('Search stopped by user');
      setIsWaiting(false);
      setPartnerId(null);
    });

    socket.on('live-stats', (stats) => {
      console.log('Live stats updated:', stats);
      setLiveStats(stats);
    });

    socket.on('match-found', ({ partnerId: newPartnerId, shouldInitiate }) => {
      console.log(' Match found:', newPartnerId, 'Should initiate:', shouldInitiate);
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
      socket.off('search-stopped');
      socket.off('live-stats');
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
        console.log('Adding local tracks to peer connection:');
        localStreamRef.current.getTracks().forEach(track => {
          console.log(`  - ${track.kind}: ${track.enabled ? 'enabled' : 'disabled'}`);
          peerConnection.addTrack(track, localStreamRef.current!);
        });
      } else {
        console.log('No local stream available to add to peer connection');
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
          
          setTimeout(() => {
            if (remoteVideoRef.current) {
              remoteVideoRef.current.play().catch(e => console.log('Video play error:', e));
            }
          }, 100);
          
          console.log(' Remote video element updated');
        } else {
          console.error(' No remote video element or stream');
        }
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('Sending ICE candidate:', event.candidate.type);
          socketRef.current.emit('ice-candidate', {
            to: peerId,
            from: socketRef.current.id!,
            candidate: event.candidate.toJSON(),
            type: 'ice-candidate' as const
          });
        } else {
          console.log('ICE gathering completed');
        }
      };

      peerConnection.onconnectionstatechange = () => {
        console.log('Connection state:', peerConnection.connectionState);
        if (peerConnection.connectionState === 'connected') {
          console.log('WebRTC connection established successfully!');
        } else if (peerConnection.connectionState === 'failed') {
          console.error('WebRTC connection failed');
        }
      };

      peerConnection.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', peerConnection.iceConnectionState);
      };

      peerConnection.onicegatheringstatechange = () => {
        console.log('ICE gathering state:', peerConnection.iceGatheringState);
      };

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
    console.log(' Find Match clicked');
    console.log('Socket status:', {
      connected: socketRef.current.connected,
      id: socketRef.current.id,
      disconnected: socketRef.current.disconnected
    });
    
    if (!socketRef.current.connected) {
      console.error('Socket not connected! Attempting to reconnect...');
      socketRef.current.connect();
      return;
    }
    
    closePeerConnection();
    setMessages([]);
    setPartnerId(null);
    setIsWaiting(true);
    socketRef.current.emit('find-match');
    console.log('find-match event emitted');
  };

  const stopMatch = () => {
    console.log('Stop Match clicked');
    setIsWaiting(false);
    setPartnerId(null);
    closePeerConnection();
    setMessages([]);
    // Emit stop-match event to server to remove from queue
    socketRef.current.emit('stop-match');
    console.log('stop-match event emitted');
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
     
     <header className="border-b border-zinc-800 bg-zinc-900/60 backdrop-blur-lg">
  <div className="flex flex-col lg:flex-row items-center justify-between mx-auto px-4 py-5  w-full">
    <div className="flex-1 text-left">
      <h1 className="text-2xl lg:text-3xl font-extrabold text-zinc-100 tracking-tight leading-snug">
        StrangerLoop
      </h1>
      <p className="text-zinc-400 text-base mt-1">
        Connect with random strangers.
      </p>
    </div>

    <div className="flex items-center gap-6 mt-5 lg:mt-0">
     
      
      <Link
        href="/terms"
        className="text-sm text-zinc-400 hover:text-zinc-100 transition font-medium underline underline-offset-2"
        target="_blank"
        rel="noopener noreferrer"
      >
        Terms
      </Link>
      <Link
        href="/rules"
        className="text-sm text-zinc-400 hover:text-zinc-100 transition font-medium underline underline-offset-2"
        target="_blank"
        rel="noopener noreferrer"
      >
        Rules
      </Link>

      <div className="bg-zinc-800/80 border border-zinc-700 px-3 py-2 rounded-lg flex items-center gap-2 shadow-sm">
        <span className="text-zinc-400 text-xs font-medium  tracking-wide">Live Users</span>
        <span className="text-zinc-100 text-sm font-bold tabular-nums">
            {liveStats.totalActiveUsers}
        </span>
      
      </div>
    </div>
  </div>
</header>


      <div className="flex-1 flex flex-col lg:flex-row">
       
        <div className="flex-1 lg:flex-[2] p-4">
          <div className="relative bg-zinc-900 rounded-lg overflow-hidden h-full border border-zinc-700">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              muted={false}
              controls={false}
              className="w-full  object-cover scale-x-[-1]"
              onLoadedMetadata={() => console.log('Remote video metadata loaded')}
              onCanPlay={() => console.log('Remote video can play')}
              onPlay={() => console.log('Remote video started playing')}
              onError={(e) => console.error('Remote video error:', e)}
            />
            
            {isWaiting && (
              <div className="absolute inset-0 bg-zinc-900/90 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-zinc-600 border-t-zinc-300 mx-auto mb-4"></div>
                  <p className="text-zinc-300 font-medium">Looking for a stranger...</p>
                  <p className="text-zinc-500 text-sm mt-1">Please wait</p>
                </div>
              </div>
            )}
            
            {!partnerId && !isWaiting && (
              <div className="absolute inset-0 bg-zinc-900/90 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-zinc-300 text-lg font-medium">Ready to connect</p>
                  <p className="text-zinc-500 text-sm mt-1">Click "Find Match" to start</p>
                </div>
              </div>
            )}
            
            {partnerId && !hasRemoteStream && (
              <div className="absolute inset-0 bg-zinc-900/90 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-zinc-300 text-lg font-medium">Connected to stranger</p>
                  <p className="text-zinc-500 text-sm mt-1">Waiting for video stream...</p>
                </div>
              </div>
            )}
            
            {partnerId && (
              <div className="absolute bottom-4 left-4 bg-zinc-800/80 px-3 py-1 rounded-md backdrop-blur-sm">
                <span className="text-zinc-300 text-sm font-medium">Stranger</span>
              </div>
            )}
          </div>
        </div>

        <div className="lg:flex-1 p-4 flex flex-col">
          
          <div className="relative bg-zinc-900 rounded-lg overflow-hidden aspect-video mb-4 border border-zinc-700">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover scale-x-[-1]"
            />
            <div className="absolute bottom-4 left-4 bg-zinc-800/80 px-3 py-1 rounded-md backdrop-blur-sm">
              <span className="text-zinc-300 text-sm font-medium">You</span>
            </div>
          </div>

          <div className="flex-1">
            <Controls
              onFindMatch={findMatch}
              onStopMatch={stopMatch}
              onSkip={skipPartner}
              onToggleMute={toggleMute}
              onToggleVideo={toggleVideo}
              onSendMessage={sendMessage}
              isMuted={isMuted}
              isVideoOff={isVideoOff}
              hasPartner={!!partnerId}
              isWaiting={isWaiting}
              messages={messages}
            />
          </div>
        </div>
      </div>
    </div>

  );
}
