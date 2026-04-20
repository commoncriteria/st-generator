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

import React, { useState } from "react";
import PropTypes from "prop-types";
import { Accordion, AccordionHeader, AccordionBody } from "@material-tailwind/react";
import { Tooltip } from "@mui/material";
import ExpandCircleDownIcon from "@mui/icons-material/ExpandCircleDown";
import ExpandCircleDownOutlinedIcon from "@mui/icons-material/ExpandCircleDownOutlined";
import { useSelector } from "react-redux";

/**
 *
 * @param {string} title - The accordion title.
 * @param {React.ReactNode} children - The content inside the accordion.
 * @param {boolean} defaultOpen - Whether the accordion is expanded by default.
 * @returns {JSX.Element}
 */
const SingleAccordion = ({ title, children, defaultOpen = false }) => {
  // Prop Validation
  SingleAccordion.propTypes = {
    title: PropTypes.string.isRequired,
    children: PropTypes.node.isRequired,
    defaultOpen: PropTypes.bool,
  };

  // Constants
  const [open, setOpen] = useState(defaultOpen);
  const { secondary, hoverOpen, hoverClosed, icons } = useSelector((state) => state.styling);

  // Methods
  /**
   * Handles the accordion click
   * @param event the event as a DOM handler
   */
  const handleAccordionClick = (event) => {
    // Prevent an additional button click that collapses accordion on click
    event.stopPropagation();
    setOpen((prev) => !prev);

    // TODO: Hook into redux state
    // dispatch(
    //   setIsAccordionOpen({
    //     title,
    //     uuid,
    //   })
    // );
  };

  return (
    <div className='min-w-full mb-2 rounded-lg px-1 pt-2'>
      <Accordion
        open={open}
        className={`rounded-lg border-2 border-gray-400 transition-all ${open ? "bg-gray-200" : "bg-gray-300"}`}
        icon={
          <Tooltip title={open ? "Close Section" : "Open Section"}>
            <div>
              {open ? (
                <ExpandCircleDownIcon htmlColor={secondary} sx={{ ...icons.large, transform: "rotate(180deg)", "&:hover": hoverOpen }} />
              ) : (
                <ExpandCircleDownOutlinedIcon htmlColor={secondary} sx={{ ...icons.large, "&:hover": hoverClosed }} />
              )}
            </div>
          </Tooltip>
        }>
        <AccordionHeader
          onClick={handleAccordionClick}
          className={`${open ? "border-b-2 bg-gray-50 rounded-lg rounded-b-none" : "border-b-0"} px-6 font-extrabold text-accent border-gray-400`}>
          <div className='text-start text-[14px]'>
            <span>{title}</span>
          </div>
        </AccordionHeader>

        <AccordionBody className='bg-gray-100 pb-0 rounded-lg rounded-t-none'>
          <div className='flex flex-col h-fit'>{children}</div>
        </AccordionBody>
      </Accordion>
    </div>
  );
};

export default SingleAccordion;
