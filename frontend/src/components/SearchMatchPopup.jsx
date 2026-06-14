import React, { useEffect, useMemo, useState } from 'react';
import { useOddsFormat } from '../contexts/OddsFormatContext';
import {
    formatOdds,
    formatLineValue,
    parseOddsNumber,
    getMatchMarket,
    getMarketOutcomeByName,
    getMarketOutcomeByKeyword,
} from '../utils/odds';
import { logoUrlForTeam, fetchTeamBadgeUrl, createFallbackTeamLogoDataUri } from '../utils/teamLogos';
import { getSiteTimezone, getSiteTimezoneLabel } from '../utils/timezone';
import MatchDetailView from './MatchDetailView';
import PropBuilderModal from './PropBuilderModal';

/**
 * Search-result popup. Renders the SAME visual shape as a regular mobile
 * match row (logos + rotation number + team names + spread/ML/total cells
 * + `+` and `P+` action buttons) but isolated inside a bottom-sheet so the
 * player who searched for one game sees only that game. Click an odds
 * cell to add it to the slip; click `+` for all markets; click `P+` for
 * player props. Mirrors MatchCard in MobileContentView, kept standalone
 * so this view can be opened from anywhere without the list-context
 * coupling MatchCard requires (period suffixes, teaser preview, visible-
 * market gating).
 */
const SearchMatchPopup = ({ match, onClose }) => {
    const { oddsFormat } = useOddsFormat();
    const matchId = match?.id || match?.externalId || '';
    const homeTeam = match?.homeTeamFull || match?.homeTeam || match?.home_team || 'Home';
    const awayTeam = match?.awayTeamFull || match?.awayTeam || match?.away_team || 'Away';
    const sportLabel = (match?.sportTitle || match?.sport_title || match?.sportKey || '').toString().replace(/_/g, ' ').toUpperCase();
    const rotationHome = match?.rotation?.home ?? null;
    const rotationAway = match?.rotation?.away ?? null;
    const logoSportCtx = useMemo(() => ({
        sportKey: match?.sportKey || '',
        sport: match?.sportTitle || match?.sport || '',
    }), [match?.sportKey, match?.sportTitle, match?.sport]);
    const homeAbbr = match?.team1Short || match?.homeTeamShort || match?.home_short || '';
    const awayAbbr = match?.team2Short || match?.awayTeamShort || match?.away_short || '';
    const homeLogoCtx = useMemo(() => ({ ...logoSportCtx, abbr: homeAbbr }), [logoSportCtx, homeAbbr]);
    const awayLogoCtx = useMemo(() => ({ ...logoSportCtx, abbr: awayAbbr }), [logoSportCtx, awayAbbr]);

    const startTimeLabel = useMemo(() => {
        const iso = match?.commenceTime || match?.startTime;
        if (!iso) return '';
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return '';
        const tz = getSiteTimezone();
        const formatted = d.toLocaleString('en-US', {
            timeZone: tz,
            month: 'short', day: 'numeric',
            hour: 'numeric', minute: '2-digit',
        });
        return `${formatted} ${getSiteTimezoneLabel(tz)}`;
    }, [match]);

    const odds = useMemo(() => {
        const h2h = getMatchMarket(match, 'h2h');
        const spreads = getMatchMarket(match, 'spreads');
        const totals = getMatchMarket(match, 'totals');
        return {
            spreadHomePoint: getMarketOutcomeByName(spreads, homeTeam)?.point ?? null,
            spreadAwayPoint: getMarketOutcomeByName(spreads, awayTeam)?.point ?? null,
            spreadHomePrice: parseOddsNumber(getMarketOutcomeByName(spreads, homeTeam)?.price),
            spreadAwayPrice: parseOddsNumber(getMarketOutcomeByName(spreads, awayTeam)?.price),
            moneylineHome: parseOddsNumber(getMarketOutcomeByName(h2h, homeTeam)?.price),
            moneylineAway: parseOddsNumber(getMarketOutcomeByName(h2h, awayTeam)?.price),
            totalPoint: getMarketOutcomeByKeyword(totals, 'over')?.point ?? getMarketOutcomeByKeyword(totals, 'under')?.point ?? null,
            totalOverPrice: parseOddsNumber(getMarketOutcomeByKeyword(totals, 'over')?.price),
            totalUnderPrice: parseOddsNumber(getMarketOutcomeByKeyword(totals, 'under')?.price),
        };
    }, [match, homeTeam, awayTeam]);

    const [homeLogo, setHomeLogo] = useState(() => logoUrlForTeam(homeTeam, homeLogoCtx) || createFallbackTeamLogoDataUri(homeTeam));
    const [awayLogo, setAwayLogo] = useState(() => logoUrlForTeam(awayTeam, awayLogoCtx) || createFallbackTeamLogoDataUri(awayTeam));
    useEffect(() => {
        let cancelled = false;
        setHomeLogo(logoUrlForTeam(homeTeam, homeLogoCtx) || createFallbackTeamLogoDataUri(homeTeam));
        setAwayLogo(logoUrlForTeam(awayTeam, awayLogoCtx) || createFallbackTeamLogoDataUri(awayTeam));
        fetchTeamBadgeUrl(homeTeam, homeLogoCtx).then((url) => {
            if (!cancelled && url) setHomeLogo(url);
        }).catch(() => {});
        fetchTeamBadgeUrl(awayTeam, awayLogoCtx).then((url) => {
            if (!cancelled && url) setAwayLogo(url);
        }).catch(() => {});
        return () => { cancelled = true; };
    }, [homeTeam, awayTeam, homeLogoCtx, awayLogoCtx]);

    const matchName = `${awayTeam} vs ${homeTeam}`;
    const handleAdd = (selection, marketType, marketLabel, price, line = null) => {
        const parsed = parseOddsNumber(price);
        if (!matchId || parsed === null) return;
        window.dispatchEvent(new CustomEvent('betslip:add', {
            detail: {
                matchId,
                selection,
                marketType,
                odds: parsed,
                matchName,
                marketLabel,
                line: Number.isFinite(Number(line)) ? Number(line) : null,
                isLive: String(match?.status || '').toLowerCase() === 'live',
                sportKey: String(match?.sportKey || match?.sport || '').toLowerCase(),
            },
        }));
    };

    const [detailOpen, setDetailOpen] = useState(false);
    const [propsOpen, setPropsOpen] = useState(false);

    const modalMatch = useMemo(() => ({
        id: matchId,
        externalId: match?.externalId,
        homeTeam,
        awayTeam,
        // Stable identifiers so the props header resolves logos by league +
        // abbr (the board's pattern), never by the display name alone.
        homeTeamShort: homeAbbr,
        awayTeamShort: awayAbbr,
        odds: match?.odds,
        sportKey: match?.sportKey,
        sport: match?.sportTitle || match?.sport || '',
    }), [matchId, match, homeTeam, awayTeam, homeAbbr, awayAbbr]);

    return (
        <>
        <div style={overlayStyle} onClick={onClose}>
            <div style={sheetStyle} onClick={(e) => e.stopPropagation()}>
                <header style={headerStyle}>
                    <div style={{ minWidth: 0 }}>
                        <div style={titleStyle}>{awayTeam} @ {homeTeam}</div>
                        <div style={subtitleStyle}>
                            {sportLabel}
                            {startTimeLabel && <span style={{ marginLeft: 8 }}>{startTimeLabel}</span>}
                        </div>
                    </div>
                    <button type="button" onClick={onClose} style={closeBtnStyle} aria-label="Close">×</button>
                </header>

                <div style={columnHeaderRowStyle}>
                    <div />
                    <div style={columnHeaderStyle}>SPREAD</div>
                    <div style={columnHeaderStyle}>ML</div>
                    <div style={columnHeaderStyle}>TOTAL</div>
                    <div />
                </div>

                {renderTeamRow({
                    name: awayTeam,
                    logo: awayLogo,
                    rotation: rotationAway,
                    point: odds.spreadAwayPoint,
                    spreadPrice: odds.spreadAwayPrice,
                    mlPrice: odds.moneylineAway,
                    totalPoint: odds.totalPoint,
                    totalPrice: odds.totalOverPrice,
                    totalSide: 'Over',
                    oddsFormat,
                    onSpread: () => handleAdd(awayTeam, 'spreads', 'Spread', odds.spreadAwayPrice, odds.spreadAwayPoint),
                    onMl: () => handleAdd(awayTeam, 'h2h', 'Moneyline', odds.moneylineAway),
                    onTotal: () => handleAdd('Over', 'totals', 'Total', odds.totalOverPrice, odds.totalPoint),
                })}
                {renderTeamRow({
                    name: homeTeam,
                    logo: homeLogo,
                    rotation: rotationHome,
                    point: odds.spreadHomePoint,
                    spreadPrice: odds.spreadHomePrice,
                    mlPrice: odds.moneylineHome,
                    totalPoint: odds.totalPoint,
                    totalPrice: odds.totalUnderPrice,
                    totalSide: 'Under',
                    oddsFormat,
                    onSpread: () => handleAdd(homeTeam, 'spreads', 'Spread', odds.spreadHomePrice, odds.spreadHomePoint),
                    onMl: () => handleAdd(homeTeam, 'h2h', 'Moneyline', odds.moneylineHome),
                    onTotal: () => handleAdd('Under', 'totals', 'Total', odds.totalUnderPrice, odds.totalPoint),
                })}

                <div style={actionRowStyle}>
                    <button
                        type="button"
                        onClick={() => setDetailOpen(true)}
                        style={addAllBtnStyle}
                        title="All game markets"
                    >+ All markets</button>
                    <button
                        type="button"
                        onClick={() => setPropsOpen(true)}
                        style={propsBtnStyle}
                        title="Player props"
                    >P+ Player props</button>
                </div>
            </div>
        </div>

        {/* Secondary modals are SIBLINGS of the SearchMatchPopup overlay
            (not children) so a click on their dim background can only
            close THEM — the bubble path no longer reaches this popup's
            overlay onClose. Effect: back from "All markets" lands the
            player back on this popup, not all the way out to the sports
            grid. */}
        {detailOpen && (
            <MatchDetailView
                match={modalMatch}
                onClose={() => setDetailOpen(false)}
            />
        )}
        {propsOpen && (
            <PropBuilderModal
                match={modalMatch}
                onClose={() => setPropsOpen(false)}
            />
        )}
        </>
    );
};

const renderTeamRow = ({
    name, logo, rotation,
    point, spreadPrice, mlPrice, totalPoint, totalPrice, totalSide,
    oddsFormat, onSpread, onMl, onTotal,
}) => (
    <div style={teamRowStyle}>
        <div style={teamCellStyle}>
            <img
                src={logo}
                alt=""
                loading="lazy"
                className="my-bets-table-logo"
                style={logoStyle}
                onError={(e) => { e.currentTarget.src = createFallbackTeamLogoDataUri(name); }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                {rotation != null && (
                    <span style={rotationStyle}>{rotation}</span>
                )}
                <span style={teamNameStyle}>{name}</span>
            </div>
        </div>

        <OddsCell
            disabled={spreadPrice === null}
            main={point != null ? formatLineValue(point, { signed: true }) : '—'}
            juice={spreadPrice != null ? formatOdds(spreadPrice, oddsFormat) : ''}
            onClick={onSpread}
        />
        <OddsCell
            disabled={mlPrice === null}
            main={mlPrice != null ? formatOdds(mlPrice, oddsFormat) : '—'}
            juice=""
            onClick={onMl}
        />
        <OddsCell
            disabled={totalPrice === null || totalPoint == null}
            main={totalPoint == null ? '—' : `${totalSide === 'Over' ? 'O' : 'U'} ${formatLineValue(totalPoint)}`}
            juice={totalPrice != null ? formatOdds(totalPrice, oddsFormat) : ''}
            onClick={onTotal}
        />
        <div />
    </div>
);

const OddsCell = ({ main, juice, disabled, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        style={{
            ...cellStyle,
            cursor: disabled ? 'default' : 'pointer',
            opacity: disabled ? 0.4 : 1,
        }}
    >
        <span style={cellMainStyle}>{main}</span>
        {juice && <span style={cellJuiceStyle}>{juice}</span>}
    </button>
);

const overlayStyle = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    zIndex: 9998,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
};

const sheetStyle = {
    background: '#fff',
    width: '100%',
    maxWidth: 460,
    borderRadius: 12,
    overflow: 'hidden',
    boxShadow: '0 14px 40px rgba(0,0,0,0.4)',
};

const headerStyle = {
    padding: '12px 14px',
    background: '#ff5051',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
};

const titleStyle = {
    fontSize: 15,
    fontWeight: 800,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
};

const subtitleStyle = {
    fontSize: 11,
    fontWeight: 600,
    color: 'rgba(255,255,255,0.92)',
    marginTop: 2,
    letterSpacing: '0.04em',
};

const closeBtnStyle = {
    width: 32,
    height: 32,
    borderRadius: 16,
    border: 'none',
    background: 'rgba(255,255,255,0.18)',
    color: '#fff',
    fontSize: 22,
    lineHeight: 1,
    cursor: 'pointer',
    flexShrink: 0,
};

const gridCols = 'minmax(0, 1fr) 60px 60px 60px 30px';

const columnHeaderRowStyle = {
    display: 'grid',
    gridTemplateColumns: gridCols,
    padding: '8px 12px 4px',
    background: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
    gap: 6,
};

const columnHeaderStyle = {
    fontSize: 10,
    fontWeight: 800,
    color: '#64748b',
    letterSpacing: '0.06em',
    textAlign: 'center',
};

const teamRowStyle = {
    display: 'grid',
    gridTemplateColumns: gridCols,
    alignItems: 'center',
    padding: '10px 12px',
    borderBottom: '1px solid #f1f5f9',
    gap: 6,
};

const teamCellStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
};

const logoStyle = {
    width: 22,
    height: 22,
    borderRadius: '50%',
    border: '1px solid #e2e8f0',
    flexShrink: 0,
    objectFit: 'cover',
};

const rotationStyle = {
    fontSize: 10,
    fontWeight: 700,
    color: '#9aa3af',
    lineHeight: 1,
};

const teamNameStyle = {
    fontSize: 13,
    fontWeight: 700,
    color: '#0f172a',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    marginTop: 2,
};

const cellStyle = {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    padding: '8px 4px',
    minHeight: 46,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    font: 'inherit',
};

const cellMainStyle = {
    fontSize: 13,
    fontWeight: 700,
    color: '#0f172a',
};

const cellJuiceStyle = {
    fontSize: 11,
    fontWeight: 700,
    color: '#16a34a',
};

const actionRowStyle = {
    display: 'flex',
    gap: 8,
    padding: '12px',
    background: '#f8fafc',
    borderTop: '1px solid #e2e8f0',
};

const addAllBtnStyle = {
    flex: 1,
    background: '#d0451b',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '10px',
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: '0.04em',
    cursor: 'pointer',
};

const propsBtnStyle = {
    flex: 1,
    background: '#8b5cf6',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '10px',
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: '0.04em',
    cursor: 'pointer',
};

export default SearchMatchPopup;
