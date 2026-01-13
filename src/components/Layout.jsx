import React from 'react';

const ContentWrapper = ({ children }) => {
    return <main className="content-wrapper">{children}</main>;
};

const MainLayout = ({ children, sidebar }) => {
    return (
        <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-start' }}>
            <div className="main-content">
                {children}
            </div>
            <div style={{ width: '350px', flexShrink: 0 }}>
                {sidebar}
            </div>
        </div>
    );
};

export { ContentWrapper, MainLayout };
