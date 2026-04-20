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
import store from "../app/store.js";
import { updateSnackBar, RESET_ACCORDION_PANE_STATE } from "../reducers/accordionPaneSlice.js";
import { RESET_SFR_STATE } from "../reducers/SFRs/sfrSlice.js";
import { RESET_SFR_SECTION_STATE } from "../reducers/SFRs/sfrSectionSlice.js";
import { RESET_SAR_STATE } from "../reducers/sarsSlice.js";
import { RESET_SFR_BASE_PP_STATE } from "../reducers/SFRs/sfrBasePPsSlice.js";
import { RESET_SFR_WORKSHEET_UI, UPDATE_EVALUATION_ACTIVITY_UI_ITEMS, UPDATE_SFR_WORKSHEET_ITEMS } from "../reducers/SFRs/sfrWorksheetUI.js";
import ToggleSwitch from "../components/ToggleSwitch.jsx";

// Methods
/**
 * Handles updates to the snackbar upon success
 * @param message the snackbar success message
 * @param additionalArgs any additional arguments for the snack bar (in the form of an object)
 */
export const handleSnackBarSuccess = (message, additionalArgs) => {
  const snackBar = getSnackBarObject(message, "success", additionalArgs);

  // Show snack bar success message
  setTimeout(() => {
    store.dispatch(updateSnackBar(snackBar));
  }, 1000);
};
/**
 * Handles updates to the snackbar upon error
 * @param message the snackbar error message
 * @param additionalArgs any additional arguments for the snack bar (in the form of an object)
 */
export const handleSnackBarError = (message, additionalArgs) => {
  const snackBar = getSnackBarObject(message.toString(), "error", additionalArgs);

  // Show snack bar error message
  setTimeout(() => {
    store.dispatch(updateSnackBar(snackBar));
  }, 1000);
};
/**
 * Handles snack bar updates for text updates
 * @param logicCallback the function logic that gets passed in
 * @param args any arguments used for the logicCallback function
 */
export const handleSnackbarTextUpdates = (logicCallback, ...args) => {
  let message = "";
  let severity = "success";

  try {
    // Execute the passed logic
    logicCallback(...args);
    message = "Text Successfully Updated";
  } catch (e) {
    console.error(e);
    message = e.toString();
    severity = "error";
  }

  // Update snackbar
  if (message !== "") {
    if (severity === "success") {
      handleSnackBarSuccess(message);
    } else if (severity === "error") {
      handleSnackBarError(message);
    }
  }
};
/**
 * Handles the submit reset data menu
 * @param closeMenu the function that closes the menu
 */
export const handleSubmitResetDataMenu = (closeMenu) => {
  try {
    // Reset Redux state
    store.dispatch(RESET_ACCORDION_PANE_STATE());
    store.dispatch(RESET_SFR_SECTION_STATE());
    store.dispatch(RESET_SFR_STATE());
    store.dispatch(RESET_SFR_BASE_PP_STATE());
    store.dispatch(RESET_SAR_STATE());
    store.dispatch(RESET_SFR_WORKSHEET_UI());

    // Clear session storage
    sessionStorage.clear();

    // Close the dialog
    closeMenu();

    // Scroll back to the top of the page
    window.scrollTo(0, 0);

    // Update snackbar
    handleSnackBarSuccess("Data Successfully Reset to Default");
  } catch (e) {
    console.log(e);
    handleSnackBarError(e);
  }
};

// Helper Methods
/**
 * Creates the snack bar object
 * @param message the snack bar message
 * @param severity the snack bar severity type
 * @param additionalArgs any additional arguments for the snack bar (in the form of an object)
 */
export const getSnackBarObject = (message, severity, additionalArgs) => {
  return {
    open: true,
    message: message.toString(),
    severity: severity,
    ...(additionalArgs || {}),
  };
};

/**
 * Clears out the session storage except for one key
 * @param keysToKeep the keys to keep
 */
export const clearSessionStorageExcept = async (keysToKeep) => {
  // Create a map to store the values of the items you want to keep
  const valuesToKeep = {};

  // Retrieve and store the values of the items you want to keep
  keysToKeep.forEach((key) => {
    const value = sessionStorage.getItem(key);
    if (value !== null) {
      valuesToKeep[key] = value;
    }
  });

  // Clear all items from sessionStorage
  await sessionStorage.clear();

  // Restore the items you wanted to keep
  Object.keys(valuesToKeep).forEach((key) => {
    sessionStorage.setItem(key, valuesToKeep[key]);
  });
};
/**
 * Gets the element values by type
 * @param element
 * @param type the type
 *             Options: tabularize, tabularizeUUIDs and title
 * @param key the key (optional)
 * @returns {*|{}|boolean|[]|*[]|string|string[]}
 */
export const getElementValuesByType = (element, type, key = null) => {
  // Check for a valid element and return value by type
  if (element && Object.keys(element).length > 0) {
    // Get the value by type
    switch (type) {
      case "tabularize": {
        if (key) {
          return element.hasOwnProperty("tabularize") && element["tabularize"].hasOwnProperty(key) ? element["tabularize"][key] : {};
        } else {
          return element.hasOwnProperty("tabularize") ? element["tabularize"] : {};
        }
      }
      case "tabularizeUUIDs": {
        return element.hasOwnProperty("tabularize") ? Object.keys(element["tabularize"]) : [];
      }
      case "title": {
        return element.hasOwnProperty(type) ? element[type] : [];
      }
      default:
        break;
    }
  }
};
/**
 * Gets the component xml id
 * @param ccID the ccID
 * @param iterationID the iterationID
 * @param isRequirementsFormat boolean - if it needs to be formatted in the requirements format
 * @param getSplitValues boolean - if it needs to be returned with all calculated values
 * @returns {{componentXmlId: (string|*), formattedIterationId: string, formattedCcId: (string|string)}|string|*}
 */
export const getComponentXmlID = (ccID, iterationID, isRequirementsFormat, getSplitValues) => {
  let formattedIterationId = "";
  let formattedCcId = ccID ? (isRequirementsFormat ? ccID.valueOf().toUpperCase() : ccID.valueOf().toLowerCase()).replace(/\s+/g, "") : "";

  // Get the iteration value
  if (iterationID && typeof iterationID === "string" && iterationID !== "") {
    formattedIterationId = (isRequirementsFormat ? "/" + iterationID.toUpperCase() : "-" + iterationID.toLowerCase()).replace(/\s+/g, "");
  }

  // Get formatted values
  let componentXmlId = formattedCcId + formattedIterationId;
  componentXmlId = isRequirementsFormat ? componentXmlId : getFormattedXmlID(componentXmlId);

  return getSplitValues ? { formattedCcId, formattedIterationId, componentXmlId } : componentXmlId;
};
/**
 * Gets the element id
 * @param ccID the ccID
 * @param iterationID the iterationID
 * @param index the index
 * @param isElementXMLID boolean - if the format is an element xml id
 * @returns {*|string}
 */
export const getElementId = (ccID, iterationID, index, isElementXMLID) => {
  let elementId = `${ccID + (isElementXMLID ? "e" : ".") + (index + 1) + iterationID}`;
  return isElementXMLID ? getFormattedXmlID(elementId) : elementId;
};
/**
 * Gets the formatted xml id
 * @param xmlId the xml id
 * @returns {string}
 */
export const getFormattedXmlID = (xmlId) => {
  if (xmlId) {
    return xmlId.replace(/\s+/g, "-").replace(/_/g, "-").replace(/\./g, "-").toLowerCase();
  } else {
    return "";
  }
};

// Dispatch Methods
/**
 * Sets the sfr worksheet items
 * @param itemMap the item map
 */
export const setSfrWorksheetUIItems = (itemMap) => {
  try {
    store.dispatch(
      UPDATE_SFR_WORKSHEET_ITEMS({
        itemMap,
      })
    );
  } catch (e) {
    console.log(e);
    handleSnackBarError(e);
  }
};

/**
 * Updates the evaluation activities ui
 * @param updateMap the update map
 */
export const updateEvaluationActivitiesUI = (updateMap) => {
  try {
    store.dispatch(
      UPDATE_EVALUATION_ACTIVITY_UI_ITEMS({
        updateMap: updateMap,
      })
    );
  } catch (e) {
    console.log(e);
    handleSnackBarError(e);
  }
};

// Components
/**
 * Gets the toggle switch
 * @param title the title
 * @param isToggled is toggled
 * @param tooltipID tooltip id
 * @param tooltip the tooltip
 * @param updateToggleMethod the update toggle method
 * @param extendedComponentDefinition the extended component definition
 * @returns {JSX.Element}
 */
export const getToggleSwitch = (title, isToggled, tooltipID, tooltip, updateToggleMethod, extendedComponentDefinition = null) => {
  return (
    <ToggleSwitch
      title={title}
      isToggled={isToggled}
      tooltipID={tooltipID}
      tooltip={tooltip}
      isSfrWorksheetToggle={true}
      handleUpdateToggle={updateToggleMethod}
      extendedComponentDefinition={extendedComponentDefinition}
    />
  );
};
