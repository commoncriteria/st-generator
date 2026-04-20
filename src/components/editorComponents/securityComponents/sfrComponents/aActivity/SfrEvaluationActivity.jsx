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
import PropTypes from "prop-types";
import { useState } from "react";
import { useSelector } from "react-redux";
import CardTemplate from "../../CardTemplate.jsx";
import { updateEvaluationActivitiesUI } from "../../../../../utils/securityComponents.jsx";
import MultiSelectDropdown from "../../MultiSelectDropdown.jsx";
import SfrEvaluationActivitySection from "./SfrEvaluationActivitySection.jsx";

/**
 * The SfrEvaluationActivity class that displays the evaluation activities for specified components/elements
 * @param isManagementFunction the is management function (boolean)
 * @returns {JSX.Element} the generic modal content
 * @constructor passes in props to the class
 */
function SfrEvaluationActivity({ isManagementFunction }) {
  // Prop Validation
  SfrEvaluationActivity.propTypes = {
    isManagementFunction: PropTypes.bool.isRequired,
  };
  // Constants
  const { evaluationActivitiesUI, elementMaps } = useSelector((state) => state.sfrWorksheetUI);
  const { evaluationActivityDropdown, selectedEvaluationActivity } = evaluationActivitiesUI;
  const [open, setOpen] = useState(true);

  // Methods
  /**
   * Handles open
   */
  const handleSetOpen = () => {
    setOpen(!open);
  };
  /**
   * Handles the select evaluation activity
   * @param title the title
   * @param selections the selections
   */
  const handleSelectEvaluationActivity = (title, selections) => {
    if (selections) {
      let updateMap = {
        selectedEvaluationActivity: selections,
        selectedUUID: "",
      };
      const isComponentName =
        elementMaps &&
        elementMaps.hasOwnProperty("componentName") &&
        elementMaps.hasOwnProperty("componentUUID") &&
        elementMaps.componentName === selections[0];
      const isElementNameMap = elementMaps && elementMaps.hasOwnProperty("elementNameMap") && elementMaps.elementNameMap.hasOwnProperty(selections[0]);

      if (isComponentName) {
        updateMap.selectedUUID = elementMaps.componentUUID;
      } else if (isElementNameMap) {
        updateMap.selectedUUID = elementMaps.elementNameMap[selections[0]];
      }

      // Update the evaluation activities ui
      updateEvaluationActivitiesUI(updateMap);
    }
  };

  // Return Method
  return (
    <div className={isManagementFunction ? "w-full px-4 pt-2" : ""}>
      <CardTemplate
        type={"parent"}
        title={"Evaluation Activities"}
        tooltip={`Evaluation Activities ${isManagementFunction ? "for Management Function" : ""}`}
        collapse={open}
        collapseHandler={handleSetOpen}
        borderColor={isManagementFunction ? "border-gray-200" : null}
        header={
          isManagementFunction && (
            <span className='flex justify-stretch min-w-full'>
              <div className='flex justify-left text-center w-full'>
                <label className='resize-none justify-start flex font-bold text-[14px] p-0 pr-4 text-secondary'>Evaluation Activities</label>
              </div>
            </span>
          )
        }
        body={
          isManagementFunction ? (
            <SfrEvaluationActivitySection isManagementFunction={isManagementFunction} />
          ) : (
            <div className='mb-2'>
              <div className='mt-4 px-4 w-full'>
                <span className='flex justify-stretch min-w-full'>
                  <div className='flex justify-center w-full'>
                    <div className='w-full'>
                      <MultiSelectDropdown
                        selectId='eval_act_select'
                        selectionOptions={evaluationActivityDropdown}
                        selections={selectedEvaluationActivity}
                        title={"Evaluation Activity"}
                        handleSelections={handleSelectEvaluationActivity}
                        multiple={false}
                      />
                    </div>
                  </div>
                </span>
              </div>
              {selectedEvaluationActivity && selectedEvaluationActivity.length > 0 && (
                <SfrEvaluationActivitySection isManagementFunction={isManagementFunction} />
              )}
            </div>
          )
        }
      />
    </div>
  );
}

// Export SfrEvaluationActivity.jsx
export default SfrEvaluationActivity;
