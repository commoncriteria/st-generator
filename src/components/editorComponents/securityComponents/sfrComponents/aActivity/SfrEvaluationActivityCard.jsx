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
import { Tooltip } from "@mui/material";
import { deepCopy } from "../../../../../utils/deepCopy.js";
import { parseTests, generateTestHTML } from "../../../../../utils/testParsing.js";
import CardTemplate from "../../CardTemplate.jsx";

/**
 * The SfrEvaluationActivityCard class that displays a specific sfr evaluation activity card
 * @param isManagementFunction the is management function (boolean)
 * @param sectionType the section type
 * @param cardTitle the card title
 * @param tooltip the tooltip
 * @returns {JSX.Element} the content
 * @constructor passes in props to the class
 */
function SfrEvaluationActivityCard({ isManagementFunction, sectionType, cardTitle, tooltip }) {
  // Prop Validation
  SfrEvaluationActivityCard.propTypes = {
    isManagementFunction: PropTypes.bool.isRequired,
    sectionType: PropTypes.string.isRequired,
    cardTitle: PropTypes.string.isRequired,
    tooltip: PropTypes.string,
  };

  // Constants
  const { component, activities: evaluationActivities, evaluationActivitiesUI, managementFunctionUI } = useSelector((state) => state.sfrWorksheetUI);
  const { activity, rowIndex } = managementFunctionUI;
  const headerColor = sectionType === "testIntroduction" || sectionType === "testClosing" ? "text-secondary" : "text-accent";

  const selectedPlatforms = useSelector((state) => state.accordionPane.platformData?.selectedPlatforms || []);
  const availablePlatforms = useSelector((state) => state.accordionPane.platformData?.platforms || []);
  const selectedPlatformNames = availablePlatforms.filter((platform) => selectedPlatforms.includes(platform.id)).map((platform) => platform.name);

  const platformLookup = {};
  availablePlatforms.forEach((p) => {
    platformLookup[p.name] = p;
  });

  // Methods
  /**
   * Gets the evaluation activity text item
   * @returns {*|string|null}
   */
  const getEvaluationActivityItem = () => {
    const activities = isManagementFunction ? deepCopy(activity) : deepCopy(evaluationActivities);

    if (isManagementFunction) {
      if (!activities.hasOwnProperty(sectionType)) {
        activities[sectionType] = "";
      }

      return activities[sectionType];
    } else {
      const { selectedUUID, selectedEvaluationActivity } = evaluationActivitiesUI;
      const isSelectedUUID = selectedUUID;
      const isSelectedEvaluationActivity = selectedEvaluationActivity && selectedEvaluationActivity.length > 0;

      if (isSelectedEvaluationActivity && isSelectedUUID && activities && activities.hasOwnProperty(selectedUUID)) {
        if (!activities[selectedUUID].hasOwnProperty(sectionType)) {
          activities[selectedUUID][sectionType] = "";
        }

        return activities[selectedUUID][sectionType];
      }
    }

    return "";
  };

  /**
   * Gets the complete evaluation activity object (for test parsing)
   * @returns {Object|null}
   */
  const getEvaluationActivityObject = () => {
    const activities = isManagementFunction ? deepCopy(activity) : deepCopy(evaluationActivities);

    if (isManagementFunction) {
      return activities;
    } else {
      const { selectedUUID, selectedEvaluationActivity } = evaluationActivitiesUI;
      const isSelectedUUID = selectedUUID;
      const isSelectedEvaluationActivity = selectedEvaluationActivity && selectedEvaluationActivity.length > 0;

      if (isSelectedEvaluationActivity && isSelectedUUID && activities && activities.hasOwnProperty(selectedUUID)) {
        return activities[selectedUUID];
      }
    }

    return null;
  };

  // Get the content based on section type
  let content = "";

  if (sectionType === "tests") {
    // For tests, parse the entire evaluation activity (to get intro, testlists, closing text)
    const activityObject = getEvaluationActivityObject();

    if (activityObject) {
      const parsed = parseTests(activityObject);
      content = generateTestHTML(parsed, { componentCcId: component?.cc_id || "", selectedPlatformNames, platformLookup });
    }
  } else {
    // For other sections, get content normally
    content = getEvaluationActivityItem();
  }

  // Don't render if there's no content
  if (!content || content.trim() === "") {
    return null;
  }

  // Return Method
  return (
    <div key={sectionType + isManagementFunction ? "ManagementFunction" : "EvaluationActivities"}>
      <CardTemplate
        type={"section"}
        header={
          <Tooltip id={sectionType + "Tooltip"} title={tooltip ? tooltip : ""} arrow>
            <label className={"resize-none font-bold text-[14px] p-0 pr-4 " + headerColor}>{cardTitle}</label>
          </Tooltip>
        }
        body={
          <div
            key={sectionType + (isManagementFunction ? "ManagementFunction" : "EvaluationActivities") + "Editor"}
            className='preview xml-viewer p-2 w-full bg-white text-left'
            dangerouslySetInnerHTML={{ __html: content }}
            style={{
              fontSize: "1rem",
              lineHeight: 1.5,
            }}
          />
        }
      />
    </div>
  );
}

// Export SfrEvaluationActivityCard.jsx
export default SfrEvaluationActivityCard;
