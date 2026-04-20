/*
 * NOTICE:
 *
 * This software was produced for the U. S. Government
 * under Basic Contract No. W56KGU-18-D-0004, and is
 * subject to the Rights in Noncommercial Computer Software
 * and Noncommercial Computer Software Documentation
 * Clause 252.227-7014 (FEB 2014)
 *
 * © 2026 The MITRE Corporation.
 */

import navBarReducer from "../reducers/navBarSlice";
import contentPaneReducer from "../reducers/contentPaneSlice";
import accordionPaneReducer from "../reducers/accordionPaneSlice";
import sfrReducer from "../reducers/SFRs/sfrSlice";
import sfrSectionReducer from "../reducers/SFRs/sfrSectionSlice";
import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from "redux-persist";
import sessionStorage from "redux-persist/lib/storage/session";
import sarsReducer from "../reducers/sarsSlice";
import stylingReducer from "../reducers/styling.js";
import sfrWorksheetUIReducer from "../reducers/SFRs/sfrWorksheetUI.js";
import sfrBasePPsReducer from "../reducers/SFRs/sfrBasePPsSlice.js";
import tdReducer from "../reducers/ST/tdSlice";

const persistConfig = {
  key: "root",
  version: 1,
  storage: sessionStorage,
};

const reducer = combineReducers({
  navBar: navBarReducer,
  contentPane: contentPaneReducer,
  accordionPane: accordionPaneReducer,
  sfrs: sfrReducer,
  sfrSections: sfrSectionReducer,
  sars: sarsReducer,
  styling: stylingReducer,
  sfrWorksheetUI: sfrWorksheetUIReducer,
  sfrBasePPs: sfrBasePPsReducer,
  stTD: tdReducer,
});

const persistedReducer = persistReducer(persistConfig, reducer);

const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export default store;
