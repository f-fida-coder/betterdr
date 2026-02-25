<?php

declare(strict_types=1);

final class AdminEntityCatalog
{
    public static function definitions(): array
    {
        return [
            self::item('dashboard', 'Dashboard', ['users', 'agents', 'bets', 'transactions'], ['GET /api/admin/stats', 'GET /api/admin/system-stats', 'GET /api/admin/header-summary']),
            self::item('weekly-figures', 'Weekly Figures', ['users', 'transactions', 'bets'], ['GET /api/admin/weekly-figures']),
            self::item('pending', 'Pending', ['transactions', 'users'], ['GET /api/admin/pending', 'POST /api/admin/pending/approve', 'POST /api/admin/pending/decline']),
            self::item('messaging', 'Messaging', ['messages'], ['GET /api/admin/messages', 'POST /api/admin/messages/:id/reply', 'DELETE /api/admin/messages/:id']),
            self::item('game-admin', 'Game Admin', ['matches', 'bets'], ['GET /api/admin/matches', 'POST /api/admin/matches', 'PUT /api/admin/matches/:id']),
            self::item('customer-admin', 'Customer Admin', ['users', 'agents'], ['GET /api/admin/users', 'POST /api/admin/create-user', 'PUT /api/admin/users/:id', 'DELETE /api/admin/users/:id']),
            self::item('agent-manager', 'Agent Management', ['agents', 'master_agents'], ['GET /api/admin/agents', 'POST /api/admin/create-agent', 'PUT /api/admin/agent/:id', 'DELETE /api/admin/agents/:id']),
            self::item('cashier', 'Cashier', ['transactions', 'users'], ['GET /api/admin/cashier/summary', 'GET /api/admin/cashier/transactions']),
            self::item('add-customer', 'Add Customer', ['users', 'agents'], ['POST /api/admin/create-user', 'GET /api/admin/next-username/:prefix']),
            self::item('third-party-limits', '3rd Party Limits', ['thirdpartylimits'], ['GET /api/admin/third-party-limits', 'POST /api/admin/third-party-limits', 'PUT /api/admin/third-party-limits/:id']),
            self::item('props', 'Props / Betting', ['bets'], ['GET /api/admin/bets', 'POST /api/admin/bets', 'DELETE /api/admin/bets/:id']),
            self::item('agent-performance', 'Agent Performance', ['agents', 'users', 'bets'], ['GET /api/admin/agent-performance', 'GET /api/admin/agent-performance/:id/details']),
            self::item('analysis', 'Analysis', ['bets', 'transactions'], ['GET /api/admin/stats']),
            self::item('ip-tracker', 'IP Tracker', ['iplogs', 'users', 'agents', 'admins'], ['GET /api/admin/ip-tracker', 'POST /api/admin/ip-tracker/:id/block', 'POST /api/admin/ip-tracker/:id/unblock']),
            self::item('transactions-history', 'Transactions History', ['transactions', 'users'], ['GET /api/admin/transactions', 'DELETE /api/admin/transactions']),
            self::item('collections', 'Collections', ['collections', 'users'], ['GET /api/admin/collections', 'POST /api/admin/collections', 'POST /api/admin/collections/:id/collect']),
            self::item('deleted-wagers', 'Deleted Wagers', ['deletedwagers', 'bets'], ['GET /api/admin/deleted-wagers', 'POST /api/admin/deleted-wagers/:id/restore']),
            self::item('games-events', 'Games & Events', ['matches'], ['GET /api/admin/matches']),
            self::item('sportsbook-links', 'Sportsbook Links', ['sportsbooklinks'], ['GET /api/admin/sportsbook-links', 'POST /api/admin/sportsbook-links', 'PUT /api/admin/sportsbook-links/:id']),
            self::item('bet-ticker', 'Bet Ticker', ['bets', 'users'], ['GET /api/admin/bets']),
            self::item('ticketwriter', 'TicketWriter', ['bets', 'users'], ['POST /api/admin/bets']),
            self::item('scores', 'Scores', ['matches'], ['GET /api/matches', 'GET /api/matches/stream']),
            self::item('master-agent-admin', 'Master Agent Admin', ['agents', 'master_agents', 'users'], ['GET /api/admin/agents', 'POST /api/admin/create-agent']),
            self::item('billing', 'Billing', ['billinginvoices'], ['GET /api/admin/billing/summary', 'GET /api/admin/billing/invoices', 'POST /api/admin/billing/invoices']),
            self::item('settings', 'Settings', ['platformsettings'], ['GET /api/admin/settings', 'PUT /api/admin/settings']),
            self::item('monitor', 'System Monitor', ['users', 'bets', 'matches', 'transactions'], ['GET /api/admin/system-stats']),
            self::item('rules', 'Rules', ['rules'], ['GET /api/admin/rules', 'POST /api/admin/rules', 'PUT /api/admin/rules/:id', 'DELETE /api/admin/rules/:id']),
            self::item('feedback', 'Feedback', ['feedbacks'], ['GET /api/admin/feedback', 'POST /api/admin/feedback/:id/reply', 'DELETE /api/admin/feedback/:id']),
            self::item('faq', 'FAQ', ['faqs'], ['GET /api/admin/faqs', 'POST /api/admin/faqs', 'PUT /api/admin/faqs/:id', 'DELETE /api/admin/faqs/:id']),
            self::item('user-manual', 'User Manual', ['manualsections'], ['GET /api/admin/manual', 'POST /api/admin/manual', 'PUT /api/admin/manual/:id', 'DELETE /api/admin/manual/:id']),
            self::item('profile', 'Profile', ['admins', 'agents', 'users'], ['GET /api/auth/me', 'PUT /api/auth/profile']),
        ];
    }

    public static function collections(): array
    {
        $collections = [];
        foreach (self::definitions() as $item) {
            foreach (($item['collections'] ?? []) as $name) {
                $collections[(string) $name] = true;
            }
        }
        $out = array_keys($collections);
        sort($out);
        return $out;
    }

    private static function item(string $id, string $label, array $collections, array $routes): array
    {
        return [
            'id' => $id,
            'label' => $label,
            'collections' => $collections,
            'routes' => $routes,
        ];
    }
}
