CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS nodes (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    hostname VARCHAR(255) NOT NULL,
    ip VARCHAR(45),
    token VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'offline',
    cpu FLOAT DEFAULT 0,
    memory FLOAT DEFAULT 0,
    disk FLOAT DEFAULT 0,
    uptime FLOAT DEFAULT 0,
    last_heartbeat TIMESTAMP,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY,
    node_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    target VARCHAR(255),
    params TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    result TEXT,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS logs (
    id UUID PRIMARY KEY,
    node_id UUID REFERENCES nodes(id) ON DELETE SET NULL,
    level VARCHAR(50) DEFAULT 'info',
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_nodes_user_id ON nodes(user_id);
CREATE INDEX idx_tasks_node_id ON tasks(node_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_logs_node_id ON logs(node_id);
CREATE INDEX idx_logs_created_at ON logs(created_at);