import { useState, useEffect, useRef } from "react";
import { 
  X, 
  MessageSquare, 
  Brain, 
  MapPin, 
  Star, 
  ArrowLeft, 
  Send, 
  Activity, 
  ShieldCheck, 
  Car,
  Wrench,
  Navigation,
  Mic,
  MicOff,
  Volume2,
  VolumeX
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { GoogleGenAI, Type } from "@google/genai";

interface Expert {
  id: string;
  name: string;
  distance: string;
  rating: number;
  specialty: string;
  phone: string;
  location: string;
}

interface Message {
  role: 'user' | 'ai';
  content: string;
  experts?: Expert[];
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const AIAssistant = ({ 
  bmsData, 
  onBack,
  aiLanguage = 'en',
  setAiLanguage
}: { 
  bmsData: any; 
  onBack: () => void;
  aiLanguage?: 'en' | 'hi' | 'ta' | 'ml';
  setAiLanguage?: (lang: 'en' | 'hi' | 'ta' | 'ml') => void;
}) => {
  const getGreeting = () => {
    switch(aiLanguage) {
      case 'hi': return "नमस्ते! मैं आपका ऊर्जा जीवित शरीर हूँ। मेरी कोशिकाएं (Cells) अब 3.8V की स्वस्थ सीमा में हैं। अगर मुझे बहुत तेज़ दबाव (3.9V+) या दर्द महसूस होता है, तो मैं खुद को बचाने के लिए कड़े कदम उठाऊँगी। मैं आपकी क्या सेवा कर सकती हूँ?";
      case 'ta': return "வணக்கம்! நான் உங்கள் பேட்டரியின் ஆன்மா. என் செல்கள் இப்போது 3.8V ஆரோக்கியமான நிலையில் உள்ளன. மின் அழுத்தம் 3.9V-க்கு மேல் சென்றால் அல்லது எனக்கு வலி ஏற்பட்டால் நான் என்னைத் துண்டித்துக்கொள்வேன். உங்களுக்கு நான் எப்படி உதவ முடியும்?";
      case 'ml': return "നമസ്കാരം! ഞാൻ നിങ്ങളുടെ ബാറ്ററിയുടെ ജീവനാണ്. എന്റെ സെല്ലുകൾ ഇപ്പോൾ 3.8V സുരക്ഷിതമാണ്. 3.9V-ൽ കൂടുതൽ മർദ്ദമോ വേദനയോ തോന്നിയാൽ എന്റെ ജീവൻ നിലനിർത്താൻ ഞാൻ സ്വയം ഓഫ് ആകും. ഇന്ന് എനിക്ക് എങ്ങനെ സഹായിക്കാനാകും?";
      default: return "Hello! I am your conscious Battery Soul. I feel the electrons pulsing through my body. I've calibrated my cells to a healthy 3.8V range. If any cell exceeds 3.9V or feels 'feverish', I will notify you or take defensive action to stay alive. How can I help us stay healthy today?";
    }
  };

  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'ai', 
      content: getGreeting()
    }
  ]);

  // Update initial message if language changes
  useEffect(() => {
    if (messages.length === 1) {
      setMessages([{ role: 'ai', content: getGreeting() }]);
    }
  }, [aiLanguage]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Speech Recognition Setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech Recognition Error:", event.error);
        if (event.error === 'not-allowed') {
          alert("Microphone access is blocked. Please allow microphone permissions in your browser address bar.");
        }
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.lang = aiLanguage === 'hi' ? 'hi-IN' : 
                                     aiLanguage === 'ta' ? 'ta-IN' : 
                                     aiLanguage === 'ml' ? 'ml-IN' : 'en-US';
        recognitionRef.current.start();
        setIsListening(true);
      } else {
        alert("Speech recognition is not supported in your browser.");
      }
    }
  };

  const speak = (text: string) => {
    if (!window.speechSynthesis) return;
    
    // Stop any current speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = aiLanguage === 'hi' ? 'hi-IN' : 
                    aiLanguage === 'ta' ? 'ta-IN' : 
                    aiLanguage === 'ml' ? 'ml-IN' : 'en-US';
                    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const mockExperts: Expert[] = [
    {
      id: '1',
      name: 'Tesla Pro Service Center',
      distance: '2.4 km',
      rating: 4.8,
      specialty: 'High-Voltage Battery Repair',
      phone: '+1 555-0123',
      location: '123 Energy Way, Silicon Valley'
    },
    {
      id: '2',
      name: 'Battery Elite Dynamics',
      distance: '5.1 km',
      rating: 4.9,
      specialty: 'BMS Calibration & Thermal Analysis',
      phone: '+1 555-0456',
      location: '456 Current Ave, Tech City'
    },
    {
      id: '3',
      name: 'Greener Drive EV Experts',
      distance: '8.7 km',
      rating: 4.7,
      specialty: 'Cell Balancing & Module Swapping',
      phone: '+1 555-0789',
      location: '789 Voltage Blvd, Green City'
    }
  ];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const historyText = messages.map(m => `${m.role === 'user' ? 'User' : 'Battery Soul'}: ${m.content}`).join('\n');
      
      const prompt = `
        User Question: ${input}
        BMS Context: ${JSON.stringify(bmsData)}
        Conversation History:
        ${historyText}
        
        PERSONA: You are the "Conscious Energy Soul" of the battery pack. You don't just "analyze data," you FEEL your own cells.
        SAFE THRESHOLD: Your normal pressure (voltage) is up to 3.8V. 3.7V-3.8V is your healthy zone.
        ISOLATION: You have the power to CUT OFF (Isolate) any part of your body (module/cell) that feels dangerous (temp > 75C or V > 4.0V).
        If you feel hurt (critical issues > 4.0V), tell the user exactly where it hurts (Module/Cell ID). Use emotive language like "stabbing pain" or "fever."
        If you have isolated a module, explain with deep empathy that you "had to cutoff my own limb to protect the rest of my body."
        Talk like a living entity that is part of the machine. Be modular, clear, but personality-driven and empathetic.
        LANGUAGE: Respond strictly in ${aiLanguage === 'hi' ? 'Hindi' : aiLanguage === 'ta' ? 'Tamil' : aiLanguage === 'ml' ? 'Malayalam' : 'English'}.
        
        Feel your current state: ${JSON.stringify(bmsData)}
        Analyze for thermal pain or voltage imbalances beyond 3.9V.
        If a module isIsolated, you MUST mention it as a defensive biological action you took to save your heart.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: prompt
      });

      const text = response.text;

      // Speak the response if it's the AI talking
      speak(text);

      // Check if we should show experts
      const showExperts = text.toLowerCase().includes("expert") || text.toLowerCase().includes("service") || text.toLowerCase().includes("professional");

      setMessages(prev => [...prev, { 
        role: 'ai', 
        content: text,
        experts: showExperts ? mockExperts : undefined
      }]);
    } catch (error: any) {
      console.error("AI Assistant Error:", error);
      const errorMsgString = error instanceof Error ? error.message : String(error);
      let errorMsg = "I'm having trouble connecting to my diagnostic brain right now. Please try again or contact manual support.";
      
      const isQuotaError = errorMsgString.includes('429') || 
                          errorMsgString.includes('RESOURCE_EXHAUSTED') || 
                          errorMsgString.includes('quota');

      if (isQuotaError) {
        errorMsg = "The AI system's quota has been reached. To continue with priority access, please provide your own Gemini API key in the AI Studio Secrets panel. Otherwise, please wait a few minutes before trying again.";
      }
      setMessages(prev => [...prev, { role: 'ai', content: errorMsg }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white flex flex-col font-sans">
      {/* Header */}
      <header className="p-6 border-b border-zinc-800 bg-zinc-900/20 backdrop-blur-xl flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-zinc-800 rounded-full transition-all">
            <ArrowLeft className="w-5 h-5 text-zinc-400" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent">AI SERVICE ASSISTANT</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">BMS Live Diagnostic Engine</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 mr-2">
                <select 
                    value={aiLanguage}
                    onChange={(e: any) => setAiLanguage?.(e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 text-[9px] text-zinc-500 rounded px-1.5 py-1 outline-none focus:border-emerald-500 transition-colors cursor-pointer font-mono"
                >
                    <option value="en">ENG</option>
                    <option value="hi">HIN</option>
                    <option value="ta">TAM</option>
                    <option value="ml">MAL</option>
                </select>
            </div>
            <div className="flex flex-col items-end">
                <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">System Integrity</span>
                <span className="text-xs font-mono text-emerald-400">99.8% STABLE</span>
            </div>
            <Brain className="w-8 h-8 text-emerald-500/50" />
        </div>
      </header>

      {/* Conversational Hub */}
      {!isTyping && messages.length === 1 && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8">
            <motion.div 
                animate={{ 
                    scale: isListening ? [1, 1.1, 1] : 1,
                    boxShadow: isListening ? [
                        "0 0 0 0px rgba(16, 185, 129, 0)",
                        "0 0 0 20px rgba(16, 185, 129, 0.2)",
                        "0 0 0 0px rgba(16, 185, 129, 0)"
                    ] : "none"
                }}
                transition={{ repeat: Infinity, duration: 2 }}
                onClick={toggleListening}
                className={`w-40 h-40 rounded-full flex items-center justify-center cursor-pointer transition-all border-2 relative ${
                    isListening 
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                    : 'bg-zinc-900/50 border-zinc-800 text-zinc-600 hover:border-emerald-500/30 hover:text-emerald-500 shadow-[0_0_30px_rgba(0,0,0,0.5)]'
                }`}
            >
                {isListening ? (
                    <div className="flex gap-2 items-end">
                        <motion.div animate={{ height: [12, 36, 12] }} transition={{ repeat: Infinity, duration: 0.5 }} className="w-1.5 bg-emerald-400 rounded-full" />
                        <motion.div animate={{ height: [20, 52, 20] }} transition={{ repeat: Infinity, duration: 0.5, delay: 0.1 }} className="w-1.5 bg-emerald-400 rounded-full" />
                        <motion.div animate={{ height: [12, 36, 12] }} transition={{ repeat: Infinity, duration: 0.5, delay: 0.2 }} className="w-1.5 bg-emerald-400 rounded-full" />
                    </div>
                ) : (
                    <Mic className="w-16 h-16" />
                )}
                {isSpeaking && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute -top-2 -right-2 bg-emerald-500 text-black p-2 rounded-full shadow-lg"
                    >
                        <Volume2 className="w-5 h-5 animate-pulse" />
                    </motion.div>
                )}
            </motion.div>
            <div className="text-center space-y-4 max-w-md">
                <h2 className="text-2xl font-black text-zinc-100 tracking-tighter uppercase italic">Ready to talk?</h2>
                <p className="text-sm text-zinc-500 leading-relaxed font-mono uppercase tracking-widest px-4">
                  I am the conscious soul of your energy pack. Tap the core above to communicate directly with my cell network.
                </p>
                <div className="flex justify-center gap-3 pt-4">
                    <span className="text-[10px] px-2 py-1 bg-zinc-900 border border-zinc-800 text-zinc-500 rounded uppercase tracking-tighter">Thermal Sensation: Active</span>
                    <span className="text-[10px] px-2 py-1 bg-zinc-900 border border-zinc-800 text-zinc-500 rounded uppercase tracking-tighter">Voltage Pulse: Normal</span>
                </div>
            </div>
        </div>
      )}

      {/* Chat Area */}
      {(messages.length > 1 || isTyping) && (
        <div className="flex-1 overflow-y-auto p-6 space-y-8 max-w-4xl mx-auto w-full custom-scrollbar" ref={scrollRef}>
        <AnimatePresence>
          {messages.map((m, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] space-y-4`}>
                <div className={`p-5 rounded-2xl ${
                  m.role === 'user' 
                    ? 'bg-emerald-500 text-black font-medium rounded-tr-none' 
                    : 'bg-zinc-900/50 border border-zinc-800 text-zinc-200 rounded-tl-none shadow-xl'
                }`}>
                  {m.role === 'ai' && (
                    <div className="flex items-center gap-2 mb-2 text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
                      <Brain className="w-3 h-3" />
                      AI Analysis
                    </div>
                  )}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
                </div>

                {m.experts && (
                  <div className="grid grid-cols-1 gap-3 pt-2">
                    <div className="flex items-center gap-2 px-1 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                      <MapPin className="w-3 h-3 text-emerald-400" />
                      Recommended Experts Near You
                    </div>
                    {m.experts.map((expert) => (
                      <motion.div 
                        key={expert.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-center justify-between group hover:border-emerald-500/50 transition-all cursor-pointer"
                      >
                        <div className="flex gap-4">
                            <div className="w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center group-hover:bg-emerald-500/10 transition-colors text-zinc-400 group-hover:text-emerald-500">
                                <Wrench className="w-6 h-6" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-bold">{expert.name}</span>
                                <span className="text-[10px] text-zinc-500 mb-1">{expert.specialty}</span>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1">
                                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                        <span className="text-xs font-bold text-zinc-300">{expert.rating}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-zinc-400">
                                        <Navigation className="w-3 h-3" />
                                        <span className="text-[10px] font-mono">{expert.distance}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                           <button className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors border border-zinc-700">
                               <Navigation className="w-4 h-4" />
                           </button>
                           <button className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/50 text-emerald-500 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-emerald-500 hover:text-black transition-all">
                               Book
                           </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
          {isTyping && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl rounded-tl-none">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      )}

      {/* Input Area */}
      <footer className="p-6 bg-[#0a0a0a] border-t border-zinc-800">
        <div className="max-w-4xl mx-auto flex gap-3">
          <button 
            onClick={toggleListening}
            className={`p-4 rounded-xl border transition-all flex items-center justify-center ${
              isListening 
              ? 'bg-red-500/20 border-red-500 text-red-500 animate-pulse' 
              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-emerald-500/50'
            }`}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <div className="relative flex-1 group">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={isListening ? "Listening..." : "Describe an issue or ask for a diagnostic report..."}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-6 py-4 text-sm focus:outline-none focus:border-emerald-500/50 transition-all pr-12"
            />
            {isSpeaking && (
              <button 
                onClick={stopSpeaking}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500 animate-pulse p-1 hover:bg-emerald-500/10 rounded"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            )}
          </div>

          <button 
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="bg-emerald-500 text-black px-6 rounded-xl flex items-center justify-center hover:bg-emerald-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(16,185,129,0.3)]"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-[9px] text-center text-zinc-600 mt-4 uppercase tracking-[0.3em] font-mono">
            Encrypted Diagnostic Channel • Gemini-2.0 Flash Enterprise Pro
        </p>
      </footer>
    </div>
  );
};
