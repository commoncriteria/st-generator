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
import { useSelector } from "react-redux";
import { deepCopy } from "../../../../../utils/deepCopy.js";
import SfrEvaluationActivityCard from "./SfrEvaluationActivityCard.jsx";

/**
 * The SfrEvaluationActivitySection class that displays the sfr evaluation activity section
 * @param isManagementFunction the is management function (boolean)
 * @returns {JSX.Element} the content
 * @constructor passes in props to the class
 */
function SfrEvaluationActivitySection({ isManagementFunction }) {
  // Prop Validation
  SfrEvaluationActivitySection.propTypes = {
    isManagementFunction: PropTypes.bool.isRequired,
  };

  // Constants
  const { activities, evaluationActivitiesUI, managementFunctionUI } = useSelector((state) => state.sfrWorksheetUI);
  const { selectedUUID } = evaluationActivitiesUI;
  const { activity } = managementFunctionUI;

  // Helper Methods
  /**
   * Gets is no test section
   * @returns {boolean|*}
   */
  const getIsNoTest = () => {
    let activityCopy = isManagementFunction ? deepCopy(activity) : deepCopy(activities);

    if (isManagementFunction) {
      return activityCopy.hasOwnProperty("isNoTest") ? activityCopy.isNoTest : false;
    } else {
      const isUUID = activityCopy.hasOwnProperty(selectedUUID);
      return isUUID && activityCopy[selectedUUID].hasOwnProperty("isNoTest") ? activityCopy[selectedUUID].isNoTest : false;
    }
  };

  // Return Method
  return (
    <div>
      {getIsNoTest() ? (
        <div className='mt-2'>
          <SfrEvaluationActivityCard isManagementFunction={isManagementFunction} sectionType={"noTest"} cardTitle={"No Evaluation Activity Explanation"} />
        </div>
      ) : (
        <div className='mt-2'>
          {isManagementFunction}
          <SfrEvaluationActivityCard isManagementFunction={isManagementFunction} sectionType={"introduction"} cardTitle={"Introduction"} />
          <SfrEvaluationActivityCard isManagementFunction={isManagementFunction} sectionType={"tss"} cardTitle={"TSS"} />
          <SfrEvaluationActivityCard isManagementFunction={isManagementFunction} sectionType={"guidance"} cardTitle={"Guidance"} />
          <SfrEvaluationActivityCard isManagementFunction={isManagementFunction} sectionType={"tests"} cardTitle={"Tests"} />
        </div>
      )}
    </div>
  );
}

// Export SfrEvaluationActivitySection.jsx
export default SfrEvaluationActivitySection;
