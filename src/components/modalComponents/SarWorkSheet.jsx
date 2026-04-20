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
import { useSelector } from "react-redux";
import { FormControl, InputLabel, MenuItem, Select, TextField, Tooltip } from "@mui/material";
import CardTemplate from "../editorComponents/securityComponents/CardTemplate.jsx";
import Modal from "../modalComponents/Modal.jsx";

/**
 * The SarWorkSheet class that displays the data for the sar worksheet as a modal
 * @returns {JSX.Element}   the sar worksheet modal content
 * @constructor             passes in props to the class
 */
function SarWorkSheet(props) {
  // Prop Validation
  SarWorkSheet.propTypes = {
    sarUUID: PropTypes.string.isRequired,
    componentUUID: PropTypes.string.isRequired,
    value: PropTypes.object.isRequired,
    open: PropTypes.bool.isRequired,
    handleClose: PropTypes.func.isRequired,
  };

  // Constants
  const sarElements = useSelector((state) => state.sars.elements);

  // The element values
  const [elementMenuOptions, setElementMenuOptions] = useState([]);
  const [selectedElementUUID, setSelectedElementUUID] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [aactivity, setAactivity] = useState("");

  // The element type
  const [selectedElementType, setSelectedElementType] = useState("");
  const elementTypeMenuOptions = [
    { key: "C", value: "Content and Presentation" },
    { key: "D", value: "Developer Action" },
    { key: "E", value: "Evaluator Action" },
  ];

  // Collapse card values
  const [openSarComponent, setOpenSarComponent] = useState(true);
  const [openSarElement, setOpenSarElement] = useState(true);

  // Use Effects
  useEffect(() => {
    // Update element dropdown
    updateElementDropdown();

    // Update element items
    updateElementItems(selectedElementUUID);
  }, [props]);
  useEffect(() => {
    // Update element items
    updateElementItems(selectedElementUUID);
  }, [selectedElementUUID]);
  useEffect(() => {
    // Update element dropdown
    updateElementDropdown();
  }, [selectedElementType]);

  // Handle Methods
  /**
   * Handles opening the sar component
   */
  const handleSetOpenSarComponent = () => {
    setOpenSarComponent(!openSarComponent);
  };
  /**
   * Handles the selected element
   * @param event the event
   */
  const handleSelectedElement = (event) => {
    setSelectedElementUUID(event.target.value);
  };
  /**
   * Handles opening the sar element
   */
  const handleSetOpenSarElement = () => {
    setOpenSarElement(!openSarElement);
  };

  /**
   * Updates the element items
   * @param elementUUID the element uuid
   */
  const updateElementItems = (elementUUID) => {
    // Update type
    let currentTypeValue = getElementValuesByType(elementUUID, "type");
    if (JSON.stringify(currentTypeValue) !== JSON.stringify(selectedElementType)) {
      setSelectedElementType(currentTypeValue);
    }

    // Update title
    let currentTitle = getElementValuesByType(elementUUID, "title");
    if (JSON.stringify(currentTitle) !== JSON.stringify(title)) {
      setTitle(currentTitle);
    }

    // Update note
    let currentNote = getElementValuesByType(elementUUID, "note");
    if (JSON.stringify(currentNote) !== JSON.stringify(note)) {
      setNote(currentNote);
    }

    // Update aactivity
    let currentAactivity = getElementValuesByType(elementUUID, "aactivity");
    if (JSON.stringify(currentAactivity) !== JSON.stringify(aactivity)) {
      setAactivity(currentAactivity);
    }
  };
  /**
   * Updates the element dropdown
   */
  const updateElementDropdown = () => {
    const elementMenuItems = getElementMenuItems();

    if (JSON.stringify(elementMenuItems) !== JSON.stringify(elementMenuOptions)) {
      setElementMenuOptions(elementMenuItems);
    }
  };

  // Helper Methods
  /**
   * Gets the element menu items
   * @returns {*[]}
   */
  const getElementMenuItems = () => {
    const uuidArray = props.value.elementIDs;
    let elementMenuItems = [];
    let counters = {
      C: 0,
      D: 0,
      E: 0,
    };

    // Create the dropdown list by type
    uuidArray.forEach((uuid) => {
      if (sarElements.hasOwnProperty(uuid)) {
        const type = sarElements[uuid].type ? sarElements[uuid].type : "C";
        let value = `${props.value.ccID.toUpperCase()}.${++counters[type]} (${type})`;
        let element = { key: uuid, value: value };
        if (!elementMenuItems.includes(element)) {
          elementMenuItems.push(element);
        }
      }
    });

    // Sort the dropdown list
    elementMenuItems.sort((a, b) => a.value.localeCompare(b.value));
    return elementMenuItems;
  };
  /**
   * Gets the element value by type
   * @param currentUUID the current uuid
   * @param type the type
   * @returns {*|string|string}
   */
  const getElementValuesByType = (currentUUID, type) => {
    if (currentUUID && currentUUID !== "" && sarElements.hasOwnProperty(currentUUID)) {
      const element = sarElements[currentUUID];
      return element && element.hasOwnProperty(type) && element[type] ? element[type] : "";
    }

    return "";
  };

  // Return Method
  return (
    <div className='w-screen'>
      <Modal
        title={"SAR Worksheet"}
        content={
          <div className='w-screen sm:max-w-screen-sm md:max-w-screen-sm lg:max-w-screen-lg'>
            <CardTemplate
              type={"parent"}
              title={"SAR Component"}
              tooltip={"SAR Component"}
              collapse={openSarComponent}
              collapseHandler={handleSetOpenSarComponent}
              body={
                <div className='min-w-full mt-4 justify-items-left grid grid-flow-row auto-rows-max'>
                  <div
                    className='w-screen sm:max-w-screen-sm md:max-w-screen-sm lg:max-w-screen-lg grid grid-flow-col columns-3 gap-4 p-2 pl-4 pr-2.5'
                    style={{ gridTemplateColumns: "1fr 1fr 80px" }}>
                    <FormControl fullWidth>
                      <Tooltip arrow id={"ccIDTooltip"} title={"Full ID of the SAR Component."}>
                        <TextField key={props.value.ccID} label='CC-ID' disabled={true} defaultValue={props.value.ccID} />
                      </Tooltip>
                    </FormControl>
                    <FormControl fullWidth>
                      <Tooltip arrow title={"Full name of the component."} id={"nameTooltip"}>
                        <TextField key={props.value.name} label='Name' disabled={true} defaultValue={props.value.name} />
                      </Tooltip>
                    </FormControl>
                  </div>
                  <div className='w-screen sm:max-w-screen-sm md:max-w-screen-sm lg:max-w-screen-lg'>
                    <CardTemplate
                      type={"section"}
                      header={<label className='resize-none font-bold text-[14px] p-0 pr-4 text-accent'>Summary</label>}
                      body={
                        <div className='preview'>
                          {props.value && props.value.summary ? props.value.summary : <p className='text-gray-400'>No summary provided</p>}
                        </div>
                      }
                    />
                  </div>
                </div>
              }
            />
            <CardTemplate
              type={"parent"}
              title={"SAR Element"}
              tooltip={"SAR Element"}
              collapse={openSarElement}
              collapseHandler={handleSetOpenSarElement}
              body={
                <div className='min-w-full mt-4 grid grid-flow-row auto-rows-max'>
                  <div className='w-screen sm:max-w-screen-sm md:max-w-screen-sm lg:max-w-screen-lg grid grid-flow-col columns-3 gap-4 p-2 px-4 pb-0'>
                    <FormControl>
                      <Tooltip
                        id={"selectElementTooltip"}
                        title={`This dropdown list allows a user to select between any of the previously 
                                                     created SFR elements attached to this component. New elements can be 
                                                     created by clicking the green "plus" symbol at the bottom of this section.`}
                        arrow>
                        <InputLabel key='element-select-label'>Select Element</InputLabel>
                      </Tooltip>
                      <Select value={selectedElementUUID} label='Select Element' autoWidth onChange={handleSelectedElement} sx={{ textAlign: "left" }}>
                        {elementMenuOptions.map((option) => (
                          <MenuItem key={option.key} value={option.key}>
                            {option.value}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    {selectedElementUUID && selectedElementUUID !== "" && (
                      <FormControl>
                        <TextField
                          className='w-full'
                          value={elementTypeMenuOptions.find((option) => option.key === selectedElementType)?.value || ""}
                          fullWidth
                          label='Element Type'
                          disabled={true}
                        />
                      </FormControl>
                    )}
                    {selectedElementUUID && selectedElementUUID !== "" && (
                      <div>
                        <span className='flex justify-stretch min-w-full'>
                          <div className='flex justify-center w-full'>
                            <div className='w-full pr-2'>
                              <Tooltip
                                id={"componentIDTooltip"}
                                title={`This is an automatically generated ID that is defined 
                                                                     by the component id and the number of the element added.`}
                                arrow>
                                <TextField
                                  className='w-full'
                                  key={`${props.componentUUID}-sar-element-id`}
                                  label='Component ID'
                                  disabled={true}
                                  value={selectedElementUUID && selectedElementUUID !== "" ? props.value.ccID.toUpperCase() : ""}
                                />
                              </Tooltip>
                            </div>
                          </div>
                        </span>
                      </div>
                    )}
                  </div>
                  {selectedElementUUID && selectedElementUUID !== "" && (
                    <div className='min-w-full justify-items-left grid grid-flow-row auto-rows-max'>
                      <div className='w-screen sm:max-w-screen-sm md:max-w-screen-sm lg:max-w-screen-lg pb-2 pl-4 pr-6'>
                        <div className='min-w-full mt-4 justify-items-left grid grid-flow-row auto-rows-max mx-[-16px]'>
                          <CardTemplate
                            className={"w-full"}
                            type={"section"}
                            header={<label className='resize-none font-bold text-[14px] p-0 pr-4 text-accent'>Requirement</label>}
                            body={
                              <div
                                className='preview'
                                dangerouslySetInnerHTML={{
                                  __html: title ? title : '<p class="text-gray-400">No requirement exists.</p>',
                                }}
                              />
                            }
                          />
                          <CardTemplate
                            className={"w-full"}
                            type={"section"}
                            header={<label className='resize-none font-bold text-[14px] p-0 pr-4 text-accent'>Application Note</label>}
                            body={
                              <div
                                className='preview'
                                dangerouslySetInnerHTML={{
                                  __html: note ? note : '<p class="text-gray-400">No application notes.</p>',
                                }}
                              />
                            }
                          />
                          <CardTemplate
                            type={"section"}
                            header={<label className='resize-none font-bold text-[14px] p-0 pr-4 text-accent'>Evaluation Activity</label>}
                            body={
                              <div
                                className='preview'
                                dangerouslySetInnerHTML={{
                                  __html: aactivity ? aactivity : '<p class="text-gray-400">No evaluation activities.</p>',
                                }}
                              />
                            }
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              }
            />
          </div>
        }
        open={props.open}
        handleClose={props.handleClose}
        hideSubmit={true}
      />
    </div>
  );
}

// Export SarWorkSheet.jsx
export default SarWorkSheet;
