import React, { createContext, useContext } from 'react';
import { DEFAULT_ODDS_FORMAT } from '../utils/odds';

const OddsFormatContext = createContext({
    oddsFormat: DEFAULT_ODDS_FORMAT,
    setOddsFormat: async () => {},
    isUpdatingOddsFormat: false,
});

export const OddsFormatProvider = ({ value, children }) => (
    <OddsFormatContext.Provider value={value}>
        {children}
    </OddsFormatContext.Provider>
);

export const useOddsFormat = () => useContext(OddsFormatContext);
