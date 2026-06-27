CREATE TABLE IF NOT EXISTS games (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    version VARCHAR(50),
    node_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    port INTEGER NOT NULL,
    cpu INTEGER DEFAULT 1,
    memory INTEGER DEFAULT 1024,
    storage INTEGER DEFAULT 5120,
    status VARCHAR(50) DEFAULT 'stopped',
    players INTEGER DEFAULT 0,
    max_players INTEGER DEFAULT 20,
    world_name VARCHAR(255),
    backup_enabled BOOLEAN DEFAULT false,
    backup_interval INTEGER DEFAULT 24,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS game_backups (
    id UUID PRIMARY KEY,
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    path VARCHAR(255) NOT NULL,
    size INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_games_node_id ON games(node_id);
CREATE INDEX idx_games_user_id ON games(user_id);
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_game_backups_game_id ON game_backups(game_id);