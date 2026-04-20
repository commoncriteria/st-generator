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

// Imports
import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FormControl, InputLabel, MenuItem, Select, TextField, Tooltip } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import { deepCopy } from "../../../../../utils/deepCopy.js";
import { handleSnackBarError, setSfrWorksheetUIItems } from "../../../../../utils/securityComponents.jsx";
import ApplicationNote from "./ApplicationNote.jsx";
import CardTemplate from "../../CardTemplate.jsx";
import SfrRequirements from "./requirements/SfrRequirements.jsx";
import { checkTitlesAndGroups } from "../../../../stComponents/Validator.jsx";

/**
 * Build parent map for nested selectable/assignment dependencies.
 *
 * A child node is disabled until all of its parent selectableGroup
 * ancestors are checked.
 *
 */
export const buildParentMap = (element) => {
  const parentMap = {};
  const { title = [], selectableGroups = {}, tabularize = {} } = element || {};

  const visitNode = (nodeKey, controllingParent = null) => {
    // controllingParent is the selectable/group that should enable it
    if (controllingParent) {
      parentMap[nodeKey] = controllingParent;
    }

    const node = selectableGroups[nodeKey];
    if (!node) return;

    // Simple one layer group
    if (Array.isArray(node.groups)) {
      node.groups.forEach((childKey) => {
        visitNode(childKey, controllingParent);
      });
    }

    // Higher level selectable with nested groups in description
    if (Array.isArray(node.description)) {
      node.description.forEach((part) => {
        if (Array.isArray(part.groups)) {
          part.groups.forEach((childKey) => {
            visitNode(childKey, nodeKey);
          });
        }
      });
    }
  };

  // Selections from title
  title.forEach((part) => {
    if (part.selections) {
      const rootGroup = selectableGroups[part.selections];
      if (rootGroup?.groups) {
        rootGroup.groups.forEach((childKey) => {
          visitNode(childKey, null);
        });
      }
    }
  });

  // Selections from tabularize table cells
  Object.values(tabularize).forEach((table) => {
    (table.rows || []).forEach((row) => {
      (table.columns || []).forEach((col) => {
        const cellValue = row[col.field];
        if (Array.isArray(cellValue)) {
          cellValue.forEach((part) => {
            if (part.selections) {
              visitNode(part.selections, null);
            }
          });
        }
      });
    });
  });

  return parentMap;
};

/**
 * The SfrElement class that displays the data for the sfr element
 * @returns {JSX.Element} the sfr element card content
 */
function SfrElement() {
  // Constants
  const dispatch = useDispatch();
  const { sfrWorksheetUI } = useSelector((state) => state);
  const { component, selectedSfrElement, openSfrElement, deletedElement, newElementUUID, elementMaps, element, currentElements } = sfrWorksheetUI;

  // Stable serialization for dependency tracking
  const elementJson = JSON.stringify(element);

  // Parent map for the currently selected element
  const parentMap = useMemo(() => buildParentMap(element), [elementJson]);

  // Component level validation — valid only if every element with selections is valid
  const componentValidation = useMemo(() => {
    const names = elementMaps?.elementNames || [];
    const elementsWithSelections = names.filter((name) => {
      const uuid = elementMaps?.elementNameMap?.[name];
      const el = currentElements?.[uuid];
      return el && Array.isArray(el.title) && el.title.some((t) => t.selections || t.assignment);
    });

    if (elementsWithSelections.length === 0) return null; // no selections to validate

    const allValid = elementsWithSelections.every((name) => {
      const uuid = elementMaps?.elementNameMap?.[name];
      const el = currentElements?.[uuid];
      if (!el) return false;
      const elParentMap = buildParentMap(el);
      try {
        return checkTitlesAndGroups(el.title, el.selectableGroups, el.selectables, elParentMap || {});
      } catch (e) {
        return false;
      }
    });

    return allValid;
  }, [currentElements, elementMaps]);

  // Use Effects
  useEffect(() => {
    // Update element dropdown value to use the newly created element
    if (newElementUUID && newElementUUID !== "" && elementMaps.elementUUIDMap.hasOwnProperty(newElementUUID)) {
      updatedSelectedSfrDropdownValue(newElementUUID);
    }

    // Update element to select an available dropdown value on delete
    if (deletedElement) {
      // Update element to select an available dropdown value on delete
      updatedSelectedSfrDropdownValue();
    }
  }, [elementMaps]);

  // Methods
  /**
   * Handles the selected element
   * @param event the selected sfr element
   */
  const handleSelectedElement = (event) => {
    const selectedElement = event.toUpperCase();

    if (JSON.stringify(selectedElement) !== JSON.stringify(selectedSfrElement)) {
      const { elementUUID, element } = deepCopy(getElementValues(selectedElement));

      // Update sfr worksheet ui items
      setSfrWorksheetUIItems({
        selectedSfrElement: selectedElement,
        elementUUID: elementUUID,
        element: element,
        elementXmlId: element.elementXMLID ? element.elementXMLID : "",
      });
    }
  };

  /**
   * Handles set open sfr element
   */
  const handleSetOpenSfrElement = () => {
    setSfrWorksheetUIItems({ openSfrElement: !openSfrElement });
  };

  /**
   * Gets the validation status for a given element by name.
   * Used to show indicators in the dropdown menu items.
   * @param {string} elementName - The element name from the dropdown
   * @returns {{ hasSelections: boolean, valid: boolean }}
   */
  const getElementValidationStatus = (elementName) => {
    const elUUID = elementMaps?.elementNameMap?.[elementName];
    if (!elUUID) return { hasSelections: false, valid: true };

    const el = currentElements?.[elUUID];
    if (!el || !Array.isArray(el.title)) return { hasSelections: false, valid: true };

    const hasSelections = el.title.some((t) => t.selections || t.assignment);
    if (!hasSelections) return { hasSelections: false, valid: true };

    const elParentMap = buildParentMap(el);
    try {
      return { hasSelections: true, valid: checkTitlesAndGroups(el.title, el.selectableGroups, el.selectables, elParentMap || {}) };
    } catch (e) {
      return { hasSelections: true, valid: false };
    }
  };

  // Helper Methods
  /**
   * Updates the selected sfr dropdown value
   * @param elementUUID the element uuid (optional)
   */
  const updatedSelectedSfrDropdownValue = (elementUUID = null) => {
    try {
      const { elementNames, elementUUIDMap } = elementMaps;
      const notEmpty = elementNames && elementNames.length > 0 && elementUUIDMap && Object.keys(elementUUIDMap).length > 0;

      // Check if the element maps are valid
      if (notEmpty) {
        const isElementUUID = elementUUID && elementUUID !== "" && elementUUIDMap.hasOwnProperty(elementUUID);
        const newSelected = isElementUUID ? elementUUIDMap[elementUUID] : elementNames[0];

        // Update selected element
        handleSelectedElement(newSelected);
      }

      // Reset updated element values
      setSfrWorksheetUIItems({
        newElementUUID: null,
        deletedElement: false,
      });
    } catch (e) {
      console.log(e);
      handleSnackBarError(e);

      // Reset the sfr element ui
      dispatch(
        RESET_SFR_ELEMENT_UI({
          allValues: true,
        })
      );
    }
  };

  /**
   * Gets the element values
   * @param selectedElement the selected sfr element
   * @returns {*|{}|boolean|[]|*[]|string|string[]}
   */
  const getElementValues = (selectedElement) => {
    let elementUUID = "";
    let element = {};
    const isElementMapValid =
      elementMaps && elementMaps.hasOwnProperty("elementNames") && elementMaps.elementNames.length > 0 && elementMaps.elementNames.includes(selectedElement);

    // Get the requested value by type
    if (selectedElement && isElementMapValid) {
      // Get the element uuid
      elementUUID = elementMaps.elementNameMap[selectedElement];

      // Get the current element
      if (currentElements && currentElements.hasOwnProperty(elementUUID)) {
        element = deepCopy(currentElements[elementUUID]);
      }
    }

    // Return the element values
    return {
      elementUUID,
      element,
    };
  };

  // Component level validation icon
  const componentStatusIcon =
    componentValidation === null ? null : componentValidation ? (
      <CheckCircleIcon sx={{ fontSize: "18px", color: "#4caf50", marginLeft: "8px" }} />
    ) : (
      <ErrorIcon sx={{ fontSize: "18px", color: "#f44336", marginLeft: "8px" }} />
    );

  // Return Method
  return (
    <CardTemplate
      type={"parent"}
      title={"SFR Element"}
      tooltip={"SFR Element"}
      collapse={openSfrElement}
      collapseHandler={handleSetOpenSfrElement}
      body={
        <div className='min-w-full mt-4 grid grid-flow-row auto-rows-max'>
          <div className='w-screen sm:max-w-screen-sm md:max-w-screen-sm lg:max-w-screen-lg grid grid-flow-col columns-3 gap-4 p-2 px-4'>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%" }}>
              <FormControl fullWidth>
                <Tooltip
                  id={"selectElementTooltip"}
                  title={`This dropdown list allows a user to select between any of the 
                                     SFR elements attached to this component.`}
                  arrow>
                  <InputLabel key='element-select-label'>Select Element</InputLabel>
                </Tooltip>
                <Select
                  value={selectedSfrElement}
                  label='Select Element'
                  autoWidth
                  id='sfr_element_select'
                  MenuProps={{ "data-testid": "sfr_element_select_menu" }}
                  onChange={(event) => handleSelectedElement(event.target.value)}
                  sx={{ textAlign: "left" }}>
                  {[...(elementMaps.elementNames || [])]
                    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }))
                    .map((name, index) => {
                      const { hasSelections, valid } = getElementValidationStatus(name);
                      return (
                        <MenuItem key={index} value={name}>
                          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            {name}
                            {hasSelections &&
                              (valid ? (
                                <CheckCircleIcon sx={{ fontSize: "16px", color: "#4caf50" }} />
                              ) : (
                                <ErrorIcon sx={{ fontSize: "16px", color: "#f44336" }} />
                              ))}
                          </span>
                        </MenuItem>
                      );
                    })}
                </Select>
              </FormControl>
            </div>

            {selectedSfrElement && selectedSfrElement !== "" && (
              <span className='flex justify-stretch min-w-full'>
                <div className='flex justify-center w-full'>
                  <div className='w-full pr-2' style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <TextField
                      className='w-full'
                      key={`${elementMaps.componentName}-component-id`}
                      label='Component ID'
                      disabled={true}
                      defaultValue={elementMaps.componentName}
                    />
                    {componentStatusIcon}
                  </div>
                </div>
              </span>
            )}
          </div>

          {selectedSfrElement && selectedSfrElement !== "" && (
            <div className='w-screen sm:max-w-screen-sm md:max-w-screen-sm lg:max-w-screen-lg'>
              <SfrRequirements requirementType={"title"} element={element} parentMap={parentMap} />
              <ApplicationNote />
            </div>
          )}
        </div>
      }
    />
  );
}

// Export SfrElement.jsx
export default SfrElement;
