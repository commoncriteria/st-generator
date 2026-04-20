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
import { Box, Stack, Switch, Tooltip, Typography } from "@mui/material";

/**
 * The ToggleSwitch component that shows the toggle switch button and components
 * @param isToggled the value of the toggle switch (on/off)
 * @param isSfrWorksheetToggle determines the type of toggle used
 * @param handleUpdateToggle the function for handling updates to the toggle
 * @param extendedComponentDefinition the extended component definition (if present)
 * @param tooltip the value of the tooltip
 * @param tooltipID the id of the tooltip
 * @param title the title associated with the toggle switch
 * @param styling additional custom styling for the toggle switch
 * @param addBorder adding a border to the toggle switch (only used in cases where the toggle switch is not an sfr worksheet toggle)
 * @returns {JSX.Element}
 * @constructor
 */
const ToggleSwitch = ({ isToggled, isSfrWorksheetToggle, handleUpdateToggle, extendedComponentDefinition, tooltip, tooltipID, title, styling, addBorder }) => {
  // Prop Validation
  ToggleSwitch.propTypes = {
    isToggled: PropTypes.bool.isRequired,
    isSfrWorksheetToggle: PropTypes.bool.isRequired,
    handleUpdateToggle: PropTypes.func.isRequired,
    extendedComponentDefinition: PropTypes.object,
    tooltip: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
    tooltipID: PropTypes.string,
    title: PropTypes.string,
    styling: PropTypes.object,
    addBorder: PropTypes.bool,
  };

  // Constants
  const { primary, primaryToggleSwitch } = useSelector((state) => state.styling);

  // Components
  /**
   * The component used for the sfr worksheet component toggle
   * @returns {JSX.Element}
   */
  const getSfrWorksheetComponentToggle = () => {
    const { titleStyle, toggleStyle } = getSfrWorksheetToggleStyle();
    const toggleColor = styling?.hasOwnProperty("primaryToggleSwitch") ? styling.primaryToggleSwitch : primaryToggleSwitch;

    // Get the sfr worksheet component toggle
    return (
      <div style={toggleStyle}>
        <Box display='flex' alignItems='center'>
          <Tooltip id={tooltipID} title={tooltip} arrow>
            <Switch
              onChange={extendedComponentDefinition ? (event) => handleUpdateToggle(event, extendedComponentDefinition) : handleUpdateToggle}
              checked={isToggled}
              sx={isToggled ? toggleColor : {}}
              size='small'
            />
          </Tooltip>
          <Typography sx={titleStyle}>{title}</Typography>
        </Box>
      </div>
    );
  };
  /**
   * Gets the traditional toggle switch component
   * @returns {JSX.Element}
   */
  const getToggleSwitch = () => {
    const { largeToggleTypography, secondaryToggleSwitch } = styling;
    const toggleStyle = addBorder ? "ml-4 pl-4 pr-1 pt-2 pb-1 border-[1px] border-[#bdbdbd] rounded-[4px]" : "flex w-[0px] justify-end pr-1";

    return (
      <div className={toggleStyle}>
        <Stack direction='row' component='label' alignItems='center' justifyContent='center'>
          <Typography noWrap style={largeToggleTypography}>
            {title}
          </Typography>
          <Tooltip arrow placement={"top"} id={tooltipID} title={tooltip}>
            <Switch sx={secondaryToggleSwitch} checked={isToggled} onChange={handleUpdateToggle} />
          </Tooltip>
        </Stack>
      </div>
    );
  };

  // Helper Methods
  /**
   * Generates the style used for the sfr worksheet toggle
   * @returns {{toggleStyle: {paddingX: number, paddingBottom: string, display: string, paddingTop: string, justifyContent: (string)}, titleStyle: {}}}
   */
  const getSfrWorksheetToggleStyle = () => {
    const titleColor = styling?.hasOwnProperty("titleColor") ? styling.titleColor : primary;
    let titleStyle = {};

    // Get the title style
    if (title) {
      if (!isToggled) {
        titleStyle = {
          fontSize: 13,
          fontWeight: "medium",
          paddingLeft: 0.5,
        };
      } else {
        titleStyle = {
          fontSize: 13,
          fontWeight: "bold",
          color: titleColor,
          paddingLeft: 0.5,
        };
      }
    }

    // Get the toggle style
    let toggleStyle = {
      paddingX: 1,
      paddingBottom: "12px",
      paddingTop: "2px",
      display: "flex",
      justifyContent: !isToggled ? "left" : "center",
    };

    if (isToggled) {
      toggleStyle.marginBottom = "-16px";
    }

    return { titleStyle, toggleStyle };
  };

  // Return Method
  return isSfrWorksheetToggle ? getSfrWorksheetComponentToggle() : getToggleSwitch();
};

// Export ToggleSwitch.jsx
export default ToggleSwitch;
