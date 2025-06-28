import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import 'highlight.js/styles/github.css';

const getApiUrl = () => {
  if (typeof window === 'undefined') return 'http://localhost:4000';
  
  const hostname = window.location.hostname;
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:4000';
  }
  
  // For demochat.ravanos.com, use the direct IP to avoid mixed content issues
  if (hostname === 'demochat.ravanos.com') {
    return 'http://206.189.139.5:4000';
  }
  
  return `http://${hostname}:4000`;
};

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [showSidebar, setShowSidebar] = useState(window.innerWidth > 768);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadSessions();
  }, []);

  // Handle window resize for mobile responsiveness
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile && !showSidebar) {
        setShowSidebar(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [showSidebar]);

  // Handle mobile sidebar overlay click
  const handleOverlayClick = () => {
    if (isMobile && showSidebar) {
      setShowSidebar(false);
    }
  };

  const loadSessions = async () => {
    setIsLoadingSessions(true);
    try {
      const API_URL = getApiUrl();
      const response = await axios.get(`${API_URL}/api/sessions`);
      setSessions(response.data.sessions || []);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const createNewSession = async () => {
    try {
      const API_URL = getApiUrl();
      const response = await axios.post(`${API_URL}/api/sessions`, {
        title: 'New Chat'
      });
      const newSession = response.data.session;
      setCurrentSessionId(newSession.id);
      setMessages([{
        role: 'assistant',
        content: `# Welcome to RavanOS Chat! 🚀

I'm your intelligent business assistant powered by GPT-4o, here to help you with your RavanOS system. I can:

- **📋 List DocTypes** - Show all available document types
- **🔍 Search Documents** - Find customers, items, orders, etc.
- **📊 Generate Reports** - Run various business reports
- **✏️ Create & Update** - Manage documents and records
- **🧠 Advanced Analysis** - Provide deep business insights with enhanced reasoning

*Try asking me: "List all doctypes" or "Show me recent sales orders"*`,
        timestamp: new Date()
      }]);
      await loadSessions();
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const loadSession = async (sessionId) => {
    try {
      const API_URL = getApiUrl();
      const response = await axios.get(`${API_URL}/api/sessions/${sessionId}/messages`);
      const sessionMessages = response.data.messages || [];
      
      if (sessionMessages.length === 0) {
        setMessages([{
          role: 'assistant',
          content: `# Welcome back! 👋

I'm your GPT-4o powered assistant, ready to help you with your RavanOS system. What would you like to work on today?`,
          timestamp: new Date()
        }]);
      } else {
        setMessages(sessionMessages.map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.timestamp)
        })));
      }
      
      setCurrentSessionId(sessionId);
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  };

  const deleteSession = async (sessionId) => {
    if (!confirm('Are you sure you want to delete this chat session?')) return;
    
    try {
      const API_URL = getApiUrl();
      await axios.delete(`${API_URL}/api/sessions/${sessionId}`);
      await loadSessions();
      
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Submit triggered:', { input: input.trim(), isLoading, currentSessionId });
    
    if (!input.trim() || isLoading) {
      console.log('Submit blocked:', { emptyInput: !input.trim(), isLoading });
      return;
    }

    const API_URL = getApiUrl();
    console.log('API URL resolved to:', API_URL);

    const userMessage = { role: 'user', content: input, timestamp: new Date() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const requestPayload = {
        messages: [{ role: 'user', content: input }],
        sessionId: currentSessionId || null, // Let backend create session if null
        userId: 'anonymous'
      };

      console.log('Sending request to:', `${API_URL}/api/chat`, requestPayload);
      const response = await axios.post(`${API_URL}/api/chat`, requestPayload);

      const assistantMessage = { 
        role: 'assistant', 
        content: response.data.response,
        timestamp: new Date()
      };

      setMessages([...newMessages, assistantMessage]);
      
      // Update session ID if it was created by the backend
      if (response.data.sessionId && response.data.sessionId !== currentSessionId) {
        console.log('Setting new session ID:', response.data.sessionId);
        setCurrentSessionId(response.data.sessionId);
        // Refresh sessions in background
        setTimeout(loadSessions, 100);
      }

    } catch (error) {
      console.error('Failed to send message:', error);
      console.error('Error details:', error.response || error.message);
      const errorMessage = { 
        role: 'assistant', 
        content: '❌ **Error**: Sorry, I ran into an issue. Please try again.\n\n*If the problem persists, check that all services are running.*',
        timestamp: new Date()
      };
      setMessages([...newMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const MessageContent = ({ message }) => {
    if (message.role === 'user') {
      return <div className="message-text">{message.content}</div>;
    }
    
    return (
      <div className="message-markdown">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={{
            code: ({node, inline, className, children, ...props}) => {
              return inline ? (
                <code className="inline-code" {...props}>
                  {children}
                </code>
              ) : (
                <pre className="code-block">
                  <code className={className} {...props}>
                    {children}
                  </code>
                </pre>
              );
            },
            table: ({children}) => (
              <div className="table-wrapper">
                <table className="markdown-table">{children}</table>
              </div>
            ),
            thead: ({children}) => <thead>{children}</thead>,
            tbody: ({children}) => <tbody>{children}</tbody>,
            tr: ({children}) => <tr>{children}</tr>,
            th: ({children}) => <th>{children}</th>,
            td: ({children}) => <td>{children}</td>
          }}
        >
          {message.content}
        </ReactMarkdown>
        {message.timestamp && (
          <div className="message-timestamp">
            {message.timestamp.toLocaleTimeString()}
          </div>
        )}
      </div>
    );
  };

  const SessionItem = ({ session, isActive, onClick, onDelete }) => (
    <div 
      className={`session-item ${isActive ? 'active' : ''}`}
      onClick={onClick}
    >
      <div className="session-title">{session.title || 'Untitled Chat'}</div>
      <div className="session-meta">
        <span className="session-date">
          {new Date(session.updated_at).toLocaleDateString()}
        </span>
        <span className="session-messages">
          {session.message_count || 0} messages
        </span>
      </div>
      <button 
        className="session-delete" 
        onClick={(e) => {
          e.stopPropagation();
          onDelete(session.id);
        }}
        title="Delete session"
      >
        🗑️
      </button>
    </div>
  );

  return (
    <div className="app-container">
      {/* Mobile Overlay */}
      {isMobile && showSidebar && (
        <div 
          className="sidebar-overlay visible" 
          onClick={handleOverlayClick}
        />
      )}
      
      {/* Sidebar */}
      <div className={`sidebar ${showSidebar ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <h3>Chat Sessions</h3>
          <button 
            className="new-chat-button" 
            onClick={createNewSession}
            disabled={isLoading}
          >
            ➕ New Chat
          </button>
        </div>
        
        <div className="sessions-list">
          {isLoadingSessions ? (
            <div className="loading-sessions">Loading sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="no-sessions">
              <p>No chat sessions yet.</p>
              <p>Start a new conversation!</p>
            </div>
          ) : (
            sessions.map(session => (
              <SessionItem
                key={session.id}
                session={session}
                isActive={session.id === currentSessionId}
                onClick={() => loadSession(session.id)}
                onDelete={deleteSession}
              />
            ))
          )}
        </div>
        
        <div className="sidebar-footer">
          <div className="app-info">
            <div className="app-title">RavanOS Chat</div>
            <div className="app-version">v2.0 Enhanced</div>
          </div>
        </div>
      </div>

      {/* Toggle Sidebar Button */}
      <button 
        className="sidebar-toggle"
        onClick={() => setShowSidebar(!showSidebar)}
      >
        {showSidebar ? '◀' : '▶'}
      </button>

      {/* Main Chat Area */}
      <div className="chat-container">
        <div className="chat-header">
          <div className="header-title">
            RavanOS Chat
            {currentSessionId && (
              <span className="session-indicator">
                Session: {sessions.find(s => s.id === currentSessionId)?.title || 'Active'}
              </span>
            )}
          </div>
          <div className="header-subtitle">
            Powered by GPT-4o • RavanOS Integration • Session Management
          </div>
        </div>

        <div className="chat-messages">
          {messages.length === 0 && !currentSessionId && (
            <div className="welcome-screen">
              <h2>🚀 Welcome to RavanOS Chat!</h2>
              <p>Your intelligent business companion includes:</p>
              <ul>
                <li>🧠 <strong>AI-Powered</strong> - GPT-4o intelligence</li>
                <li>💾 <strong>Session Management</strong> - Persistent chat history</li>
                <li>🎨 <strong>Rich Formatting</strong> - Beautiful markdown responses</li>
                <li>🔍 <strong>RavanOS Integration</strong> - Live data access</li>
              </ul>
              <p>Start typing below to begin your conversation - no setup required!</p>
            </div>
          )}
          
          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.role}`}>
              <MessageContent message={msg} />
            </div>
          ))}
          
          {isLoading && (
            <div className="message assistant">
              <div className="typing-indicator">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="chat-input-form">
          <input
            type="text"
            className="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={currentSessionId ? 
              "Continue your conversation..." : 
              "Ask me anything about your business data..."
            }
            disabled={isLoading}
          />
          <button 
            type="submit" 
            className="send-button" 
            disabled={isLoading}
            onClick={() => console.log('Send button clicked!')}
          >
            {isLoading ? '⏳' : '📤'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;
