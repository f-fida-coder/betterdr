const collapseWhitespace = (value) => String(value || '').replace(/\s+/g, ' ').trim();

export const normalizeDuplicateText = (value) => collapseWhitespace(value).toLowerCase();

export const normalizeDuplicatePhone = (value) => {
  const digits = String(value || '').replace(/\D+/g, '');
  if (!digits) return '';
  return digits.length > 10 ? digits.slice(-10) : digits;
};

export const normalizeDuplicateEmail = (value) => normalizeDuplicateText(value);

const buildNormalizedName = (player) => {
  const fullName = normalizeDuplicateText(player?.fullName || player?.name || '');
  if (fullName) return fullName;
  return normalizeDuplicateText(`${player?.firstName || ''} ${player?.lastName || ''}`);
};

const registerKey = (keyToIds, key, id) => {
  if (!key) return;
  if (!keyToIds.has(key)) {
    keyToIds.set(key, new Set());
  }
  keyToIds.get(key).add(id);
};

export const annotateDuplicatePlayers = (players) => {
  if (!Array.isArray(players) || players.length === 0) {
    return [];
  }

  const identityRows = players.map((player, index) => {
    const id = String(player?.id || player?._id || player?.username || `row-${index}`);
    const name = buildNormalizedName(player);
    const phone = normalizeDuplicatePhone(player?.phoneNumber);
    const email = normalizeDuplicateEmail(player?.email);
    return { player, id, name, phone, email };
  });

  const keyToIds = new Map();
  identityRows.forEach(({ id, name, phone, email }) => {
    if (phone) {
      registerKey(keyToIds, `phone:${phone}`, id);
    }
    if (email) {
      registerKey(keyToIds, `email:${email}`, id);
    }
    if (name && phone) {
      registerKey(keyToIds, `name_phone:${name}|${phone}`, id);
    }
    if (name && email) {
      registerKey(keyToIds, `name_email:${name}|${email}`, id);
    }
    if (name && !phone && !email && name.length >= 8 && name.includes(' ')) {
      registerKey(keyToIds, `name_only:${name}`, id);
    }
  });

  const duplicateMetaById = new Map();
  const ensureMeta = (id) => {
    if (!duplicateMetaById.has(id)) {
      duplicateMetaById.set(id, {
        reasons: new Set(),
        groups: new Set(),
        matchCount: 0,
      });
    }
    return duplicateMetaById.get(id);
  };

  keyToIds.forEach((ids, key) => {
    if (ids.size < 2) return;

    const keyReason = key.startsWith('email:')
      ? 'email'
      : key.startsWith('phone:')
        ? 'phone'
        : 'name';

    ids.forEach((id) => {
      const meta = ensureMeta(id);
      meta.reasons.add(keyReason);
      meta.groups.add(key);
      meta.matchCount += ids.size - 1;
    });
  });

  return identityRows.map(({ player, id }) => {
    const meta = duplicateMetaById.get(id);
    if (!meta) {
      return {
        ...player,
        isDuplicatePlayer: false,
        duplicateMatchCount: 0,
        duplicateReasons: [],
        duplicateGroupKeys: [],
      };
    }

    return {
      ...player,
      isDuplicatePlayer: true,
      duplicateMatchCount: meta.matchCount,
      duplicateReasons: Array.from(meta.reasons),
      duplicateGroupKeys: Array.from(meta.groups),
    };
  });
};
