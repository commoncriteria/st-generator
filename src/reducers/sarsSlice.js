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
import { v4 as uuidv4 } from "uuid";
import { deepCopy } from "../utils/deepCopy";

const initialState = {
  xmlTagMeta: {
    tagName: "section",
    attributes: {},
  },
  sections: {},
  components: {},
  elements: {},
};

// Additional Methods
const deleteComponent = (state, sarUUID, componentUUID) => {
  if (state.components.hasOwnProperty(componentUUID)) {
    let currentComponent = state.components[componentUUID];
    if (currentComponent.hasOwnProperty("elementIDs") && currentComponent.elementIDs.length > 0) {
      // Run through elements and delete associated elements
      let elementIDs = deepCopy(currentComponent.elementIDs);
      elementIDs.forEach((elementUUID) => {
        if (state.elements.hasOwnProperty(elementUUID)) {
          deleteElement(state, componentUUID, elementUUID);
        }
      });
    }
    // Delete from components
    delete state.components[componentUUID];

    // Delete from parent section array if sarUUID was included
    if (sarUUID && state.sections.hasOwnProperty(sarUUID) && state.sections[sarUUID].hasOwnProperty("componentIDs")) {
      let componentIDs = state.sections[sarUUID].componentIDs;
      if (componentIDs && componentIDs.length > 0) {
        let componentIndex = componentIDs.indexOf(componentUUID);
        if (componentIndex > -1) {
          componentIDs.splice(componentIndex, 1);
        }
      }
    }
  }
};
const deleteElement = (state, componentUUID, elementUUID) => {
  if (state.elements.hasOwnProperty(elementUUID)) {
    // Delete from parent section array if componentUUID was included
    if (componentUUID && state.components.hasOwnProperty(componentUUID) && state.components[componentUUID].hasOwnProperty("elementIDs")) {
      let elementIDs = deepCopy(state.components[componentUUID].elementIDs);
      if (elementIDs && elementIDs.length > 0) {
        let elementIndex = elementIDs.indexOf(elementUUID);
        if (elementIndex > -1) {
          state.components[componentUUID].elementIDs.splice(elementIndex, 1);
        }
      }
    }

    // Delete from elements
    delete state.elements[elementUUID];
  }
};

export const sarsSlice = createSlice({
  name: "sars",
  initialState,
  reducers: {
    SET_XMLTAGMETA: (state, action) => {
      state.xmlTagMeta = action.payload.xmlTagMeta;
    },
    CREATE_SAR_SECTION: (state, action) => {
      let newId = uuidv4();
      const { title, summary } = action.payload;
      let id = action.payload.id ? action.payload.id : "";
      if (!state.sections.hasOwnProperty(newId)) {
        state.sections[newId] = {
          title: title,
          id: id,
          summary: summary,
          open: false,
          componentIDs: [],
        };
        action.payload = newId;
      } else {
        action.payload = null;
      }
    },
    DELETE_SAR: (state, action) => {
      const sarUUID = action.payload.sarUUID;
      if (state.sections.hasOwnProperty(sarUUID)) {
        let currentSection = state.sections[sarUUID];
        if (currentSection.hasOwnProperty("componentIDs") && currentSection.componentIDs.length > 0) {
          // Run through components and delete associated components
          let componentIDs = deepCopy(currentSection.componentIDs);
          componentIDs.forEach((componentUUID) => {
            if (state.components.hasOwnProperty(componentUUID)) {
              deleteComponent(state, sarUUID, componentUUID);
            }
          });
        }
        // Delete the SAR section
        delete state.sections[sarUUID];
      }
    },
    UPDATE_SAR_SECTION_SUMMARY: (state, action) => {
      const { uuid, newSummary } = action.payload;
      if (state.sections.hasOwnProperty(uuid)) {
        state.sections[uuid].summary = newSummary;
      }
    },
    UPDATE_SAR_SECTION_TITLE: (state, action) => {
      const { uuid, title, newTitle } = action.payload;
      if (state.sections.hasOwnProperty(uuid)) {
        if (state.sections[uuid].title === title) {
          state.sections[uuid].title = newTitle;
        }
      }
    },
    COLLAPSE_SAR_SECTION: (state, action) => {
      const { uuid, title, open } = action.payload;
      if (state.sections.hasOwnProperty(uuid)) {
        if (state.sections[uuid].title === title) {
          state.sections[uuid].open = open !== null && typeof open === "boolean" ? open : !state.sections[uuid].open;
        }
      }
    },
    CREATE_SAR_COMPONENT: (state, action) => {
      const componentUUID = uuidv4();
      const { sarUUID } = action.payload;
      if (sarUUID) {
        if (!state.sections.hasOwnProperty(sarUUID)) {
          state.sections[sarUUID] = {
            title: "",
            summary: "",
            open: false,
            componentIDs: [],
          };
        }

        // Add component ID to currentSAR
        let currentSAR = state.sections[sarUUID];
        if (!currentSAR.hasOwnProperty("componentIDs")) {
          currentSAR.componentIDs = [];
        }
        if (!currentSAR.componentIDs.includes(componentUUID)) {
          currentSAR.componentIDs.push(componentUUID);
        }

        // Set the component ID
        let compCCID = "";
        let compName = "";
        let component = action.payload.hasOwnProperty("component") ? action.payload.component : {};
        if (component.hasOwnProperty("xmlTagMeta")) {
          // Attributes from imported xml
          if (component.xmlTagMeta.attributes.hasOwnProperty("cc-id")) {
            compCCID = component.xmlTagMeta.attributes["cc-id"];
          }

          if (component.xmlTagMeta.attributes.hasOwnProperty("name")) {
            compName = component.xmlTagMeta.attributes["name"];
          }

          if (component.xmlTagMeta.attributes.hasOwnProperty("status")) {
            if (component.xmlTagMeta.attributes["status"] == "optional") {
              component.optional = true;
            }
          }
        }

        if (component.ccID) {
          compCCID = component.ccID.toUpperCase();
        }

        // Create new component
        state.components[componentUUID] = {
          ccID: compCCID,
          name: compName,
          optional: component && component.optional ? component.optional : false,
          summary: component && component.summary ? component.summary : "",
          elementIDs: [],
        };
      }
      action.payload = componentUUID;
    },
    UPDATE_SAR_COMPONENT_ITEMS: (state, action) => {
      const { componentUUID, itemMap } = action.payload;
      const sarSection = state.components[componentUUID];
      if (sarSection && Object.entries(itemMap).length > 0) {
        Object.entries(itemMap).forEach(([key, updatedValue]) => {
          if (JSON.stringify(sarSection[key]) !== JSON.stringify(updatedValue)) {
            sarSection[key] = key === "ccID" ? updatedValue.toUpperCase() : updatedValue;
          }
        });
      }
    },
    DELETE_SAR_COMPONENT: (state, action) => {
      const { sarUUID, componentUUID } = action.payload;

      // Delete Component
      deleteComponent(state, sarUUID, componentUUID);
    },
    CREATE_SAR_ELEMENT: (state, action) => {
      const elementUUID = uuidv4();
      const { componentUUID, element } = action.payload;

      if (componentUUID) {
        if (!state.components.hasOwnProperty(componentUUID)) {
          state.components[componentUUID] = {
            ccID: "",
            name: "",
            optional: false,
            summary: "",
            elementIDs: [],
          };
        }

        // Add element ID to currentComponent
        let currentComponent = state.components[componentUUID];
        if (!currentComponent.hasOwnProperty("elementIDs")) {
          currentComponent.elementIDs = [];
        }
        if (!currentComponent.elementIDs.includes(elementUUID)) {
          currentComponent.elementIDs.push(elementUUID);
        }

        // Set the type
        let elementType = "C";
        if (element.hasOwnProperty("xmlTagMeta")) {
          // Attributes from imported xml
          if (element.xmlTagMeta.attributes.hasOwnProperty("type")) {
            elementType = element.xmlTagMeta.attributes.type;
          }
        }

        if (element.type) {
          elementType = element.type;
        }

        // Create new element
        state.elements[elementUUID] = {
          type: elementType,
          title: element && element.title ? element.title : "",
          note: element && element.note ? element.note : "",
          aactivity: element && element.aactivity ? element.aactivity : "",
        };
      }
      action.payload = elementUUID;
    },
    UPDATE_SAR_ELEMENT: (state, action) => {
      const { elementUUID, itemMap } = action.payload;
      const elementSection = state.elements[elementUUID];
      if (elementSection && Object.entries(itemMap).length > 0) {
        Object.entries(itemMap).forEach(([key, updatedValue]) => {
          if (JSON.stringify(elementSection[key]) !== JSON.stringify(updatedValue)) {
            elementSection[key] = updatedValue;
          }
        });
      }
    },
    DELETE_SAR_ELEMENT: (state, action) => {
      const { elementUUID, componentUUID } = action.payload;

      // Delete the element
      deleteElement(state, componentUUID, elementUUID);
    },
    DELETE_ALL_SAR_SECTIONS: (state) => {
      // Delete all elements
      Object.entries(state.elements).map(([key, value]) => {
        delete state.elements[key];
      });

      // Delete all components
      Object.entries(state.components).map(([key, value]) => {
        delete state.components[key];
      });

      // Delete all families
      Object.entries(state.sections).map(([key, value]) => {
        delete state.sections[key];
      });
    },
    SET_SARS_INITIAL_STATE: (state, action) => {
      try {
        return {
          ...action.payload,
        };
      } catch (e) {
        console.log(e);
      }
    },
    RESET_SAR_STATE: () => initialState,
  },
});

// Action creators are generated for each case reducer function
export const {
  SET_XMLTAGMETA,
  CREATE_SAR_SECTION,
  DELETE_SAR,
  UPDATE_SAR_SECTION_TITLE,
  UPDATE_SAR_SECTION_SUMMARY,
  COLLAPSE_SAR_SECTION,
  CREATE_SAR_COMPONENT,
  UPDATE_SAR_COMPONENT_ITEMS,
  DELETE_SAR_COMPONENT,
  CREATE_SAR_ELEMENT,
  UPDATE_SAR_ELEMENT,
  DELETE_SAR_ELEMENT,
  DELETE_ALL_SAR_SECTIONS,
  SET_SARS_INITIAL_STATE,
  RESET_SAR_STATE,
} = sarsSlice.actions;

export default sarsSlice.reducer;
