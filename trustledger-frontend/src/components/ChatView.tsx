import React, { useState, useRef, useEffect } from "react";
import { ChatMessage } from "../types";
import { TrustLedgerAPI } from "../api";
import { Send, Mic, Bot, User, Loader2, Sparkles } from "lucide-react";

interface ChatViewProps {
  token: string | null;
}

export default function ChatView({ token }: ChatViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "msg-1",
      sender: "bot",
      text: "Aba! Long-time no see! I be your TrustLedger Bookkeeper. Drop your manual paper records and ask me anything in clean Nigerian Pidgin or English. E.g. 'How much did Iya Basirat buy?' or 'What anomaly did the cyber security core flag?' "
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [accordionsOpen, setAccordionsOpen] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Microphone recording simulator inside chatbot
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [voiceTimer, setVoiceTimer] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    if (voiceRecording) {
      timerRef.current = setInterval(() => {
        setVoiceTimer((v) => v + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [voiceRecording]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = async (textToSend?: string) => {
    const rawText = textToSend || inputText;
    if (!rawText.trim() && !voiceRecording) return;

    let textPayload = rawText;
    if (voiceRecording) {
      setVoiceRecording(false);
      textPayload = `Voice log query: "Summarize total volume and verify Maize cargo transactions"`;
    }

    const userMsgId = "msg-user-" + Math.random();
    const newUserMessage: ChatMessage = {
      id: userMsgId,
      sender: "user",
      text: textPayload,
      isVoice: voiceRecording
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setInputText("");
    setLoading(true);

    try {
      const response = await TrustLedgerAPI.sendChatMessage(textPayload, token);
      
      const botMsgId = "msg-bot-" + Math.random();
      setMessages((prev) => [
        ...prev,
        {
          id: botMsgId,
          sender: "bot",
          text: response.answer,
          compiled_cypher: response.compiled_cypher
        }
      ]);
    } catch (err) {
      const botMsgId = "msg-bot-" + Math.random();
      setMessages((prev) => [
        ...prev,
        {
          id: botMsgId,
          sender: "bot",
          text: "Egbami! Net pipeline mismatch, could not reach graph advice database, but your sandbox index is fully safe."
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const startVoiceTrigger = () => {
    setVoiceTimer(0);
    setVoiceRecording(true);
  };

  const toggleAccordion = (msgId: string) => {
    setAccordionsOpen((prev) => ({
      ...prev,
      [msgId]: !prev[msgId]
    }));
  };

  const presetQuestions = [
    "What did Iya Basirat buy yesterday?",
    "Show me the price anomaly details",
    "Did we pay Aliyu for loader labor?",
    "Tell me my current trust scores"
  ];

  return (
    <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-6 shadow-xl flex flex-col h-[650px]">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-[#0EBD2B] animate-pulse" />
          <div>
            <h2 className="text-md font-sans font-bold uppercase tracking-wider text-white">
              AI Pidgin Analytics Chat
            </h2>
            <p className="text-[10px] text-white/40 font-mono">
              TrustLedger Intelligent Financial Bookkeeper Advisor v2026
            </p>
          </div>
        </div>
        <div className="bg-[#0EBD2B]/15 border border-[#0EBD2B]/20 px-2 py-1 rounded text-[10px] font-mono text-[#0EBD2B] flex items-center gap-1 uppercase font-bold">
          <Sparkles className="w-3.5 h-3.5" /> GRAPH INTERPRETER
        </div>
      </div>

      {/* Messages viewport */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 pb-4 scroll-smooth">
        {messages.map((msg) => {
          const isBot = msg.sender === "bot";
          const isAccordionOpen = accordionsOpen[msg.id] || false;

          return (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-[85%] ${isBot ? "mr-auto" : "ml-auto flex-row-reverse"}`}
            >
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border ${
                isBot 
                  ? "bg-[#0EBD2B]/15 border-[#0EBD2B]/30 text-[#0EBD2B]" 
                  : "bg-blue-500/15 border-blue-500/30 text-blue-400"
              }`}>
                {isBot ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>

                {/* Bubble Body */}
                <div className="space-y-2">
                  <div className={`rounded-2xl p-4 border text-sm font-sans leading-relaxed shadow-md ${
                    isBot
                      ? "bg-black/30 border-white/5 text-white/95"
                      : "bg-[#0EBD2B]/10 border-[#0EBD2B]/25 text-white"
                  }`}>
                    <p>{msg.text}</p>
                  </div>
                </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex gap-3 max-w-[85%] mr-auto items-center">
            <div className="w-8 h-8 rounded-lg bg-[#0EBD2B]/10 border border-[#0EBD2B]/20 text-[#0EBD2B] flex items-center justify-center animate-spin">
              <Loader2 className="w-4 h-4" />
            </div>
            <div className="text-xs font-mono text-white/30 uppercase tracking-widest animate-pulse">
              Translating Cypher graph dimensions...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested chips click trigger shortcut */}
      <div className="py-2.5 flex flex-wrap gap-1.5 border-t border-white/5 mb-2">
        {presetQuestions.map((pq, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(pq)}
            disabled={loading}
            className="px-2.5 py-1 text-[10px] font-mono border border-white/5 hover:border-[#0EBD2B] bg-black/20 hover:bg-white/5 rounded-full text-white/55 hover:text-white transition-colors cursor-pointer"
          >
            {pq}
          </button>
        ))}
      </div>

      {/* Bottom Controls Dock */}
      <div className="flex items-center gap-2 pt-3 border-t border-white/5">
        
        {/* Microphone records trigger */}
        <button
          onMouseDown={startVoiceTrigger}
          onMouseUp={() => handleSend()}
          onTouchStart={startVoiceTrigger}
          onTouchEnd={() => handleSend()}
          className={`p-3 rounded-xl border flex-shrink-0 transition-all cursor-pointer ${
            voiceRecording
              ? "bg-red-650 border-red-500 text-white animate-pulse shadow-lg shadow-red-500/30"
              : "bg-black/30 border-white/5 text-white/40 hover:text-white hover:border-[#0EBD2B] hover:bg-white/5"
          }`}
          title="Hold/Press to record voice pidgin log query"
        >
          <Mic className="w-5 h-5" />
        </button>

        {/* Alphanumeric string input text area */}
        <div className="flex-1 relative">
          <input
            type="text"
            className="w-full px-4 py-3 bg-black/30 border border-white/5 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#0EBD2B] pr-10"
            placeholder={
              voiceRecording
                ? `Recording voice... 00:${voiceTimer < 10 ? `0${voiceTimer}` : voiceTimer} (Release to analyze)`
                : "Ask Bookkeeper or hold Mic to talk..."
            }
            value={inputText}
            disabled={voiceRecording}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSend();
            }}
          />
        </div>

        {/* Send Action */}
        <button
          onClick={() => handleSend()}
          disabled={loading || voiceRecording}
          className="p-3 rounded-xl bg-[#0EBD2B] text-[#121212] hover:bg-[#0EBD2B]/90 active:scale-95 transition-all flex items-center justify-center flex-shrink-0 cursor-pointer"
        >
          <Send className="w-5 h-5" />
        </button>

      </div>
    </div>
  );
}
