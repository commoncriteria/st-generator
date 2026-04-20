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

import { useSelector } from "react-redux";
import { useMemo } from "react";
import { Card, CardBody } from "@material-tailwind/react";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HighlightOff from "@mui/icons-material/HighlightOff";
import { deepCopy } from "../../utils/deepCopy.js";
import { buildParentMap } from "../editorComponents/securityComponents/sfrComponents/sfrElement/SfrElement.jsx";
import { buildTitleGroups, openSTWorkSheet, getSelectionDependencyInfo, buildSelectableLookup } from "./Requirements.jsx";

/**
 * validateSelections
 *
 * Recursive function
 *
 * Validate a map of selection groups and their child status entries.
 * This function walks the provided `dict` (which maps selection group keys
 * to arrays of status objects produced by `checkSelections`) and applies
 * validation rules to determine whether the overall selections are valid.
 *
 * Parameters:
 * @param {Object} dict - A mapping from selectionKey -> Array<status objects>.
 *   Each status object can contain flags such as isParent, isAChildSelectable,
 *   parent, theChild, selected, titleSelectionRootParent, etc. These objects are created
 *   by checkSelections and represent the relationship and selection state of
 *   groups and selectables.
 * @param {Object} selectableGroups - The selectableGroups map from the element
 *   data model. Used to determine whether a referenced uuid is a nested group
 *   (parent) or a leaf selectable.
 *
 * Returns:
 * @returns {boolean} true if all rules pass, false if any required selectable
 *   is missing/invalid according to the implemented rules.
 */
export function validateSelections(dict, selectableGroups) {
  const visited = new Set();

  //helper function to ensure at least one child checkbox is selected
  function atLeastOneChildrenSelected(map, key) {
    try {
      const arr = map?.[key];
      if (!Array.isArray(arr)) return false;

      // prefer non-assignment selectables when present
      const nonAssignmentSelectables = arr.filter((x) => x?.assignment === false);
      const assignmentSelectables = arr.filter((x) => x?.assignment === true);

      if (nonAssignmentSelectables.length > 0) {
        // At least one non-assignment is selected -> valid
        if (nonAssignmentSelectables.some((x) => x?.selected === true)) return true;
        // No non-assignment selected —> check if any assignment sibling is selected
        // (checkbox with just an assignment counts as a valid selection)
        if (assignmentSelectables.some((x) => x?.selected === true)) return true;
        return false;
      }

      // otherwise if multiple assignment selectables exist and there are NO
      // non-assignment selectables, require ALL assignment selectables to be
      if (assignmentSelectables.length === 0) return true; // no non-assignment selectables —> fall back to assignment selectables
      return assignmentSelectables.every((x) => x?.selected === true);
    } catch (err) {
      console.error("atLeastOneChildrenSelected error:", err, { key });
      return false;
    }
  }

  // recursive validation function, takes the parent/group key
  const validateKey = (key) => {
    if (!dict || !dict[key]) return true;
    if (visited.has(key)) return true; // prevent loops
    visited.add(key);

    const items = dict[key];
    // Track whether the parent of this group (when used as a grouping parent)
    // is selected
    let groupParentSelected = false;
    let atLeastOneChildren = atLeastOneChildrenSelected(dict, key);
    for (const item of items) {
      // Rule: for the titleSelectionRootParent key, ignore any "isParent" entries in its array
      let parentSelected = false;

      // Rule: any selectable checkbox/inline-checkbox item must be selected
      let parentKey = item?.parent || "empty_key";
      if ((key || parentKey) === item?.titleSelectionRootParent) {
        //if parent or currentkey is rootParent default to selected is true
        parentSelected = true;
      } else {
        parentSelected = isSelectableSelected(selectableGroups?.[parentKey]);
      }

      // need to find the group selection since a child can have unchecked parents, aka group
      if (item?.parentIsSelected && key.includes("group")) {
        groupParentSelected = true;
      }

      const parentOrGroupSelected = Boolean(parentSelected || groupParentSelected);

      // if parent is selected and at least ONE child is not
      if (!atLeastOneChildren && parentOrGroupSelected) {
        return false;
      }

      // if child is selected but neither its parent nor the grouping parent
      // is selected, that's invalid.
      if ((item?.isAChildSelectable || item?.groupInLineCheckBox) && item?.selected === true && !parentOrGroupSelected) {
        return false;
      }

      //handling assignments
      if (item?.isAChildSelectable && item?.assignment === true && item?.selected !== true && parentOrGroupSelected) {
        // If a non-assignment sibling in the same group is selected, this assignment is optional.
        // Count both isAChildSelectable siblings AND isParent siblings (selectableGroups) as valid
        // non-assignment selections
        const siblings = dict?.[key] || [];
        // Count isAChildSelectable and isParent siblings as valid non-assignment selections.
        // Do NOT count groupInLineCheckBox — that represents the parent group's own checked
        // state, not a sibling selection. If a group only contains an assignment, the
        // assignment must be filled even when the group checkbox is checked.
        const nonAssignmentSiblingSelected = siblings.some(
          (s) => s?.assignment === false && s?.selected === true && (s?.isAChildSelectable === true || s?.isParent === true)
        );
        if (!nonAssignmentSiblingSelected) {
          return false;
        }
      }

      // Rule: if this item is a parent and selected, then its child group must validate too
      if (item?.isParent && item?.selected === true) {
        const childKey = item?.theChild;
        if (!validateKey(childKey)) return false;
      }
    }

    return true;
  };

  for (const key of Object.keys(dict || {})) {
    const ok = validateKey(key);
    if (!ok) {
      return false; // immediately exits validateSelections and stops the loop
    }
  }

  return true;
}

/**
 * isSelectableSelected
 *
 * Determine whether a selectable (or group-like object) should be considered
 * "selected" for validation purposes. This abstracts the different ways a
 * selectable can be marked as chosen:
 * - For assignment-style selectables (sel.assignment === true) the presence
 *   of non-empty assignment_text indicates selection.
 * - For normal selectables the checked boolean is used.
 *
 * Parameters:
 * @param {Object} sel - The selectable object to test. May be undefined/null.
 *
 * Returns:
 * @returns {boolean} true when the selectable is considered selected, false
 *   otherwise.
 */
export function isSelectableSelected(sel) {
  if (!sel) return false;
  if (sel.assignment) {
    // Assignments are validated solely by whether assignment_text is filled.
    // The checked field on an assignment is a UI-only affordance used to
    // enable/disable the textarea and does not affect validity.
    return Boolean(sel.assignment_text && String(sel.assignment_text).trim() !== "");
  }
  return Boolean(sel.checked);
}

/**
 * checkTitlesAndGroups
 *
 * Given the parsed title array for an element and the selectable maps, build
 * a structure of checked/parent relationships and validate whether the
 * selections meet the required rules.
 *
 * Parameters:
 * @param {Array} titleArray - The "title" structure for an element. When
 *   the title is an array it may contain entries that reference selectables
 *   via `assignment` or `selections` fields.
 * @param {Object} selectableGroups - Map of group uuid -> group object.
 * @param {Object} selectables - Map of selectable uuid -> selectable object.
 * @param {Object} parentMap - map of parents for element, from buildParentMap
 *
 * Returns:
 * @returns {boolean} true when the title's selections are valid, false
 *
 */
export function checkTitlesAndGroups(titleArray, selectableGroups, selectables, parentMap) {
  let checkedList = {};

  titleArray.map((t, i) => {
    if (t.assignment) {
      // not part of a group
      const assignable = selectables?.[t.assignment];
      const validAssignment = isSelectableSelected(assignable);

      // If this assignment has a controlling parent in parentMap
      // (e.g. nested inside a selectable via nestedGroups), only
      // require it when that parent is checked
      const controllingParentKey = parentMap?.[t.assignment];
      const controllingParent = controllingParentKey ? selectables?.[controllingParentKey] || selectableGroups?.[controllingParentKey] : null;
      const parentIsSelected = controllingParent ? isSelectableSelected(controllingParent) : true; // no parent = standalone assignment, always required

      const parentStatus = {
        parent: t.assignment,
        parentFromMap: controllingParentKey || null,
        parentIsSelected: parentIsSelected,
        titleSelectionRootParent: t.assignment,
      };
      let assignmentStatus = {
        isAChildSelectable: true,
        selected: validAssignment,
        assignment: true,
        parent: null,
        uuid: t.assignment,
        theChild: t.assignment,
        desc: assignable.description,
        titleSelectionRootParent: t.assignment,
        parentFrom: controllingParentKey || null,
        parentIsSelected: parentIsSelected,
      };
      (checkedList[t.assignment] ??= []).push(parentStatus);
      (checkedList[t.assignment] ??= []).push(assignmentStatus);
    }

    if (t.selections) {
      // part of a group
      // t.selections will be the titleSelectionRootParent always
      // so we always know what the root parent is from any node
      const res = checkSelections(t.selections, selectableGroups, selectables, checkedList, t.selections, parentMap);
      // since there can be more then one selection in the loop
      // append result to checkedList
      if (res && res !== checkedList) {
        for (const [key, arr] of Object.entries(res)) {
          if (!checkedList[key]) {
            checkedList[key] = arr;
          } else {
            checkedList[key] = checkedList[key].concat(arr);
          }
        }
      }
    }
  });

  let validated = validateSelections(checkedList, selectableGroups);
  if (validated) {
    return true;
  } else {
    return false;
  }
}

/**
 * checkSelections
 *
 * Walk a selectable group (identified by selectionKey) and populate an
 * accumulated `checkedList` structure describing the relationships between
 * parents and their child selectables/groups and whether each is selected.
 * This function is recursive and will call itself for nested groups.
 *
 * Parameters:
 * @param {string} selectionKey - The uuid/key of the selectable group to
 *   inspect in selectableGroups.
 * @param {Object} selectableGroups - Map of group uuid -> group object.
 * @param {Object} selectables - Map of selectable uuid -> selectable object.
 * @param {Object} checkedList - Accumulator object (map) that will be
 *   populated with arrays of status objects keyed by selection/group uuids.
 *   This function mutates and also returns the checkedList.
 * @param {string} titleSelectionRootParent - The top-level parent key this traversal
 *   originated from; used to apply special rules during validation.
 * @param {Object} parentMap - map of parents for element, from buildParentMap
 *
 * Returns:
 * @returns {Object|null} the updated checkedList, or null when the group for
 *   selectionKey was not found.
 */
export function checkSelections(selectionKey, selectableGroups, selectables, checkedList, titleSelectionRootParent, parentMap) {
  const group = selectableGroups?.[selectionKey];

  if (!group) return null;

  /**
   * Helper to get parent selectable/group for a given child key from a parentMap.
   * Returns the parent key
   * @param {string} childKey - the child key to look up
   * @param {Object} map - optional parentMap, defaults to parentMap
   * @returns {string|null}
   */
  const parentFromMap = (childKey, map) => {
    try {
      // Validate map
      if (!map || typeof map !== "object") return null;

      // Validate childKey
      if (childKey === null || childKey === undefined || childKey === "") return null;

      // Return parent if it exists on the map
      if (Object.prototype.hasOwnProperty.call(map, childKey)) {
        return map[childKey];
      }

      // Not found
      return null;
    } catch (e) {
      console.error("parentFromMap error:", e);
      return null;
    }
  };

  // Helper to build the pair of status objects
  // Returns an object with `itemStatus` (the parent's view of
  // the child) and `parentStatus` (the child's view of its parent).
  const parentStatuses = (parentKey, childUuid) => {
    const childGroup = selectableGroups?.[childUuid] || {};

    // For flat groups with no checked field of their own, derive selected state
    // from whether the group itself is checked OR any child is selected.
    let checkSelectable = isSelectableSelected(childGroup);
    if (!checkSelectable && !childGroup.checked && Array.isArray(childGroup.groups)) {
      checkSelectable = childGroup.groups.some((uid) => {
        if (selectables?.[uid]) {
          return isSelectableSelected(selectables[uid]);
        }
        if (selectableGroups?.[uid]) {
          return isSelectableSelected(selectableGroups[uid]);
        }
        return false;
      });
    }

    const checkParent = isSelectableSelected(selectableGroups?.[parentKey] || {});
    const parentFrom = parentFromMap(parentKey, parentMap);
    const itemStatus = {
      isParent: true,
      uuid: childUuid,
      theChild: childUuid,
      assignment: false,
      selected: checkSelectable,
      titleSelectionRootParent: titleSelectionRootParent,
    };

    const parent = parentKey || titleSelectionRootParent;
    let parentIsSelected = false;
    if (parent === titleSelectionRootParent) {
      parentIsSelected = true;
    } else {
      parentIsSelected = checkParent;
    }

    const parentStatus = {
      parent: parent,
      parentFromMap: parentFrom,
      parentIsSelected: parentIsSelected,
      titleSelectionRootParent: titleSelectionRootParent,
    };
    if (parent === titleSelectionRootParent) {
      (checkedList[titleSelectionRootParent] ??= []).push(parentStatus);
    }

    return { itemStatus, parentStatus };
  };

  // Helper to build a status object for a selectable child item.
  // Assumes both assignment and nonassignment are selectables
  // Parameters:
  // - childUuid: the selectable's uuid
  // - sel: the selectable object
  // - titleSelectionRootParent: the top-level parent for validation rules
  // - info: optional info string to describe this status
  // - parentMap: map used by parentFromMap to determine the parent attribute
  const selectableStatus = (childUuid, selectionKey, sel, titleSelectionRootParent, info = "", parentMap) => {
    const parentFrom = parentFromMap(childUuid, parentMap);
    const selected = isSelectableSelected(sel);
    const assignment = Boolean(sel?.assignment);
    const checkParent = isSelectableSelected(selectableGroups?.[selectionKey] || {});

    const parent = selectionKey || titleSelectionRootParent;
    let parentIsSelected = false;
    if (parent === titleSelectionRootParent) {
      parentIsSelected = true;
    } else {
      parentIsSelected = checkParent;
    }
    return {
      isAChildSelectable: true,
      selected: selected,
      assignment: assignment,
      parent: selectionKey,
      uuid: childUuid,
      theChild: childUuid,
      desc: info,
      titleSelectionRootParent: titleSelectionRootParent,
      parentFrom: parentFrom,
      parentIsSelected: parentIsSelected,
    };
  };

  // Handle complex selectable
  if (Array.isArray(group.description)) {
    let foundFirstText = false;

    for (let i = 0; i < group.description.length; i++) {
      const d = group.description[i];

      if (!foundFirstText && typeof d?.text === "string" && d.text.length > 0) {
        foundFirstText = true;
        continue;
      }

      if (foundFirstText) {
        // Groups after the first text
        if (Array.isArray(d?.groups)) {
          for (const uuid of d.groups) {
            if (selectables?.[uuid]) {
              const sel = selectables[uuid];
              const status = selectableStatus(
                uuid,
                selectionKey,
                sel,
                titleSelectionRootParent,
                sel.description || "validSelGroup groups after first text",
                parentMap
              );
              (checkedList[selectionKey] ??= []).push(status);
            } else if (selectableGroups?.[uuid]) {
              // Nested group
              const { itemStatus, parentStatus } = parentStatuses(selectionKey, uuid);
              (checkedList[uuid] ??= []).push(parentStatus);
              (checkedList[selectionKey] ??= []).push(itemStatus);
              checkSelections(uuid, selectableGroups, selectables, checkedList, titleSelectionRootParent);
            }
          }
        }
      } else {
        // check parents and children of d.groups
        if (Array.isArray(d?.groups)) {
          for (const uuid of d.groups) {
            if (selectableGroups?.[uuid]) {
              const { itemStatus, parentStatus } = parentStatuses(selectionKey, uuid);
              (checkedList[uuid] ??= []).push(parentStatus);
              (checkedList[selectionKey] ??= []).push(itemStatus);
              checkSelections(uuid, selectableGroups, selectables, checkedList, titleSelectionRootParent);
            } else if (selectables?.[uuid]) {
              const sel = selectables[uuid];
              const status = selectableStatus(uuid, selectionKey, sel, titleSelectionRootParent, sel.description || "group child", parentMap);
              (checkedList[selectionKey] ??= []).push(status);
            }
          }
        }
      }
    }

    // for checkboxes that have inline assignment text
    // e.g. sel_plat_sto or "fcs_sto_ext.1.1_2" in FCS_STO_EXT.1
    let validInline = isSelectableSelected(group);
    let status = {
      parent: selectionKey,
      assignment: false,
      groupInLineCheckBox: true,
      selected: validInline,
      titleSelectionRootParent: titleSelectionRootParent,
    };
    (checkedList[selectionKey] ??= []).push(status);
    return checkedList;
  }

  if (Array.isArray(group.groups) && group.groups.length > 0) {
    // Handle selectables groups
    group.groups.forEach((uuid, idx) => {
      if (selectableGroups?.[uuid]) {
        const { itemStatus, parentStatus } = parentStatuses(selectionKey, uuid);
        (checkedList[uuid] ??= []).push(parentStatus);
        (checkedList[selectionKey] ??= []).push(itemStatus);
        checkSelections(uuid, selectableGroups, selectables, checkedList, titleSelectionRootParent);
      } else if (selectables?.[uuid]) {
        const sel = selectables[uuid];
        const status = selectableStatus(uuid, selectionKey, sel, titleSelectionRootParent, sel.description || "validSelGroup selectables groups", parentMap);
        (checkedList[selectionKey] ??= []).push(status);
      }
    });
  }

  return checkedList;
}

function Validator() {
  const { primary, secondary } = useSelector((state) => state.styling);
  const sfrs = useSelector((state) => state.sfrs);
  const sfrSections = useSelector((state) => state.sfrSections);
  const sfrBasePPs = useSelector((state) => state.sfrBasePPs);

  // Build families grouped by title (memoized to avoid recalculating on every render)
  const titleGroups = useMemo(() => buildTitleGroups(sfrSections, sfrs, sfrBasePPs), [sfrSections, sfrs, sfrBasePPs]);

  // Build selectable lookup (byUUID/byID) so dependency checks can resolve references
  const selectableLookup = useMemo(() => buildSelectableLookup(sfrSections), [sfrSections]);

  /**
   * StatusIcon
   *
   * Small presentational helper that shows a green check when `complete` is
   * truthy and a red X when falsy. Uses styling colors from the Redux
   * styling slice.
   */
  const StatusIcon = ({ complete }) =>
    complete ? <CheckCircleIcon fontSize='small' htmlColor={secondary} /> : <HighlightOff fontSize='small' htmlColor={primary} />;

  // Build the valid list from the sfrSections structure.
  // This helper will iterate every element
  // found in sfrSections to determine if valid
  const getValidSelectables = () => {
    const validList = {};

    if (!titleGroups) return validList;
    // Iterate titleGroups -> families -> components -> elements
    titleGroups.forEach((group) => {
      group.families.forEach(({ familyKey, components }) => {
        if (!components || Object.entries(components).length === 0) return;
        Object.entries(components).forEach(([compUUID, component]) => {
          const elements = deepCopy((component && component.elements) || {});
          if (!elements || Object.entries(elements).length === 0) return;
          const isOptional = component.optional;
          const isObjective = component.objective;
          const isSelectionBased = component.selectionBased;
          const isToggleable = isOptional || isObjective;
          const hasInstances = Array.isArray(component.instances) && component.instances.length > 0;

          // Determine enabled state
          const manualEnabled = component.enabled ?? false;
          const selectionInfo = isSelectionBased ? getSelectionDependencyInfo(component.selections, selectableLookup) : { met: false, sources: [] };
          const autoEnabled = isSelectionBased && selectionInfo.met;
          const isDisabled = hasInstances || ((isToggleable || isSelectionBased) && !(manualEnabled || autoEnabled));

          Object.entries(elements).forEach(([uuid, element]) => {
            let parentMap = buildParentMap(element);
            let elementValid = false;
            try {
              if (Array.isArray(element.title)) {
                elementValid = checkTitlesAndGroups(element.title, element.selectableGroups, element.selectables, parentMap || {});
              }
            } catch (e) {
              console.log("error");
              console.log(e);
              elementValid = false;
            }
            const instanceName = component?.instanceName || "";
            const uniqueId = `${component.cc_id}${component.iteration_id ? "/" + component.iteration_id : ""} ${instanceName}`;

            const title = `${uniqueId} ${component.title}`;
            validList[uniqueId] = validList[uniqueId] || {
              familyKey: familyKey,
              compUUID: compUUID,
              isDisabled: isDisabled,
              title: title,
              id: component.cc_id,
              elementsToValidate: [],
              validationChecks: [],
              valid: false,
            };

            validList[uniqueId].validationChecks.push(elementValid);
            validList[uniqueId].elementsToValidate.push({ [element.elementXMLID]: elementValid, uuid: uuid, id: element.elementXMLID });

            validList[uniqueId].valid = !validList[uniqueId].validationChecks.includes(false);
          });
        });
      });
    });

    return validList;
  };

  const validList = getValidSelectables(sfrSections);
  // Transform validList into the items array the UI expects
  // Sort the element keys alphabetically
  const elementNames = Object.keys(validList || {}).sort((a, b) => a.localeCompare(b));
  const total = elementNames.length;

  // Count enabled (not disabled) items and their completion status
  const enabledCount = elementNames.filter((n) => !validList[n].isDisabled).length;
  const enabledCompleted = elementNames.filter((n) => !validList[n].isDisabled && validList[n].valid).length;
  const enabledIncomplete = enabledCount - enabledCompleted;

  const items = [];

  // Per-element items
  elementNames.forEach((name) => {
    const valid = !!validList[name].valid;
    const title = validList[name].title;
    const id = validList[name].id;
    const familyKey = validList[name].familyKey;
    const compUUID = validList[name].compUUID;
    const isDisabled = validList[name].isDisabled;

    // include the element id so we can link to the element in the UI
    // also include the section and component uuids so the UI can open the
    // ST worksheet for this component when the list item is clicked
    items.push({ text: `${title} is ${valid ? "complete" : "incomplete"}`, isDisabled: isDisabled, complete: valid, id: id, familyKey, compUUID });
  });

  // Fallback when no elements
  if (total === 0) {
    items.length = 0;
    items.push({ text: "No elements found.", complete: true });
  }

  return (
    <Card className='h-screen min-w-full rounded-lg border-2 border-gray-300 p-1 mb-4 overflow-auto'>
      <CardBody className='min-h-screen min-w-full m-0 p-0'>
        <Typography variant='h6' sx={{ ml: 2 }}>
          Validation Summary
        </Typography>

        <Typography variant='subtitle1' sx={{ ml: 2, fontWeight: "bold", mb: 0, color: secondary }}>
          {`${enabledCount} SFRs enabled out of ${total} SFRs`}
        </Typography>
        <Typography variant='subtitle1' sx={{ ml: 2, fontWeight: "bold", mt: 0, mb: 1, color: secondary }}>
          {`${enabledCompleted} SFRs completed, ${enabledIncomplete} incomplete.`}
        </Typography>

        <List dense>
          {items.map((item, idx) => (
            <ListItem
              key={idx}
              onClick={() => item.familyKey && item.compUUID && !item.isDisabled && openSTWorkSheet(item.familyKey, item.compUUID, sfrSections)}
              sx={{ cursor: item.familyKey && item.compUUID && !item.isDisabled ? "pointer" : "default" }}
              style={{ display: item.isDisabled ? "none" : "flex" }}>
              <ListItemIcon sx={{ minWidth: 25 }}>
                <StatusIcon complete={item.complete} />
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItem>
          ))}
        </List>
      </CardBody>
    </Card>
  );
}

export default Validator;
