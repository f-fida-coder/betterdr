import React, { useState, useEffect } from 'react';
import { getAgentTree, getMe } from '../../api';

function AgentTreeView({
    onClose,
    onGo,
    initialQuery = '',
    onRestoreBaseContext,
    canRestoreBaseContext = false,
    baseContextLabel = 'Admin'
}) {
    const AGENT_ROLES = new Set(['admin', 'agent', 'master_agent', 'super_agent']);
    const normalizeRole = (role) => String(role || '').trim().toLowerCase();
    const roleLabelForNode = (node) => {
        const role = normalizeRole(node?.role);
        if (role === 'master_agent') return 'M';
        if (role === 'super_agent') return 'S';
        if (role === 'agent') return 'A';
        if (role === 'admin') return 'ADMIN';
        return String(node?.role || '').replace(/_/g, ' ').toUpperCase() || 'ACCOUNT';
    };
    const roleClassForNode = (node) => {
        const role = normalizeRole(node?.role).replace(/_/g, '-');
        return role || 'account';
    };
    const isExpandableRole = (node) => {
        const role = normalizeRole(node?.role);
        return role === 'admin' || role === 'master_agent' || role === 'super_agent';
    };
    const getNodeSearchText = (node) => {
        const username = String(node?.username || '').toLowerCase();
        const roleRaw = normalizeRole(node?.role);
        const roleText = roleRaw.replace(/_/g, ' ');
        const roleCompact = roleText.replace(/\s+/g, '');
        const typeText = String(node?.nodeType || '').toLowerCase();
        return `${username} ${roleText} ${roleCompact} ${typeText}`.trim();
    };
    const nodeMatchesQuery = (node, rawQuery) => {
        const query = String(rawQuery || '').trim().toLowerCase();
        if (!query) return true;
        return getNodeSearchText(node).includes(query);
    };
    const isAgentNode = (node) => {
        const nodeType = String(node?.nodeType || '').toLowerCase();
        if (nodeType === 'agent') return true;
        if (nodeType === 'player') return false;
        return AGENT_ROLES.has(String(node?.role || '').toLowerCase());
    };
    const normalizeNodeId = (value) => String(value || '').trim();
    const findNodePath = (node, targetId) => {
        const normalizedTargetId = normalizeNodeId(targetId);
        if (!normalizedTargetId || !node) return [];

        const nodeId = normalizeNodeId(node.id);
        if (nodeId === normalizedTargetId) {
            return [nodeId];
        }

        const children = Array.isArray(node.children) ? node.children : [];
        for (const child of children) {
            const childPath = findNodePath(child, normalizedTargetId);
            if (childPath.length > 0) {
                return [nodeId, ...childPath];
            }
        }

        return [];
    };
    const [loading, setLoading] = useState(true);
    const [treeData, setTreeData] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedNodes, setExpandedNodes] = useState(new Set());
    const [error, setError] = useState(null);
    const [currentContext, setCurrentContext] = useState(null);

    useEffect(() => {
        const fetchTree = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem('token');
                if (!token) {
                    setError('Please login to load tree');
                    setTreeData(null);
                    setCurrentContext(null);
                    return;
                }

                const baseToken = sessionStorage.getItem('impersonationBaseToken');
                const shouldUseBaseTree = Boolean(canRestoreBaseContext && baseToken && baseToken !== token);

                const meData = await getMe(token);
                setCurrentContext(meData || null);

                let data;
                try {
                    data = await getAgentTree(shouldUseBaseTree ? baseToken : token);
                } catch (treeError) {
                    if (!shouldUseBaseTree) {
                        throw treeError;
                    }
                    data = await getAgentTree(token);
                }

                setTreeData(data);
                if (data?.root) {
                    const nextExpanded = new Set([data.root.id]);
                    const searchRoot = { ...data.root, children: data.tree || [] };
                    const pathToCurrent = findNodePath(searchRoot, meData?.id);
                    pathToCurrent.forEach((nodeId) => nextExpanded.add(nodeId));
                    setExpandedNodes(nextExpanded);
                } else {
                    setExpandedNodes(new Set());
                }
                setError(null);
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

    const hasMatchingAgentInBranch = (node, query) => {
        const normalizedQuery = String(query || '').trim().toLowerCase();
        if (!normalizedQuery) return true;

        const isAgent = isAgentNode(node);
        if (isAgent && nodeMatchesQuery(node, normalizedQuery)) {
            return true;
        }

        return (node.children || []).some((child) => hasMatchingAgentInBranch(child, normalizedQuery));
    };

    const currentContextId = normalizeNodeId(currentContext?.id);
    const treeRootId = normalizeNodeId(treeData?.root?.id);
    const isViewingOriginTree = Boolean(canRestoreBaseContext && currentContextId && treeRootId && currentContextId !== treeRootId);
    const rootChildren = (treeData?.tree || []).filter((node) => isAgentNode(node));
    const rootHasChildren = rootChildren.length > 0;
    const rootCanExpand = Boolean(treeData?.root) && isExpandableRole(treeData.root);
    const rootExpanded = expandedNodes.has(treeData?.root?.id);

    const renderNode = (node, depth = 0) => {
        const isAgent = isAgentNode(node);
        if (!isAgent) return null;

        const nodeId = normalizeNodeId(node.id);
        const isExpanded = expandedNodes.has(nodeId);
        const visibleChildren = (node.children || []).filter((child) => isAgentNode(child));
        const hasChildren = visibleChildren.length > 0;
        const canExpand = hasChildren && isExpandableRole(node);
        const isDead = node.isDead || node.username?.toUpperCase() === 'DEAD';
        const normalizedSearchQuery = searchQuery.trim().toLowerCase();
        const roleLabel = roleLabelForNode(node);
        const roleClassName = roleClassForNode(node);
        // Account tree search only matches/show admin/agent hierarchy nodes.
        if (normalizedSearchQuery) {
            if (!hasMatchingAgentInBranch(node, normalizedSearchQuery)) return null;
        }

        return (
            <div key={nodeId} className={`tree-node-wrapper depth-${depth}`}>
                <div className={`tree-node ${isDead ? 'dead-node' : ''}`}>
                    <div className="node-content" onClick={() => canExpand && toggleNode(nodeId)}>
                        {canExpand ? (
                            <span className="node-toggle">
                                {isExpanded ? '−' : '+'}
                            </span>
                        ) : (
                            <span className="node-toggle node-toggle-spacer" aria-hidden="true"></span>
                        )}
                        <span className="node-name">{node.username.toUpperCase()}</span>
                        <span className={`node-role-badge role-${roleClassName}`}>{roleLabel}</span>
                        {node.agentPercent != null && (
                          <span className="node-pct-badge">{node.agentPercent}%</span>
                        )}
                        {isDead && <span className="dead-tag">DEAD</span>}
                    </div>
                    <button className="node-go-btn" onClick={() => onGo(nodeId, node.role)}>
                        Go
                    </button>
                </div>
                {canExpand && (isExpanded || searchQuery) && (
                    <div className="node-children">
                        {visibleChildren.map(child => renderNode(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="agent-tree-sidebar-wrap">
            <aside className="agent-tree-container agent-tree-sidebar glass-effect">
                <div className="tree-header">
                    <h3>Account Tree</h3>
                    <button className="close-x" onClick={onClose}>✕</button>
                </div>

                <div className="tree-search">
                    <div className="search-pill">
                        <span className="pill-label">Accounts</span>
                        <input
                            type="text"
                            placeholder="Search admin, master, or agent..."
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
                                <div className="node-content" onClick={() => rootCanExpand && toggleNode(treeData.root.id)}>
                                    {rootCanExpand ? (
                                        <span className="node-toggle">
                                            {rootExpanded ? '−' : '+'}
                                        </span>
                                    ) : (
                                        <span className="node-toggle node-toggle-spacer" aria-hidden="true"></span>
                                    )}
                                    <span className="node-name">{treeData.root.username.toUpperCase()}</span>
                                    <span className={`node-role-badge role-${roleClassForNode(treeData.root)}`}>
                                        {roleLabelForNode(treeData.root)}
                                    </span>
                                </div>
                                <button
                                    className="node-go-btn"
                                    onClick={() => {
                                        if (isViewingOriginTree && onRestoreBaseContext) {
                                            onRestoreBaseContext();
                                            return;
                                        }
                                        onGo(treeData.root.id, treeData.root.role);
                                    }}
                                >
                                    Go
                                </button>
                            </div>
                            {rootHasChildren && (rootExpanded || searchQuery) && (
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
