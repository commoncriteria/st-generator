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
import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { FormControl, FormHelperText, TextField } from "@mui/material";
import { handleSnackbarTextUpdates } from "../../utils/securityComponents.jsx";
import Modal from "./Modal.jsx";

/**
 * The NewTableColumn class that displays the confirmation dialog for creating a new column header
 * @returns {JSX.Element}   the new column header modal content
 * @constructor             passes in props to the class
 */
function NewTableColumn(props) {
  // Prop Validation
  NewTableColumn.propTypes = {
    open: PropTypes.bool.isRequired,
    handleOpen: PropTypes.func.isRequired,
    handleSubmit: PropTypes.func.isRequired,
    columnDefs: PropTypes.array.isRequired,
  };

  // Constants
  const [disabled, setDisabled] = useState(true);
  const [columnName, setColumnName] = useState("");

  // Use Effects
  useEffect(() => {
    setDisabled(getDisabled());
  }, [props]);
  useEffect(() => {
    setDisabled(getDisabled());
  }, [columnName]);

  // Methods
  const getDisabled = () => {
    const headerExists = checkHeaderNameContainsInput();
    return headerExists || columnName === null || columnName === undefined || columnName === "" ? true : false;
  };
  const checkHeaderNameContainsInput = () => {
    return props.columnDefs.some((column) => column.headerName.toLowerCase() === columnName.toLowerCase());
  };
  const handleColumnName = (event) => {
    setColumnName(event.target.value);
  };
  const handleOpen = async () => {
    // Reset the column name
    setColumnName("");

    // Close the dialog
    props.handleOpen();
  };
  const handleSubmit = async () => {
    if (!disabled) {
      // Return the column name value
      const name = columnName.toString();
      props.handleSubmit(name);

      // Close the dialog
      await handleOpen();
    }
  };

  // Return Method
  return (
    <div>
      <Modal
        title={"Add New Column Header"}
        content={
          <div className='pt-4'>
            <FormControl fullWidth>
              <TextField
                required
                id='outlined-required'
                label='Column Header'
                key={"newColumnHeader" + columnName}
                defaultValue={columnName}
                onBlur={(event) => handleSnackbarTextUpdates(handleColumnName, event)}
                inputProps={{ style: { fontSize: 14 } }}
                InputLabelProps={{ style: { fontSize: 14 } }}
              />
              <FormHelperText id='component-error-text' sx={{ color: "#ff4d4d", paddingTop: 1 }}>
                {checkHeaderNameContainsInput() ? "Column name already exists" : null}
              </FormHelperText>
            </FormControl>
          </div>
        }
        disabled={disabled}
        open={props.open}
        handleClose={handleOpen}
        handleSubmit={handleSubmit}
      />
    </div>
  );
}

// Export NewTableColumn.jsx
export default NewTableColumn;
