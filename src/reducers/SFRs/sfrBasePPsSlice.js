import { createSlice } from "@reduxjs/toolkit";

// Constants
export const defaultTipTapValues = { text: "", open: true };
export const defaultAudit = {
  isAudit: true,
  section: {
    id: "",
    title: "",
    description: "",
    open: false,
  },
  auditTable: {
    id: "",
    table: "",
    title: "",
    open: false,
  },
  eventsTableOpen: false,
  open: true,
};

// The initial state
const initialState = {
  sfrBasePPDefinition: ``,
};

export const sfrBasePPsSlice = createSlice({
  name: "sfrBasePPs",
  initialState,
  reducers: {
    SET_SFR_BASE_PP_INITIAL_STATE: (state, action) => {
      try {
        return {
          ...action.payload,
        };
      } catch (e) {
        console.log(e);
      }
    },
    RESET_SFR_BASE_PP_STATE: () => initialState,
  },
});

// Action creators are generated for each case reducer function
export const { SET_SFR_BASE_PP_INITIAL_STATE, RESET_SFR_BASE_PP_STATE } = sfrBasePPsSlice.actions;

export default sfrBasePPsSlice.reducer;
