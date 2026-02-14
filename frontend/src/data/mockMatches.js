const getTeamLogo = (teamName, color = '000000') => {
    const name = encodeURIComponent(teamName);
    return `https://ui-avatars.com/api/?name=${name}&background=${color}&color=fff&size=128&font-size=0.45&bold=true`;
};

const getPlayerAvatar = (playerName) => {
    const name = encodeURIComponent(playerName);
        return `https://ui-avatars.com/api/?name=${name}&background=random&color=fff&rounded=true&size=128`;
};

export const getMockDataForSport = (sportId) => {
        const baseDate = "SUNDAY, JAN 11";
    let matches = [];
    let title = sportId.toUpperCase();
    let icon = "fa-solid fa-trophy";     let showProps = true;
    let promos = [];

        if (sportId === 'nfl' || sportId.includes('football')) {
        title = "NFL";
        icon = "fa-solid fa-helmet-safety";

        promos = [
            {
                title: "Leaders In The Clubhouse",
                time: "Today 11:00 PM",
                badge: "WA SGP",
                players: [
                    { name: "Travis Etienne Jr.", team: "BUF @ JAX", event: "Yes - To Score a Touchdown", avatar: getPlayerAvatar("TE") },
                    { name: "Christian McCaffrey", team: "SF @ PHI", event: "Yes - To Score a Touchdown", avatar: getPlayerAvatar("CM") },
                    { name: "Dallas Goedert", team: "SF @ PHI", event: "Yes - To Score a Touchdown", avatar: getPlayerAvatar("DG") }
                ],
                odds: "+809 » +833"
            },
            {
                title: "Rushing Spot!",
                time: "Today 11:00 PM",
                badge: "WA SGP",
                players: [
                    { name: "James Cook", team: "BUF @ JAX", event: "79½ Over - Total Rushing Yards", avatar: getPlayerAvatar("JC") },
                    { name: "Travis Etienne Jr.", team: "BUF @ JAX", event: "65½ Over - Total Rushing Yards", avatar: getPlayerAvatar("TE") },
                    { name: "Saquon Barkley", team: "SF @ PHI", event: "81½ Over - Total Rushing Yards", avatar: getPlayerAvatar("SB") }
                ],
                odds: "+1162 » +1220"
            }
        ];

        matches = [
            {
                id: 1,
                time: "01:00 PM EST",
                broadcast: "CBS",
                home: "Buffalo Bills",
                homeRecord: "(12-5)",
                homeLogo: getTeamLogo("Buffalo Bills", "00338D"),
                away: "Jacksonville Jaguars",
                awayRecord: "(13-4)",
                awayLogo: getTeamLogo("Jacksonville Jaguars", "006778"),
                spread: ["+1½ -110", "-1½ -110"],
                moneyline: ["+105", "-125"],
                total: ["O 51 -110", "U 51 -110"],
                teamTotal: ["O 26 -120", "O 26 -130", "U 26 -110", "U 26 +100"]
            },
            {
                id: 2,
                time: "04:30 PM EST",
                broadcast: "FOX",
                home: "San Francisco 49ers",
                homeRecord: "(12-5)",
                homeLogo: getTeamLogo("San Francisco 49ers", "AA0000"),
                away: "Philadelphia Eagles",
                awayRecord: "(11-6)",
                awayLogo: getTeamLogo("Philadelphia Eagles", "004C54"),
                spread: ["+6 -110", "-6 -110"],
                moneyline: ["+215", "-265"],
                total: ["O 44½ -110", "U 44½ -110"],
                teamTotal: ["O 20 -115", "O 24½ -120", "U 20 -115", "U 24½ -110"]
            },
            {
                id: 3,
                time: "08:15 PM EST",
                broadcast: "NBC",
                home: "Los Angeles Chargers",
                homeRecord: "(11-6)",
                homeLogo: getTeamLogo("Los Angeles Chargers", "0080C6"),
                away: "New England Patriots",
                awayRecord: "(14-3)",
                awayLogo: getTeamLogo("New England Patriots", "002244"),
                spread: ["+3½ -110", "-3½ -110"],
                moneyline: ["+160", "-190"],
                total: ["O 45½ -110", "U 45½ -110"],
                teamTotal: ["O 21 -115", "O 24½ -120", "U 21 -115", "U 24½ -110"]
            }
        ];
    } else if (sportId === 'nba' || sportId.includes('basketball')) {
        title = "NBA";
        icon = "fa-solid fa-basketball";

        promos = [
            {
                title: "Points Leaders",
                time: "Tonight 7:30 PM",
                badge: "NBA BOOST",
                players: [
                    { name: "Jayson Tatum", team: "BOS", event: "25+ Points", avatar: getPlayerAvatar("JT") },
                    { name: "Giannis Antetokounmpo", team: "MIL", event: "30+ Points", avatar: getPlayerAvatar("GA") }
                ],
                odds: "+450 » +525"
            }
        ];

        matches = [
            {
                id: 1,
                time: "07:30 PM EST",
                broadcast: "ESPN",
                home: "Boston Celtics",
                homeRecord: "(30-10)",
                homeLogo: getTeamLogo("Boston Celtics", "007A33"),
                away: "Milwaukee Bucks",
                awayRecord: "(28-12)",
                awayLogo: getTeamLogo("Milwaukee Bucks", "00471B"),
                spread: ["-4.5 -110", "+4.5 -110"],
                moneyline: ["-180", "+155"],
                total: ["O 235.5 -110", "U 235.5 -110"],
                teamTotal: ["O 120.5 -110", "O 115.5 -110", "U 120.5 -110", "U 115.5 -110"]
            },
            {
                id: 2,
                time: "10:00 PM EST",
                broadcast: "TNT",
                home: "Phoenix Suns",
                homeRecord: "(25-15)",
                homeLogo: getTeamLogo("Phoenix Suns", "1D1160"),
                away: "Denver Nuggets",
                awayRecord: "(29-11)",
                awayLogo: getTeamLogo("Denver Nuggets", "0E2240"),
                spread: ["-1.5 -110", "+1.5 -110"],
                moneyline: ["-125", "+105"],
                total: ["O 228 -110", "U 228 -110"],
                teamTotal: ["O 114.5 -115", "O 112.5 -115", "U 114.5 -115", "U 112.5 -115"]
            }
        ];
    } else if (sportId === 'tennis' || sportId.includes('tennis')) {
        title = "TENNIS";
        icon = "fa-solid fa-table-tennis-paddle-ball";
        showProps = false;
        matches = [
            {
                id: 1,
                time: "03:00 AM EST",
                broadcast: "AO",
                home: "Novak Djokovic",
                homeRecord: "(SRB)",
                homeLogo: getTeamLogo("Novak Djokovic", "333"),
                away: "Carlos Alcaraz",
                awayRecord: "(ESP)",
                awayLogo: getTeamLogo("Carlos Alcaraz", "333"),
                spread: ["-2.5 -120", "+2.5 +100"],
                moneyline: ["-150", "+130"],
                total: ["O 38.5 -110", "U 38.5 -110"],
                teamTotal: ["", "", "", ""]
            }
        ]
    } else {
                title = sportId.replace(/-/g, ' ').toUpperCase();
        matches = [
            {
                id: 1,
                time: "12:00 PM EST",
                broadcast: "Stream",
                home: "Home Team",
                homeRecord: "(0-0)",
                homeLogo: getTeamLogo("HT", "333"),
                away: "Away Team",
                awayRecord: "(0-0)",
                awayLogo: getTeamLogo("AT", "666"),
                spread: ["PK -110", "PK -110"],
                moneyline: ["-110", "-110"],
                total: ["O 50 -110", "U 50 -110"],
                teamTotal: ["", "", "", ""]
            }
        ];
    }

    return { title, icon, matches, showProps, date: baseDate, promos };
};
