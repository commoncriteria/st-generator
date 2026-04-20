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

import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isNavOpen: false,
  isPreviewToggled: false,
};

export const navBarSlice = createSlice({
  name: "navBar",
  initialState,
  reducers: {
    setIsNavBarOpen: (state) => {
      state.isNavOpen = !state.isNavOpen;
    },
    setIsPreviewToggled: (state) => {
      state.isPreviewToggled = !state.isPreviewToggled;
    },
  },
});

// Action creators are generated for each case reducer function
export const { setIsNavBarOpen, setIsPreviewToggled } = navBarSlice.actions;

export default navBarSlice.reducer;
