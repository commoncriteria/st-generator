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
import { useMemo } from "react";
import { useSelector } from "react-redux";
import CardTemplate from "../../CardTemplate.jsx";

/**
 * The Application Note component
 * @returns {JSX.Element}
 * @constructor passes in props to the className
 */
function ApplicationNote() {
  // Constants
  const { secondary } = useSelector((state) => state.styling);
  const { element, refIdOptions, managementFunctionUI } = useSelector((state) => state.sfrWorksheetUI);
  const { note, rowIndex } = managementFunctionUI;

  /**
   * Gets the application note
   * @param note application note
   * @returns {JSX.Element}
   */
  const getNoteText = (note) => {
    return (
      <div
        className='p-2 w-full bg-white text-left'
        dangerouslySetInnerHTML={{ __html: note || "" }}
        style={{
          fontSize: "1rem",
          lineHeight: 1.5,
        }}
      />
    );
  };

  // Use Memos
  /**
   * The AppNote component
   * @type {JSX.Element}
   */
  const AppNote = useMemo(() => {
    const { note } = element;

    return getNoteText(note ? note : "No Application Note");
  }, [element, rowIndex, note, refIdOptions]);

  // Return Method
  return (
    <CardTemplate
      type={"section"}
      header={
        <label style={{ color: secondary }} className='resize-none font-bold text-[14px] p-0 pr-4'>
          Application Note
        </label>
      }
      body={<div>{AppNote}</div>}
    />
  );
}

// Export ApplicationNote.jsx
export default ApplicationNote;
