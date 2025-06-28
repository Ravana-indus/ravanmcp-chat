# RavanOS Chat

An intelligent AI-powered chat system integrated with RavanOS business management platform, featuring GPT-4o-mini, session management, and real-time data access.

## 🚀 Features

- **🧠 AI-Powered**: GPT-4o-mini intelligence for natural conversations
- **💾 Session Management**: Persistent chat history with SQLite database
- **🎨 Rich Formatting**: Beautiful markdown responses with syntax highlighting
- **🔍 RavanOS Integration**: Live access to business data through MCP protocol
- **📱 Mobile Responsive**: Optimized for desktop, tablet, and mobile devices
- **🔒 Secure**: CORS-enabled with network security best practices

## 🏗 Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend │────│  Node.js Backend │────│   MCP Gateway   │
│   Port 5175      │    │   Port 4000      │    │   Port 3000     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                       ┌─────────────────┐    ┌─────────────────┐
                       │ SQLite Database │    │  RavanOS API    │
                       │ Session Storage │    │   Port 8000     │
                       └─────────────────┘    └─────────────────┘
```

## 📋 Prerequisites

- Node.js 18+ and npm
- SQLite
- OpenAI API Key
- RavanOS instance (optional for basic chat)

## 🛠 Installation

### 1. Clone the Repository
```bash
git clone https://github.com/Ravana-indus/ravanmcp-chat.git
cd ravanmcp-chat
```

### 2. Backend Setup
```bash
cd backend
npm install

# Create .env file
echo "OPENAI_API_KEY=your_openai_api_key_here" > .env
echo "DATABASE_PATH=./chat_sessions.db" >> .env
echo "MCP_GATEWAY_URL=http://127.0.0.1:3000/mcp" >> .env
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
```

### 4. MCP Gateway (Optional - for RavanOS integration)
```bash
cd ../mcp-gateway
npm install

# Configure RavanOS credentials in config
```

## 🚀 Running the Application

### Development Mode

1. **Start Backend**:
```bash
cd backend
OPENAI_API_KEY=your_api_key npm start
```

2. **Start Frontend**:
```bash
cd frontend
npm run dev
```

3. **Start MCP Gateway** (Optional):
```bash
cd mcp-gateway
npm start
```

### Production Mode

```bash
# Backend
cd backend
OPENAI_API_KEY=your_api_key nohup node index.js > backend.log 2>&1 &

# Frontend (build and serve)
cd frontend
npm run build
npm run preview -- --host 0.0.0.0 --port 5175
```

## 🌐 Access URLs

- **Frontend**: http://localhost:5175
- **Backend API**: http://localhost:4000
- **MCP Gateway**: http://localhost:3000 (if running)

## 📁 Project Structure

```
ravanmcp-chat/
├── backend/
│   ├── index.js           # Express server
│   ├── database.js        # SQLite session management
│   ├── mcpClient.js       # MCP protocol client
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx        # Main React component
│   │   ├── App.css        # Styles
│   │   └── main.jsx       # Entry point
│   ├── index.html
│   └── package.json
├── mcp-gateway/           # Optional RavanOS integration
└── README.md
```

## 🔧 Configuration

### Environment Variables

**Backend (.env)**:
```env
OPENAI_API_KEY=sk-proj-your-key-here
DATABASE_PATH=./chat_sessions.db
MCP_GATEWAY_URL=http://127.0.0.1:3000/mcp
PORT=4000
```

**Frontend**:
- API URL is automatically detected based on hostname
- Supports localhost and production deployments

### API Endpoints

- `POST /api/chat` - Send chat message
- `GET /api/sessions` - List chat sessions
- `POST /api/sessions` - Create new session
- `GET /api/sessions/:id/messages` - Get session messages
- `DELETE /api/sessions/:id` - Delete session

## 🎨 Features Detail

### Chat Interface
- Real-time messaging with typing indicators
- Markdown rendering with syntax highlighting
- Code blocks with language detection
- Tables and lists support
- Mobile-responsive design

### Session Management
- Automatic session creation
- Persistent chat history
- Session titles and metadata
- Delete functionality
- Message counting

### RavanOS Integration
- Live data queries
- Document management
- Report generation
- Business analytics

## 🚨 Troubleshooting

### Mixed Content Issues
If accessing via HTTPS, ensure backend also supports HTTPS or use:
- HTTP URLs: `http://your-domain:5175`
- Or configure reverse proxy for HTTPS

### CORS Issues
Backend includes CORS middleware, but ensure:
- Frontend and backend are on same protocol (HTTP/HTTPS)
- Correct API URLs in frontend configuration

### Database Issues
- Ensure SQLite permissions are correct
- Check database file creation in backend directory
- Verify database initialization logs

## 🔐 Security

- Environment variables for sensitive data
- CORS configuration for API access
- Input validation and sanitization
- Session-based access control

## 📝 API Documentation

### Chat Endpoint
```javascript
POST /api/chat
{
  "messages": [{"role": "user", "content": "Hello"}],
  "sessionId": "optional-session-id",
  "userId": "user-identifier"
}
```

Response:
```javascript
{
  "response": "AI response text",
  "sessionId": "generated-or-existing-session-id"
}
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🎯 Roadmap

- [ ] User authentication and authorization
- [ ] File upload and sharing capabilities
- [ ] Voice message support
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Plugin system for custom integrations

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Contact: support@ravanos.com
- Documentation: [RavanOS Docs](https://docs.ravanos.com)

---

**Built with ❤️ by the RavanOS Team** 