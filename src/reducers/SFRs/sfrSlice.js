import { createSlice } from "@reduxjs/toolkit";
import { v4 as uuidv4 } from "uuid";
import { defaultAudit } from "./sfrBasePPsSlice.js";
import { deepCopy } from "../../utils/deepCopy.js";

// Constants
export const defaultToeSfr = {
  open: false,
  audit: deepCopy(defaultAudit),
};
export const sfrTypeMap = {
  Mandatory: "mandatory",
  Optional: "optional",
  Objective: "objective",
  "Selection-based": "selectionBased",
  "Implementation-dependent": "implementationDependent",
};

const initialState = {
  auditSection: "",
  sfrDefinition: "",
  toeSfrs: {
    mandatory: deepCopy(defaultToeSfr),
    optional: deepCopy(defaultToeSfr),
    objective: deepCopy(defaultToeSfr),
    selectionBased: deepCopy(defaultToeSfr),
    implementationDependent: deepCopy(defaultToeSfr),
  },
  sections: {},
};

export const sfrSlice = createSlice({
  name: "sfrs",
  initialState,
  reducers: {
    SET_SFRS_INITIAL_STATE: (state, action) => {
      try {
        return {
          ...action.payload,
        };
      } catch (e) {
        console.log(e);
      }
    },
    RESET_SFR_STATE: () => initialState,
  },
});

// Action creators are generated for each case reducer function
export const { RESET_SFR_STATE, SET_SFRS_INITIAL_STATE } = sfrSlice.actions;

export default sfrSlice.reducer;
