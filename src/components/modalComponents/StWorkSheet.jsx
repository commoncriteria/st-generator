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
import PropTypes, { any } from "prop-types";
import Modal from "./Modal.jsx";
import SfrElement from "../editorComponents/securityComponents/sfrComponents/sfrElement/SfrElement.jsx";
import SfrEvaluationActivity from "../editorComponents/securityComponents/sfrComponents/aActivity/SfrEvaluationActivity.jsx";
import SfrAuditEvents from "../editorComponents/securityComponents/sfrComponents/SfrAuditEvents.jsx";
import { useSelector } from "react-redux";

/**
 * The StWorkSheet class that does modal for StWorkSheet in ST Wizard
 * @param selectedValue value selected for sheet
 * @param open the open boolean
 * @param handleClose the handler for close
 * @returns {JSX.Element}
 * @constructor
 */
function StWorkSheet({ handleClose }) {
  // Prop Validation
  StWorkSheet.propTypes = {
    handleClose: PropTypes.func,
  };

  // Constants
  const { sfrWorksheetUI } = useSelector((state) => state);
  const { isSfrWorksheetValid, openSfrWorksheet } = sfrWorksheetUI;

  // Return Method
  return (
    <Modal
      title={"SFR Worksheet"}
      open={openSfrWorksheet && isSfrWorksheetValid}
      handleClose={handleClose}
      hideSubmit
      closeButtonId={"sfr-worksheet-close-button"}
      content={
        <div className='w-screen sm:max-w-screen-sm md:max-w-screen-sm lg:max-w-screen-lg'>
          <SfrElement />
          <SfrAuditEvents />
          <SfrEvaluationActivity isManagementFunction={false} />
        </div>
      }
    />
  );
}

// Export StWorkSheet.jsx
export default StWorkSheet;
