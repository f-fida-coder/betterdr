import React, { useState, useEffect } from 'react';
import { getAgentTree } from '../../api';

function AgentTreeView({ onClose, onGo, initialQuery = '' }) {
    const [loading, setLoading] = useState(true);
    const [treeData, setTreeData] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedNodes, setExpandedNodes] = useState(new Set());
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchTree = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem('token');
                const data = await getAgentTree(token);
                setTreeData(data);
                // Expand root by default
                if (data.root) {
                    setExpandedNodes(new Set([data.root.id]));
                }
            } catch (err) {
                console.error('Failed to fetch agent tree:', err);
                setError('Failed to load tree');
            } finally {
                setLoading(false);
            }
        };
        fetchTree();
    }, []);

    useEffect(() => {
        setSearchQuery(initialQuery || '');
    }, [initialQuery]);

    useEffect(() => {
        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                onClose?.();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onClose]);

    const toggleNode = (id) => {
        const newSet = new Set(expandedNodes);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setExpandedNodes(newSet);
    };

    const renderNode = (node, depth = 0) => {
        const isExpanded = expandedNodes.has(node.id);
        const isAgent = node.role !== 'player';
        const hasChildren = node.children && node.children.length > 0;
        const isDead = node.isDead || node.username?.toUpperCase() === 'DEAD';

        // Filter based on search
        const matchesSearch = node.username.toLowerCase().includes(searchQuery.toLowerCase());
        const hasMatchingChild = node.children?.some(child =>
            child.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
            child.children?.length > 0 // Simplified: if it has children, just show it for now
        );

        if (searchQuery && !matchesSearch && !hasMatchingChild) {
            return null;
        }

        return (
            <div key={node.id} className={`tree-node-wrapper depth-${depth}`}>
                <div className={`tree-node ${isDead ? 'dead-node' : ''}`}>
                    <div className="node-content" onClick={() => isAgent && toggleNode(node.id)}>
                        {isAgent ? (
                            <span className="node-toggle">
                                {isExpanded ? '−' : '+'}
                            </span>
                        ) : (
                            <span className="node-dot">•</span>
                        )}
                        <span className="node-icon">
                            {isDead ? '💀' : isAgent ? '📁' : '👤'}
                        </span>
                        <span className="node-name">{node.username.toUpperCase()}</span>
                        {isDead && <span className="dead-tag">DEAD</span>}
                    </div>
                    <button className="node-go-btn" onClick={() => onGo(node.id, node.role)}>
                        Go
                    </button>
                </div>
                {isAgent && (isExpanded || searchQuery) && hasChildren && (
                    <div className="node-children">
                        {node.children.map(child => renderNode(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="agent-tree-sidebar-wrap">
            <aside className="agent-tree-container agent-tree-sidebar glass-effect">
                <div className="tree-header">
                    <h3>Agent Tree</h3>
                    <button className="close-x" onClick={onClose}>✕</button>
                </div>

                <div className="tree-search">
                    <div className="search-pill">
                        <span className="pill-label">Agents</span>
                        <input
                            type="text"
                            placeholder="Search accounts..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="tree-scroll-area">
                    {loading ? (
                        <div className="tree-loading">Loading Tree...</div>
                    ) : error ? (
                        <div className="tree-error">{error}</div>
                    ) : treeData ? (
                        <div className="tree-root">
                            {/* Render Root */}
                            <div className="tree-node depth-0 root-node">
                                <div className="node-content" onClick={() => toggleNode(treeData.root.id)}>
                                    <span className="node-toggle">
                                        {expandedNodes.has(treeData.root.id) ? '−' : '+'}
                                    </span>
                                    <span className="node-icon">👑</span>
                                    <span className="node-name">{treeData.root.username.toUpperCase()} (You)</span>
                                </div>
                                <button className="node-go-btn" onClick={() => onGo(treeData.root.id, treeData.root.role)}>
                                    Go
                                </button>
                            </div>
                            {(expandedNodes.has(treeData.root.id) || searchQuery) && (
                                <div className="node-children">
                                    {treeData.tree.map(node => renderNode(node, 1))}
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>
            </aside>
        </div>
    );
}

export default AgentTreeView;
