// Imports
import { createSlice } from "@reduxjs/toolkit";
import { v4 as uuidv4 } from "uuid";
import { deepCopy } from "../../utils/deepCopy.js";
import validator from "validator";

// Initial State
const initialState = {};

export const sfrSectionSlice = createSlice({
  name: "sfrSections",
  initialState,
  reducers: {
    UPDATE_SFR_AUDIT_EVENT: (state, action) => {
      const { sfrUUID, componentUUID, eventUUID, checked, noneSelected } = action.payload;
      const event = state?.[sfrUUID]?.[componentUUID]?.auditEvents?.[eventUUID];
      if (!event) return;

      event.checked = checked;

      if (noneSelected !== undefined) {
        event.noneSelected = noneSelected;
      }
    },
    UPDATE_SFR_ADDITIONAL_AUDIT: (state, action) => {
      const { sfrUUID, componentUUID, eventUUID, itemIndex, checked } = action.payload;
      const event = state?.[sfrUUID]?.[componentUUID]?.auditEvents?.[eventUUID];
      if (!event || !Array.isArray(event.items) || !event.items[itemIndex]) return;
      event.items[itemIndex].checked = checked;
    },
    UPDATE_SFR_COMPONENT_ITEMS: (state, action) => {
      const { sfrUUID, uuid, itemMap } = action.payload;
      let sfrSection = state[sfrUUID][uuid];
      if (sfrSection && Object.entries(itemMap).length > 0) {
        Object.entries(itemMap).map(([key, updatedValue]) => {
          if (key !== "element" && JSON.stringify(sfrSection[key]) !== JSON.stringify(updatedValue)) {
            sfrSection[key] = updatedValue;
          }
        });
      }
    },
    GET_ALL_SFR_OPTIONS_MAP: (state, action) => {
      // state param is required even though not used
      const { sfrSections } = action.payload;
      let sfrOptionsMap = {
        dropdownOptions: { components: [], elements: [], selections: [] },
        nameMap: { components: {}, elements: {}, selections: {} },
        uuidMap: { components: {}, elements: {}, selections: {} },
        elementSelections: {},
      };
      try {
        // Get component and element data
        Object.values(sfrSections).map((sfrClass) => {
          Object.entries(sfrClass).map(([componentUUID, sfrComponent]) => {
            // Get component data
            let componentName = sfrComponent.cc_id;
            let iterationID = sfrComponent.iteration_id;
            let iterationTitle = iterationID && typeof iterationID === "string" && iterationID !== "" ? "/" + iterationID : "";
            let componentTitle = componentName + iterationTitle;
            if (!sfrOptionsMap.dropdownOptions.components.includes(componentTitle)) {
              sfrOptionsMap.dropdownOptions.components.push(componentTitle);
              sfrOptionsMap.nameMap.components[componentTitle] = componentUUID;
              sfrOptionsMap.uuidMap.components[componentUUID] = componentTitle;
            }
            // Get element data
            Object.entries(sfrComponent.elements).map(([elementUUID, sfrElement], index) => {
              let elementName = `${componentName}.${index + 1}${iterationTitle}`;
              if (!sfrOptionsMap.dropdownOptions.elements.includes(elementName)) {
                sfrOptionsMap.dropdownOptions.elements.push(elementName);
                sfrOptionsMap.nameMap.elements[elementName] = elementUUID;
                sfrOptionsMap.uuidMap.elements[elementUUID] = elementName;
                // Get selections data
                if (sfrElement.selectables && Object.keys(sfrElement.selectables).length > 0) {
                  sfrOptionsMap.elementSelections[elementUUID] = [];
                  let elementSelections = sfrOptionsMap.elementSelections[elementUUID];
                  Object.entries(sfrElement.selectables).map(([selectionUUID, selection]) => {
                    // Get component data
                    let id = selection.id;
                    let assignment = selection.assignment;
                    let description = selection.description;
                    let selectable = id ? `${description} (${id})` : description;
                    if (!sfrOptionsMap.dropdownOptions.selections.includes(selectable) && !assignment) {
                      sfrOptionsMap.dropdownOptions.selections.push(selectable);
                      sfrOptionsMap.nameMap.selections[selectable] = selectionUUID;
                      sfrOptionsMap.uuidMap.selections[selectionUUID] = selectable;
                      if (!elementSelections.includes(selectionUUID)) {
                        elementSelections.push(selectionUUID);
                      }
                    }
                  });
                }
              }
            });
          });
        });

        // Sort drop down menu options
        sfrOptionsMap.dropdownOptions.components.sort();
        sfrOptionsMap.dropdownOptions.elements.sort();
        sfrOptionsMap.dropdownOptions.selections.sort();
      } catch (e) {
        console.log(e);
      }
      action.payload = sfrOptionsMap;
    },
    CREATE_SFR_INSTANCES: (state, action) => {
      // instanceNames: [string, string] — names for the two instances
      const { sfrUUID, componentUUID, instanceNames } = action.payload;

      const family = state[sfrUUID];
      if (!family || !family[componentUUID]) return;

      const original = family[componentUUID];
      const instanceUUIDs = [];

      for (let i = 0; i < 2; i++) {
        const cloned = deepCopy(original);
        // Clear all user selections from the clone
        Object.values(cloned.elements || {}).forEach((element) => {
          // Clear selectable checked/assignment_text
          Object.values(element.selectables || {}).forEach((sel) => {
            if (sel.checked !== undefined) {
              sel.checked = false;
            }
            if (sel.assignment_text !== undefined) {
              delete sel.assignment_text;
            }
          });

          // Clear selectableGroup checked
          Object.values(element.selectableGroups || {}).forEach((group) => {
            if (group.checked !== undefined) {
              group.checked = false;
            }
          });
        });

        const newCompUUID = uuidv4();

        // Build UUID remapping for elements
        const elementUUIDMap = {}; // oldUUID -> newUUID
        const newElements = {};
        Object.entries(cloned.elements || {}).forEach(([oldElUUID, element]) => {
          const newElUUID = uuidv4();
          elementUUIDMap[oldElUUID] = newElUUID;

          // Remap selectable UUIDs within this element
          const selectableUUIDMap = {}; // oldUUID -> newUUID
          const newSelectables = {};
          Object.entries(element.selectables || {}).forEach(([oldSelUUID, selectable]) => {
            const newSelUUID = uuidv4();
            selectableUUIDMap[oldSelUUID] = newSelUUID;
            // Update self referencing uuid field if present (this is for selectable group under
            // selectables object)
            const updated = { ...selectable };
            if (updated.uuid) {
              updated.uuid = newSelUUID;
            }
            newSelectables[newSelUUID] = updated;
          });
          element.selectables = newSelectables;

          // Remap selectableGroup keys and their internal group references
          const groupKeyMap = {};
          const newSelectableGroups = {};
          Object.entries(element.selectableGroups || {}).forEach(([oldGroupKey, groupData]) => {
            // Only UUID keys; leave string keys like "group-X" as is
            const newGroupKey = validator.isUUID(oldGroupKey) ? uuidv4() : oldGroupKey;
            groupKeyMap[oldGroupKey] = newGroupKey;
            newSelectableGroups[newGroupKey] = groupData;
          });

          // Update group references within selectableGroups
          Object.values(newSelectableGroups).forEach((groupData) => {
            if (Array.isArray(groupData.groups)) {
              groupData.groups = groupData.groups.map((ref) => {
                if (selectableUUIDMap[ref]) {
                  return selectableUUIDMap[ref];
                }
                if (groupKeyMap[ref]) {
                  return groupKeyMap[ref];
                }
                return ref;
              });
            }
            // Update complex description group references
            if (Array.isArray(groupData.description)) {
              groupData.description.forEach((d) => {
                if (Array.isArray(d?.groups)) {
                  d.groups = d.groups.map((ref) => {
                    if (selectableUUIDMap[ref]) {
                      return selectableUUIDMap[ref];
                    }
                    if (groupKeyMap[ref]) {
                      return groupKeyMap[ref];
                    }
                    return ref;
                  });
                }
              });
            }
          });
          element.selectableGroups = newSelectableGroups;

          // Update title array references
          if (Array.isArray(element.title)) {
            element.title = element.title.map((t) => {
              if (t.selections) {
                const remapped = groupKeyMap[t.selections] || t.selections;
                return { ...t, selections: remapped };
              }
              if (t.assignment) {
                const remapped = selectableUUIDMap[t.assignment] || t.assignment;
                return { ...t, assignment: remapped };
              }
              return t;
            });
          }

          newElements[newElUUID] = element;
        });
        cloned.elements = newElements;

        // Remap evaluationActivities keys from original component/element UUIDs
        const oldEvaluationActivities = cloned.evaluationActivities || {};
        const newEvaluationActivities = {};

        Object.entries(oldEvaluationActivities).forEach(([oldActivityKey, activityValue]) => {
          let newActivityKey = oldActivityKey;

          if (oldActivityKey === componentUUID) {
            newActivityKey = newCompUUID;
          } else if (elementUUIDMap[oldActivityKey]) {
            newActivityKey = elementUUIDMap[oldActivityKey];
          }

          newEvaluationActivities[newActivityKey] = activityValue;
        });

        cloned.evaluationActivities = newEvaluationActivities;

        // Set instance metadata
        cloned.instanceOf = componentUUID;
        cloned.instanceName = instanceNames[i];

        // Add to family
        family[newCompUUID] = cloned;
        instanceUUIDs.push(newCompUUID);
      }

      // Disable original and link to instances
      original.enabled = false;
      original.instances = instanceUUIDs;

      // Reorder family so instances appear right after their original component
      const reordered = {};
      Object.entries(family).forEach(([key, value]) => {
        reordered[key] = value;
        // Insert instances immediately after the original
        if (key === componentUUID) {
          instanceUUIDs.forEach((instUUID) => {
            reordered[instUUID] = family[instUUID];
          });
        }
      });

      // Replace family contents with reordered version
      Object.keys(family).forEach((key) => delete family[key]);
      Object.assign(family, reordered);
    },
    DELETE_SFR_INSTANCES: (state, action) => {
      const { sfrUUID, componentUUID } = action.payload;

      const family = state[sfrUUID];
      if (!family || !family[componentUUID]) return;

      const instance = family[componentUUID];
      if (!instance.instanceOf) return;

      const originalUUID = instance.instanceOf;
      const original = family[originalUUID];
      if (!original) return;

      // Delete all instances
      const instanceUUIDs = original.instances || [];
      instanceUUIDs.forEach((instUUID) => {
        delete family[instUUID];
      });

      // Re-enable original and clear instances array
      original.enabled = true;
      delete original.instances;
    },
    UPDATE_INSTANCE_NAME: (state, action) => {
      const { sfrUUID, componentUUID, instanceName } = action.payload;

      const family = state[sfrUUID];
      if (!family || !family[componentUUID]) return;

      family[componentUUID].instanceName = instanceName;
    },
    SET_SFR_SECTIONS_INITIAL_STATE: (state, action) => {
      try {
        return {
          ...action.payload,
        };
      } catch (e) {
        console.log(e);
      }
    },
    RESET_SFR_SECTION_STATE: () => initialState,
  },
});

// Action creators are generated for each case reducer function
export const {
  UPDATE_SFR_AUDIT_EVENT,
  UPDATE_SFR_ADDITIONAL_AUDIT,
  UPDATE_SFR_COMPONENT_ITEMS,
  GET_ALL_SFR_OPTIONS_MAP,
  RESET_SFR_SECTION_STATE,
  CREATE_SFR_INSTANCES,
  DELETE_SFR_INSTANCES,
  UPDATE_INSTANCE_NAME,
  SET_SFR_SECTIONS_INITIAL_STATE,
} = sfrSectionSlice.actions;

export default sfrSectionSlice.reducer;
