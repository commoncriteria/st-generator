import { createSlice } from "@reduxjs/toolkit";
import { v4 as uuidv4 } from "uuid";

// pulled from
// https://www.niap-ccevs.org/technical-decisions
// Empty spaces in component IDs allow item to show inside section without component ID match

const initialState = {
  tdDefaults: [
  {
    title: "1003: Adding MOD_EDR_V2.0 and MOD_HA_V2.0 to the Conformance Claims for PP_APP_V2.0",
    tdNumber: 1003,
    section: "protection_profile_for_application_software_20",
    cc_ids: [" "],
    sfrs: [],
  },
  {
    title: "989: Correction to FCS_TLSC_EXT.1.1:8.1 in PKG_TLS_V2.1",
    tdNumber: 989,
    section: "functional_package_for_transport_layer_security_tls_21",
    cc_ids: ["FCS_TLSC_EXT.1.1_8_1"],
    sfrs: [],
  },
  {
    title: "981: Correction to Test FCS_TLSS_EXT.1.1:5.3.5",
    tdNumber: 981,
    section: "functional_package_for_transport_layer_security_tls_21",
    cc_ids: ["FCS_TLSS_EXT.1.1:5.3.5"],
    sfrs: [],
  },
  {
    title: "980: Correction to FCS_(D)TLSS_EXT.1.4 and FCS_(D)TLSC_EXT.1.4",
    tdNumber: 980,
    section: "functional_package_for_transport_layer_security_tls_21",
    cc_ids: [
      "FCS_TLSS_EXT.1.4",
      "FCS_TLSC_EXT.1.4",
      "FCS_DTLSS_EXT.1.4",
      "FCS_DTLSC_EXT.1.4",
    ],
    sfrs: [],
  },
  {
    title: "979: Correction to Section 1.3 FCS_RBG.1 Entry",
    tdNumber: 979,
    section: "functional_package_for_transport_layer_security_tls_21",
    cc_ids: [" ","Section 1.3"],
    sfrs: [],
  },
  {
    title: "969: Correction to Session Resumption Test",
    tdNumber: 969,
    section: "functional_package_for_transport_layer_security_tls_21",
    cc_ids: ["FCS_TLSS_EXT.5"],
    sfrs: [],
  },
  {
    title: "956: (D)TLSC Test Corrections",
    tdNumber: 956,
    section: "functional_package_for_transport_layer_security_tls_21",
    cc_ids: ["FCS_TLSC_EXT.1.1", "FCS_DTLSC_EXT.1.1"],
    sfrs: [],
  },
  {
    title: "966: Correction to FCS_CKM.1",
    tdNumber: 966,
    section: "virtual_private_network_vpn_clients_30",
    cc_ids: ["FCS_CKM.1", "FCS_CKM.1/AK"],
    sfrs: [],
  },
]
};

export const tdSlice = createSlice({
  name: "td",
  initialState,
  reducers: {
    CREATE_TD: (state, action) => {
      let newId = uuidv4();
      const { title, tdNumber, tdReason, uniquePP, sfrs } = action.payload;

      //checking for existing items with uniquePP and tdNumber
      const match = Object.entries(state).find(([key, value]) => value.uniquePP === uniquePP && value.tdNumber === tdNumber);

      if (!match && !state.hasOwnProperty(newId)) {
        state[newId] = {
          title: title,
          tdNumber: tdNumber,
          tdReason: tdReason,
          sfrs: sfrs,
          uniquePP: uniquePP,
        };
        action.payload = { uuid: newId, tdReason: tdReason, tdNumber: tdNumber, uniquePP: uniquePP };
      } else {
        if (match) {
          const [matchedKey, matchedValue] = match;
          let tdReason = matchedValue.tdReason;
          action.payload = { uuid: matchedKey, tdReason: tdReason, tdNumber: tdNumber, uniquePP: uniquePP };
        } else {
          action.payload = null;
        }
      }
    },
    UPDATE_TD: (state, action) => {
      const { uuid, tdReason } = action.payload;
      if (state.hasOwnProperty(uuid)) {
        state[uuid].tdReason = tdReason;
        action.payload = { uuid: uuid, tdReason: tdReason, tdNumber: state[uuid].tdNumber, uniquePP: state[uuid].uniquePP };
      }
    },
    DELETE_TD: (state, action) => {
      const { uuid, tdReason } = action.payload;
      if (state.hasOwnProperty(uuid)) {
        if (state[uuid].tdReason === tdReason) {
          delete state[uuid];
        }
      }
    },
    ADD_SFR_TO_TD_DEFAULT: (state, action) => {
      const { tdNumber, uuid } = action.payload;
      const td = state.tdDefaults.find((d) => d.tdNumber === tdNumber);
      if (td) {
        if (!td.sfrs) td.sfrs = [];
        if (!td.sfrs.includes(uuid)) td.sfrs.push(uuid);
      }
    },
  },
});

// Action creators are generated for each case reducer function
export const { ADD_SFR_TO_TD_DEFAULT, CREATE_TD, UPDATE_TD, DELETE_TD } = tdSlice.actions;

export default tdSlice.reducer;
