'use client';

import { useChat, type Message } from '@ai-sdk/react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageSquare, X, Send, Loader2, Bot, User, Mic, CircleStop, CircleArrowDown, CirclePlus, History } from 'lucide-react';

// Define the structure for a chat session
interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export default function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [localInput, setLocalInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [allSessions, setAllSessions] = useState<ChatSession[]>([]); // All saved sessions
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null); // ID of the currently active session
  const [showHistoryModal, setShowHistoryModal] = useState(false); // State for showing history modal

  const loadAllSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/sessions');
      if (res.ok) {
        const data = await res.json();
        setAllSessions(data);
      }
    } catch (e) {
      console.error("Failed to load sessions from server", e);
    }
  }, []);

  const chatData = useChat({
    body: { sessionId: currentSessionId },
    onResponse: (response) => {
      const sid = response.headers.get('x-session-id');
      if (sid && sid !== currentSessionId) {
        setCurrentSessionId(sid);
        loadAllSessions(); // refresh history list silently
      }
    }
  });
  const { messages, append, isLoading, error, setMessages } = chatData;

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const interimRef = useRef('');
  const [interimText, setInterimText] = useState('');
  const [showScrollToBottomButton, setShowScrollToBottomButton] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // --- Helper functions for session management ---
  
  // Load all sessions on component mount
  useEffect(() => {
    loadAllSessions();
  }, [loadAllSessions]);

  useEffect(() => {
    const handleToggle = () => toggleChat();
    window.addEventListener('toggleAIChat', handleToggle);
    return () => window.removeEventListener('toggleAIChat', handleToggle);
  }, [isOpen]);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    let inputToAppend = localInput; // Use a temporary variable for the content to append

    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      setIsRecording(false);
      if (interimRef.current) {
         inputToAppend = (localInput ? localInput + ' ' : '') + interimRef.current;
      }
      // Do not set localInput here, it will be cleared after append
      setInterimText('');
      interimRef.current = '';
    }

    if (!inputToAppend.trim()) return; // Use inputToAppend for trim check

    if (append) {
      append({ role: 'user', content: inputToAppend });
    }
    // Clear localInput and interimText AFTER appending
    setLocalInput('');
    setInterimText('');
    interimRef.current = ''; // Ensure interimRef is also cleared
  };

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Auto-scroll logic based on user request
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];

      if (lastMessage.role === 'user') {
        // When user sends a message, scroll to the very bottom
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      } else if (lastMessage.role === 'assistant') {
        // When assistant sends a message, find the last user message and scroll it to the top.
        const lastUserMessage = messages.slice().reverse().find(m => m.role === 'user');
        if (lastUserMessage) {
          const userMessageElement = document.getElementById(lastUserMessage.id);
          userMessageElement?.scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
          // Fallback if no user messages found (e.g., first assistant message)
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
      }
    }
    setShowScrollToBottomButton(false); // Hide button when auto-scrolling occurs
  }, [messages]);

  // Auto-resize textarea and scroll to bottom
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = inputRef.current.scrollHeight + 'px';
      inputRef.current.scrollTop = inputRef.current.scrollHeight; // Scroll to bottom
    }
  }, [localInput, interimText]);

  const toggleChat = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    if (isRecording) {
      handleVoiceInput();
    }
    if (newState) { // When opening the chat
      loadAllSessions();
      startNewChat(); // Always start a new chat when opening
      // Add scroll to bottom when opening the chat
      setTimeout(() => scrollToBottom(), 100); // Small delay to ensure content is rendered
    }
  };

  // Function to start a new chat
  const startNewChat = () => {
    setMessages([]); // Clear current messages
    setCurrentSessionId(null); // No active session
    setLocalInput('');
    setInterimText('');
    setShowHistoryModal(false); // Close history modal
    // Add scroll to bottom when starting a new chat
    setTimeout(() => scrollToBottom(), 100); // Small delay to ensure content is rendered
  };

  // Function to load a specific chat session
  const loadChatSession = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
        setCurrentSessionId(data.id);
        setLocalInput('');
        setInterimText('');
        setShowHistoryModal(false); // Close history modal
        scrollToBottom(); // Scroll to bottom after loading a session
      }
    } catch (e) {
      console.error(e);
      alert('שגיאה בטעינת השיחה');
    }
  };

  // Handle voice input
  const handleVoiceInput = () => {
    if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      alert('מצטערים, הדפדפן שלך אינו תומך בזיהוי קולי.');
      return;
    }

    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      // Ensure any interim text is added to localInput before stopping
      if (interimRef.current) { // Prioritize interimRef.current as it's the most up-to-date
        setLocalInput(prev => (prev ? prev + ' ' : '') + interimRef.current);
      } else if (interimText.trim()) { // Fallback if interimRef.current is empty but interimText has content
        setLocalInput(prev => (prev ? prev + ' ' : '') + interimText);
      }
      setIsRecording(false);
      setInterimText('');
      interimRef.current = '';
    } else {
      const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognitionAPI();
      recognition.lang = 'he-IL';
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsRecording(true);
        setInterimText('');
        interimRef.current = '';
        console.log('Voice recognition started');
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let currentInterim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            currentInterim += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          setLocalInput(prev => (prev ? prev + ' ' : '') + finalTranscript);
          setInterimText('');
          interimRef.current = '';
        } else {
          setInterimText(currentInterim);
          interimRef.current = currentInterim;
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        alert(`שגיאה בזיהוי קולי: ${event.error}`);
        setInterimText('');
        interimRef.current = '';
      };

      recognition.onend = () => {
        setIsRecording(false);
        console.log('Voice recognition ended');
        if (interimRef.current) {
          setLocalInput(prev => (prev ? prev + ' ' : '') + interimRef.current);
        }
        setInterimText('');
        interimRef.current = '';
      };

      recognitionRef.current = recognition;
      recognition.start();
    }
  };

  const handleScroll = useCallback(() => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      // Show button if not at the very bottom (with a small buffer)
      const isAtBottom = scrollHeight - scrollTop <= clientHeight + 20; // Increased buffer slightly
      setShowScrollToBottomButton(!isAtBottom);
    }
  }, []);

  return (
    <div className="fixed bottom-6 right-4 sm:bottom-6 sm:right-6 z-[9999] flex flex-col items-end print:hidden">
      {/* Expanding Chat Window */}
      {isOpen && (
        <div className="bg-white w-80 sm:w-96 rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col h-[90vh] max-h-[90vh] animate-in slide-in-from-bottom-5 fade-in duration-300">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white flex justify-between items-center shadow-md">
            <div className="flex items-center gap-2">
              <Bot className="w-6 h-6" />
              <div>
                <h3 className="font-bold text-lg leading-tight">העוזר של מלכות</h3>
                <p className="text-xs text-blue-100">AI שמחובר למסד הנתונים</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* History Button */}
              <button onClick={() => setShowHistoryModal(true)} className="text-blue-100 hover:text-white transition-colors bg-white/10 p-1.5 rounded-full hover:bg-white/20" title="היסטוריית שיחות">
                <History className="w-5 h-5" />
              </button>
              {/* New Chat Button */}
              <button onClick={startNewChat} className="text-blue-100 hover:text-white transition-colors bg-white/10 p-1.5 rounded-full hover:bg-white/20" title="שיחה חדשה">
                <CirclePlus className="w-5 h-5" />
              </button>
              <button onClick={toggleChat} className="text-blue-100 hover:text-white transition-colors bg-white/10 p-1.5 rounded-full hover:bg-white/20" title="סגור צ'אט">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 flex flex-col w-full relative" dir="rtl">
            {messages.length === 0 && (
              <div className="text-center text-gray-400 mt-10 text-sm">
                <Bot className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>היי! אני העוזר החכם של המערכת.</p>
                <p className="mt-1">אני יכול לענות על שאלות לגבי לקוחות, חובות, והזמנות מהעבר.</p>
                {allSessions.length > 0 && (
                  <p className="mt-4 text-blue-500 cursor-pointer hover:underline" onClick={() => setShowHistoryModal(true)}>
                    לחץ כאן כדי לראות את היסטוריית השיחות שלך
                  </p>
                )}
              </div>
            )}

            {messages.map((m) => {
               if (m.role === 'system' || m.role === 'data') return null;

               const hasToolCalls = m.toolInvocations && m.toolInvocations.length > 0;
               const isUser = m.role === 'user';

               if (m.role === 'assistant' && !m.content && hasToolCalls) {
                 return null; // hide historical tool bubbles as per user request
               }

               if (!m.content) return null;

               return (
                <div id={m.id} key={m.id} className={`flex items-start gap-2 max-w-[85%] ${isUser ? 'mr-auto flex-row-reverse' : 'ml-auto'}`}>
                  <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${isUser ? 'bg-blue-100 text-blue-600' : 'bg-indigo-600 text-white'}`}>
                    {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div className={`rounded-2xl p-3 shadow-sm text-sm ${isUser ? 'bg-blue-600 text-white rounded-tl-sm' : 'bg-white border border-gray-100 text-gray-800 rounded-tr-sm'}`}>
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-start gap-2 max-w-[85%] overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm bg-indigo-600 text-white">
                  <Bot className="w-4 h-4 animate-pulse" />
                </div>
                <div className="bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-tr-sm p-3 shadow-sm text-sm flex gap-2 items-center h-auto w-auto">
                   <Loader2 className="w-4 h-4 animate-spin text-indigo-500 shrink-0" />
                   <span className="font-medium text-gray-600 truncate">
                     {(() => {
                        const lastMessage = messages[messages.length - 1];
                        if (lastMessage?.role === 'assistant' && lastMessage?.toolInvocations?.length) {
                           const tool = lastMessage.toolInvocations[0].toolName;
                           switch(tool) {
                             case 'callInternalAPI': return 'מתקשר עם המערכת...';
                             case 'readDatabase': return 'קורא במסד הנתונים...';
                             case 'writeProjectFile': return 'עורך קוד...';
                             case 'createPreviewUpdate': return 'בונה תצוגה מקדימה...';
                             case 'searchProjectFiles': return 'מחפש קבצים...';
                             case 'listProjectFiles': return 'ממפה את הפרויקט...';
                             case 'readProjectFile': return 'קורא קבצים...';
                             case 'findCustomer': return 'מחפש לקוח...';
                             case 'getCustomerOrders': return 'שולף הזמנות...';
                             case 'getUnpaidOrders': return 'בודק חובות...';
                             default: return 'מבצע פעולה מיוחדת...';
                           }
                        }
                        return 'חושב ומקליד...';
                     })()}
                   </span>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl shadow-sm text-sm mx-auto my-2 w-[90%] border border-red-200 text-center">
                <strong className="font-bold block mb-1">שגיאת תקשורת</strong>
                {error.message.toLowerCase().includes('quota') || error.message.includes('429') || error.message.toLowerCase().includes('exhausted')
                  ? 'הגענו למגבלת הבקשות של גוגל (Rate Limit). אנא המתן חצי דקה ונסה שוב.'
                  : 'אירעה שגיאה בחיבור לבינה המלאכותית. נסה שוב בעוד רגע.'}
              </div>
            )}
            <div ref={messagesEndRef} className="h-4" />
          </div>

          {/* Input Area */}
          <form onSubmit={onSubmit} className="relative p-3 bg-white border-t border-gray-100 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]" dir="rtl">
            {showScrollToBottomButton && (
              <button
                type="button"
                onClick={scrollToBottom}
                className="absolute -top-12 left-4 bg-indigo-500 text-white p-2 rounded-full shadow-lg hover:bg-indigo-600 transition-all duration-300 z-50 flex items-center justify-center border border-white/20"
                title="גלול לתחתית"
              >
                <CircleArrowDown className="w-5 h-5" />
              </button>
            )}
             <div className="relative flex items-center">
              <textarea
                ref={inputRef}
                value={localInput + interimText}
                onChange={e => {
                  setLocalInput(e.target.value);
                  setInterimText('');
                  interimRef.current = '';
                }}
                placeholder="שאל שאלה על המערכת..."
                className="w-full bg-gray-100 border-transparent focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl py-3 pr-12 pl-12 text-sm transition-all outline-none text-gray-800 shadow-inner resize-none overflow-y-auto max-h-[10rem]"
                rows={Math.min(10, Math.max(1, (localInput + interimText).split('\n').length || 1))}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = target.scrollHeight + 'px';
                }}
              />
              {/* Microphone Button */}
              <button
                type="button"
                onClick={handleVoiceInput}
                className={`absolute bottom-1.5 right-1.5 p-2 rounded-full transition-all shadow-md active:scale-95 flex items-center justify-center
                  ${isRecording ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                title={isRecording ? 'עצור הקלטה' : 'הקלט קול'}
              >
                {isRecording ? <CircleStop className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              {/* Send Button */}
              <button
                type="submit"
                disabled={isLoading || (!localInput.trim() && !interimText.trim())}
                className="absolute bottom-1.5 left-1.5 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-95 flex items-center justify-center"
              >
                <Send className="w-4 h-4 translate-x-[-1px]" style={{ transform: 'rotate(180deg)' }} />
              </button>
            </div>
            <div className="text-center mt-2">
              <span className="text-[10px] text-gray-300">מופעל ע"י בינה מלאכותית. מומלץ לוודא נתונים חשובים.</span>
            </div>
          </form>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-80 sm:w-96 max-h-[80vh] flex flex-col overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white flex justify-between items-center shadow-md">
              <h3 className="font-bold text-lg">היסטוריית שיחות</h3>
              <button onClick={() => setShowHistoryModal(false)} className="text-blue-100 hover:text-white transition-colors bg-white/10 p-1.5 rounded-full hover:bg-white/20">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {/* New Chat option */}
              <button
                onClick={startNewChat}
                className="w-full text-right p-3 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold transition-colors flex items-center gap-2"
              >
                <CirclePlus className="w-5 h-5" />
                <span>שיחה חדשה</span>
              </button>
              {allSessions.length === 0 ? (
                <p className="text-center text-gray-500 mt-4">אין שיחות שמורות עדיין.</p>
              ) : (
                allSessions
                  .sort((a, b) => b.updatedAt - a.updatedAt) // Sort by most recent
                  .map((session) => (
                    <button
                      key={session.id}
                      onClick={() => loadChatSession(session.id)}
                      className={`w-full text-right p-3 rounded-lg hover:bg-gray-100 transition-colors text-gray-800 flex flex-col items-start ${currentSessionId === session.id ? 'bg-blue-100 font-bold' : 'bg-white'}`}
                    >
                      <span className="font-medium">{session.title}</span>
                      <span className="text-xs text-gray-500 mt-1">
                        {new Date(session.updatedAt).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </button>
                  ))
              )}
            </div>
          </div>
        </div>
      )}


    </div>
  );
}