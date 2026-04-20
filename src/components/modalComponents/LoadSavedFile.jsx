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
import store from "../../app/store.js";
import { useDispatch } from "react-redux";
import { Card, CardFooter } from "@material-tailwind/react";
import { Button } from "@mui/material";
import { handleSnackBarSuccess, handleSnackBarError } from "../../utils/securityComponents.jsx";
import { deepCopy } from "../../utils/deepCopy.js";
import { UPDATE_SFR_COMPONENT_ITEMS } from "../../reducers/SFRs/sfrSectionSlice.js";
import {
  SET_SELECTED_PP,
  SET_SELECTED_PACKAGES,
  SET_SELECTED_MODULES,
  SET_SELECTED_PLATFORMS,
  SET_SHOW_REQUIREMENTS,
} from "../../reducers/accordionPaneSlice.js";
import { normalizeComponentId, findActionKey } from "../../utils/saveLoadUtils.js";
import { BASE_PPS, PACKAGES, MODULES } from "../../utils/ppData.js";
import Modal from "./Modal";

// Build lookup map of packages/mods for selection + loading
function buildValueMap(jsonMap, type) {
  const result = {};

  Object.entries(jsonMap).forEach(([key, json], idx) => {
    const meta = json?.accordionPane?.metadata;
    if (!meta) return;

    const name = type === "module" ? meta.xmlTagMeta?.attributes?.name : meta.ppName;
    const value = `${(name || "").replace(/\s+/g, "_")}_${meta.version}`;
    const short = meta.xmlTagMeta?.attributes?.short?.toUpperCase();
    const suffix = short ? ` (${short})` : "";
    const label = type === "module" ? `${name} ${meta.version}${suffix}` : `${meta.ppName} ${meta.version}${suffix}`;

    result[value] = {
      id: `${type}-${idx + 1}`,
      value,
      label,
      type,
      pkgJson: json,
      key,
    };
  });

  return result;
}

const PACKAGE_VALUE_MAP = buildValueMap(PACKAGES, "package");
const MODULE_VALUE_MAP = buildValueMap(MODULES, "module");

function LoadSavedFile({ open, handleOpen }) {
  LoadSavedFile.propTypes = {
    open: PropTypes.bool,
    handleOpen: PropTypes.func,
  };

  const dispatch = useDispatch();

  // Finds the key for the selectable/assignment using the PP identifier and selectable ID
  const findSelectable = (actions, ppIdentifier, selId, type) => {
    const baseKey = `${ppIdentifier}:${selId}`;
    return findActionKey(actions, baseKey, type);
  };

  // Find the key for a selectable group using the PP identifier, component ID, and group ID
  const findGroup = (actions, ppIdentifier, compId, groupId) => {
    const baseKey = `${ppIdentifier}:${compId}:${groupId}`;
    return findActionKey(actions, baseKey, "group");
  };

  // Apply saved selection and assignment values to the current sfrSections state
  const applySelections = (actions, ppIdentifier) => {
    const freshState = store.getState();
    const freshSfrSections = freshState?.sfrSections || {};

    Object.entries(freshSfrSections).forEach(([sfrUUID, family]) => {
      Object.entries(family || {}).forEach(([componentUUID, component]) => {
        try {
          const compId = normalizeComponentId(component);
          const updatedElements = deepCopy(component?.elements || {});
          let componentChanged = false;

          Object.entries(updatedElements).forEach(([elementUUID, element]) => {
            const selectables = element?.selectables || {};

            Object.entries(selectables).forEach(([selectableUUID, sel]) => {
              const selId = sel.id !== undefined && sel.id !== null ? sel.id : sel.uuid ? sel.uuid : String(selectableUUID);

              const actionKey = findSelectable(actions, ppIdentifier, selId, sel.assignment ? "assignment" : "selectable");

              if (!actionKey) return;

              const entry = actions[actionKey] || {};
              const nextChecked = Boolean(entry.checked);
              const nextContent = entry.content || "";

              if (sel.assignment) {
                if (updatedElements[elementUUID].selectables[selectableUUID].assignment_text !== nextContent) {
                  updatedElements[elementUUID].selectables[selectableUUID].assignment_text = nextContent;
                  componentChanged = true;
                }

                const checkedValue = nextContent ? false : nextChecked;
                if (updatedElements[elementUUID].selectables[selectableUUID].checked !== checkedValue) {
                  updatedElements[elementUUID].selectables[selectableUUID].checked = checkedValue;
                  componentChanged = true;
                }
              } else {
                if (updatedElements[elementUUID].selectables[selectableUUID].checked !== nextChecked) {
                  updatedElements[elementUUID].selectables[selectableUUID].checked = nextChecked;
                  componentChanged = true;
                }
              }
            });

            const groups = element?.selectableGroups || {};
            Object.entries(groups).forEach(([groupId, group]) => {
              const actionKey = findGroup(actions, ppIdentifier, compId, groupId);
              if (!actionKey) return;

              const entry = actions[actionKey] || {};
              const nextChecked = Boolean(entry.checked);

              if (updatedElements[elementUUID].selectableGroups[groupId]?.checked !== nextChecked) {
                updatedElements[elementUUID].selectableGroups[groupId] = {
                  ...updatedElements[elementUUID].selectableGroups[groupId],
                  checked: nextChecked,
                };
                componentChanged = true;
              }
            });
          });

          if (componentChanged) {
            dispatch(
              UPDATE_SFR_COMPONENT_ITEMS({
                sfrUUID,
                uuid: componentUUID,
                itemMap: { elements: updatedElements },
              })
            );
          }
        } catch (e) {
          console.log(e);
        }
      });
    });
  };

  const handleUploadFile = (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onerror = () => {
      handleSnackBarError(`Failed to read file ${file.name}`);
    };

    reader.onload = () => {
      try {
        const payload = JSON.parse(reader.result);

        if (!payload || typeof payload !== "object" || !payload.actions || typeof payload.actions !== "object") {
          throw new Error("Invalid progress file format. Expected { selections, actions }.");
        }

        const { actions } = payload;
        const {
          selectedPP: ppRef,
          selectedPackages: pkgRefs = [],
          selectedModules: modRefs = [],
          selectedPlatforms: savedPlatforms = [],
        } = payload.selections || {};

        const selectedPP = BASE_PPS[ppRef] || null;
        if (!selectedPP) {
          throw new Error(`Could not find Base PP for "${ppRef}".`);
        }

        const selectedPackages = (pkgRefs || [])
          .map((p) => {
            if (typeof p === "string") return PACKAGE_VALUE_MAP[p] || null;
            return PACKAGE_VALUE_MAP[p?.value] || null;
          })
          .filter(Boolean);

        const selectedModules = (modRefs || [])
          .map((m) => {
            if (typeof m === "string") return MODULE_VALUE_MAP[m] || null;
            return MODULE_VALUE_MAP[m?.value] || null;
          })
          .filter(Boolean);

        dispatch(SET_SELECTED_PP(selectedPP));
        dispatch(SET_SELECTED_PACKAGES(selectedPackages));
        dispatch(SET_SELECTED_MODULES(selectedModules));
        dispatch(SET_SHOW_REQUIREMENTS(true));

        const ppAccMeta = selectedPP?.accordionPane?.metadata;
        const ppShort = ppAccMeta?.xmlTagMeta?.attributes?.short || null;
        const ppName = ppAccMeta?.ppName || null;

        let ppIdentifier = ppShort || ppName || "app";
        ppIdentifier = String(ppIdentifier).toLowerCase().trim().replace(/\s+/g, "_");

        // Let ContentPane's useEffect regenerate sfrSections first, then apply saved actions
        setTimeout(() => {
          try {
            dispatch(SET_SELECTED_PLATFORMS(savedPlatforms || []));
            applySelections(actions, ppIdentifier);
            handleSnackBarSuccess(`Loaded progress from ${file.name}`);
            handleOpen();
          } catch (err) {
            console.error(err);
            handleSnackBarError(err.message || err);
          }
        }, 0);
      } catch (err) {
        console.error(err);
        handleSnackBarError(err.message || err);
      }
    };

    reader.readAsText(file);
  };

  // Return Method
  return (
    <div>
      <Modal
        title={"Load File"}
        content={
          <div className='w-screen-md'>
            <Card className='rounded-lg border-2 border-gray-200'>
              <CardFooter>
                <div className='flex gap-2'>
                  <Button
                    sx={{ fontSize: "12px" }}
                    component='label'
                    variant='contained'
                    color='secondary'
                    style={{ color: "white", marginTop: "0px", marginBottom: "5px" }}>
                    <input type='file' accept='.json,application/json' hidden onChange={handleUploadFile} />
                    Select a Saved File
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

export default LoadSavedFile;
