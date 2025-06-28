const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class Database {
    constructor() {
        this.db = null;
        this.initDatabase();
    }

    async initDatabase() {
        return new Promise((resolve, reject) => {
            const dbPath = path.join(__dirname, 'chat.db');
            this.db = new sqlite3.Database(dbPath, (err) => {
                if (err) {
                    console.error('Error opening database:', err);
                    reject(err);
                } else {
                    console.log('Connected to SQLite database');
                    this.createTables().then(resolve).catch(reject);
                }
            });
        });
    }

    async createTables() {
        return new Promise((resolve, reject) => {
            const createSessionsTable = `
                CREATE TABLE IF NOT EXISTS sessions (
                    id TEXT PRIMARY KEY,
                    user_id TEXT,
                    title TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    metadata TEXT
                );
            `;

            const createMessagesTable = `
                CREATE TABLE IF NOT EXISTS messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    metadata TEXT,
                    FOREIGN KEY (session_id) REFERENCES sessions (id)
                );
            `;

            const createIndexes = `
                CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
                CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
                CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
            `;

            this.db.exec(createSessionsTable + createMessagesTable + createIndexes, (err) => {
                if (err) {
                    console.error('Error creating tables:', err);
                    reject(err);
                } else {
                    console.log('Database tables created successfully');
                    resolve();
                }
            });
        });
    }

    async createSession(userId = 'anonymous', title = 'New Chat') {
        return new Promise((resolve, reject) => {
            const sessionId = uuidv4();
            const query = `
                INSERT INTO sessions (id, user_id, title)
                VALUES (?, ?, ?)
            `;
            
            this.db.run(query, [sessionId, userId, title], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        id: sessionId,
                        user_id: userId,
                        title: title,
                        created_at: new Date().toISOString()
                    });
                }
            });
        });
    }

    async getSession(sessionId) {
        return new Promise((resolve, reject) => {
            const query = `SELECT * FROM sessions WHERE id = ?`;
            
            this.db.get(query, [sessionId], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    async getUserSessions(userId = 'anonymous', limit = 20) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT s.*, 
                       COUNT(m.id) as message_count,
                       MAX(m.timestamp) as last_message_time
                FROM sessions s
                LEFT JOIN messages m ON s.id = m.session_id
                WHERE s.user_id = ?
                GROUP BY s.id
                ORDER BY s.updated_at DESC
                LIMIT ?
            `;
            
            this.db.all(query, [userId, limit], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async addMessage(sessionId, role, content, metadata = null) {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO messages (session_id, role, content, metadata)
                VALUES (?, ?, ?, ?)
            `;
            
            const self = this;
            this.db.run(query, [sessionId, role, content, JSON.stringify(metadata)], function(err) {
                if (err) {
                    reject(err);
                } else {
                    // Update session timestamp
                    const updateSession = `UPDATE sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
                    self.db.run(updateSession, [sessionId]);
                    
                    resolve({
                        id: this.lastID,
                        session_id: sessionId,
                        role: role,
                        content: content,
                        timestamp: new Date().toISOString(),
                        metadata: metadata
                    });
                }
            });
        });
    }

    async getSessionMessages(sessionId, limit = 100) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT * FROM messages 
                WHERE session_id = ? 
                ORDER BY timestamp ASC 
                LIMIT ?
            `;
            
            this.db.all(query, [sessionId, limit], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows.map(row => ({
                        ...row,
                        metadata: row.metadata ? JSON.parse(row.metadata) : null
                    })));
                }
            });
        });
    }

    async updateSessionTitle(sessionId, title) {
        return new Promise((resolve, reject) => {
            const query = `
                UPDATE sessions 
                SET title = ?, updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            `;
            
            this.db.run(query, [title, sessionId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ success: true, changes: this.changes });
                }
            });
        });
    }

    async deleteSession(sessionId) {
        return new Promise((resolve, reject) => {
            const deleteMessages = `DELETE FROM messages WHERE session_id = ?`;
            const deleteSession = `DELETE FROM sessions WHERE id = ?`;
            
            this.db.serialize(() => {
                this.db.run(deleteMessages, [sessionId]);
                this.db.run(deleteSession, [sessionId], function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ success: true, changes: this.changes });
                    }
                });
            });
        });
    }

    async searchMessages(query, userId = 'anonymous', limit = 20) {
        return new Promise((resolve, reject) => {
            const searchQuery = `
                SELECT m.*, s.title, s.user_id
                FROM messages m
                JOIN sessions s ON m.session_id = s.id
                WHERE s.user_id = ? AND m.content LIKE ?
                ORDER BY m.timestamp DESC
                LIMIT ?
            `;
            
            this.db.all(searchQuery, [userId, `%${query}%`, limit], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err);
                } else {
                    console.log('Database connection closed');
                }
            });
        }
    }
}

module.exports = Database; 