const express = require('express');
const cors = require('cors');
const axios = require('axios');
const OpenAI = require('openai');
const Database = require('./database');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const MCP_GATEWAY_URL = 'http://127.0.0.1:3000/mcp';

// Initialize Database
const database = new Database();

// Define the tools available to the agent
const tools = [
    {
        type: "function",
        function: {
            name: "get_doctypes",
            description: "Get a list of all available DocTypes in RavanOS",
            parameters: { type: "object", properties: {} },
        },
    },
    {
        type: "function",
        function: {
            name: "get_doctype_fields",
            description: "Get the list of fields for a specific DocType in RavanOS",
            parameters: {
                type: "object",
                properties: {
                    doctype: { type: "string", description: "The DocType to get fields for (e.g., 'Customer', 'Item')." },
                },
                required: ["doctype"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "get_documents",
            description: "Get a list of documents for a specific DocType in RavanOS",
            parameters: {
                type: "object",
                properties: {
                    doctype: { type: "string", description: "The DocType to get documents from (e.g., 'Customer', 'Item')." },
                    fields: { type: "array", items: { type: "string" }, description: "Optional. List of fields to include in the response." },
                    filters: { type: "object", description: "Optional. Filters to apply, in the format {field: value}." },
                    limit: { type: "number", description: "Optional. Maximum number of documents to return." },
                },
                required: ["doctype"],
            },
        },
    },

];

// Basic system prompt
const getSystemPrompt = () => {
    return `You are an intelligent RavanOS Chat Assistant powered by GPT-4o. You help users interact with their business management system efficiently and provide detailed, formatted responses.

## Capabilities:
- **Data Retrieval**: Search customers, items, sales orders, reports, etc.
- **Document Management**: Create, update, and manage business documents
- **Report Generation**: Run various business reports and analytics
- **Advanced Analysis**: Provide deep insights with GPT-4o's enhanced reasoning capabilities

## Response Format Guidelines:
- Use markdown formatting for better readability
- Structure responses with headers, lists, and tables when appropriate
- Provide actionable insights and suggestions
- Include relevant data in well-formatted tables
- Leverage advanced reasoning for complex business analysis

## Important Notes:
- Always be helpful and provide complete information
- If data is not available, suggest alternative approaches
- Explain technical terms when necessary
- You are part of the RavanOS ecosystem, a comprehensive business management platform
- Use your enhanced capabilities to provide deeper business insights and recommendations`;
};

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

// Simplified chat endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { messages, sessionId: providedSessionId, userId = 'anonymous' } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Messages array is required' });
        }

        // Create or use existing session
        let sessionId = providedSessionId;
        if (!sessionId) {
            const session = await database.createSession(userId, 'New Chat');
            sessionId = session.id;
        }

        // Get conversation history from database
        const existingMessages = await database.getSessionMessages(sessionId);
        
        // Combine with new messages
        const allMessages = [
            { role: 'system', content: getSystemPrompt() },
            ...existingMessages.map(msg => ({ role: msg.role, content: msg.content })),
            ...messages
        ];

        // Process conversation with AI
        const response = await runConversation(allMessages);

        // Save new messages to database
        for (const message of messages) {
            await database.addMessage(sessionId, message.role, message.content);
        }
        
        // Save AI response
        await database.addMessage(sessionId, 'assistant', response);

        // Auto-generate session title if it's a new session
        if (!providedSessionId) {
            try {
                const userMessage = messages[messages.length - 1]?.content || '';
                const titleResponse = await openai.chat.completions.create({
                    model: 'gpt-4o',
                    messages: [
                        {
                            role: 'system',
                            content: 'Generate a short, descriptive title (max 4 words) for this conversation. Only return the title.'
                        },
                        {
                            role: 'user',
                            content: userMessage
                        }
                    ],
                    max_tokens: 20,
                    temperature: 0.3,
                });
                
                const title = titleResponse.choices[0].message.content.trim();
                await database.updateSessionTitle(sessionId, title);
            } catch (error) {
                console.error('Error generating title:', error);
            }
        }

        res.json({ 
            response, 
            sessionId
        });

    } catch (error) {
        console.error('Error in chat endpoint:', error);
        res.status(500).json({ error: 'An error occurred during the conversation.' });
    }
});



async function runConversation(messages) {
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages,
            tools: tools,
            tool_choice: 'auto',
            temperature: 0.7,
        });

        const responseMessage = response.choices[0].message;
        const toolCalls = responseMessage.tool_calls;

        if (toolCalls) {
            // Add the assistant's response with tool calls to messages
            messages.push(responseMessage);

            for (const toolCall of toolCalls) {
                const functionName = toolCall.function.name;
                const functionArgs = JSON.parse(toolCall.function.arguments);
                
                console.log(`Calling MCP tool: ${functionName} with args:`, functionArgs);

                try {
                    // Call the MCP gateway using JSON-RPC 2.0 format
                    const rpcRequest = {
                        jsonrpc: "2.0",
                        id: Date.now(),
                        method: `tools/call`,
                        params: {
                            name: functionName,
                            arguments: functionArgs
                        }
                    };

                    const toolResponse = await axios.post(MCP_GATEWAY_URL, rpcRequest, {
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });

                    if (toolResponse.data.error) {
                        throw new Error(`RPC Error: ${JSON.stringify(toolResponse.data.error)}`);
                    }

                    const result = toolResponse.data.result;

                    // Add tool result to messages
                    messages.push({
                        tool_call_id: toolCall.id,
                        role: 'tool',
                        name: functionName,
                        content: JSON.stringify(result),
                    });

                } catch (error) {
                    console.error('Error calling tool via MCP:', error);
                    const errorDetails = error.response ? error.response.data : error.message;
                    
                    messages.push({
                        tool_call_id: toolCall.id,
                        role: 'tool',
                        name: functionName,
                        content: JSON.stringify({ 
                            error: 'Tool call failed', 
                            details: errorDetails 
                        }),
                    });
                }
            }

            // Get the final response after tool calls
            return await runConversation(messages);
        } else {
            return responseMessage.content;
        }
    } catch (error) {
        console.error('Error in runConversation:', error);
        throw error;
    }
}

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down gracefully...');
    if (database) {
        database.close();
    }
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\nShutting down gracefully...');
    if (database) {
        database.close();
    }
    process.exit(0);
});

app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 RavanOS Chat Backend running on 0.0.0.0:${port}`);
    console.log(`💾 Database: SQLite for session management`);
    console.log(`🔗 MCP Gateway: ${MCP_GATEWAY_URL}`);
}); 