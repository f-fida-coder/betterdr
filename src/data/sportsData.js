
export const sportsData = [
    {
        id: 'up-next',
        label: 'UP NEXT',
        icon: 'fa-solid fa-clock',
        type: 'main-link',
        selectable: false
    },
    {
        id: 'featured',
        label: 'FEATURED',
        icon: 'fa-solid fa-star',
        type: 'main-link',
        selectable: false
    },
    {
        id: 'commercial-live',
        label: 'COMMERCIAL LIVE',
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
                selectable: true,
                children: [
                    { id: 'nfl-1st-half', label: '1st Half', selectable: true, hasChildren: true },
                    { id: 'nfl-1st-quarter', label: '1st Quarter', selectable: true, hasChildren: true },
                    { id: 'nfl-2nd-quarter', label: '2nd Quarter', selectable: true, hasChildren: true }
                ]
            },
            {
                id: 'ncaa-football',
                label: 'NCAA Football',
                icon: 'fa-solid fa-building-columns',
                selectable: true,
                children: [
                    { id: 'ncaa-1st-half', label: '1st Half', selectable: true, hasChildren: true },
                    { id: 'ncaa-1st-quarter', label: '1st Quarter', selectable: true, hasChildren: true }
                ]
            },
            { id: 'nfl-1st-scoring', label: 'NFL 1ST SCORING PLAY', selectable: false, hasChildren: true },
            { id: 'nfl-1st-td-scorer', label: 'NFL 1ST TD SCORER', selectable: false, hasChildren: true },
            { id: 'nfl-anytime-td', label: 'NFL ANYTIME TD SCORER', selectable: false, hasChildren: true },
            { id: 'nfl-margin-victory', label: 'NFL MARGIN OF VICTORY', selectable: false, hasChildren: true },
            { id: 'nfl-player-props', label: 'NFL TEXANS VS STEELERS PLAYER PROPS', selectable: false, hasChildren: true },
            { id: 'nfl-props-plus', label: 'NFL Props Plus +', selectable: false, icon: 'fa-solid fa-arrow-right', type: 'props-plus' },
            { id: 'college-props-plus', label: 'College Props Plus +', selectable: false, icon: 'fa-solid fa-arrow-right', type: 'props-plus' },
            { id: 'afl-props-plus', label: 'AFL Props Plus +', selectable: false, icon: 'fa-solid fa-arrow-right', type: 'props-plus' }
        ]
    },
    {
        id: 'baseball',
        label: 'BASEBALL',
        icon: 'fa-solid fa-baseball-bat-ball',
        selectable: false,
        children: [
            { id: 'mlb', label: 'MLB', selectable: true },
            { id: 'kbo', label: 'KBO League', selectable: true }
        ]
    },
    {
        id: 'basketball',
        label: 'BASKETBALL',
        icon: 'fa-solid fa-basketball',
        selectable: false,
        children: [
            { id: 'nba', label: 'NBA', selectable: true },
            { id: 'ncaab', label: 'NCAA Basketball', selectable: true }
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
    },
    {
        id: 'golf',
        label: 'GOLF',
        icon: 'fa-solid fa-golf-ball-tee',
        selectable: false,
        children: [
            { id: 'pga', label: 'PGA Tour', selectable: true }
        ]
    },
    {
        id: 'tennis',
        label: 'TENNIS',
        icon: 'fa-solid fa-table-tennis-paddle-ball',
        selectable: false,
        children: [
            { id: 'atp', label: 'ATP', selectable: true }
        ]
    },
    {
        id: 'martial-arts',
        label: 'MARTIAL ARTS',
        icon: 'fa-solid fa-person-hiking',
        selectable: true
    },
    {
        id: 'boxing',
        label: 'BOXING',
        icon: 'fa-solid fa-hand-fist',
        selectable: true
    },
    {
        id: 'auto-racing',
        label: 'AUTO RACING',
        icon: 'fa-solid fa-flag-checkered',
        selectable: true
    },
    {
        id: 'rugby',
        label: 'RUGBY',
        icon: 'fa-solid fa-football',
        selectable: true
    },
    {
        id: 'olympics',
        label: 'OLYMPICS',
        icon: 'fa-solid fa-fire',
        selectable: true
    }
];
