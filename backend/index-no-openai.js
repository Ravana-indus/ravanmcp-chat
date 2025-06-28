const express = require('express');
const cors = require('cors');
const axios = require('axios');
const Database = require('./database');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const MCP_GATEWAY_URL = 'http://127.0.0.1:3000/mcp';

// Initialize Database
const database = new Database();

// API Routes

// Get user sessions
app.get('/api/sessions', async (req, res) => {
    try {
        const userId = req.query.userId || 'anonymous';
        const sessions = await database.getUserSessions(userId);
        res.json({ sessions });
    } catch (error) {
        console.error('Error fetching sessions:', error);
        res.status(500).json({ error: 'Failed to fetch sessions' });
    }
});

// Create new session
app.post('/api/sessions', async (req, res) => {
    try {
        const { userId = 'anonymous', title = 'New Chat' } = req.body;
        const session = await database.createSession(userId, title);
        res.json({ session });
    } catch (error) {
        console.error('Error creating session:', error);
        res.status(500).json({ error: 'Failed to create session' });
    }
});

// Get session messages
app.get('/api/sessions/:sessionId/messages', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const messages = await database.getSessionMessages(sessionId);
        res.json({ messages });
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// Delete session
app.delete('/api/sessions/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        await database.deleteSession(sessionId);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting session:', error);
        res.status(500).json({ error: 'Failed to delete session' });
    }
});

// Simple chat endpoint without OpenAI
app.post('/api/chat', async (req, res) => {
    try {
        const { messages, sessionId: providedSessionId, userId = 'anonymous' } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Messages array is required' });
        }

        // Create or use existing session
        let sessionId = providedSessionId;
        if (!sessionId) {
            const session = await database.createSession(userId, 'Test Chat');
            sessionId = session.id;
        }

        const userMessage = messages[messages.length - 1]?.content || '';
        
        // Simple response logic without OpenAI
        let response = '';
        
        if (userMessage.toLowerCase().includes('hello') || userMessage.toLowerCase().includes('hi')) {
            response = `Hello! I'm your ERPNext assistant. I can help you with:

## Available ERPNext Tools:
- **get_doctypes**: List all available document types
- **get_doctype_fields**: Get fields for a specific document type
- **get_documents**: Retrieve documents with filters

Try asking me about customers, items, or any ERPNext data!`;
        } else if (userMessage.toLowerCase().includes('doctypes') || userMessage.toLowerCase().includes('document types')) {
            // Test MCP call
            try {
                const rpcRequest = {
                    jsonrpc: "2.0",
                    id: Date.now(),
                    method: "tools/call",
                    params: {
                        name: "get_doctypes",
                        arguments: {}
                    }
                };

                const mcpResponse = await axios.post(MCP_GATEWAY_URL, rpcRequest, {
                    headers: { 'Content-Type': 'application/json' }
                });

                if (mcpResponse.data.result) {
                    const doctypes = JSON.parse(mcpResponse.data.result.content[0].text);
                    response = `## Available ERPNext DocTypes (${doctypes.length} total):

${doctypes.slice(0, 20).map(dt => `- ${dt}`).join('\n')}

${doctypes.length > 20 ? `\n*...and ${doctypes.length - 20} more document types*` : ''}

You can ask me to get documents from any of these types!`;
                } else {
                    response = 'Sorry, I had trouble retrieving the document types.';
                }
            } catch (error) {
                console.error('MCP Error:', error);
                response = 'Sorry, I had trouble connecting to the ERPNext system.';
            }
        } else if (userMessage.toLowerCase().includes('customers') || userMessage.toLowerCase().includes('customer')) {
            // Test getting customers
            try {
                const rpcRequest = {
                    jsonrpc: "2.0",
                    id: Date.now(),
                    method: "tools/call",
                    params: {
                        name: "get_documents",
                        arguments: {
                            doctype: "Customer",
                            limit: 5
                        }
                    }
                };

                const mcpResponse = await axios.post(MCP_GATEWAY_URL, rpcRequest, {
                    headers: { 'Content-Type': 'application/json' }
                });

                if (mcpResponse.data.result) {
                    const customers = JSON.parse(mcpResponse.data.result.content[0].text);
                    response = `## Recent Customers:

| Name | Customer Type | Territory |
|------|---------------|-----------|
${customers.slice(0, 5).map(c => `| ${c.customer_name || c.name} | ${c.customer_type || 'N/A'} | ${c.territory || 'N/A'} |`).join('\n')}

Found ${customers.length} customers in total.`;
                } else {
                    response = 'Sorry, I had trouble retrieving customers.';
                }
            } catch (error) {
                console.error('MCP Error:', error);
                response = 'Sorry, I had trouble retrieving customer data.';
            }
        } else {
            response = `I received your message: "${userMessage}"

I'm a simple ERPNext assistant. Try asking me about:
- **"doctypes"** - to see available document types
- **"customers"** - to see customer data
- **"hello"** - for a general greeting

I can connect to your ERPNext system via MCP!`;
        }

        // Save new messages to database
        for (const message of messages) {
            await database.addMessage(sessionId, message.role, message.content);
        }
        
        // Save AI response
        await database.addMessage(sessionId, 'assistant', response);

        res.json({ 
            response, 
            sessionId
        });

    } catch (error) {
        console.error('Error in chat endpoint:', error);
        res.status(500).json({ error: 'An error occurred during the conversation.' });
    }
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down gracefully...');
    if (database) {
        database.close();
    }
    process.exit(0);
});

app.listen(port, () => {
    console.log(`🚀 ERPNext Chat Backend (No OpenAI) running on port ${port}`);
    console.log(`💾 Database: SQLite for session management`);
    console.log(`🔗 MCP Gateway: ${MCP_GATEWAY_URL}`);
}); 