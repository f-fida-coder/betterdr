export const sportsData = [
    {
        id: 'up-next',
        label: 'UP NEXT',
        icon: 'fa-solid fa-clock',
        type: 'main-link',
        selectable: true
    },
    {
        id: 'commercial-live',
        label: 'LIVE NOW',
        icon: 'fa-solid fa-tv',
        selectable: true
    },
    {
        id: 'football',
        label: 'FOOTBALL',
        icon: 'fa-solid fa-football',
        selectable: false,
        children: [
            {
                id: 'nfl',
                label: 'NFL',
                icon: 'fa-solid fa-helmet-safety',
                selectable: true
            }
        ]
    },
    {
        id: 'basketball',
        label: 'BASKETBALL',
        icon: 'fa-solid fa-basketball',
        selectable: false,
        children: [
            { id: 'nba', label: 'NBA', selectable: true }
        ]
    },
    {
        id: 'baseball',
        label: 'BASEBALL',
        icon: 'fa-solid fa-baseball-bat-ball',
        selectable: false,
        children: [
            { id: 'mlb', label: 'MLB', selectable: true }
        ]
    },
    {
        id: 'hockey',
        label: 'HOCKEY',
        icon: 'fa-solid fa-hockey-puck',
        selectable: false,
        children: [
            { id: 'nhl', label: 'NHL', selectable: true }
        ]
    },
    {
        id: 'soccer',
        label: 'SOCCER',
        icon: 'fa-solid fa-futbol',
        selectable: false,
        children: [
            { id: 'epl', label: 'Premier League', selectable: true }
        ]
    }
];
