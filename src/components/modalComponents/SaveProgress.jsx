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

import PropTypes from "prop-types";
import { useState } from "react";
import { useSelector } from "react-redux";
import { Card, CardBody, CardFooter } from "@material-tailwind/react";
import { Button, TextField } from "@mui/material";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import { handleSnackBarSuccess, handleSnackBarError } from "../../utils/securityComponents.jsx";
import Modal from "./Modal";
import { normalizeComponentId, getUniqueKey } from "../../utils/saveLoadUtils.js";

/**
 * The Save Progress class that packages the form into an Json Export file
 * @returns {JSX.Element}   the Save Progress modal content
 * @constructor             passes in props to the class
 */
function SaveProgress({ open, handleOpen }) {
  SaveProgress.propTypes = {
    open: PropTypes.bool,
    handleOpen: PropTypes.func,
  };

  // Constants
  const state = useSelector((state) => state);
  const sfrSections = useSelector((state) => state.sfrSections);
  const [fileName, setFileName] = useState("download");
  const TESTING = false;

  const handleSetFileName = (event) => {
    let fileName = event.target.value;
    let trimmed = fileName.replace(/[/\\?%*:|"<>]/g, "-");
    setFileName(trimmed);
  };

  /**
   * Export selectable checked state from sfrSections and UI state.
   * Returns an object in the form: { actions: { "": {checked:false, content:""}, "app:comp:sel": {checked: bool, content: string} } }
   *
   * This function will inspect the provided sfrSections for selectable and selectableGroup checked flags
   */
  const exportSfrSectionSelectables = () => {
    const actions = {};

    // Always include the empty key as requested
    actions[""] = { checked: false, content: "" };

    // derive app short name
    let overallShort = null;
    try {
      const overall = state?.overallObject || {};
      overallShort =
        (overall.PP && overall.PP["@short"]) || (overall.Package && overall.Package["@short"]) || (overall.Module && overall.Module["@short"]) || null;
    } catch (e) {
      overallShort = null;
    }

    const selectedPP = state?.accordionPane?.selectedPP;
    const ppShort = selectedPP?.accordionPane?.metadata?.xmlTagMeta?.attributes?.short || null;
    const ppName = selectedPP?.accordionPane?.metadata?.ppName || null;

    let ppIdentifier = overallShort || ppShort || ppName || "";
    ppIdentifier = String(ppIdentifier).toLowerCase().trim().replace(/\s+/g, "_");

    // Helper to add a selectable entry
    const addSelectableEntry = (selectable) => {
      if (!selectable) return;

      const selId = selectable.id !== undefined && selectable.id !== null ? selectable.id : selectable.uuid ? selectable.uuid : "0";

      const key = `${ppIdentifier}:${selId}`;
      const checked = Boolean(selectable.checked);
      const content = selectable.assignment_text || selectable.assignmentText || "";
      const type = selectable?.assignment ? "assignment" : "selectable";

      const uniqueKey = getUniqueKey(actions, key, type);
      actions[uniqueKey] = { checked, content };
    };

    // Helper to add a group entry (complex selectable)
    // Keep component ID because group-XX is not globally unique
    const addGroupEntry = (compId, groupId, group) => {
      if (!groupId) return;

      const key = `${ppIdentifier}:${compId}:${groupId}`;
      const uniqueKey = getUniqueKey(actions, key, "group");
      actions[uniqueKey] = { checked: Boolean(group?.checked), content: "" };
    };

    try {
      // Iterate sfrSections (static state)
      Object.values(sfrSections).forEach((family) => {
        Object.values(family || {}).forEach((component) => {
          const compId = normalizeComponentId(component);
          const elements = component?.elements || {};

          Object.values(elements).forEach((element) => {
            const selectables = element?.selectables || {};
            Object.values(selectables).forEach((sel) => addSelectableEntry(sel));

            const groups = element?.selectableGroups || {};
            Object.entries(groups).forEach(([groupId, group]) => addGroupEntry(compId, groupId, group));
          });
        });
      });
    } catch (e) {
      console.log(e);
    }

    return { actions };
  };

  const exportSelections = () => {
    const { selectedPP, selectedPackages, selectedModules, selectedPlatforms } = state?.accordionPane || {};

    const ppShortKey = selectedPP?.accordionPane?.metadata?.xmlTagMeta?.attributes?.short?.toLowerCase() || null;

    return {
      selections: {
        selectedPP: ppShortKey,
        selectedPackages: (selectedPackages ?? []).map((p) => ({
          value: p.value,
          label: p.label,
          type: p.type,
        })),
        selectedModules: (selectedModules ?? []).map((m) => ({
          value: m.value,
          label: m.label,
          type: m.type,
        })),
        selectedPlatforms: selectedPlatforms ?? [],
      },
    };
  };

  const handleSave = () => {
    try {
      const payload = {
        ...exportSelections(),
        ...exportSfrSectionSelectables(),
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = `${fileName ? fileName : "saved-st"}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(href);

      handleSnackBarSuccess("Exported Progress JSON successfully");
    } catch (e) {
      console.error(e);
      handleSnackBarError(e);
    } finally {
      handleOpen();
    }
  };

  // Return Method
  return (
    <div>
      <Modal
        title={"Save Progress"}
        content={
          <div className='w-screen-md'>
            <Card className='rounded-lg border-2 border-gray-200'>
              <CardBody className='border-b-2 rounded-b-sm border-gray-300 text-secondary'>
                <div className='w-full' style={{ display: "inline-block", padding: 1 }}>
                  <span className='flex justify-stretch min-w-full'>
                    <TextField fullWidth required color={"secondary"} label={"JSON File"} value={fileName} onChange={handleSetFileName} />
                    <div className='pl-2 text-[14px] mt-8 text-black'>.json</div>
                  </span>
                </div>
              </CardBody>
              <CardFooter>
                <div className='flex justify-center items-center'>
                  <Button
                    id={"final-export-sfrsections-json-button"}
                    sx={{ fontSize: "12px" }}
                    disabled={TESTING || (fileName && fileName !== "") ? false : true}
                    component='label'
                    variant='contained'
                    color='secondary'
                    startIcon={<CloudDownloadIcon />}
                    style={{ color: "white", marginTop: "0px", marginBottom: "5px" }}
                    onClick={handleSave}>
                    Save Progress
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </div>
        }
        open={open}
        handleClose={() => handleOpen()}
        hideSubmit={true}
      />
    </div>
  );
}

export default SaveProgress;
