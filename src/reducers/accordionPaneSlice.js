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
  loadedfile: {
    filename: "",
    content: "",
    pp: false,
    mod: false,
  },
  platformData: {
    description: "",
    platforms: [],
    selectedPlatforms: [],
  },
  snackbar: {
    open: false,
    message: "",
    severity: "success",
    vertical: "bottom",
    horizontal: "left",
    autoHideDuration: 3000,
  },
  metadata: {
    open: false,
    ppType: "Protection Profile",
    ppTemplateVersion: "CC2022 Standard",
    ppName: "",
    author: "",
    keywords: "",
    version: "",
    releaseDate: "",
    revisionHistory: [],
    xmlTagMeta: {},
    customCSS: "",
  },
  sections: {},
  selectedPP: null,
  selectedPackages: [],
  selectedModules: [],
  selectedPlatforms: [],
  showRequirements: false,
  stMetadata: {
    stTitle: "",
    stVersion: "",
    stDate: "",
    stAuthor: "",
    toeDeveloper: "",
    toeIdentifier: "",
  },
};

export const accordionPaneSlice = createSlice({
  name: "accordionPane",
  initialState,
  reducers: {
    SET_SELECTED_PP: (state, action) => {
      state.selectedPP = action.payload;
    },
    SET_SELECTED_PACKAGES: (state, action) => {
      state.selectedPackages = action.payload;
    },
    SET_SELECTED_MODULES: (state, action) => {
      state.selectedModules = action.payload;
    },
    SET_SELECTED_PLATFORMS: (state, action) => {
      state.selectedPlatforms = action.payload;
    },
    SET_SHOW_REQUIREMENTS: (state, action) => {
      state.showRequirements = action.payload;
    },
    UPDATE_ST_METADATA: (state, action) => {
      const { field, value } = action.payload;
      state.stMetadata[field] = value;
    },
    updateMetaDataItem: (state, action) => {
      let type = action.payload.type;
      state.metadata[type] = action.payload.item;
    },
    updateFileUploaded: (state, action) => {
      const { filename, content, pp, mod } = action.payload;
      if (filename) {
        state.loadedfile.filename = filename;
      }
      if (content) {
        state.loadedfile.content = content ? content : "";
      }
      if (pp !== undefined && typeof pp === "boolean") {
        state.loadedfile.pp = pp;
      }
      if (mod !== undefined && typeof mod === "boolean") {
        state.loadedfile.mod = mod;
      }
    },
    UPDATE_PLATFORMS: (state, action) => {
      state.platformData.description = action.payload.description;
      state.platformData.platforms = action.payload.platforms;
      state.platformData.xml = action.payload.xml;
      state.platformData.selectedPlatforms = action.payload.selectedPlatforms || [];
    },
    updateSnackBar: (state, action) => {
      const { open, message, severity, vertical, horizontal, autoHideDuration } = action.payload;

      // Update values
      state.snackbar = {
        open: open !== undefined ? open : false,
        message: message !== undefined ? message : "",
        severity: severity !== undefined ? severity : "success",
        vertical: vertical !== undefined ? vertical : "bottom",
        horizontal: horizontal !== undefined ? horizontal : "left",
        autoHideDuration: autoHideDuration !== undefined ? autoHideDuration : 4000,
      };
    },
    setIsAccordionOpen: (state, action) => {
      let title = action.payload.title;
      let uuid = action.payload.uuid;
      if (state.sections.hasOwnProperty(uuid)) {
        if (state.sections[uuid].title === title) {
          state.sections[uuid].open = !state.sections[uuid].open;
        }
      }
    },
    // Loops through the form items within each accordion until it finds the right one and deletes it
    deleteFormItemHelper: (state, action) => {
      let sections = action.payload.sections;
      let uuid = action.payload.uuid;
      if (sections.hasOwnProperty("formItems")) {
        sections.formItems.map((value, index) => {
          let currentUUID = value.uuid;
          let formItems = value.hasOwnProperty("formItems") ? value.formItems : null;
          if (currentUUID === uuid) {
            sections.formItems.splice(index, 1);
          } else {
            if (formItems) {
              let input = { payload: { sections: value, uuid: uuid } };
              accordionPaneSlice.caseReducers.deleteFormItemHelper(state, input);
            }
          }
        });
      }
    },
    SET_ACCORDION_PANE_INITIAL_STATE: (state, action) => {
      const { loadedfile, platformData, metadata, sections } = action.payload;

      try {
        state.loadedfile = loadedfile;
        state.platformData = platformData;
        state.metadata = metadata;
        state.sections = sections;
      } catch (e) {
        console.log(e);
      }
    },
    RESET_ACCORDION_PANE_STATE: () => initialState,
  },
});

// Action creators are generated for each case reducer function
export const {
  SET_SELECTED_PP,
  SET_SELECTED_PACKAGES,
  SET_SELECTED_MODULES,
  SET_SELECTED_PLATFORMS,
  SET_SHOW_REQUIREMENTS,
  UPDATE_ST_METADATA,
  RESET_ACCORDION_PANE_STATE,
  SET_ACCORDION_PANE_INITIAL_STATE,
  UPDATE_PLATFORMS,
  updateMetaDataItem,
  setIsAccordionOpen,
  updateFileUploaded,
  updateSnackBar,
} = accordionPaneSlice.actions;

export default accordionPaneSlice.reducer;
