import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Mock UI Component for Chat AI View
export default function ChatPage() {
  const [messages, setMessages] = useState([
    { id: 0, text: "I'm your NeuralFlix AI — what kind of feeling are you chasing tonight?", role: 'ai' }
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    
    // Add user message
    setMessages(prev => [...prev, { id: prev.length, text: input, role: 'user' }]);
    setInput('');
    
    // Trigger streaming API 
    // fetch('/v1/chat/recommend', { ... })
  };

  return (
    <div className="flex flex-col h-screen text-white relative">
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        <AnimatePresence>
          {messages.map(msg => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`max-w-[70%] p-4 rounded-xl shadow-glow ${
                msg.role === 'ai' 
                  ? 'bg-bg-elevated self-start border-l-4 border-neural-electric' 
                  : 'bg-neural-crimson self-end shadow-neural-crimson'
              }`}
            >
              {msg.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="p-4 bg-bg-surface sticky bottom-0">
        <input 
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Give me something highly emotional like Interstellar..."
          className="w-full bg-bg-deep p-4 rounded-full border border-gray-800 text-white placeholder-gray-500 focus:outline-none focus:border-neural-electric"
        />
      </div>
    </div>
  );
}