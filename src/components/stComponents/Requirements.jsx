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
import store from "../../app/store.js";
import { deepCopy } from "../../utils/deepCopy.js";
import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  Typography,
  IconButton,
  Tooltip,
  Chip,
  Switch,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { Card, CardBody } from "@material-tailwind/react";
import RemoveIcon from "@mui/icons-material/Remove";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import StWorkSheet from "../modalComponents/StWorkSheet.jsx";
import SarWorkSheet from "../modalComponents/SarWorkSheet.jsx";
import { handleSnackBarError } from "../../utils/securityComponents.jsx";
import { UPDATE_SFR_WORKSHEET_ITEMS, UPDATE_SFR_WORKSHEET_COMPONENT, RESET_SFR_WORKSHEET_UI } from "../../reducers/SFRs/sfrWorksheetUI.js";
import {
  GET_ALL_SFR_OPTIONS_MAP,
  UPDATE_SFR_COMPONENT_ITEMS,
  CREATE_SFR_INSTANCES,
  DELETE_SFR_INSTANCES,
  UPDATE_INSTANCE_NAME,
} from "../../reducers/SFRs/sfrSectionSlice.js";
import SingleAccordion from "../accordionComponents/SingleAccordion.jsx";

/**
 * Build title and source lookup maps
 *
 * Get maps from sfrs.sections (for mandatory SFRs) and
 * sfrBasePPs (for additional/modified SFRs).
 *
 * Source chips should only appear for SFRs from packages or modules,
 * not for the selected base PP's own SFRs. For module additional/modified
 * SFRs, the source is the module name.
 *
 * @param {Object} sfrs - sfrs slice
 * @param {Object} sfrBasePPs - sfrBasePPs slice
 * @returns {Object} titleMap
 */
function buildMapsFromState(sfrs, sfrBasePPs) {
  const titleMap = {};

  // Source 1: sfrBasePPs — titles for additional/modified families.
  Object.entries(sfrBasePPs || {}).forEach(([_, bp]) => {
    if (!bp || typeof bp !== "object") return;

    ["additionalSfrs", "modifiedSfrs"].forEach((sfrType) => {
      const sections = bp?.[sfrType]?.sfrSections || {};
      Object.entries(sections).forEach(([familyUUID, familyData]) => {
        if (familyData?.title && !titleMap[familyUUID]) {
          titleMap[familyUUID] = familyData.title;
        }
      });
    });
  });

  // Source 2: sfrs.sections — titles for all SFR families.
  const sfrsSections = sfrs?.sections || {};

  Object.entries(sfrsSections).forEach(([familyUUID, section]) => {
    if (section?.title) {
      titleMap[familyUUID] = section.title;
    }
  });

  return titleMap;
}

/**
 * Build a display-only grouping of families by title
 *
 * Multiple family UUIDs can share the same title (e.g. base PP mandatory SFRs, and
 * module mandatory/modified/additional SFRs). This function is used to render all SFRs
 * under the same family accordion.
 *
 * @param {Object} sfrSections - sfrSections slice
 * @param {Object} sfrs - sfrs slice
 * @param {Object} sfrBasePPs - sfrBasePPs slice
 * @returns {Array} Array of { title, families: [{ familyKey, components }] }
 */
export function buildTitleGroups(sfrSections, sfrs, sfrBasePPs) {
  const titleMap = buildMapsFromState(sfrs, sfrBasePPs);

  // Collect keys from all modified SFRs (cc_id + iteration_id)
  // These replace the base PP's SFRs
  const modifiedKeys = new Set();
  Object.values(sfrSections || {}).forEach((components) => {
    Object.values(components).forEach((comp) => {
      if (comp?.modifiedSfr) {
        const key = `${comp.cc_id}|${comp.iteration_id || ""}`;
        modifiedKeys.add(key);
      }
    });
  });

  const groupOrder = []; // Maintains insertion order of first-seen titles
  const groupMap = {}; // title -> { title, families: [] }

  Object.entries(sfrSections || {}).forEach(([familyKey, components]) => {
    const title = titleMap[familyKey] || familyKey;

    // Filter out base PP SFRs that have been replaced by modified SFRs.
    const filteredComponents = {};
    Object.entries(components).forEach(([compUUID, comp]) => {
      if (!comp?.modifiedSfr && !comp?.additionalSfr) {
        const key = `${comp.cc_id}|${comp.iteration_id || ""}`;
        if (modifiedKeys.has(key)) {
          return;
        }
      }
      filteredComponents[compUUID] = comp;
    });

    // Skip this family entirely if all components were filtered out
    if (Object.keys(filteredComponents).length === 0) return;

    if (!groupMap[title]) {
      groupMap[title] = {
        title,
        families: [],
      };
      groupOrder.push(title);
    }

    groupMap[title].families.push({
      familyKey,
      components: filteredComponents,
    });
  });

  // Sort groups by the CC family abbreviation e.g. "(FAU)", "(FCS)"
  // Falls back to full title for entries without an abbreviation
  groupOrder.sort((a, b) => {
    const abbrA = groupMap[a].title.match(/\(([A-Z]{3,})\)\s*$/)?.[1] || groupMap[a].title;
    const abbrB = groupMap[b].title.match(/\(([A-Z]{3,})\)\s*$/)?.[1] || groupMap[b].title;
    return abbrA.localeCompare(abbrB);
  });

  // Flatten all families' components into a single sorted list per group,
  // preserving each component's familyKey for Redux lookups
  groupOrder.forEach((key) => {
    const allComponents = [];

    groupMap[key].families.forEach((family) => {
      Object.entries(family.components).forEach(([compUUID, comp]) => {
        allComponents.push({ compUUID, comp, familyKey: family.familyKey });
      });
    });

    allComponents.sort((a, b) => {
      const nameA = `${a.comp.cc_id}${a.comp.iteration_id || ""}`.toUpperCase();
      const nameB = `${b.comp.cc_id}${b.comp.iteration_id || ""}`.toUpperCase();
      return nameA.localeCompare(nameB);
    });

    groupMap[key].sortedComponents = allComponents;
  });

  return groupOrder.map((key) => groupMap[key]);
}

/**
 * Gets selection dependency info for a selection-based SFR.
 * @param {Object} selections - The component's selections object
 * @param {{ byUUID: Object, byID: Object }} selectableLookup - Lookup maps
 * @returns {{ met: boolean, sources: string[] }}
 * Exported helper: Sets the sfr worksheet items (uses top-level store import)
 * @param {Object} itemMap
 */
export function setSfrWorksheetUIItems(itemMap) {
  try {
    store.dispatch(
      UPDATE_SFR_WORKSHEET_ITEMS({
        itemMap,
      })
    );
  } catch (e) {
    console.log(e);
    handleSnackBarError(e);
  }
}

/**
 * Exported helper: Opens the ST Worksheet. This is extracted so other files can
 * invoke the same behavior. Note that sfrSections and openSfrWorksheet must be
 * provided by the caller (they were previously captured from the component's
 * closure).
 *
 * @param {string} familyKey
 * @param {string} compUUID
 * @param {Object} sfrSections
 * @param {boolean} openSfrWorksheet
 */
export function openSTWorkSheet(familyKey, compUUID, sfrSections, openSfrWorksheet) {
  // Update SFR Worksheet UI
  setSfrWorksheetUIItems({
    openSfrWorksheet: !openSfrWorksheet,
    sfrUUID: familyKey,
    componentUUID: compUUID,
    sfrSections: deepCopy(sfrSections),
  });

  try {
    // Get the new sfr options map
    const newSfrOptions = store.dispatch(
      GET_ALL_SFR_OPTIONS_MAP({
        sfrSections: sfrSections,
      })
    ).payload;

    // Update the component
    store.dispatch(
      UPDATE_SFR_WORKSHEET_COMPONENT({
        sfrSections: sfrSections,
        newSfrOptions,
      })
    );
  } catch (e) {
    console.log(e);
    handleSnackBarError(e);
  }
}

/**
 * Exported helper: Checks if any of the referenced selectables for a selection
 * based SFR are checked. Accepts the selectableLookup as an argument so it can
 * be used outside the component.
 *
 * @param {Object} selections - The component's selections object
 * @param {Object} selectableLookup - { byUUID, byID }
 * @returns {{ met: boolean, sources: string[] }} Whether dependency is met and which components it depends on
 */
export function getSelectionDependencyInfo(selections, selectableLookup) {
  if (!selections?.selections || selections.selections.length === 0) {
    return { met: false, sources: [] };
  }

  const sources = [];
  let met = false;

  for (const sel of selections.selections) {
    // UUID lookup — single entry
    const uuidEntry = selectableLookup?.byUUID?.[sel];
    if (uuidEntry) {
      if (!sources.includes(uuidEntry.compLabel)) {
        sources.push(uuidEntry.compLabel);
      }
      if (uuidEntry.selectable.checked) {
        met = true;
        continue;
      }

      // UUID matched but not checked — the original may be disabled/instanced.
      // Fall back to checking all entries that share the same string id,
      // which includes the instances.
      if (uuidEntry.selectable.id) {
        const idEntries = selectableLookup?.byID?.[uuidEntry.selectable.id];
        if (Array.isArray(idEntries)) {
          for (const entry of idEntries) {
            if (!sources.includes(entry.compLabel)) {
              sources.push(entry.compLabel);
            }
            if (entry.selectable.checked) {
              met = true;
            }
          }
        }
      }
      continue;
    }

    // ID lookup — array of entries (original + instances share the same id)
    const idEntries = selectableLookup?.byID?.[sel];
    if (Array.isArray(idEntries)) {
      for (const entry of idEntries) {
        if (!sources.includes(entry.compLabel)) {
          sources.push(entry.compLabel);
        }
        if (entry.selectable.checked) {
          met = true;
        }
      }
    }
  }

  return { met, sources };
}

/**
 * Build selectable lookup maps from sfrSections
 *
 * This extracts the logic for creating byUUID and byID maps so other
 * modules (e.g. Validator.jsx) can reuse the same lookup.
 *
 * @param {Object} sfrSections
 * @returns {{ byUUID: Object, byID: Object }}
 */
export function buildSelectableLookup(sfrSections) {
  const byUUID = {};
  const byID = {};

  for (const families of Object.values(sfrSections || {})) {
    for (const component of Object.values(families || {})) {
      if (!component.elements) continue;

      const compLabel = component.cc_id + (component.iteration_id ? "/" + component.iteration_id : "");

      for (const element of Object.values(component.elements)) {
        if (!element.selectables) continue;

        for (const [selUUID, selectable] of Object.entries(element.selectables)) {
          const entry = {
            selectable,
            compLabel,
            selUUID,
          };

          byUUID[selUUID] = entry;

          if (selectable.id) {
            if (!byID[selectable.id]) {
              byID[selectable.id] = [];
            }
            byID[selectable.id].push(entry);
          }
        }
      }
    }
  }

  return { byUUID, byID };
}

/**
 * The Requirements class
 * @returns {JSX.Element}
 */
function Requirements() {
  // Constants
  const sfrs = useSelector((state) => state.sfrs);
  const sfrSections = useSelector((state) => state.sfrSections);
  const sfrBasePPs = useSelector((state) => state.sfrBasePPs);
  const sars = useSelector((state) => state.sars);
  const { primary, secondary } = useSelector((state) => state.styling);
  const stTD = useSelector((state) => state.stTD);
  const [expandedFamily, setExpandedFamily] = React.useState({});

  // SAR state
  const [expandedSarSection, setExpandedSarSection] = useState({});

  // SAR worksheet state
  const [openSarWorksheet, setOpenSarWorksheet] = useState(false);
  const [selectedSarComponentUUID, setSelectedSarComponentUUID] = useState("");
  const [selectedSarComponentValue, setSelectedSarComponentValue] = useState(null);

  // Instance creation state
  const [instanceDialog, setInstanceDialog] = React.useState({ open: false, familyKey: null, compUUID: null });
  const [instanceNames, setInstanceNames] = React.useState(["", ""]);

  // Delete confirmation state
  const [deleteDialog, setDeleteDialog] = React.useState({ open: false, familyKey: null, compUUID: null });

  // Build families grouped by title (memoized to avoid recalculating on every render)
  const titleGroups = useMemo(() => buildTitleGroups(sfrSections, sfrs, sfrBasePPs), [sfrSections, sfrs, sfrBasePPs]);

  // Use Effects
  // Reset the worksheet UI on component mount
  useEffect(() => {
    store.dispatch(RESET_SFR_WORKSHEET_UI());
  }, []); // Empty dependency array = run once on mount

  // Persist data if page is refreshed before modal is exited
  useEffect(() => {
    const handleBeforeUnload = () => {
      const { sfrUUID, componentUUID, currentElements, openSfrWorksheet } = store.getState().sfrWorksheetUI;

      if (openSfrWorksheet && sfrUUID && componentUUID && currentElements && Object.keys(currentElements).length > 0) {
        store.dispatch(
          UPDATE_SFR_COMPONENT_ITEMS({
            sfrUUID,
            uuid: componentUUID,
            itemMap: { elements: currentElements },
          })
        );
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // Use Memos
  // Create selection dependency lookup
  const selectableLookup = useMemo(() => buildSelectableLookup(sfrSections), [sfrSections]);

  // Methods
  /**
   * Handles closing the SFR WorkSheet
   */
  const handleCloseStWorkSheet = () => {
    const { sfrUUID, componentUUID, currentElements } = store.getState().sfrWorksheetUI;

    // Persist modified elements back to sfrSections
    if (sfrUUID && componentUUID && currentElements && Object.keys(currentElements).length > 0) {
      store.dispatch(
        UPDATE_SFR_COMPONENT_ITEMS({
          sfrUUID,
          uuid: componentUUID,
          itemMap: { elements: currentElements },
        })
      );
    }

    store.dispatch(RESET_SFR_WORKSHEET_UI());
  };

  /**
   * Look up a TD by an sfrUUID.
   * Searches the stTD reducer for an entry whose `sfrs` array contains the
   * provided sfrUUID and which has a non-empty tdReason. If found, returns
   * the matching tdNumber. Returns null if no match is found.
   *
   * @param {string} sfrUUID
   * @returns {number|null}
   */
  const getTdNumberBySfrUuid = (sfrUUID) => {
    if (!sfrUUID || !stTD) return null;

    // First, check the tdDefaults array (these are the built-in TDs)
    // Assumes we take highest number td if more than one sfr per tdNumber
    // TODO: remove this defaults check after the demo/poc
    const defaults = stTD.tdDefaults || [];
    const sortedTdDefaults = [...defaults].sort((a, b) => b.tdNumber - a.tdNumber);

    const defaultMatch = sortedTdDefaults.find((d) => {
      if (!d || !d.sfrs) return false;
      const sfrs = d.sfrs || [];
      if (Array.isArray(sfrs)) return sfrs.includes(sfrUUID);
      return false;
    });

    if (defaultMatch) return defaultMatch.tdNumber ?? null;

    // Search any TDs stored at the top level of the reducer
    // Sort TD entries descending by tdNumber so we find the highest tdNumber first
    const sortedEntries = Object.entries(stTD || {})
      .filter(([key]) => key !== "tdDefaults")
      .sort(([, a], [, b]) => (b?.tdNumber ?? -Infinity) - (a?.tdNumber ?? -Infinity));

    const match = sortedEntries.find(([key, value]) => {
      if (!value) return false;
      const sfrs = value.sfrs || "";
      return sfrs.includes(sfrUUID);
    });

    if (match) {
      const [, matchedValue] = match;
      return matchedValue.tdNumber ?? null;
    }

    return null;
  };

  /**
   * Handles opening the SFR Worksheet (instance method using component state)
   * @param {string} familyKey
   * @param {string} compUUID
   */
  const handleOpenSfrWorkSheet = (familyKey, compUUID) => {
    openSTWorkSheet(familyKey, compUUID, sfrSections);
  };

  /**
   * Toggles the enabled state of an optional/objective SFR component
   * @param {string} familyKey - the family UUID
   * @param {string} compUUID - the component UUID
   * @param {boolean} currentEnabled - the current enabled state
   */
  const toggleComponentEnabled = (familyKey, compUUID, currentEnabled) => {
    try {
      store.dispatch(
        UPDATE_SFR_COMPONENT_ITEMS({
          sfrUUID: familyKey,
          uuid: compUUID,
          itemMap: { enabled: !currentEnabled },
        })
      );
    } catch (e) {
      console.log(e);
    }
  };

  /**
   * Opens the instance naming dialog
   * @param {string} familyKey - family UUID
   * @param {string} compUUID - component UUID
   * @param {string} ccId - component cc_id for default naming
   * @param {string} iterationId - component iteration_id
   */
  const handleOpenInstanceDialog = (familyKey, compUUID, ccId, iterationId) => {
    setInstanceNames(["Instance 1", "Instance 2"]);
    setInstanceDialog({ open: true, familyKey, compUUID });
  };

  /**
   * Creates two instances of the component
   */
  const handleCreateInstances = () => {
    const { familyKey, compUUID } = instanceDialog;
    if (!familyKey || !compUUID) return;

    store.dispatch(
      CREATE_SFR_INSTANCES({
        sfrUUID: familyKey,
        componentUUID: compUUID,
        instanceNames: instanceNames,
      })
    );

    setInstanceDialog({ open: false, familyKey: null, compUUID: null });
    setInstanceNames(["", ""]);
  };

  /**
   * Opens the delete confirmation dialog
   * @param {string} familyKey - family UUID
   * @param {string} compUUID - instance component UUID
   */
  const handleOpenDeleteDialog = (familyKey, compUUID) => {
    setDeleteDialog({ open: true, familyKey, compUUID });
  };

  /**
   * Deletes all instances and re-enables the original
   */
  const handleDeleteInstances = () => {
    const { familyKey, compUUID } = deleteDialog;
    if (!familyKey || !compUUID) return;

    store.dispatch(
      DELETE_SFR_INSTANCES({
        sfrUUID: familyKey,
        componentUUID: compUUID,
      })
    );

    setDeleteDialog({ open: false, familyKey: null, compUUID: null });
  };

  /**
   * Updates an instance's name
   * @param {string} familyKey - family UUID
   * @param {string} compUUID - instance component UUID
   * @param {string} newName - new instance name
   */
  const handleUpdateInstanceName = (familyKey, compUUID, newName) => {
    store.dispatch(
      UPDATE_INSTANCE_NAME({
        sfrUUID: familyKey,
        componentUUID: compUUID,
        instanceName: newName,
      })
    );
  };

  // SAR handlers
  const handleOpenSarWorksheet = (componentUUID, componentValue) => {
    setSelectedSarComponentUUID(componentUUID);
    setSelectedSarComponentValue(componentValue);
    setOpenSarWorksheet(true);
  };

  const handleCloseSarWorksheet = () => {
    setOpenSarWorksheet(false);
    setSelectedSarComponentUUID("");
    setSelectedSarComponentValue(null);
  };

  /**
   * Render SAR sections from Redux sars slice
   * @returns {JSX.Element[]|null}
   */
  function renderSARs() {
    if (!sars?.sections || Object.keys(sars.sections).length === 0) return null;

    return Object.entries(sars.sections)
      .filter(([_, value]) => value && typeof value === "object" && value.title)
      .map(([sectionKey, sectionValue]) => {
        const isExpanded = expandedSarSection[sectionKey] || false;

        return (
          <Card key={sectionKey} className='border-2 border-gray-300'>
            <CardBody className='p-0'>
              <div className='flex items-center justify-between px-4 py-3'>
                <Typography
                  variant='h6'
                  style={{
                    color: primary,
                    fontWeight: "bold",
                    fontSize: "15px",
                  }}>
                  {sectionValue.title || sectionKey}
                </Typography>

                <IconButton onClick={() => setExpandedSarSection({ ...expandedSarSection, [sectionKey]: !isExpanded })} sx={{ padding: "4px" }}>
                  <Tooltip title={isExpanded ? "Collapse Section" : "Expand Section"}>
                    {isExpanded ? <RemoveIcon htmlColor={primary} sx={{ fontSize: "1.5rem" }} /> : <AddIcon htmlColor={primary} sx={{ fontSize: "1.5rem" }} />}
                  </Tooltip>
                </IconButton>
              </div>

              {isExpanded && (
                <div className='px-4 pb-4 pt-2'>
                  {sectionValue.summary && (
                    <Typography
                      variant='body2'
                      sx={{
                        mb: 3,
                        "& *": {
                          fontSize: "1rem !important",
                          fontWeight: "normal !important",
                          margin: 0,
                          lineHeight: 1.5,
                        },
                        "& b, & strong": {
                          fontWeight: "bold !important",
                        },
                      }}
                      dangerouslySetInnerHTML={{ __html: sectionValue.summary }}
                    />
                  )}

                  <div className='space-y-3'>
                    {(sectionValue.componentIDs || []).map((compUUID) => {
                      const component = sars.components?.[compUUID];
                      if (!component) return null;

                      return (
                        <Card key={compUUID} className='border-2 border-gray-300'>
                          <CardBody className='p-3'>
                            <div className='flex items-center'>
                              <IconButton sx={{ padding: "4px", marginRight: "8px" }} onClick={() => handleOpenSarWorksheet(compUUID, component)}>
                                <Tooltip title={"Edit SAR Worksheet"} id={`editSarWorksheetTooltip-${compUUID}`}>
                                  <AutoFixHighIcon htmlColor={primary} sx={{ fontSize: "1.1rem" }} />
                                </Tooltip>
                              </IconButton>
                              <Typography
                                variant='subtitle1'
                                style={{
                                  color: primary,
                                  fontWeight: "bold",
                                  fontSize: "14px",
                                }}>
                                {component.name || component.ccID || compUUID}
                              </Typography>
                            </div>
                          </CardBody>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        );
      });
  }

  return (
    <div className='space-y-3'>
      <StWorkSheet handleClose={handleCloseStWorkSheet} />

      {/* SAR Worksheet Modal */}
      {openSarWorksheet && selectedSarComponentUUID && selectedSarComponentValue && (
        <SarWorkSheet
          sarUUID={selectedSarComponentUUID}
          componentUUID={selectedSarComponentUUID}
          value={selectedSarComponentValue}
          open={openSarWorksheet}
          handleClose={handleCloseSarWorksheet}
        />
      )}

      {/* SFR Sections */}
      <SingleAccordion title='Security Functional Requirements'>
        <div className='p-4 space-y-3'>
          {titleGroups.map((group) => {
            const isExpanded = expandedFamily[group.title] || false;
            const familyModified = group.families.some(({ components }) =>
              Object.keys(components || {}).some((compUUID) => {
                const tdNum = getTdNumberBySfrUuid(compUUID);
                return tdNum !== null && tdNum !== undefined;
              })
            );

            return (
              <Card key={group.title} className='border-2 border-gray-300'>
                <CardBody className='p-0'>
                  <div className='flex items-center justify-between px-4 py-3'>
                    <div className='flex items-center gap-2 flex-wrap'>
                      <Typography
                        variant='h6'
                        style={{
                          color: primary,
                          fontWeight: "bold",
                          fontSize: "15px",
                        }}>
                        {group.title}
                        {familyModified ? <span style={{ color: secondary, fontSize: "12px", marginLeft: "8px" }}>Modified by TDs</span> : null}
                      </Typography>
                    </div>

                    <IconButton
                      onClick={() =>
                        setExpandedFamily({
                          ...expandedFamily,
                          [group.title]: !isExpanded,
                        })
                      }
                      sx={{ padding: "4px" }}>
                      <Tooltip title={isExpanded ? "Collapse Section" : "Expand Section"}>
                        {isExpanded ? (
                          <RemoveIcon htmlColor={primary} sx={{ fontSize: "1.5rem" }} />
                        ) : (
                          <AddIcon htmlColor={primary} sx={{ fontSize: "1.5rem" }} />
                        )}
                      </Tooltip>
                    </IconButton>
                  </div>

                  {isExpanded && (
                    <div className='px-4 pb-4 pt-2'>
                      <div className='space-y-3'>
                        {group.sortedComponents.map(({ compUUID, comp: compValue, familyKey }) => {
                          const tdNumber = getTdNumberBySfrUuid(compUUID);
                          const isOptional = compValue.optional;
                          const isObjective = compValue.objective;
                          const isSelectionBased = compValue.selectionBased;
                          const isToggleable = isOptional || isObjective;
                          const isInstance = Boolean(compValue.instanceOf);
                          const hasInstances = Array.isArray(compValue.instances) && compValue.instances.length > 0;

                          // Determine enabled state
                          const manualEnabled = compValue.enabled ?? false;
                          const selectionInfo = isSelectionBased
                            ? getSelectionDependencyInfo(compValue.selections, selectableLookup)
                            : { met: false, sources: [] };
                          const autoEnabled = isSelectionBased && selectionInfo.met;
                          const isDisabled = hasInstances || ((isToggleable || isSelectionBased) && !(manualEnabled || autoEnabled));
                          const selectionTooltip =
                            isSelectionBased && selectionInfo.sources.length > 0 ? `Depends on: ${selectionInfo.sources.join(", ")}` : "";

                          return (
                            <Tooltip
                              key={compUUID}
                              title={hasInstances ? "This SFR has been instanced" : selectionTooltip}
                              placement='top'
                              disableHoverListener={!isSelectionBased && !hasInstances}
                              arrow>
                              <Card className='border-2 border-gray-300' style={{ opacity: isDisabled ? 0.4 : 1 }}>
                                <CardBody className='p-3'>
                                  <div className='flex items-center'>
                                    <IconButton
                                      sx={{ padding: "4px", marginRight: "8px" }}
                                      disabled={isDisabled}
                                      onClick={() => {
                                        handleOpenSfrWorkSheet(familyKey, compUUID);
                                      }}>
                                      <Tooltip title={"View SFRs"} id={"editSfrWorksheetTooltip"}>
                                        <AutoFixHighIcon htmlColor={primary} sx={{ fontSize: "1.1rem" }} />
                                      </Tooltip>
                                    </IconButton>

                                    <Typography
                                      variant='subtitle1'
                                      style={{
                                        color: primary,
                                        fontWeight: "bold",
                                        fontSize: "14px",
                                      }}>
                                      {compValue.cc_id}
                                      {compValue.iteration_id ? "/" + compValue.iteration_id : ""} {compValue.title}
                                      {tdNumber ? (
                                        <span style={{ color: secondary, fontSize: "12px", marginLeft: "8px" }}>Modified by TD {tdNumber}</span>
                                      ) : null}
                                    </Typography>

                                    {/* Instance name — editable inline */}
                                    {isInstance && (
                                      <TextField
                                        size='small'
                                        defaultValue={compValue.instanceName || ""}
                                        onBlur={(e) => handleUpdateInstanceName(familyKey, compUUID, e.target.value)}
                                        sx={{
                                          marginLeft: "12px",
                                          "& .MuiInputBase-input": {
                                            fontSize: "12px",
                                            padding: "2px 6px",
                                            fontWeight: "bold",
                                            color: primary,
                                          },
                                          "& .MuiOutlinedInput-root": {
                                            "& fieldset": { borderColor: "#ccc" },
                                          },
                                          width: "180px",
                                        }}
                                      />
                                    )}

                                    {compValue.source && (
                                      <Chip
                                        label={compValue.source}
                                        size='small'
                                        sx={{
                                          height: "20px",
                                          fontSize: "11px",
                                          backgroundColor: secondary,
                                          color: "white",
                                          fontWeight: "bold",
                                          marginLeft: "8px",
                                        }}
                                      />
                                    )}

                                    {hasInstances && (
                                      <Chip
                                        label='Instanced'
                                        size='small'
                                        sx={{
                                          height: "20px",
                                          fontSize: "11px",
                                          backgroundColor: "#607d8b",
                                          color: "white",
                                          fontWeight: "bold",
                                          marginLeft: "8px",
                                        }}
                                      />
                                    )}

                                    {isOptional && (
                                      <Chip
                                        label='Optional'
                                        size='small'
                                        sx={{
                                          height: "20px",
                                          fontSize: "11px",
                                          backgroundColor: "#ff9800",
                                          color: "white",
                                          fontWeight: "bold",
                                          marginLeft: "8px",
                                        }}
                                      />
                                    )}

                                    {isObjective && (
                                      <Chip
                                        label='Objective'
                                        size='small'
                                        sx={{
                                          height: "20px",
                                          fontSize: "11px",
                                          backgroundColor: "#9c27b0",
                                          color: "white",
                                          fontWeight: "bold",
                                          marginLeft: "8px",
                                        }}
                                      />
                                    )}

                                    {isSelectionBased && (
                                      <Chip
                                        label='Selection-Based'
                                        size='small'
                                        sx={{
                                          height: "20px",
                                          fontSize: "11px",
                                          backgroundColor: "#0288d1",
                                          color: "white",
                                          fontWeight: "bold",
                                          marginLeft: "8px",
                                        }}
                                      />
                                    )}

                                    {/* Right-side actions */}
                                    <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "4px" }}>
                                      {!isInstance && !hasInstances && !isDisabled && (
                                        <Tooltip title='Create Instances'>
                                          <IconButton
                                            size='small'
                                            onClick={() => handleOpenInstanceDialog(familyKey, compUUID, compValue.cc_id, compValue.iteration_id)}>
                                            <ContentCopyIcon sx={{ fontSize: "1rem", color: primary }} />
                                          </IconButton>
                                        </Tooltip>
                                      )}

                                      {isInstance && !isDisabled && (
                                        <Tooltip title='Delete All Instances'>
                                          <IconButton size='small' onClick={() => handleOpenDeleteDialog(familyKey, compUUID)}>
                                            <DeleteOutlineIcon sx={{ fontSize: "1rem", color: "#d32f2f" }} />
                                          </IconButton>
                                        </Tooltip>
                                      )}

                                      {isToggleable && !hasInstances && (
                                        <Tooltip title={manualEnabled ? "Disable" : "Enable"}>
                                          <Switch
                                            size='small'
                                            checked={manualEnabled}
                                            onChange={() => toggleComponentEnabled(familyKey, compUUID, manualEnabled)}
                                          />
                                        </Tooltip>
                                      )}
                                    </div>
                                  </div>
                                </CardBody>
                              </Card>
                            </Tooltip>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      </SingleAccordion>

      {/* SAR Sections */}
      <SingleAccordion title='Security Assurance Requirements'>
        <div className='p-4 space-y-3'>{renderSARs()}</div>
      </SingleAccordion>

      {/* Instance Creation Dialog */}
      <Dialog open={instanceDialog.open} onClose={() => setInstanceDialog({ open: false, familyKey: null, compUUID: null })}>
        <DialogTitle>Create SFR Instances</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ marginBottom: "16px", color: "black" }}>
            This will create two instances of the SFR and disable the original. Provide names for each instance.
          </DialogContentText>
          <TextField
            autoFocus
            fullWidth
            label='Instance 1 Name'
            value={instanceNames[0]}
            onChange={(e) => setInstanceNames([e.target.value, instanceNames[1]])}
            sx={{ marginBottom: "12px" }}
            size='small'
          />
          <TextField
            fullWidth
            label='Instance 2 Name'
            value={instanceNames[1]}
            onChange={(e) => setInstanceNames([instanceNames[0], e.target.value])}
            size='small'
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInstanceDialog({ open: false, familyKey: null, compUUID: null })} size='small'>
            Cancel
          </Button>
          <Button onClick={handleCreateInstances} variant='contained' size='small' disabled={!instanceNames[0].trim() || !instanceNames[1].trim()}>
            Create Instances
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Instances Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, familyKey: null, compUUID: null })}>
        <DialogTitle>Delete All Instances</DialogTitle>
        <DialogContent>
          <DialogContentText>
            An SFR must have at least 2 instances. Are you sure you want to delete ALL instances? This will re-enable the original SFR.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, familyKey: null, compUUID: null })}>Cancel</Button>
          <Button onClick={handleDeleteInstances} variant='contained' color='error'>
            Delete All Instances
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default Requirements;
