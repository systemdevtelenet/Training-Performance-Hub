import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, X, Minus, Sparkles, Mic, Send, Navigation, AlertTriangle, TrendingDown, BarChart2, History, MessageSquare, Maximize2, Minimize2, HelpCircle, Paperclip, Square, Plus, Trash2 } from 'lucide-react';
import { useRole } from '@/components/providers/RoleProvider';
import { toast } from 'react-hot-toast';

type Message = {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  toolExecuted?: string;
  action?: { type: string; path: string } | null;
  modelUsed?: string;
};

const getTechSavvyLabel = (p: string) => {
  if (p.includes('/trainers?tab=reliability') || p.includes('reliability')) return 'Open Trainer Reliability Dashboard →';
  if (p.includes('/traffic-lights')) return 'Launch Traffic Light Monitor →';
  if (p.includes('/trainers')) return 'View Trainer Directory & Analytics →';
  if (p.includes('/trainees')) return 'Open Trainees Directory →';
  if (p.includes('/analytics')) return 'View Analytics & Performance Trends →';
  if (p.includes('/history')) return 'View System Audit Log →';
  return 'Navigate to Dashboard View →';
};

type ChatSession = {
  id: string;
  title: string;
  time: string;
  timestamp: number;
  messages: Message[];
};

export default function AiHubDrawer() {
  const router = useRouter();
  const { role, email } = useRole();
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [inputText, setInputText] = useState('');
  const [view, setView] = useState<'chat' | 'history'>('chat');
  const [isMaximized, setIsMaximized] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);

  const userInitials = 'NJ';

  const defaultWelcomeMessage: Message = {
    id: 'welcome',
    sender: 'ai',
    text: 'Hi there! I am your Training Performance Hub AI. How can I help you navigate or analyze your training performance, attendance, and attrition data today?',
  };

  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([defaultWelcomeMessage]);

  const [audioLevels, setAudioLevels] = useState<number[]>(Array(28).fill(0.2));
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Load persistent chat history & auto-restore the most recent session from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tph_ai_chat_sessions');
      if (saved) {
        try {
          const parsed: ChatSession[] = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Clean up legacy non-serializable objects from messages if present
            const cleanedSessions = parsed.map(session => ({
              ...session,
              messages: session.messages.map(m => {
                const { resultCard, ...rest } = m as any;
                return rest as Message;
              })
            }));

            setChatSessions(cleanedSessions);
            // Auto-restore the most recent active chat thread so closing/opening drawer keeps conversation
            const latestSession = cleanedSessions[0];
            if (latestSession && latestSession.messages?.length > 0) {
              setActiveSessionId(latestSession.id);
              setMessages(latestSession.messages);
            }
          }
        } catch (e) {
          console.warn('Failed to load chat history:', e);
        }
      }
    }
  }, []);

  // Save chat session whenever messages update
  const saveSessionToHistory = (newMsgList: Message[], userQueryText: string) => {
    setChatSessions(prev => {
      const currentId = activeSessionId || Date.now().toString();
      if (!activeSessionId) {
        setActiveSessionId(currentId);
      }

      const existingIndex = prev.findIndex(s => s.id === currentId);
      const title = userQueryText.length > 35 ? userQueryText.substring(0, 35) + '...' : userQueryText;
      const formattedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      let updatedSessions: ChatSession[];
      if (existingIndex >= 0) {
        updatedSessions = [...prev];
        updatedSessions[existingIndex] = {
          ...updatedSessions[existingIndex],
          messages: newMsgList,
          time: `Today at ${formattedTime}`
        };
      } else {
        const newSession: ChatSession = {
          id: currentId,
          title,
          time: `Today at ${formattedTime}`,
          timestamp: Date.now(),
          messages: newMsgList
        };
        updatedSessions = [newSession, ...prev];
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('tph_ai_chat_sessions', JSON.stringify(updatedSessions));
      }

      return updatedSessions;
    });
  };

  const handleStartNewChat = () => {
    setActiveSessionId(null);
    setMessages([defaultWelcomeMessage]);
    setView('chat');
  };

  const handleLoadSession = (session: ChatSession) => {
    setActiveSessionId(session.id);
    setMessages(session.messages);
    setView('chat');
  };

  const handleDeleteSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    setChatSessions(prev => {
      const updated = prev.filter(s => s.id !== sessionId);
      if (typeof window !== 'undefined') {
        localStorage.setItem('tph_ai_chat_sessions', JSON.stringify(updated));
      }
      return updated;
    });

    if (activeSessionId === sessionId) {
      handleStartNewChat();
    }
  };

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, isOpen]);

  const stopListening = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch (e) {}
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      try { mediaStreamRef.current.getTracks().forEach(track => track.stop()); } catch (e) {}
      mediaStreamRef.current = null;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
      recognitionRef.current = null;
    }
    setIsListening(false);
    setAudioLevels(Array(28).fill(0.2));
  };

  // Clean up recognition and audio context on unmount
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, []);

  // Listen for external open commands (e.g. from Topbar or Analytics AI bar)
  useEffect(() => {
    const handleOpen = (e: Event) => {
      setIsOpen(true);
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.prompt) {
        setTimeout(() => {
          handleSendQuery(customEvent.detail.prompt);
        }, 100);
      }
    };
    window.addEventListener('open-ai-copilot', handleOpen);
    return () => window.removeEventListener('open-ai-copilot', handleOpen);
  }, []);

  const handleSendQuery = async (queryText: string) => {
    if (!queryText.trim() || isTyping) return;

    const userMsg: Message = { id: Date.now().toString(), sender: 'user', text: queryText };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: queryText,
          history: messages.map(m => ({
            role: m.sender === 'user' ? 'user' : 'assistant',
            content: m.text
          }))
        })
      });

      const data = await res.json();

      if (data.action?.type === 'navigate') {
        try { router.prefetch(data.action.path); } catch (e) {}
      }

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: data.reply || 'Here is the requested information.',
        action: data.action || null,
        modelUsed: data.modelUsed
      };

      setMessages(prev => {
        const nextList = [...prev, aiMsg];
        saveSessionToHistory(nextList, queryText);
        return nextList;
      });
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: 'Sorry, I ran into an issue connecting to the AI endpoint.'
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSuggestionClick = (type: 'reliability' | 'attrition' | 'summary' | 'help' | 'analytics') => {
    if (type === 'reliability') {
      handleSendQuery('Take me to Trainer Reliability and show critical cases');
    } else if (type === 'attrition') {
      handleSendQuery('Why did March attrition spike?');
    } else if (type === 'summary') {
      handleSendQuery('Show Q3 summary report');
    } else if (type === 'help') {
      handleSendQuery('Help & Support');
    } else if (type === 'analytics') {
      handleSendQuery('Navigate to Analytics Trends');
    }
  };

  const handleSendText = () => {
    const text = inputText;
    setInputText('');
    handleSendQuery(text);
  };

  const toggleListening = async () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Voice recognition is not supported on this browser.');
      return;
    }

    if (isListening) {
      stopListening();
      return;
    }

    // Connect Web Audio API to mic stream for real-time tone/volume visualization
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;

        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioContextClass();
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        audioContextRef.current = audioCtx;
        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const updateLevels = () => {
          analyser.getByteFrequencyData(dataArray);
          const levels: number[] = [];
          const numBars = 28;
          // Calculate overall speech energy for full line dynamics
          const speechEnergy = Array.from(dataArray.slice(0, 16)).reduce((a, b) => a + b, 0) / 16;
          
          for (let i = 0; i < numBars; i++) {
            // Map bar index 0-27 onto active human voice spectrum (bins 0-14)
            const binIdx = Math.floor((i / numBars) * 14);
            const freqVal = dataArray[binIdx] || 0;
            // Mix frequency bin value + overall speech energy for full-line dynamic movement
            const blended = (freqVal * 0.6) + (speechEnergy * 0.4);
            const normalized = Math.max(0.18, Math.min(1.0, blended / 110));
            levels.push(normalized);
          }
          setAudioLevels(levels);
          animFrameRef.current = requestAnimationFrame(updateLevels);
        };

        updateLevels();
      }
    } catch (err) {
      console.warn('Audio visualization not supported or blocked:', err);
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        if (currentTranscript) {
          setInputText(currentTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition status:', event.error);
        if (event.error === 'not-allowed' || event.error === 'permission-denied' || event.error === 'audio-capture') {
          stopListening();
          toast.error('Microphone blocked or no physical mic connected to PC.', { icon: '🎙️' });
        } else if (event.error !== 'no-speech') {
          stopListening();
        }
      };

      recognition.onend = () => {
        stopListening();
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('Speech recognition exception:', err);
      stopListening();
    }
  };

  return (
    <>
      {/* Floating Action Button (FAB) - Hidden per company policy */}
      <div className={`hidden fixed bottom-1 right-2 z-50 transition-all duration-300 ${isOpen ? 'translate-y-20 opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}>
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center justify-center transition-all hover:scale-110 hover:-translate-y-1"
        >
          <Player
            autoplay
            loop
            src="/animations/AI chatbot-2.json"
            style={{ height: '60px', width: '60px' }}
          />

          {/* Tooltip Beside Button */}
          <div className="absolute right-full -mr-2 top-1/2 -translate-y-1/2 w-max opacity-0 translate-x-2 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
            <div className="relative rounded-xl bg-[#2F6798] px-3 py-1.5 text-xs font-medium text-white shadow-xl border border-[#2F6798]/50">
              Training Hub AI
              <div className="absolute -right-1 top-1/2 -translate-y-1/2 h-2 w-2 rotate-45 bg-[#2F6798] border-t border-r border-[#2F6798]/50"></div>
            </div>
          </div>
        </button>
      </div>

      {/* Slide-Over Drawer / Pop-up Chat */}
      <div
        className={`fixed z-50 flex flex-col overflow-hidden bg-white dark:bg-slate-950 shadow-2xl transition-all duration-300 ease-in-out ${isMaximized
          ? `inset-4 md:inset-8 lg:inset-x-40 lg:inset-y-12 rounded-[24px] border border-slate-200 dark:border-slate-800 ${isOpen ? 'opacity-100 scale-100 translate-x-0' : 'opacity-0 scale-95 translate-x-full pointer-events-none'}`
          : `inset-y-0 right-0 w-full max-w-md border-l border-slate-200 dark:border-slate-800 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`
          }`}
      >
        {/* Header Bar - Styled in Primary Theme Blue (#2F6798) */}
        <div className="flex items-center justify-between bg-[#2F6798] px-5 py-4 text-white shadow-md">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/20 border border-white/30 shadow-xs">
              <Player
                autoplay
                loop
                src="/animations/AI chatbot-2.json"
                style={{ height: '30px', width: '30px' }}
              />
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#2F6798] bg-emerald-400"></span>
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">Training Hub AI</h2>
              <p className="text-xs text-white/80 flex items-center gap-1 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span> Active
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-white/80">
            <button
              onClick={handleStartNewChat}
              className="rounded-md p-2 transition-colors hover:bg-white/15 hover:text-white"
              title="New Chat"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView(view === 'chat' ? 'history' : 'chat')}
              className={`rounded-md p-2 transition-colors ${view === 'history' ? 'bg-white/25 text-white' : 'hover:bg-white/15 hover:text-white'}`}
              title="Chat History"
            >
              <History className="h-4 w-4" />
            </button>
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="rounded-md p-2 hover:bg-white/15 hover:text-white"
              title={isMaximized ? "Restore down" : "Maximize"}
            >
              {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-md p-2 hover:bg-white/15 hover:text-white"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        {view === 'history' ? (
          <div className="flex-1 overflow-y-auto p-0">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400">Recent Conversations</h3>
              <button
                onClick={handleStartNewChat}
                className="flex items-center gap-1.5 rounded-full bg-[#2F6798] px-3 py-1 text-xs font-semibold text-white shadow-xs hover:bg-[#235179] transition-all cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                New Chat
              </button>
            </div>

            {chatSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <MessageSquare className="h-10 w-10 stroke-[1.5] text-slate-300 dark:text-slate-700 mb-2" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">No past conversations yet</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">Ask a question to Training Hub AI to automatically save your chat history here.</p>
                <button
                  onClick={handleStartNewChat}
                  className="mt-4 flex items-center gap-1.5 rounded-xl bg-[#2F6798]/10 text-[#2F6798] border border-[#2F6798]/30 px-4 py-2 text-xs font-semibold hover:bg-[#2F6798]/20 transition-all cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Start a new conversation
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {chatSessions.map((session) => {
                  const isActive = session.id === activeSessionId;
                  return (
                    <div
                      key={session.id}
                      onClick={() => handleLoadSession(session)}
                      className={`group w-full flex items-center justify-between p-4 text-left transition-colors cursor-pointer ${isActive ? 'bg-blue-50/60 dark:bg-slate-900' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors ${isActive ? 'bg-[#2F6798] text-white border-[#2F6798]' : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'}`}>
                          <MessageSquare className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium truncate ${isActive ? 'text-[#2F6798] font-bold dark:text-blue-400' : 'text-slate-800 dark:text-slate-200'}`}>
                            {session.title}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">{session.time}</p>
                        </div>
                      </div>

                      <button
                        title="Delete chat session"
                        onClick={(e) => handleDeleteSession(e, session.id)}
                        className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-all cursor-pointer shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* Centered Template Welcome & Compact 2x2 Grid of Quick Questions */}
            {messages.length <= 1 && (
              <div className="my-2 space-y-3 text-center animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#2F6798] border border-white/30 overflow-hidden shadow-md">
                  <Player
                    autoplay
                    loop
                    src="/animations/AI chatbot-2.json"
                    style={{ height: '36px', width: '36px' }}
                  />
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">How can I help you today?</h3>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                    Ask me about training performance, trainer reliability, attrition insights, or traffic light monitoring.
                  </p>
                </div>

                {/* Compact 2x2 Grid of Action Buttons (Consistent rounded-xl shape) */}
                <div className="grid grid-cols-2 gap-2 pt-1 text-left">
                  <button
                    onClick={() => handleSendQuery('Analyze training performance')}
                    className="flex flex-col justify-center rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-[10px] sm:text-[11px] font-semibold text-slate-700 dark:text-slate-200 shadow-2xs hover:border-[#2F6798] hover:bg-blue-50/50 hover:text-[#2F6798] transition-all cursor-pointer min-h-[36px]"
                  >
                    <span>Analyze training performance</span>
                  </button>

                  <button
                    onClick={() => handleSendQuery('Show trainer reliability')}
                    className="flex flex-col justify-center rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-[10px] sm:text-[11px] font-semibold text-slate-700 dark:text-slate-200 shadow-2xs hover:border-[#2F6798] hover:bg-blue-50/50 hover:text-[#2F6798] transition-all cursor-pointer min-h-[36px]"
                  >
                    <span>Show trainer reliability</span>
                  </button>

                  <button
                    onClick={() => handleSendQuery('Check traffic light statuses')}
                    className="flex flex-col justify-center rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-[10px] sm:text-[11px] font-semibold text-slate-700 dark:text-slate-200 shadow-2xs hover:border-[#2F6798] hover:bg-blue-50/50 hover:text-[#2F6798] transition-all cursor-pointer min-h-[36px]"
                  >
                    <span>Check traffic light statuses</span>
                  </button>

                  <button
                    onClick={() => handleSendQuery('Show team attrition analytics')}
                    className="flex flex-col justify-center rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-[10px] sm:text-[11px] font-semibold text-slate-700 dark:text-slate-200 shadow-2xs hover:border-[#2F6798] hover:bg-blue-50/50 hover:text-[#2F6798] transition-all cursor-pointer min-h-[36px]"
                  >
                    <span>Show team attrition analytics</span>
                  </button>
                </div>
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end gap-2.5' : 'gap-2.5'}`}>
                {msg.sender === 'ai' && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2F6798] shadow-xs border border-[#2F6798]/50 text-white">
                    <Player
                      autoplay
                      loop
                      src="/animations/AI chatbot-2.json"
                      style={{ height: '22px', width: '22px' }}
                    />
                  </div>
                )}

                <div className={msg.sender === 'user' ? 'max-w-[85%] rounded-2xl rounded-tr-sm bg-[#2F6798] px-3.5 py-2 text-xs font-medium text-white shadow-xs' : 'space-y-2.5 max-w-[85%]'}>
                  {msg.sender === 'user' ? (
                    msg.text
                  ) : (
                    <>
                      <div className="rounded-2xl rounded-tl-sm border border-slate-100 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 leading-relaxed">
                        {msg.text.split('**').map((part, i) => i % 2 === 1 ? <strong key={i} className="font-bold text-slate-900 dark:text-white">{part}</strong> : part)}
                      </div>

                      {/* Dynamic Navigation Action Card */}
                      {msg.action?.type === 'navigate' && msg.action.path && (
                        <div className="mt-2 flex w-full flex-col overflow-hidden rounded-xl border border-blue-100 bg-white shadow-xs dark:border-blue-900/30 dark:bg-slate-900">
                          <div className="flex items-center justify-between border-b border-blue-100 bg-blue-50 px-4 py-2.5 dark:border-blue-900/30 dark:bg-blue-900/10">
                            <div className="flex items-center gap-2">
                              <Navigation className="h-4 w-4 text-[#2F6798]" />
                              <span className="text-xs font-semibold text-[#2F6798]">Smart Navigation Ready</span>
                            </div>
                            <span className="text-[10px] font-mono text-slate-400">{msg.modelUsed || 'AI Engine'}</span>
                          </div>
                          <div className="p-3">
                            <button
                              onClick={() => {
                                router.push(msg.action!.path);
                                setIsOpen(false);
                              }}
                              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#2F6798] px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-[#235179] transition-colors cursor-pointer"
                            >
                              <Navigation className="h-3.5 w-3.5" />
                              {getTechSavvyLabel(msg.action!.path)}
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {msg.sender === 'user' && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-white shadow-xs font-black text-xs">
                    {userInitials}
                  </div>
                )}
              </div>
            ))}

            {/* AI Thinking / Processing Animated Bubble */}
            {isTyping && (
              <div className="flex gap-2.5 items-center animate-in fade-in duration-200">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2F6798] shadow-xs border border-[#2F6798]/50 text-white">
                  <Player
                    autoplay
                    loop
                    src="/animations/AI chatbot-2.json"
                    style={{ height: '22px', width: '22px' }}
                  />
                </div>
                <div className="rounded-2xl rounded-tl-sm border border-blue-100 bg-blue-50/50 px-4 py-2.5 text-xs text-[#2F6798] dark:border-blue-900/30 dark:bg-blue-900/10 dark:text-blue-400 flex items-center gap-2 font-medium">
                  <span>Training Hub AI is thinking</span>
                  <div className="flex items-center gap-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-[#2F6798] animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="h-1.5 w-1.5 rounded-full bg-[#2F6798] animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="h-1.5 w-1.5 rounded-full bg-[#2F6798] animate-bounce"></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input Footer Area */}
        {view === 'chat' && (
          <div className="border-t border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="relative flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-1.5 pr-2 focus-within:border-[#2F6798] focus-within:ring-1 focus-within:ring-[#2F6798] dark:border-slate-700 dark:bg-slate-900">
              
              {/* Voice-to-text Microphone Button */}
              <button
                title="Voice input (Speech-to-text)"
                onClick={toggleListening}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors cursor-pointer ${isListening
                  ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                  : 'text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300'
                  }`}
              >
                <Mic className="h-4 w-4" />
              </button>

              {isListening ? (
                <div className="flex-1 flex items-center gap-2.5 px-2 overflow-hidden">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 shrink-0">Listening...</span>
                  <div className="flex items-center justify-between flex-1 h-5 overflow-hidden gap-[2px] pr-1">
                    {audioLevels.map((lvl, idx) => (
                      <div
                        key={idx}
                        className="w-1 rounded-full bg-slate-400 dark:bg-slate-500 transition-all duration-75"
                        style={{
                          height: `${Math.max(18, lvl * 100)}%`,
                          opacity: Math.max(0.4, lvl)
                        }}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
                  placeholder="Ask Training Hub AI..."
                  className="flex-1 bg-transparent px-2 text-xs text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-200 dark:placeholder:text-slate-500"
                />
              )}

              {/* Stop Button (Circle with solid dark square - Gemini style) */}
              {isListening && (
                <button
                  title="Stop voice recording"
                  onClick={toggleListening}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  <Square className="h-3.5 w-3.5 fill-slate-700 dark:fill-slate-200" />
                </button>
              )}

              {/* Primary Blue Send Button */}
              <button
                onClick={handleSendText}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors cursor-pointer ${inputText.trim() || isListening
                  ? 'bg-[#2F6798] text-white hover:bg-[#235179]'
                  : 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600'
                  }`}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Overlay backdrop when drawer is open */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-xs transition-opacity dark:bg-slate-950/40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
