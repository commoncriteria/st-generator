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
import Modal from "./Modal.jsx";

/**
 * The ResetDataConfirmation class that displays the confirmation dialog for resetting the data to the initial state
 * @returns {JSX.Element}   the reset data confirmation modal content
 * @constructor             passes in props to the class
 */
function ResetDataConfirmation(props) {
  // Prop Validation
  ResetDataConfirmation.propTypes = {
    title: PropTypes.string.isRequired,
    text: PropTypes.oneOfType([PropTypes.string.isRequired, PropTypes.object.isRequired]),
    open: PropTypes.bool.isRequired,
    handleOpen: PropTypes.func.isRequired,
    handleSubmit: PropTypes.func.isRequired,
  };

  // Return Method
  return (
    <div>
      <Modal
        title={props.title}
        content={<div className='p-4 text-[14px] italic'>{props.text}</div>}
        open={props.open}
        handleClose={() => {
          props.handleOpen();
        }}
        handleSubmit={props.handleSubmit}
      />
    </div>
  );
}

// Export ResetDataConfirmation.jsx
export default ResetDataConfirmation;
