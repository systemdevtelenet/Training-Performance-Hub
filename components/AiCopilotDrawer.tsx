import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, X, Minus, Sparkles, Mic, Send, Navigation, AlertTriangle, TrendingDown, BarChart2, History, MessageSquare, Maximize2, Minimize2, Paperclip, HelpCircle } from 'lucide-react';

type Message = {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  toolExecuted?: string;
  resultCard?: React.ReactNode;
};

export default function AiCopilotDrawer() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [inputText, setInputText] = useState('');
  const [view, setView] = useState<'chat' | 'history'>('chat');
  const [isMaximized, setIsMaximized] = useState(false);
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: 'Hi there! I am your AI Operations Assistant. How can I help you navigate or analyze the training data today?',
    }
  ]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // Listen for external open commands (e.g. from Topbar)
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-ai-copilot', handleOpen);
    return () => window.removeEventListener('open-ai-copilot', handleOpen);
  }, []);

  const handleQuickPrompt = (userText: string, aiText: string) => {
    setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'user', text: userText }]);
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: aiText
      }]);
    }, 500);
  };

  const handleSuggestionClick = (type: 'reliability' | 'attrition' | 'summary' | 'help' | 'analytics') => {
    if (type === 'reliability') {
      const userMsg: Message = { id: Date.now().toString(), sender: 'user', text: 'Take me to trainer reliability and show me critical cases.' };
      setMessages(prev => [...prev, userMsg]);
      
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: 'Navigating you to Trainer Reliability view now...',
          toolExecuted: 'Routed to /trainers?tab=reliability',
          resultCard: (
            <div className="rounded-xl border border-red-100 bg-white overflow-hidden shadow-sm dark:border-red-900/30 dark:bg-slate-900">
              <div className="bg-red-50 px-4 py-2.5 flex items-center gap-2 border-b border-red-100 dark:bg-red-900/10 dark:border-red-900/30">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-500" />
                <span className="text-xs font-semibold text-red-700 dark:text-red-400">2 Critical Trainers Found</span>
              </div>
              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/50">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Rohla Mie Baswa</span>
                  <span className="font-semibold text-red-600 dark:text-red-400">31.5%</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/50">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Joven Anañon</span>
                  <span className="font-semibold text-red-600 dark:text-red-400">79.8%</span>
                </div>
              </div>
            </div>
          )
        }]);
      }, 500);
    } else if (type === 'attrition') {
      const userMsg: Message = { id: Date.now().toString(), sender: 'user', text: 'Why did March attrition spike?' };
      setMessages(prev => [...prev, userMsg]);

      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: 'March attrition reached **50.0%** primarily due to a small sample size in the **Inhouse Department**, where 1 loss occurred out of 2 active trainees.',
          resultCard: (
            <div className="rounded-xl border border-amber-100 bg-white overflow-hidden shadow-sm dark:border-amber-900/30 dark:bg-slate-900">
              <div className="bg-amber-50 px-4 py-2.5 flex items-center gap-2 border-b border-amber-100 dark:bg-amber-900/10 dark:border-amber-900/30">
                <TrendingDown className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">March Attrition Breakdown</span>
              </div>
              <div className="p-3 space-y-2">
                <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/50 flex flex-col gap-1">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Inhouse March Attrition</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">50.0% <span className="text-xs font-normal text-slate-500">(1 Loss / 2 Active HC)</span></span>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/50 flex flex-col gap-1">
                  <span className="font-medium text-slate-700 dark:text-slate-300">PST March Attrition</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">15.2% <span className="text-xs font-normal text-slate-500">(5 Losses / 33 Active HC)</span></span>
                </div>
                <div className="pt-2">
                  <button
                    onClick={() => {
                      router.push('/analytics');
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-amber-700 focus:outline-none"
                  >
                    <Navigation className="h-3 w-3" />
                    View Detailed Attrition Data
                  </button>
                </div>
              </div>
            </div>
          )
        }]);
      }, 500);
    } else if (type === 'summary') {
      const userMsg: Message = { id: Date.now().toString(), sender: 'user', text: 'Show Q3 summary report' };
      setMessages(prev => [...prev, userMsg]);

      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: 'Here is the high-level training performance overview for **Q3**:',
          toolExecuted: 'Filtered dashboard view to Q3',
          resultCard: (
            <div className="rounded-xl border border-blue-100 bg-white overflow-hidden shadow-sm dark:border-blue-900/30 dark:bg-slate-900">
              <div className="bg-blue-50 px-4 py-2.5 flex items-center gap-2 border-b border-blue-100 dark:bg-blue-900/10 dark:border-blue-900/30">
                <BarChart2 className="h-4 w-4 text-blue-600 dark:text-blue-500" />
                <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">Q3 Summary Report</span>
              </div>
              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/50">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Active Trainees</span>
                  <span className="font-semibold text-slate-900 dark:text-white">142 Total</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/50">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Overall Attrition</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">11.4% <span className="text-xs font-normal text-slate-500">(Down 3.2% vs Q2)</span></span>
                </div>
                <div className="flex flex-col gap-1 rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/50">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Top Performing Trainer</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">Vincent Luis Celdran <span className="text-xs font-normal text-slate-500">(100% Attendance)</span></span>
                </div>
              </div>
            </div>
          )
        }]);
      }, 500);
    } else if (type === 'help') {
      const userMsg: Message = { id: Date.now().toString(), sender: 'user', text: 'I need Help & Support' };
      setMessages(prev => [...prev, userMsg]);

      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: 'I am here to help! As your AI Operations Assistant, I can instantly assist you with the dashboard. Here are a few things you can ask me to do:',
          resultCard: (
            <div className="rounded-xl border border-blue-100 bg-white overflow-hidden shadow-sm dark:border-blue-900/30 dark:bg-slate-900">
              <div className="bg-blue-50 px-4 py-2.5 flex items-center gap-2 border-b border-blue-100 dark:bg-blue-900/10 dark:border-blue-900/30">
                <HelpCircle className="h-4 w-4 text-blue-600 dark:text-blue-500" />
                <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">Self-Service Support</span>
              </div>
              <div className="p-3 space-y-2">
                <button 
                  onClick={() => handleQuickPrompt("How is the Attendance Rate calculated?", "The Attendance Rate is calculated by dividing the total number of trainees present by the total active headcount for a given day, excluding approved leaves.")}
                  className="w-full text-left flex flex-col gap-1 rounded-lg bg-slate-50 px-3 py-2 text-sm transition-colors hover:bg-blue-50 dark:bg-slate-800/50 dark:hover:bg-blue-900/20"
                >
                  <span className="font-medium text-slate-700 dark:text-slate-300">Data Explanation</span>
                  <span className="text-xs text-slate-500">e.g. "How is the Attendance Rate calculated?"</span>
                </button>
                <button 
                  onClick={() => handleSuggestionClick('analytics')}
                  className="w-full text-left flex flex-col gap-1 rounded-lg bg-slate-50 px-3 py-2 text-sm transition-colors hover:bg-blue-50 dark:bg-slate-800/50 dark:hover:bg-blue-900/20"
                >
                  <span className="font-medium text-slate-700 dark:text-slate-300">Navigation Assistance</span>
                  <span className="text-xs text-slate-500">e.g. "Take me to the Analytics dashboard"</span>
                </button>
                <button 
                  onClick={() => handleQuickPrompt("Export the Q3 summary as PDF", "Exporting the Q3 summary now... (This is a mock action; file download will begin shortly in production).")}
                  className="w-full text-left flex flex-col gap-1 rounded-lg bg-slate-50 px-3 py-2 text-sm transition-colors hover:bg-blue-50 dark:bg-slate-800/50 dark:hover:bg-blue-900/20"
                >
                  <span className="font-medium text-slate-700 dark:text-slate-300">Automated Reports</span>
                  <span className="text-xs text-slate-500">e.g. "Export the Q3 summary as PDF"</span>
                </button>
              </div>
            </div>
          )
        }]);
      }, 500);
    } else if (type === 'analytics') {
      const userMsg: Message = { id: Date.now().toString(), sender: 'user', text: 'Navigate to Analytics Trends' };
      setMessages(prev => [...prev, userMsg]);

      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: 'Right away! Click the button below to view the Analytics Trends dashboard.',
          resultCard: (
            <div className="mt-2 flex w-full flex-col overflow-hidden rounded-xl border border-blue-100 bg-white shadow-sm dark:border-blue-900/30 dark:bg-slate-900">
              <div className="flex items-center gap-2 border-b border-blue-100 bg-blue-50 px-4 py-2.5 dark:border-blue-900/30 dark:bg-blue-900/10">
                <BarChart2 className="h-4 w-4 text-blue-600 dark:text-blue-500" />
                <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">Navigation Ready</span>
              </div>
              <div className="p-3">
                <button
                  onClick={() => {
                    router.push('/analytics');
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                >
                  <Navigation className="h-4 w-4" />
                  Go to Analytics Trends
                </button>
              </div>
            </div>
          )
        }]);
      }, 500);
    }
  };

  const handleSendText = () => {
    if (!inputText.trim()) return;
    
    const text = inputText;
    setInputText('');
    
    setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'user', text }]);
    
    if (text.toLowerCase().includes('ai insights') || text.toLowerCase().includes('direct to ai insights')) {
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: 'Sure! I can take you to the AI Insights page where you can see all predictive metrics and anomalies.',
          resultCard: (
            <div className="mt-2 flex w-full flex-col overflow-hidden rounded-xl border border-purple-100 bg-white shadow-sm dark:border-purple-900/30 dark:bg-slate-900">
              <div className="flex items-center gap-2 border-b border-purple-100 bg-purple-50 px-4 py-2.5 dark:border-purple-900/30 dark:bg-purple-900/10">
                <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-500" />
                <span className="text-xs font-semibold text-purple-700 dark:text-purple-400">Navigation Ready</span>
              </div>
              <div className="p-3">
                <button
                  onClick={() => {
                    router.push('/insights');
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                >
                  <Navigation className="h-4 w-4" />
                  Go to AI Insights
                </button>
              </div>
            </div>
          )
        }]);
      }, 500);
    } else {
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: 'This is a static prototype response. Voice and live LLM integration will be connected in the next phase!'
        }]);
      }, 500);
    }
  };

  return (
    <>
      {/* Floating Action Button (FAB) */}
      <div className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${isOpen ? 'translate-y-20 opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}>
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex h-16 w-16 items-center justify-center rounded-full bg-slate-900 shadow-2xl transition-all hover:scale-110 hover:shadow-blue-900/20 border border-slate-700/50"
        >
          <img src="/images/ai-logo.PNG" alt="AI Copilot" className="h-10 w-10 object-contain" />
          
          {/* Tooltip Beside Button */}
          <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 w-max opacity-0 translate-x-2 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
            <div className="relative rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-xl shadow-blue-900/10 border border-slate-700">
              How can I help you today?
              {/* Right-pointing arrow */}
              <div className="absolute -right-1 top-1/2 -translate-y-1/2 h-2 w-2 rotate-45 bg-slate-900 border-t border-r border-slate-700"></div>
            </div>
          </div>
        </button>
      </div>

      {/* Slide-Over Drawer / Pop-up Chat */}
      <div
        className={`fixed z-50 flex flex-col overflow-hidden bg-white shadow-2xl transition-all duration-300 ease-in-out dark:bg-slate-950 ${
          isMaximized
            ? `inset-4 md:inset-8 lg:inset-x-40 lg:inset-y-12 rounded-[24px] border border-slate-200 dark:border-slate-800 ${isOpen ? 'opacity-100 scale-100 translate-x-0' : 'opacity-0 scale-95 translate-x-full pointer-events-none'}`
            : `inset-y-0 right-0 w-full max-w-md border-l border-slate-200 dark:border-slate-800 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`
        }`}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 shadow-sm border border-slate-700/50">
              <img src="/images/ai-logo.PNG" alt="AI Copilot" className="h-6 w-6 object-contain" />
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500 dark:border-slate-950"></span>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Training Hub AI Copilot</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span> Online
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-slate-400">
            <button
              onClick={() => setView(view === 'chat' ? 'history' : 'chat')}
              className={`rounded-md p-2 transition-colors ${view === 'history' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300'}`}
              title="Chat History"
            >
              <History className="h-4 w-4" />
            </button>
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="rounded-md p-2 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              title={isMaximized ? "Restore down" : "Maximize"}
            >
              {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-md p-2 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-md p-2 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Quick Actions (Horizontal Scroll) - Only visible in chat view */}
        {view === 'chat' && (
          <div className="flex gap-2 overflow-x-auto border-b border-slate-50 bg-slate-50/50 p-4 scrollbar-none [ms-overflow-style:none] [&::-webkit-scrollbar]:hidden dark:border-slate-800/50 dark:bg-slate-900/20">
          <button 
            onClick={() => handleSuggestionClick('reliability')}
            className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-700/50 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
          >
            "Take me to Trainer Reliability"
          </button>
          <button 
            onClick={() => handleSuggestionClick('attrition')}
            className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-700/50 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
          >
            "Why did March attrition spike?"
          </button>
          <button 
            onClick={() => handleSuggestionClick('summary')}
            className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-700/50 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
          >
            "Show Q3 summary report"
          </button>
          <button 
            onClick={() => handleSuggestionClick('help')}
            className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-700/50 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
          >
            "Help & Support"
          </button>
          <button 
            onClick={() => handleSuggestionClick('analytics')}
            className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-700/50 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
          >
            "Navigate to Analytics Trends"
          </button>
        </div>
        )}

        {/* Main Content Area */}
        {view === 'history' ? (
          <div className="flex-1 overflow-y-auto p-0">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400">Recent Conversations</h3>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {[
                { title: "March Attrition Analysis", time: "2 days ago", icon: TrendingDown },
                { title: "Trainer Reliability Check", time: "Last week", icon: AlertTriangle },
                { title: "Q3 Performance Summary", time: "2 weeks ago", icon: BarChart2 },
                { title: "New Trainee Onboarding Report", time: "Last month", icon: MessageSquare }
              ].map((item, i) => (
                <button
                  key={i}
                  onClick={() => setView('chat')}
                  className="w-full flex items-start gap-4 p-4 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate dark:text-slate-200">{item.title}</p>
                    <p className="text-xs text-slate-500 mt-1 dark:text-slate-400">{item.time}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end gap-3' : 'gap-3'}`}>
              {msg.sender === 'ai' && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 shadow-sm border border-slate-700/50">
                  <img src="/images/ai-logo.PNG" alt="AI Copilot" className="h-5 w-5 object-contain" />
                </div>
              )}
              
              <div className={msg.sender === 'user' ? 'max-w-[85%] rounded-2xl rounded-tr-sm bg-blue-600 px-4 py-3 text-sm text-white shadow-sm' : 'space-y-3 max-w-[85%]'}>
                {msg.sender === 'user' ? (
                  msg.text
                ) : (
                  <>
                    <div className="rounded-2xl rounded-tl-sm border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                      {/* Very simple markdown strong parser for prototype */}
                      {msg.text.split('**').map((part, i) => i % 2 === 1 ? <strong key={i}>{part}</strong> : part)}
                    </div>

                    {/* Tool Execution Card */}
                    {msg.toolExecuted && (
                      <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50/50 px-3 py-2 text-xs text-blue-700 dark:border-blue-900/30 dark:bg-blue-900/10 dark:text-blue-400">
                        <Navigation className="h-3 w-3 shrink-0" />
                        <span className="font-medium">Executed: {msg.toolExecuted}</span>
                      </div>
                    )}

                    {/* Structured Summary Card */}
                    {msg.resultCard && msg.resultCard}
                  </>
                )}
              </div>

              {msg.sender === 'user' && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm ring-2 ring-white dark:ring-slate-950">
                  <span className="text-[10px] font-bold">NR</span>
                </div>
              )}
            </div>
          ))}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input Area - Only visible in chat view */}
        {view === 'chat' && (
          <div className="border-t border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="relative flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-1.5 pr-2 focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400 dark:border-slate-700 dark:bg-slate-900 dark:focus-within:border-blue-500">
            <button
              title="Attach document or image"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <button
              title="Voice input"
              onClick={() => setIsListening(!isListening)}
              className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                isListening 
                  ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' 
                  : 'text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <Mic className="h-4 w-4" />
            </button>

            {isListening ? (
              <div className="flex-1 flex items-center gap-3 px-3">
                <span className="text-sm font-medium text-slate-500 animate-pulse dark:text-slate-400">Listening...</span>
                <div className="flex items-center gap-1 h-4">
                  <div className="w-1 bg-blue-500 rounded-full h-full animate-[bounce_1s_infinite_100ms]"></div>
                  <div className="w-1 bg-blue-500 rounded-full h-2/3 animate-[bounce_1s_infinite_200ms]"></div>
                  <div className="w-1 bg-blue-500 rounded-full h-1/2 animate-[bounce_1s_infinite_300ms]"></div>
                  <div className="w-1 bg-blue-500 rounded-full h-4/5 animate-[bounce_1s_infinite_400ms]"></div>
                </div>
              </div>
            ) : (
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
                placeholder="Ask AI to navigate or summarize..."
                className="flex-1 bg-transparent px-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-200 dark:placeholder:text-slate-500"
              />
            )}

            <button
              onClick={handleSendText}
              className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                inputText.trim() || isListening
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
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
          className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm transition-opacity dark:bg-slate-950/40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
