const KNOWN_TEAM_LOGOS = {
    'leeds united': 'https://upload.wikimedia.org/wikipedia/en/5/54/Leeds_United_F.C._logo.svg',
    'nottingham forest': 'https://upload.wikimedia.org/wikipedia/en/e/e5/Nottingham_Forest_F.C._logo.svg'
};

const normalizeTeamName = (teamName = '') =>
    String(teamName || '')
        .toLowerCase()
        .replace(/[.'-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const getHash = (input) => {
    let hash = 0;
    for (let i = 0; i < input.length; i += 1) {
        hash = input.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
};

const toInitials = (teamName = '') => {
    const words = String(teamName).trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return '?';
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase();
};

export const createFallbackTeamLogoDataUri = (teamName = '') => {
    const safeTeamName = String(teamName || 'Team');
    const hash = getHash(safeTeamName.toLowerCase());
    const hue = hash % 360;
    const secondaryHue = (hue + 36) % 360;
    const initials = toInitials(safeTeamName);
    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="hsl(${hue}, 78%, 46%)" />
      <stop offset="100%" stop-color="hsl(${secondaryHue}, 78%, 36%)" />
    </linearGradient>
  </defs>
  <circle cx="40" cy="40" r="38" fill="url(#g)" />
  <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,.32)" stroke-width="2" />
  <text x="40" y="48" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#fff">${initials}</text>
</svg>`;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg.trim())}`;
};

export const fetchTeamBadgeUrl = async (teamName = '') => {
    const normalized = normalizeTeamName(teamName);
    if (!normalized) return '';

    if (KNOWN_TEAM_LOGOS[normalized]) {
        return KNOWN_TEAM_LOGOS[normalized];
    }

    return '';
};
