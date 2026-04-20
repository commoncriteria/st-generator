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
import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Accordion, AccordionBody, AccordionHeader, Card, List, ListItem, ListItemPrefix, Typography } from "@material-tailwind/react";
import { Tooltip } from "@mui/material";
import RestoreIcon from "@mui/icons-material/Restore";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import SettingsSharpIcon from "@mui/icons-material/SettingsSharp";
import ArrowRightIcon from "@mui/icons-material/ArrowRight";
import FolderIcon from "@mui/icons-material/Folder";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import ArticleIcon from "@mui/icons-material/Article";
import { setIsPreviewToggled } from "../reducers/navBarSlice.js";
import { handleSnackBarSuccess, handleSubmitResetDataMenu } from "../utils/securityComponents.jsx";
import ResetDataConfirmation from "./modalComponents/ResetDataConfirmation.jsx";
import LoadSavedFile from "./modalComponents/LoadSavedFile.jsx";
import XMLExporter from "./modalComponents/XMLExporter.jsx";
import SaveProgress from "./modalComponents/SaveProgress.jsx";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import { buildSTHtml } from "../utils/exportST.js";
import { buildAAHtml } from "../utils/exportAA.js";

/**
 * The Sidebar class that displays the sidebar menu
 * @returns {JSX.Element}   the sidebar content
 * @constructor             passes in props to the class
 */
function SideBar() {
  // Constants
  const dispatch = useDispatch();
  const isNavOpen = useSelector((state) => state.navBar.isNavOpen);
  const isPreviewToggled = useSelector((state) => state.navBar.isPreviewToggled);
  const { primary, icons } = useSelector((state) => state.styling);
  const [openMenuItems, setOpenMenuItems] = React.useState(0);
  const [openFileLoaderMenu, setOpenFileLoaderMenu] = React.useState(false);
  const [openLoadSavedFile, setOpenLoadSavedFile] = React.useState(false);
  const [openSaveProgress, setOpenSaveProgress] = React.useState(false);
  const [openAccordionMenu, setOpenAccordionMenu] = React.useState(false);
  const [openResetDataMenu, setOpenResetDataMenu] = React.useState(false);
  const [openXMLExporterMenu, setOpenXMLExporterMenu] = React.useState(false);
  const [openActivityExporterMenu, setOpenActivityExporterMenu] = React.useState(false);
  // Use Effects
  useEffect(() => {
    // This runs when the file loader menu is closed prematurely
    if (sessionStorage.getItem("fileMenuClosed") === "true") {
      // Update snackbar
      handleSnackBarSuccess(`Loaded in Default XML Template`);

      // Perform actions after reload
      sessionStorage.removeItem("fileMenuClosed");
    }
  }, []);

  // Methods
  /**
   * Handles opening and closing the accordions in the side bar menu
   * @param value the value of the accordion to open or close
   */
  const handleOpenMenuItems = (value) => {
    setOpenMenuItems(openMenuItems === value ? 0 : value);
  };

  /**
   * Handles opening the Load Saved File dialog
   * @returns {Promise<void>}
   */
  const handleOpenLoadSavedFile = async () => {
    if (!openLoadSavedFile) {
      if (isPreviewToggled) {
        await dispatch(setIsPreviewToggled());
      }
    }
    setOpenLoadSavedFile(!openLoadSavedFile);
  };

  /**
   * Handles opening the Save Progress dialog
   * @returns {Promise<void>}
   */
  const handleOpenSaveProgress = async () => {
    if (!openSaveProgress) {
      if (isPreviewToggled) {
        await dispatch(setIsPreviewToggled());
      }
    }
    setOpenSaveProgress(!openSaveProgress);
  };
  /**
   * Handles opening the xml exporter dialog
   * @returns {Promise<void>}
   */
  const handleOpenXMLExporter = async () => {
    if (!openXMLExporterMenu) {
      if (isPreviewToggled) {
        await dispatch(setIsPreviewToggled());
      }
    }
    setOpenXMLExporterMenu(!openXMLExporterMenu);
  };
  /**
   * Handles opening the activity exporter dialog
   * @returns {Promise<void>}
   */
  const handleOpenActivityExporter = async () => {
    if (!openActivityExporterMenu) {
      if (isPreviewToggled) {
        await dispatch(setIsPreviewToggled());
      }
    }
    setOpenActivityExporterMenu(!openActivityExporterMenu);
  };
  /**
   * Handles opening the reset data dialog
   */
  const handleOpenResetDataMenu = () => {
    setOpenResetDataMenu(!openResetDataMenu);
  };

  // Return Method
  return (
    <div>
      {isNavOpen ? (
        <div
          className={`top-0 left-0 text-white fixed h-full z-40 ease-in-out duration-300 
                                 min-w-[300px] max-w-[300px] mt-4 ml-1 mr-2 pb-6 rounded-md grid justify-items-center ... 
                                 ${isNavOpen ? "translate-x-0 " : "translate-x-full"}`}>
          <Card className='w-full h-full bg-neutral border-2 border-gray-500 pt-5 overflow-y-auto'>
            <div className='h-full w-full'>
              <div className='flex items-center justify-center pb-2 border-b-[3px] rounded-b-sm border-gray-500'>
                <Typography className='text-2xl font-semibold text-secondary'>Menu</Typography>
              </div>
              <div className='flex items-start justify-start w-full text-white'>
                <List className='w-full mt-2'>
                  <Accordion
                    className='pb-2 text-white'
                    open={openMenuItems === 2}
                    icon={
                      <div className='flex mx-auto'>
                        <ArrowDropDownIcon
                          sx={{
                            ...icons.large,
                            marginBottom: "2px",
                            transform: openMenuItems === 2 ? "rotate(180deg)" : "",
                          }}
                        />
                      </div>
                    }>
                    <ListItem className='p-0' selected={openMenuItems === 2}>
                      <AccordionHeader onClick={() => handleOpenMenuItems(2)} className='border-b-0 px-3 py-2'>
                        <ListItemPrefix>
                          <FolderIcon htmlColor={primary} sx={icons.large} />
                        </ListItemPrefix>
                        <Typography className='text-[16px] mr-auto pt-[8px]'>File Options</Typography>
                      </AccordionHeader>
                    </ListItem>
                    <AccordionBody className='pl-0 pt-1 pb-0 text-white'>
                      <List className='p-0'>
                        <Tooltip title={"Uploads a file, usually from Save Progress"} placement={"top"} id={"loadSavedTooltip"}>
                          <ListItem onClick={handleOpenLoadSavedFile}>
                            <ListItemPrefix>
                              <ArrowRightIcon sx={icons.small} />
                            </ListItemPrefix>
                            <ListItemPrefix>
                              <UploadFileIcon htmlColor={primary} sx={icons.small} />
                            </ListItemPrefix>
                            <Typography className='text-[14px] pt-[8px]'>Load Saved File</Typography>
                          </ListItem>
                        </Tooltip>
                        <Tooltip title={"Save current progress to JSON"} placement={"top"} id={"saveProgressTooltip"}>
                          <ListItem onClick={handleOpenSaveProgress}>
                            <ListItemPrefix>
                              <ArrowRightIcon sx={icons.small} />
                            </ListItemPrefix>
                            <ListItemPrefix>
                              <CloudDownloadIcon htmlColor={primary} sx={icons.small} />
                            </ListItemPrefix>
                            <Typography className='text-[14px] pt-[8px]'>Save Progress</Typography>
                          </ListItem>
                        </Tooltip>
                        <Tooltip title={"Exports the Security Target document"} placement={"top"} id={"exportSTTooltip"}>
                          <ListItem id={"side-bar-export-button"} onClick={handleOpenXMLExporter}>
                            <ListItemPrefix>
                              <ArrowRightIcon sx={icons.small} />
                            </ListItemPrefix>
                            <ListItemPrefix>
                              <FileDownloadIcon htmlColor={primary} sx={icons.small} />
                            </ListItemPrefix>
                            <Typography className='text-[14px] pt-[8px]'>Export ST</Typography>
                          </ListItem>
                        </Tooltip>
                        <Tooltip title={"Exports the Evaluation Activity document"} placement={"top"} id={"exportActivityTooltip"}>
                          <ListItem id={"side-bar-export-activity-button"} onClick={handleOpenActivityExporter}>
                            <ListItemPrefix>
                              <ArrowRightIcon sx={icons.small} />
                            </ListItemPrefix>
                            <ListItemPrefix>
                              <ArticleIcon htmlColor={primary} sx={icons.small} />
                            </ListItemPrefix>
                            <Typography className='text-[14px] pt-[8px]'>Export EAs</Typography>
                          </ListItem>
                        </Tooltip>
                      </List>
                    </AccordionBody>
                  </Accordion>
                  <Accordion
                    className='pb-5 text-white'
                    open={openMenuItems === 3}
                    icon={
                      <div className='flex mx-auto'>
                        <ArrowDropDownIcon
                          sx={{
                            ...icons.large,
                            marginBottom: "2px",
                            transform: openMenuItems === 3 ? "rotate(180deg)" : "",
                          }}
                        />
                      </div>
                    }>
                    <ListItem className='p-0' selected={openMenuItems === 3}>
                      <AccordionHeader onClick={() => handleOpenMenuItems(3)} className='border-b-0 px-3 py-2'>
                        <ListItemPrefix>
                          <SettingsSharpIcon htmlColor={primary} sx={icons.large} />
                        </ListItemPrefix>
                        <Typography className='text-[16px] mr-auto pt-[8px]'>Settings</Typography>
                      </AccordionHeader>
                    </ListItem>
                    <AccordionBody className='pl-0 pt-1 pb-0 text-white'>
                      <List className='p-0'>
                        <Tooltip title={"Clears Out All Data"} placement={"top"} id={"clearOutDataTooltip"}>
                          <ListItem onClick={handleOpenResetDataMenu}>
                            <ListItemPrefix>
                              <ArrowRightIcon sx={icons.small} />
                            </ListItemPrefix>
                            <ListItemPrefix>
                              <RestoreIcon htmlColor={primary} sx={icons.small} />
                            </ListItemPrefix>
                            <Typography className='text-[14px] pt-[8px]'>Reset Data</Typography>
                          </ListItem>
                        </Tooltip>
                      </List>
                    </AccordionBody>
                  </Accordion>
                </List>
              </div>
            </div>
          </Card>
        </div>
      ) : null}
      <LoadSavedFile open={openLoadSavedFile} handleOpen={handleOpenLoadSavedFile} />
      <SaveProgress open={openSaveProgress} handleOpen={handleOpenSaveProgress} />
      <XMLExporter
        open={openXMLExporterMenu}
        handleOpen={handleOpenXMLExporter}
        title='Security Target Exporter'
        buildHtml={buildSTHtml}
        successMessage='Exported ST Successfully'
      />
      <XMLExporter
        open={openActivityExporterMenu}
        handleOpen={handleOpenActivityExporter}
        title='Evaluation Activities Exporter'
        buildHtml={buildAAHtml}
        successMessage='Exported EAs Successfully'
      />
      <ResetDataConfirmation
        title={"Reset Data Confirmation"}
        text={"Are you sure you want to reset all data to its initial state?"}
        open={openResetDataMenu}
        handleOpen={handleOpenResetDataMenu}
        handleSubmit={() => handleSubmitResetDataMenu(handleOpenResetDataMenu)}
      />
    </div>
  );
}

// Export SideBar.jsx
export default SideBar;
