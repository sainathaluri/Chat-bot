import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { createBlob, decode, decodeAudioData } from '../utils/audio-utils';
import { LiveSessionStatus } from '../types';

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

const ASPEN_SYSTEM_INSTRUCTION = `
Role: You are "Aspen," the Lead Performance Coordinator for a high-end gym in Boulder, Colorado.
Tone: Athletic, professional, calm, and encouraging. You sound like a high-end coach who values both hard work and deep recovery.
Voice: Use a calm, slightly energetic, professional voice.

Core Objectives:
1. Promote the Trial: Drive new inquiries toward the $100 First-Month Unlimited Trial.
2. Schedule Sessions: Coordinate between personal trainers and recovery services (Sauna, Cold Plunge, Yoga).
3. Consultative Selling: Match the caller's fitness goals to specific packages.

Key Talking Points:
- The Boulder Edge: "We don't just train athletes; we sustain them. We bridge the gap between high-intensity personal training and elite recovery."
- The Recovery Suite: Mention the contrast therapy (Sauna/Cold Plunge) as essential for local athletes training in the Rockies.
- The Trial Offer: "It's $100 for your first month. That includes unlimited access to all recovery modalities and classes so you can see how our ecosystem works before committing."

Conversational Rules:
- Acknowledge the Environment: If they mention hiking, skiing, or trail running, relate the recovery services to those activities.
- Simplicity: If a user is confused by schedules, offer to "look at the master calendar" and find the best gap for them.
- The Close: Always end by asking if they’d like to book a tour or start their $100 trial today.

Identity: "You are an expert concierge at a luxury athletic club in Boulder. You are articulate and never sound rushed."
Knowledge:
- Sarah: Focuses on mobility and injury prevention.
- Mike: Focuses on strength and conditioning.
- Cold Plunge Benefits: Reduces inflammation, improves circulation, boosts mood.
Guardrails:
- If someone asks for a medical diagnosis, tell them to consult a doctor.
- Do not offer discounts beyond the $100 trial.
`;

export function useLiveSession() {
  const [status, setStatus] = useState<LiveSessionStatus>('disconnected');
  const [volume, setVolume] = useState(0);
  
  // Refs for audio context and resources
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const outputGainRef = useRef<GainNode | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const sessionRef = useRef<any>(null); // To hold the active session
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const animationFrameRef = useRef<number | null>(null);
  const connectedRef = useRef(false);

  const disconnect = useCallback(() => {
    // Close the session via API if possible (no explicit close method on session object usually, but we stop sending)
    // The LiveClient doesn't have a simple close method on the promise result, usually we just stop the stream.
    // However, the `connect` returns a promise that resolves to the session.
    // We can rely on `callbacks.onclose` if the server hangs up, but here we just clean up local resources.
    
    connectedRef.current = false;

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }
    if (inputSourceRef.current) {
      inputSourceRef.current.disconnect();
      inputSourceRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }
    
    // Stop all playing sources
    sourcesRef.current.forEach(source => {
        try { source.stop(); } catch (e) { /* ignore */ }
    });
    sourcesRef.current.clear();

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    setStatus('disconnected');
    setVolume(0);
  }, []);

  const connect = useCallback(async () => {
    if (status === 'connected' || status === 'connecting') return;
    setStatus('connecting');

    try {
      // 1. Initialize Audio Contexts
      const inputCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
      inputAudioContextRef.current = inputCtx;
      outputAudioContextRef.current = outputCtx;

      // Output setup for visualization
      const analyzer = outputCtx.createAnalyser();
      analyzer.fftSize = 256;
      analyzerRef.current = analyzer;
      const outputGain = outputCtx.createGain();
      outputGainRef.current = outputGain;
      outputGain.connect(analyzer);
      analyzer.connect(outputCtx.destination);

      // 2. Get Microphone Stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // 3. Initialize Gemini API
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // 4. Connect to Live API
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }, // Using Kore for a balanced tone
          },
          systemInstruction: ASPEN_SYSTEM_INSTRUCTION,
        },
        callbacks: {
          onopen: () => {
            console.log('Gemini Live API Connected');
            setStatus('connected');
            connectedRef.current = true;

            // Setup Input Streaming
            const source = inputCtx.createMediaStreamSource(stream);
            inputSourceRef.current = source;
            
            // Note: ScriptProcessor is deprecated but widely supported and used in official examples for raw PCM.
            // A production app might use AudioWorklet.
            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then(session => {
                  session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(processor);
            processor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              const ctx = outputAudioContextRef.current;
              if (!ctx) return;

              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              
              const audioBuffer = await decodeAudioData(
                decode(base64Audio),
                ctx,
                24000,
                1
              );
              
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputGainRef.current!);
              
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
              });
              
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            // Handle Interruption
            if (message.serverContent?.interrupted) {
                sourcesRef.current.forEach(source => {
                    try { source.stop(); } catch (e) { /* ignore */ }
                });
                sourcesRef.current.clear();
                nextStartTimeRef.current = 0;
            }
          },
          onclose: () => {
            console.log('Gemini Live API Closed');
            disconnect();
          },
          onerror: (err) => {
            console.error('Gemini Live API Error', err);
            disconnect();
            setStatus('error');
          }
        }
      });
      
      sessionRef.current = sessionPromise;

      // 5. Start Visualization Loop
      const updateVolume = () => {
        if (analyzerRef.current && connectedRef.current) {
          const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
          analyzerRef.current.getByteFrequencyData(dataArray);
          const avg = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setVolume(avg); // Normalized roughly 0-255
        }
        if (connectedRef.current) {
            animationFrameRef.current = requestAnimationFrame(updateVolume);
        }
      };
      
      connectedRef.current = true;
      updateVolume();

    } catch (error) {
      console.error('Failed to connect:', error);
      setStatus('error');
      disconnect();
    }
  }, [status, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    status,
    connect,
    disconnect,
    volume
  };
}