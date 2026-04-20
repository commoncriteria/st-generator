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
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Card, CardBody, CardFooter } from "@material-tailwind/react";
import { IconButton, Tooltip } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";

/**
 * The CardTemplate class that displays the generic card component
 * @returns {JSX.Element} the content
 * @constructor passes in props to the class
 */
function CardTemplate(props) {
  // Prop Validation
  CardTemplate.propTypes = {
    type: PropTypes.string.isRequired,
    header: PropTypes.node,
    body: PropTypes.node,
    footer: PropTypes.node,
    title: PropTypes.string,
    tooltip: PropTypes.string,
    collapse: PropTypes.bool,
    collapseHandler: PropTypes.func,
    bottomBorderCss: PropTypes.string,
    borderColor: PropTypes.string,
    collapseIconColor: PropTypes.string,
  };

  // Constants
  const { primary, icons } = useSelector((state) => state.styling);
  const [iconColor, setIconColor] = useState(primary);

  // Use Effect
  useEffect(() => {
    const { collapseIconColor } = props;

    // Update icon color
    if (collapseIconColor) {
      setIconColor(collapseIconColor);
    } else {
      setIconColor(primary);
    }
  }, [props.collapseIconColor]);

  // Return Method
  return (
    <div data-testid={props.title ? `CardTemplate_${props.title.replace(/\s+/g, "_")}` : undefined}>
      {props.type === "parent" ? (
        <Card
          className={`w-full rounded-lg border-2 ${props.borderColor ? props.borderColor : "border-gray-300"} mb-4 ${props.bottomBorderCss ? props.bottomBorderCss : ""}`}>
          <CardBody className='w-full m-0 p-0'>
            <div className={`w-full border-b-2 ${props.borderColor ? props.borderColor : "border-gray-300"} p-2 pt-4`}>
              <span className='flex justify-stretch min-w-full mt-1'>
                <div className='justify-items-start pr-2'>
                  <IconButton sx={{ marginTop: "-8px" }} onClick={props.collapseHandler} key={props.tooltip + "ToolTip"} variant='contained'>
                    <Tooltip
                      id={(props.collapse ? "collapse" : "expand") + props.tooltip + "Tooltip"}
                      title={`${(props.collapse ? "Collapse " : "Expand ") + props.tooltip}`}>
                      {props.collapse ? <RemoveIcon htmlColor={iconColor} sx={icons.small} /> : <AddIcon htmlColor={iconColor} sx={icons.small} />}
                    </Tooltip>
                  </IconButton>
                </div>
                <div className='w-full p-0 m-0'>
                  {props.title && !props.header ? (
                    <label className='resize-none justify-start flex font-bold text-[14px] p-0 pr-4 text-secondary'>{props.title}</label>
                  ) : props.header ? (
                    props.header
                  ) : null}
                </div>
              </span>
            </div>
            {props.collapse ? <div className='pb-2'>{props.body}</div> : null}
          </CardBody>
          {props.collapse && props.footer ? <CardFooter className='w-full m-0 p-0'>{props.footer}</CardFooter> : null}
        </Card>
      ) : (
        <div className='w-full px-4 py-2'>
          <Card className='w-full rounded-lg border-2 border-gray-200'>
            {props.header ? <CardBody className='w-full m-0 p-0 py-4 border-b-2 border-gray-200'>{props.header}</CardBody> : null}
            {props.body !== null ? <CardFooter className='w-full m-0 p-4 pb-2'>{props.body}</CardFooter> : null}
          </Card>
        </div>
      )}
    </div>
  );
}

// Export CardTemplate.jsx
export default CardTemplate;
