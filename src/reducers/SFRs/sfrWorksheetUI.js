// Imports
import { createSlice } from "@reduxjs/toolkit";
import { deepCopy } from "../../utils/deepCopy.js";
import { getComponentXmlID, getElementId, handleSnackBarError } from "../../utils/securityComponents.jsx";

const initialState = {
  openSfrWorksheet: false,
  isSfrWorksheetValid: false,
  sfrUUID: null,
  componentUUID: null,
  elementUUID: null,
  component: {},
  element: {},
  selectedSfrElement: "",
  openSfrComponent: true,
  openSfrElement: true,
  currentElements: {},
  elementXmlId: "",
  newElementUUID: null,
  deletedElement: false,

  // Management Functions
  refIdOptions: [],
  managementFunctionUI: {
    openManagementFunctionModal: false,
    openEditManagementFunctionModal: false,
    rowIndex: 0,
    activity: {
      isNoTest: false,
      noTest: "",
      introduction: "",
      tss: "",
      guidance: "",
      testIntroduction: "",
      testClosing: "",
      testLists: {},
      tests: {},
      refIds: [],
    },
    note: [],
    textArray: [],
  },

  // Evaluation Activities
  activities: {},
  evaluationActivitiesUI: {
    selectedEvaluationActivity: [],
    newSelectedEvaluationActivity: [],
    selectedUUID: "",
    dependencyMap: {
      elementsToSelectables: {},
      elementsToComplexSelectables: {},
      selectablesToUUID: {},
      uuidToSelectables: {},
    },
    evaluationActivityDropdown: {
      Component: [],
      Elements: [],
    },
    newEvaluationActivityDropdown: {
      Component: [],
      Elements: [],
    },
  },

  // Maps
  elementMaps: {
    componentName: "",
    componentUUID: "",
    elementNames: [],
    elementNameMap: {},
    elementUUIDMap: {},
  },
  selectablesMap: {
    dropdownOptions: {
      assignments: [],
      complexSelectables: [],
      groups: [],
      selectables: [],
    },
    nameMap: {
      assignments: {},
      selectables: {},
    },
    uuidMap: {
      assignments: {},
      selectables: {},
    },
  },
  allSfrOptionsMap: {
    dropdownOptions: {
      components: [],
      elements: [],
      selections: [],
      useCases: [],
    },
    nameMap: {
      components: {},
      elements: {},
      selections: {},
      useCases: {},
    },
    uuidMap: {
      components: {},
      elements: {},
      selections: {},
      useCases: {},
    },
    useCaseUUID: null,
    elementSelections: {},
  },
};

export const sfrWorksheetUI = createSlice({
  name: "sfrWorksheetUI",
  initialState,
  reducers: {
    UPDATE_SFR_WORKSHEET_ITEMS: (state, action) => {
      const { itemMap } = action.payload;

      if (itemMap && Object.keys(itemMap).length > 0) {
        Object.entries(itemMap).forEach(([key, value]) => {
          if (state.hasOwnProperty(key)) {
            state[key] = value;
          }
        });
      }

      // Update sfr worksheet validation
      sfrWorksheetValidation(state, itemMap);
    },
    UPDATE_SFR_SELECTABLE: (state, action) => {
      const { elementUUID, selectableUUID, updateMap } = action.payload;

      if (!updateMap || !selectableUUID) return;

      // Update the currently selected element if it matches
      try {
        if (state.element?.selectables?.[selectableUUID]) {
          Object.entries(updateMap).forEach(([key, value]) => {
            state.element.selectables[selectableUUID][key] = value;
          });
        }

        // Update the currentElements map if available
        if (elementUUID && state.currentElements?.[elementUUID]?.selectables?.[selectableUUID]) {
          Object.entries(updateMap).forEach(([key, value]) => {
            state.currentElements[elementUUID].selectables[selectableUUID][key] = value;
          });
        }
      } catch (e) {
        console.log(e);
      }
    },
    UPDATE_SELECTABLE_GROUP_CHECKED: (state, action) => {
      const { elementUUID, groupId, updateMap } = action.payload;

      if (!updateMap || !groupId) return;

      /**
       * Returns all direct child IDs for a selectableGroup from:
       * - group.groups
       * - group.description.groups
       */
      const getChildIDs = (group) => {
        if (!group) return [];

        const childIds = [];

        if (Array.isArray(group.groups)) {
          childIds.push(...group.groups);
        }

        if (Array.isArray(group.description)) {
          group.description.forEach((part) => {
            if (Array.isArray(part.groups)) {
              childIds.push(...part.groups);
            }
          });
        }

        return childIds;
      };

      /**
       * Recursively clears all descendants of a selectableGroup:
       * - unchecks nested selectableGroups
       * - unchecks nested selectables
       * - clears assignment_text on assignment selectables
       */
      const clearGroupDescendants = (element, currentGroupId) => {
        const currentGroup = element?.selectableGroups?.[currentGroupId];
        if (!currentGroup) return;

        const visitChild = (childId) => {
          if (element.selectableGroups?.[childId]) {
            element.selectableGroups[childId].checked = false;

            getChildIDs(element.selectableGroups[childId]).forEach((nestedId) => {
              visitChild(nestedId);
            });

            return;
          }

          if (element.selectables?.[childId]) {
            element.selectables[childId].checked = false;

            if (element.selectables[childId].assignment) {
              element.selectables[childId].assignment_text = "";
            }
          }
        };

        getChildIDs(currentGroup).forEach((childId) => {
          visitChild(childId);
        });
      };

      /**
       * Applies the update to a selectableGroup and clears descendants if unchecked
       */
      const applyGroupUpdate = (element, targetGroupId, updateMap) => {
        if (!element?.selectableGroups?.[targetGroupId]) return;

        Object.entries(updateMap).forEach(([key, value]) => {
          element.selectableGroups[targetGroupId][key] = value;
        });

        if (updateMap.checked === false) {
          clearGroupDescendants(element, targetGroupId);
        }
      };

      try {
        if (state.elementUUID === elementUUID) {
          applyGroupUpdate(state.element, groupId, updateMap);
        }

        if (elementUUID) {
          applyGroupUpdate(state.currentElements?.[elementUUID], groupId, updateMap);
        }
      } catch (e) {
        console.log(e);
      }
    },
    UPDATE_SFR_SELECTION_WITH_GROUP_RULES: (state, action) => {
      const { elementUUID, clickedId, checked, containingGroupId, clickedType } = action.payload;
      if (!elementUUID || !clickedId) return;

      const getChildIds = (group) => {
        if (!group) return [];

        const ids = [];

        if (Array.isArray(group.groups)) {
          ids.push(...group.groups);
        }

        if (Array.isArray(group.description)) {
          group.description.forEach((part) => {
            if (Array.isArray(part.groups)) {
              ids.push(...part.groups);
            }
          });
        }

        return ids;
      };

      const clearGroupDescendants = (element, currentGroupId) => {
        const currentGroup = element?.selectableGroups?.[currentGroupId];
        if (!currentGroup) return;

        const visitChild = (childId) => {
          if (element.selectableGroups?.[childId]) {
            element.selectableGroups[childId].checked = false;
            getChildIds(element.selectableGroups[childId]).forEach(visitChild);
            return;
          }

          if (element.selectables?.[childId]) {
            element.selectables[childId].checked = false;
            if (element.selectables[childId].assignment) {
              element.selectables[childId].assignment_text = "";
            }
          }
        };

        getChildIds(currentGroup).forEach(visitChild);
      };

      const clearSelectableOrGroup = (element, childId) => {
        if (element.selectables?.[childId]) {
          element.selectables[childId].checked = false;
          if (element.selectables[childId].assignment) {
            element.selectables[childId].assignment_text = "";
          }
          return;
        }

        if (element.selectableGroups?.[childId]) {
          element.selectableGroups[childId].checked = false;
          clearGroupDescendants(element, childId);
        }
      };

      const applyCheckedRules = (element) => {
        if (!element) return;

        // Apply clicked state
        if (clickedType === "selectable" && element.selectables?.[clickedId]) {
          element.selectables[clickedId].checked = checked;
        } else if (clickedType === "group" && element.selectableGroups?.[clickedId]) {
          element.selectableGroups[clickedId].checked = checked;
        } else {
          return;
        }

        // Only enforce sibling clearing when checking "on"
        if (checked !== true || !containingGroupId) return;

        const containingGroup = element.selectableGroups?.[containingGroupId];
        if (!containingGroup?.groups) return;

        const clickedExclusive =
          clickedType === "selectable" ? Boolean(element.selectables?.[clickedId]?.exclusive) : Boolean(element.selectableGroups?.[clickedId]?.exclusive);

        const onlyOne = Boolean(containingGroup.onlyOne);

        if (!onlyOne && !clickedExclusive) {
          // Still clear any exclusive sibling if selecting a normal option
          containingGroup.groups.forEach((siblingId) => {
            if (siblingId === clickedId) return;

            if (element.selectables?.[siblingId]?.exclusive && element.selectables[siblingId].checked) {
              clearSelectableOrGroup(element, siblingId);
            }

            if (element.selectableGroups?.[siblingId]?.exclusive && element.selectableGroups[siblingId].checked) {
              clearSelectableOrGroup(element, siblingId);
            }
          });
          return;
        }

        // onlyOne or exclusive -> clear all siblings
        containingGroup.groups.forEach((siblingId) => {
          if (siblingId === clickedId) return;
          clearSelectableOrGroup(element, siblingId);
        });
      };

      try {
        if (state.elementUUID === elementUUID) {
          applyCheckedRules(state.element);
        }

        if (state.currentElements?.[elementUUID]) {
          applyCheckedRules(state.currentElements[elementUUID]);
        }
      } catch (e) {
        console.log(e);
      }
    },
    UPDATE_SFR_WORKSHEET_COMPONENT: (state, action) => {
      const { openSfrWorksheet, sfrUUID, componentUUID, component, activities, elementMaps, allSfrOptionsMap } = state;

      if (openSfrWorksheet) {
        const { sfrSections, newSfrOptions } = action.payload;
        const isValid = sfrUUID && componentUUID && sfrSections;
        const componentExists = sfrSections.hasOwnProperty(sfrUUID) && sfrSections[sfrUUID].hasOwnProperty(componentUUID);

        if (isValid && componentExists) {
          const newComponent = deepCopy(sfrSections[sfrUUID][componentUUID]);
          const newElementMaps = getElementMaps(componentUUID, newComponent);

          // Update the component
          if (JSON.stringify(component) !== JSON.stringify(newComponent)) {
            state.component = newComponent;

            // Generate evaluation activities
            const newEvaluationActivities = newComponent.hasOwnProperty("evaluationActivities") ? newComponent.evaluationActivities : {};
            const isNewEvaluationActivities = JSON.stringify(activities) !== JSON.stringify(newEvaluationActivities);
            if (isNewEvaluationActivities) {
              state.activities = newEvaluationActivities;
            }

            // Generate element maps
            const isNewElementMaps = JSON.stringify(elementMaps) !== JSON.stringify(newElementMaps);
            if (isNewElementMaps) {
              state.elementMaps = newElementMaps;
            }

            // Update all sfr options map
            if (JSON.stringify(allSfrOptionsMap) !== JSON.stringify(newSfrOptions)) {
              state.allSfrOptionsMap = newSfrOptions;
            }

            // Update evaluation activities ui
            const elMapsCopy = deepCopy(isNewElementMaps ? newElementMaps : elementMaps);
            const activitiesCopy = deepCopy(isNewEvaluationActivities ? newEvaluationActivities : activities);
            initializeEvaluationActivitiesUI(elMapsCopy, activitiesCopy, sfrSections, state);

            // Update the elements
            initializeElements(newComponent, newSfrOptions, state);
          }
        }

        // Update sfr worksheet validation
        const itemMap = {
          sfrSections: sfrSections,
          openSfrWorksheet: state.openSfrWorksheet,
        };
        sfrWorksheetValidation(state, itemMap);
      }
    },
    UPDATE_EVALUATION_ACTIVITY_UI_ITEMS: (state, action) => {
      const { updateMap } = action.payload;

      updateEvaluationActivitiesUiItems(updateMap, state);
    },
    RESET_SFR_ELEMENT_UI: (state, action) => {
      const { allValues } = action.payload;
      resetSfrElementUI(state, allValues);
    },
    RESET_SFR_WORKSHEET_UI: () => initialState,
  },
});

// Helper Methods
/**
 * This updates the states sfr worksheet validation
 * @param state the state
 * @param itemMap the item map
 */
const sfrWorksheetValidation = (state, itemMap) => {
  if (itemMap.hasOwnProperty("openSfrWorksheet") && itemMap.hasOwnProperty("sfrSections")) {
    const { sfrSections } = itemMap;
    const { openSfrWorksheet, sfrUUID, componentUUID, component } = state;
    const isSfrUUID = sfrUUID;
    const isComponentUUID = componentUUID;
    const isSfrSections = sfrSections && sfrSections.hasOwnProperty(sfrUUID) && sfrSections[sfrUUID].hasOwnProperty(componentUUID);
    const isComponent = component !== null && component !== undefined && Object.keys(component).length > 0;

    // Validation for opening the sfr worksheet
    const isValid = openSfrWorksheet && isSfrUUID && isComponentUUID && isSfrSections && isComponent;

    if (isValid) {
      state.isSfrWorksheetValid = true;
    } else {
      state.isSfrWorksheetValid = false;
    }
  }
};
/**
 * Initializes the elements
 * @param newComponent the new component
 * @param newSfrOptions the new sfr options
 * @param state the state
 */
const initializeElements = (newComponent, newSfrOptions, state) => {
  const { elementUUID, element, currentElements, selectedSfrElement } = state;

  // Update the elements
  if (newComponent.hasOwnProperty("elements")) {
    const newElements = deepCopy(newComponent.elements);

    // Update the current elements
    if (JSON.stringify(currentElements) !== JSON.stringify(newElements)) {
      state.currentElements = newElements;
    }

    // Update the element in the state
    if (elementUUID && newElements.hasOwnProperty(elementUUID)) {
      const newElement = deepCopy(newComponent.elements[elementUUID]);
      const isNewElement = JSON.stringify(element) !== JSON.stringify(newElement);

      // Update the selected sfr element
      if (
        newSfrOptions.hasOwnProperty("uuidMap") &&
        newSfrOptions.uuidMap.hasOwnProperty("elements") &&
        newSfrOptions.uuidMap.elements.hasOwnProperty(elementUUID)
      ) {
        const newSelectedSfrElement = newSfrOptions.uuidMap.elements[elementUUID].toUpperCase();
        const isNewSelectedSfr = JSON.stringify(selectedSfrElement) !== JSON.stringify(newSelectedSfrElement);

        // Update selected sfr element
        if (isNewSelectedSfr) {
          state.selectedSfrElement = newSelectedSfrElement;
        }

        // Update selectables map
        const getElement = deepCopy(isNewElement ? newElement : element);
        updateSelectablesMap(getElement, state);
      } else {
        resetSfrElementUI(state);
      }

      // Update the selected element
      if (isNewElement) {
        // Initialize management functions
        initializeManagementFunctions(newElement, state);

        // Update element
        state.element = newElement;
      }
    } else {
      // Clear the sfr element ui storage
      resetSfrElementUI(state);
    }
  } else {
    // Clear the sfr element ui storage
    resetSfrElementUI(state);
  }
};
/**
 * Resets the sfr element ui
 * @param state the state
 * @param allValues the is all values boolean
 */
const resetSfrElementUI = (state, allValues = false) => {
  const { elementUUID, element, selectedSfrElement, elementXmlId, newElementUUID, deletedElement, refIdOptions, managementFunctionUI, selectablesMap } =
    initialState;
  state.elementUUID = elementUUID;
  state.element = element;
  state.selectedSfrElement = selectedSfrElement;
  state.elementXmlId = elementXmlId;
  state.refIdOptions = refIdOptions;
  state.managementFunctionUI = deepCopy(managementFunctionUI);
  state.selectablesMap = deepCopy(selectablesMap);

  if (allValues) {
    state.newElementUUID = newElementUUID;
    state.deletedElement = deletedElement;
  }
};

// Management Function Helper Methods
/**
 * Initializes the management functions and management functions ui
 * @param newElement the new element
 * @param state the state
 */
const initializeManagementFunctions = (newElement, state) => {
  // Update the management function activities
  const { rowIndex, openEditManagementFunctionModal, activity, note, textArray } = state.managementFunctionUI;
  let currentManagementFunctions = newElement.managementFunctions;

  if (openEditManagementFunctionModal && rowIndex > -1) {
    // Update the management functions ui
    if (currentManagementFunctions.hasOwnProperty("rows") && currentManagementFunctions.rows.length > 0 && currentManagementFunctions.rows[rowIndex]) {
      let row = currentManagementFunctions.rows[rowIndex];

      // Generate new ea if it does not exist
      if (!row.hasOwnProperty("evaluationActivity")) {
        row.evaluationActivity = {
          isNoTest: false,
          noTest: "",
          introduction: "",
          tss: "",
          guidance: "",
          testIntroduction: "",
          testClosing: "",
          testLists: {},
          tests: {},
          refIds: [],
        };
      }

      // Generate new note if it does not exist
      if (!row.hasOwnProperty("note")) {
        row.note = [];
      }

      // Generate new text array if it does not exist
      if (!row.hasOwnProperty("textArray")) {
        row.textArray = [];
      }

      // Update management function activity
      if (JSON.stringify(activity) !== JSON.stringify(row.evaluationActivity)) {
        state.managementFunctionUI.activity = deepCopy(row.evaluationActivity);
      }

      // Update management function note
      if (JSON.stringify(note) !== JSON.stringify(row.note)) {
        state.managementFunctionUI.note = deepCopy(row.note);
      }

      // Update management function text array
      if (JSON.stringify(textArray) !== JSON.stringify(row.textArray)) {
        state.managementFunctionUI.textArray = deepCopy(row.textArray);
      }
    }
  } else {
    resetManagementFunctionUI(state, true);
  }

  // Generate the ref id options
  if (newElement.hasOwnProperty("isManagementFunction") && newElement.isManagementFunction) {
    const { refIdOptions } = state;
    const newRefIdOptions = generateRefIdOptions(deepCopy(currentManagementFunctions.rows));

    if (JSON.stringify(refIdOptions) !== JSON.stringify(newRefIdOptions)) {
      state.refIdOptions = newRefIdOptions;
    }
  } else {
    state.refIdOptions = [];
  }
};
/**
 * Resets the management function ui
 * @param state the state
 * @param notAllValues not all values boolean
 */
const resetManagementFunctionUI = (state, notAllValues) => {
  const { managementFunctionUI } = initialState;

  if (notAllValues) {
    const { rowIndex, activity, note, textArray } = managementFunctionUI;
    state.managementFunctionUI.rowIndex = rowIndex;
    state.managementFunctionUI.activity = deepCopy(activity);
    state.managementFunctionUI.note = deepCopy(note);
    state.managementFunctionUI.textArray = deepCopy(textArray);
  } else {
    state.managementFunctionUI = deepCopy(managementFunctionUI);
  }
};
/**
 * Generates the ref id options
 * @param rows the rows
 * @returns {*}
 */
const generateRefIdOptions = (rows) => {
  return (
    rows
      // Extract all IDs
      .map((row, index) => ({
        key: index,
        label: row.id,
        disabled: false,
      }))
      .sort((a, b) => {
        const lowerA = a.label.toLowerCase();
        const lowerB = b.label.toLowerCase();

        if (lowerA < lowerB) {
          return -1;
        }
        if (lowerA > lowerB) {
          return 1;
        }
        return 0;
      })
  );
};

// Evaluation Activity Helper Methods
/**
 * Updates the evaluation activities ui items
 * @param updateMap the update map
 * @param state the state
 */
const updateEvaluationActivitiesUiItems = (updateMap, state) => {
  // Updates the evaluation activity ui
  Object.entries(updateMap).map(([key, value]) => {
    state.evaluationActivitiesUI[key] = value;
  });
};
/**
 * Initializes the evaluation activities ui
 * @param elementMaps the element maps
 * @param activities the activities
 * @param sfrSections the sfr sections
 * @param state the state
 */
const initializeEvaluationActivitiesUI = (elementMaps, activities, sfrSections, state) => {
  let updateMap = {};
  const { sfrUUID, componentUUID, evaluationActivitiesUI } = state;
  const { selectedEvaluationActivity, selectedUUID, dependencyMap, evaluationActivityDropdown, newEvaluationActivityDropdown } = evaluationActivitiesUI;
  let mainDropdown = {
    Component: [],
    Elements: [],
  };
  let newDropdown = {
    Component: [],
    Elements: [],
  };

  // Run through activities and add to main dropdown
  if (activities) {
    Object.keys(activities).forEach((uuid) => {
      // Add components to dropdown
      if (elementMaps.componentUUID === uuid && !mainDropdown.Component.includes(elementMaps.componentName)) {
        mainDropdown.Component.push(elementMaps.componentName);
      } else if (elementMaps.elementUUIDMap.hasOwnProperty(uuid)) {
        let name = elementMaps.elementUUIDMap[uuid];
        if (!mainDropdown.Elements.includes(name)) {
          mainDropdown.Elements.push(name);
        }
      }
    });
    sfrElementSort(mainDropdown.Elements);
  }

  // Run through remaining components/elements and add to new evaluation activity dropdown options
  if (!mainDropdown.Component.includes(elementMaps.componentName) && !newDropdown.Component.includes(elementMaps.componentName)) {
    newDropdown.Component.push(elementMaps.componentName);
  }
  elementMaps.elementNames.forEach((name) => {
    if (!mainDropdown.Elements.includes(name) && !newDropdown.Elements.includes(name)) {
      newDropdown.Elements.push(name);
    }
  });
  sfrElementSort(newDropdown.Elements);

  // Generate main dropdown
  if (mainDropdown && JSON.stringify(evaluationActivityDropdown) !== JSON.stringify(mainDropdown)) {
    updateMap.evaluationActivityDropdown = mainDropdown;

    // Get newly selected if the name was changed
    if (selectedUUID) {
      if (selectedEvaluationActivity && selectedEvaluationActivity.length > 0) {
        const selectedEa = selectedEvaluationActivity[0];
        const componentUUID = elementMaps.componentUUID;
        const componentName = elementMaps.componentName;
        const elementUUIDMap = elementMaps.elementUUIDMap;

        // Update selected evaluation activity to the component, or element uuid, or clear it out
        if (selectedUUID === componentUUID && selectedEa !== componentName) {
          updateMap.selectedEvaluationActivity = [componentName];
        } else if (elementUUIDMap.hasOwnProperty(selectedUUID) && elementUUIDMap[selectedUUID] !== selectedEa) {
          updateMap.selectedEvaluationActivity = [elementUUIDMap[selectedUUID]];
        } else if (selectedUUID !== componentUUID && !elementUUIDMap.hasOwnProperty(selectedUUID)) {
          updateMap.selectedUUID = "";
          updateMap.selectedEvaluationActivity = [];
        }
      }
    }
  }

  // Generate new dropdown
  if (newDropdown && JSON.stringify(newEvaluationActivityDropdown) !== JSON.stringify(newDropdown)) {
    updateMap.newEvaluationActivityDropdown = newDropdown;
    updateMap.newSelectedEvaluationActivity = [];
  }

  // Generate dependency map
  const newDependencyMap = getDependencyMap(sfrUUID, componentUUID, sfrSections, elementMaps);
  if (newDependencyMap && JSON.stringify(dependencyMap) !== JSON.stringify(newDependencyMap)) {
    updateMap.dependencyMap = newDependencyMap;
  }

  // Update the evaluation activity ui items
  updateEvaluationActivitiesUiItems(updateMap, state);
};
/**
 * Sorts the sfr elements
 * @param sfrArray the sfr array
 */
const sfrElementSort = (sfrArray) => {
  // Sort the SFR elements in ascending order
  sfrArray.sort((a, b) => {
    const getLastNumber = (str) => parseInt(str.substring(str.lastIndexOf(".") + 1), 10);
    return getLastNumber(a) - getLastNumber(b);
  });
};

// Map Helper Methods
/**
 * Gets the element maps
 * @param componentUUID the component UUID
 * @param component the component
 * @returns {{elementNames: *[], elementNameMap: {}, componentName: *, elementUUIDMap: {}, componentUUID}}
 */
const getElementMaps = (componentUUID, component) => {
  let { cc_id, iteration_id, elements } = component;
  elements = elements ? deepCopy(elements) : {};
  let { formattedCcId, formattedIterationId, componentXmlId } = getComponentXmlID(cc_id, iteration_id, true, true);
  let elementMap = {
    componentName: componentXmlId,
    componentUUID: componentUUID,
    elementNames: [],
    elementNameMap: {},
    elementUUIDMap: {},
  };

  // Generate the element map
  if (elements && Object.entries(elements).length > 0) {
    Object.keys(elements).forEach((key, index) => {
      let name = getElementId(formattedCcId, formattedIterationId, index, false);
      if (!elementMap.elementNames.includes(name)) {
        elementMap.elementNames.push(name);
        elementMap.elementNameMap[name] = key;
        elementMap.elementUUIDMap[key] = name;
      }
    });
  }
  elementMap.elementNames.sort();
  return elementMap;
};
/**
 * Gets the selectable maps
 * @param element the element to get the selectable map from
 * @returns {{dropdownOptions: {assignments: *[], complexSelectables: *[], selectables: *[], groups: *[]}, nameMap: {assignments: {}, selectables: {}}, uuidMap: {assignments: {}, selectables: {}}}}
 */
const getSelectablesMaps = (element) => {
  let selectablesMap = {
    dropdownOptions: {
      assignments: [],
      complexSelectables: [],
      groups: [],
      selectables: [],
    },
    nameMap: {
      assignments: {},
      selectables: {},
    },
    uuidMap: {
      assignments: {},
      selectables: {},
    },
  };

  try {
    let currentElement = element !== undefined && element !== null ? deepCopy(element) : {};

    // Get selectable and assignment data
    if (currentElement && currentElement.hasOwnProperty("selectables")) {
      Object.entries(currentElement.selectables).forEach(([selectableUUID, selectable]) => {
        let selectableName = selectable.id ? `${selectable.description} (${selectable.id})` : selectable.description;
        let isAssignment = selectable.assignment ? true : false;

        if (isAssignment) {
          if (!selectablesMap.dropdownOptions.assignments.includes(selectableName)) {
            selectablesMap.dropdownOptions.assignments.push(selectableName);
            selectablesMap.nameMap.assignments[selectableName] = selectableUUID;
            selectablesMap.uuidMap.assignments[selectableUUID] = selectableName;
          }
        } else {
          if (!selectablesMap.dropdownOptions.selectables.includes(selectableName)) {
            selectablesMap.dropdownOptions.selectables.push(selectableName);
            selectablesMap.nameMap.selectables[selectableName] = selectableUUID;
            selectablesMap.uuidMap.selectables[selectableUUID] = selectableName;
          }
        }
      });
    }

    // Get selectable and assignment data
    if (currentElement && currentElement.hasOwnProperty("selectableGroups")) {
      Object.entries(currentElement.selectableGroups).forEach(([group, value]) => {
        if (value.hasOwnProperty("groups")) {
          if (!selectablesMap.dropdownOptions.groups.includes(group)) {
            selectablesMap.dropdownOptions.groups.push(group);
          }
        } else if (value.hasOwnProperty("description")) {
          if (!selectablesMap.dropdownOptions.complexSelectables.includes(group)) {
            selectablesMap.dropdownOptions.complexSelectables.push(group);
          }
        }
      });
    }

    // Sort drop down menu options
    const { selectables, assignments, groups, complexSelectables } = selectablesMap.dropdownOptions;
    selectablesMap.dropdownOptions = {
      selectables: sortDropdown(selectables),
      assignments: sortDropdown(assignments),
      groups: sortDropdown(groups),
      complexSelectables: sortDropdown(complexSelectables),
    };
  } catch (e) {
    console.log(e);
    handleSnackBarError(e);
  }

  return selectablesMap;
};
/**
 * Sorts the dropdown
 * @param dropdown the dropdown to sort
 * @returns {*}
 */
const sortDropdown = (dropdown) => {
  return dropdown.sort((a, b) => {
    const aMatch = a.match(/group-(\d+)/);
    const bMatch = b.match(/group-(\d+)/);

    // If both strings have a numeric part, compare them numerically
    if (aMatch && bMatch) {
      return parseInt(aMatch[1]) - parseInt(bMatch[1]);
    }

    // If one of the strings doesn't have a numeric part, keep it at the end
    if (aMatch) return -1;
    if (bMatch) return 1;

    // If neither string has a numeric part, compare them lexicographically
    return a.localeCompare(b);
  });
};
/**
 * Gets the dependency map for the evaluation activity ui
 * @param sfrUUID the sfr uuid
 * @param componentUUID the component uuid
 * @param sfrSections the sfr sections
 * @param elementMaps the element maps
 * @returns {{elementsToComplexSelectables: {}, elementsToSelectables: {}, selectablesToUUID: {}, uuidToSelectables: {}}}
 */
const getDependencyMap = (sfrUUID, componentUUID, sfrSections, elementMaps) => {
  let dependencies = {
    elementsToSelectables: {},
    elementsToComplexSelectables: {},
    selectablesToUUID: {},
    uuidToSelectables: {},
  };

  // Create dependency map
  if (
    sfrSections.hasOwnProperty(sfrUUID) &&
    sfrSections[sfrUUID].hasOwnProperty(componentUUID) &&
    sfrSections[sfrUUID][componentUUID].hasOwnProperty("elements")
  ) {
    let elements = deepCopy(sfrSections[sfrUUID][componentUUID].elements);
    if (elements && Object.entries(elements).length > 0) {
      Object.entries(elements).forEach(([uuid, element]) => {
        if (elementMaps.elementUUIDMap.hasOwnProperty(uuid)) {
          let name = elementMaps.elementUUIDMap[uuid];

          // Get selectables
          let selectableArray = [];
          if (element.hasOwnProperty("selectables")) {
            let selectables = deepCopy(element.selectables);
            if (selectables && Object.entries(selectables).length > 0) {
              Object.entries(selectables).forEach(([selectableUUID, selectable]) => {
                let isAssignment = selectable.assignment ? true : false;
                if (!isAssignment) {
                  let selectableName = selectable.id ? `${selectable.description} (${selectable.id})` : selectable.description;
                  dependencies.selectablesToUUID[selectableName] = selectableUUID;
                  dependencies.uuidToSelectables[selectableUUID] = selectableName;
                  if (!selectableArray.includes(selectableName)) {
                    selectableArray.push(selectableName);
                  }
                }
              });
              selectableArray.sort();
              dependencies.elementsToSelectables[name] = selectableArray;
            }
          }

          // Get complex selectables
          let complexSelectableArray = [];
          if (element.hasOwnProperty("selectableGroups")) {
            let selectableGroups = deepCopy(element.selectableGroups);
            if (selectableGroups && Object.entries(selectableGroups).length > 0) {
              Object.entries(selectableGroups).forEach(([selectableGroupID, value]) => {
                let isComplexSelectable = value.hasOwnProperty("description") ? true : false;
                if (isComplexSelectable) {
                  if (!complexSelectableArray.includes(selectableGroupID)) {
                    complexSelectableArray.push(selectableGroupID);
                  }
                }
              });
              complexSelectableArray.sort();
              dependencies.elementsToComplexSelectables[name] = complexSelectableArray;
            }
          }
        }
      });
    }
  }
  return dependencies;
};
/**
 * Updates the selectables map
 * @param componentUUID the component uuid
 * @param component the component
 * @param element the element
 * @param selectedSfrElement the selected sfr element
 * @param elementMaps the element maps
 * @param state the state
 */
const updateSelectablesMap = (element, state) => {
  const newSelectableOptions = deepCopy(getSelectablesMaps(element));
  const { selectablesMap } = state;

  // Update selectables map
  if (JSON.stringify(selectablesMap) !== JSON.stringify(newSelectableOptions)) {
    state.selectablesMap = newSelectableOptions;
  }
};

// Action creators are generated for each case reducer function
export const {
  UPDATE_SFR_WORKSHEET_ITEMS,
  UPDATE_SFR_SELECTABLE,
  UPDATE_SELECTABLE_GROUP_CHECKED,
  UPDATE_SFR_SELECTION_WITH_GROUP_RULES,
  UPDATE_SFR_WORKSHEET_COMPONENT,
  UPDATE_EVALUATION_ACTIVITY_UI_ITEMS,
  RESET_SFR_ELEMENT_UI,
  RESET_SFR_WORKSHEET_UI,
} = sfrWorksheetUI.actions;

export default sfrWorksheetUI.reducer;
