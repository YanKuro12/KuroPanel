CREATE TABLE IF NOT EXISTS file_nodes (
    id UUID PRIMARY KEY,
    path VARCHAR(512) NOT NULL,
    name VARCHAR(255) NOT NULL,
    is_dir BOOLEAN DEFAULT false,
    size BIGINT DEFAULT 0,
    mime_type VARCHAR(100),
    perm VARCHAR(10),
    node_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id VARCHAR(512),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_file_nodes_node_id ON file_nodes(node_id);
CREATE INDEX idx_file_nodes_parent_id ON file_nodes(parent_id);
CREATE INDEX idx_file_nodes_path ON file_nodes(path);