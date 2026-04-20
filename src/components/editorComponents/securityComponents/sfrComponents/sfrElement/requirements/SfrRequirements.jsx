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
import store from "../../../../../../app/store.js";
import PropTypes from "prop-types";
import { useSelector } from "react-redux";
import React, { useEffect, useState } from "react";
import { FormControlLabel, Checkbox, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button, Typography, Tooltip } from "@mui/material";
import { handleSnackBarError, handleSnackBarSuccess } from "../../../../../../utils/securityComponents.jsx";
import {
  UPDATE_SFR_SELECTABLE,
  UPDATE_SELECTABLE_GROUP_CHECKED,
  UPDATE_SFR_SELECTION_WITH_GROUP_RULES,
} from "../../../../../../reducers/SFRs/sfrWorksheetUI.js";
import CardTemplate from "../../../CardTemplate.jsx";

/**
 * The SfrRequirements class that displays the requirements per sfr element
 * @returns {JSX.Element} the content
 * @constructor passes in props to the class
 */
function SfrRequirements(props) {
  // Prop Validation
  SfrRequirements.propTypes = {
    requirementType: PropTypes.string.isRequired,
    element: PropTypes.object,
    parentMap: PropTypes.object,
  };

  // Constants
  const { componentUUID, elementUUID } = useSelector((state) => state.sfrWorksheetUI);
  const { primary, secondary, requirementsStyling } = useSelector((state) => state.styling);
  const [styling, setStyling] = useState(requirementsStyling.title);
  const [mfDialog, setMfDialog] = useState({ open: false, row: null, rowIdx: null });

  const { element = {}, parentMap = {} } = props;

  // Warning dialog for exclusive selections
  const [exclusiveDialog, setExclusiveDialog] = useState({
    open: false,
    componentUUID: null,
    elementUUID: null,
    clickedId: null,
    containingGroupId: null,
    checked: false,
    clickedType: null,
  });

  // For number validation, applies to assignment_text
  const RE_BETWEEN = /^positive integer between (\d[\d,]*) and (\d[\d,]*)$/i;
  const RE_GT = /^positive integer greater than (\d[\d,]*)$/i;
  const RE_ATLEAST = /^positive integer of (\d[\d,]*) (or|of) (greater|more)$/i; //of handles an edge case

  // For number validation, applies to assignment_text
  // Remove commas + whitespace, does not allow leading zeros
  const stripCommas = (s) => String(s).replace(/,/g, "");
  const isPosInt = (s) => /^[1-9]\d*$/.test(stripCommas(s));
  const toInt = (s) => parseInt(stripCommas(s), 10);

  // Use Effect
  useEffect(() => {
    const newStyling = getStyling(false);

    // Update styling
    if (JSON.stringify(newStyling) !== JSON.stringify(styling)) {
      setStyling(newStyling);
    }
  }, [props.requirementType]);

  /**
   * Returns whether a node is checked.
   * Parent selectable is always a selectable group
   *
   * @param {Object} currentElement
   * @param {string} nodeKey
   * @returns {boolean}
   */
  const isNodeChecked = (currentElement, nodeKey) => {
    if (!nodeKey) return true;

    const groupNode = currentElement?.selectableGroups?.[nodeKey];
    if (typeof groupNode?.checked === "boolean") {
      return groupNode.checked;
    }

    return false;
  };

  /**
   * Returns whether a node should be disabled.
   * A node is disabled if any ancestor parent in parentMap is unchecked.
   *
   * @param {Object} currentElement
   * @param {string} nodeKey
   * @param {Object} currentParentMap
   * @returns {boolean}
   */
  const isNodeDisabled = (currentElement, nodeKey, currentParentMap) => {
    let currentParent = currentParentMap?.[nodeKey];

    while (currentParent) {
      if (!isNodeChecked(currentElement, currentParent)) {
        return true;
      }
      // For selectable parents, check checked directly
      const parentSel = currentElement?.selectables?.[currentParent];
      if (parentSel && !parentSel.checked) {
        return true;
      }
      currentParent = currentParentMap?.[currentParent];
    }

    return false;
  };

  /**
   * Find the parent group of the selection made, in order to:
   *   - determine if group is onlyOne
   *   - selection is exclusive
   *   - whether sibling selections are already checked
   * @param {*} selectableGroups
   * @param {*} selectableUUID
   * @returns {string}
   */
  const findContainingGroupId = (selectableGroups, selectableUUID) => {
    for (const [groupId, group] of Object.entries(selectableGroups || {})) {
      if (Array.isArray(group?.groups) && group.groups.includes(selectableUUID)) {
        return groupId;
      }
    }
    return null;
  };

  /**
   *
   * @param {*} selectableGroups
   * @param {*} selectables
   * @param {*} groupId
   * @param {*} selectableUUID
   * @returns {Array}
   */
  const getSelectedSiblingSelectableUUIDs = (selectableGroups, selectables, groupId, clickedId) => {
    const group = selectableGroups?.[groupId];
    if (!group?.groups) return [];

    return group.groups.filter((uuid) => {
      if (uuid === clickedId) return false;
      if (selectables?.[uuid]?.checked) return true;
      if (selectableGroups?.[uuid]?.checked) return true;
      return false;
    });
  };

  // Methods
  /**
   * checkAssigmentTextRules(ruleString, valueString) -> boolean
   * For number validation, applies to assignment_text
   * Returns true if valueString satisfies the ruleString.
   */
  function checkAssigmentTextRules(ruleString, valueString) {
    const rule = String(ruleString).trim();
    const valueOk = isPosInt(valueString);

    if (!valueOk) return false;

    const v = toInt(valueString);

    let m;

    m = rule.match(RE_BETWEEN);
    if (m) {
      const min = toInt(m[1]);
      const max = toInt(m[2]);
      return v >= min && v <= max;
    }

    m = rule.match(RE_GT);
    if (m) {
      const n = toInt(m[1]);
      return v > n;
    }

    m = rule.match(RE_ATLEAST);
    if (m) {
      const min = toInt(m[1]);
      return v >= min;
    }

    // ruleString didn't match any supported pattern
    // so we let it through
    return true;
  }

  /**
   * Checks if word number, int, digit is in the textarea placeholder
   * For number validation, applies to assignment_text
   * @param event placeholder
   */
  function checkIntegerInPlaceholder(placeholder) {
    try {
      const ph = String(placeholder ?? "");
      // match number-like words
      const hasNumber = /(number|int|digit)/i.test(ph);
      // but ignore when size units are present (kb, mb, gb)
      const hasSizeUnit = /\b(?:kb|mb|gb|gigabyte|bit)\b/i.test(ph);
      return hasNumber && !hasSizeUnit;
    } catch {
      return false;
    }
  }

  /**
   * Warns on integer rules onBlur based on placeholder text:
   * - e.g. If placeholder includes exact "positive integer of 1,000 or greater"
   * - e.g. If placeholder includes exact "positive integer of 256"
   * - If placeholder contains "number"/"int"/"digit" - allows dash for negative numbers
   * @param {string} placeholder textarea placeholder
   * @param {string} value
   */
  function validateText(placeholder, value) {
    try {
      const raw = String(value ?? "");
      const ph = String(placeholder ?? "");

      if (!checkIntegerInPlaceholder(ph)) {
        return "";
      }

      const trimmed = String(raw).trim();
      // Allow empty values (user may clear the field)
      if (trimmed === "") {
        return "";
      }
      // already valid integer
      // allows dash for negative numbers
      if (!/^-?\d+$/.test(trimmed)) {
        return "Warning: Integers are recommended for this field.";
      }

      // Exact-text min constraints
      if (!checkAssigmentTextRules(ph, trimmed)) {
        return `Warning on value of ${trimmed} -- ${ph} suggested.`;
      }
    } catch (err) {
      console.log(`Error validating assignment text: ${err}`);
    }
  }

  // Helper Methods
  /**
   * Generates the styling
   * @param innerStyling the inner styling
   * @returns {*}
   */
  const getStyling = (innerStyling) => {
    const { requirementType } = props;

    if (innerStyling) {
      return requirementType === "title" || requirementType === "crypto" ? requirementsStyling.title : requirementsStyling.other;
    } else {
      return requirementType === "title" ? requirementsStyling.title : requirementsStyling.other;
    }
  };

  const renderAssignmentTextarea = (sel, uuid, disabled, extraStyle = {}) => {
    return (
      <textarea
        key={uuid}
        rows={1}
        disabled={disabled}
        style={{
          width: "260px",
          fontSize: "0.9rem",
          padding: "2px 6px",
          borderRadius: "4px",
          border: "2px solid #777",
          resize: "none",
          display: "inline-block",
          verticalAlign: "middle",
          margin: "0 6px",
          backgroundColor: disabled ? "#f3f4f6" : "white",
          color: disabled ? "#9ca3af" : "black",
          ...extraStyle,
        }}
        value={sel.assignment_text || ""}
        placeholder={sel.description}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onChange={(e) => {
          e.stopPropagation();
          store.dispatch(
            UPDATE_SFR_SELECTABLE({
              componentUUID,
              elementUUID,
              selectableUUID: uuid,
              updateMap: { assignment_text: e.target.value },
            })
          );
        }}
        onBlur={(e) => {
          const message = validateText(sel.description, e.target.value) || "";
          handleSnackBarSuccess("Assignment text updated. " + message);
        }}
      />
    );
  };

  // Components
  /**
   * Render the selectables as checkbox groups, selectable as checkbox
   * @param {string} selectionKey
   * @param {Object} selectableGroups
   * @param {Object} selectables
   * @param {number} depth
   * @param {boolean} asBullets - when true, each child selectableGroup renders with a bullet marker
   * @returns {JSX.Element|null}
   */
  function renderSelections(selectionKey, selectableGroups, selectables, depth = 0, asBullets = false) {
    const group = selectableGroups?.[selectionKey];
    if (!group) return null;

    const children = [];

    // Handle complex selectable
    if (Array.isArray(group.description)) {
      // Build the full inline + blocked (indented) content for the checkbox label,
      // including any assignments or nested groups that follow the first text
      const labelParts = []; // elements that render inline inside the parent checkbox label (before block content starts)
      const nestedChildren = []; // elements that render below the parent checkbox, indented
      const postBlockInlineParts = []; // once block content begins, text and assignments must continue below the block content but stay inline with each other

      let blockMode = false;

      const flushPostBlockInline = (forceFlush = false) => {
        // Only flush if forced (end of loop) — otherwise hold for next group as label
        if (forceFlush && postBlockInlineParts.length > 0) {
          nestedChildren.push(
            <div key={`post-inline-${nestedChildren.length}`} style={{ marginLeft: "3.5rem", marginTop: "6px" }}>
              <span>{postBlockInlineParts.splice(0)}</span>
            </div>
          );
        }
      };

      // Returns pending postBlockInlineParts as a label prefix, then clears them
      const consumePendingLabel = () => {
        if (postBlockInlineParts.length === 0) return null;
        const nodes = [...postBlockInlineParts];
        postBlockInlineParts.length = 0;
        return <span style={{ display: "inline-flex", flexWrap: "wrap", alignItems: "baseline", gap: "4px" }}>{nodes}</span>;
      };

      group.description.forEach((part, i) => {
        // Regular text
        if (part?.text) {
          const node = <span key={`text-${i}`} dangerouslySetInnerHTML={{ __html: part.text }} />;

          if (blockMode) {
            postBlockInlineParts.push(node);
          } else {
            labelParts.push(node);
          }
        }

        // Groups
        if (Array.isArray(part?.groups)) {
          part.groups.forEach((uuid, j) => {
            // Assignment
            if (selectables?.[uuid]?.assignment) {
              const sel = selectables[uuid];
              const disabled = isNodeDisabled(element, uuid, parentMap);

              const node = <React.Fragment key={`assign-${i}-${j}`}>{renderAssignmentTextarea(sel, uuid, disabled)}</React.Fragment>;

              if (blockMode) {
                postBlockInlineParts.push(node);
              } else {
                labelParts.push(node);
              }

              return;
            }

            // Selectable checkbox
            if (selectables?.[uuid]) {
              const sel = selectables[uuid];
              const disabled = isNodeDisabled(element, uuid, parentMap);

              blockMode = true;
              const label = consumePendingLabel();
              nestedChildren.push(
                <div key={`sel-${i}-${j}`} style={{ marginLeft: "3.5rem" }}>
                  {label}
                  <FormControlLabel
                    className='preview'
                    disableTypography
                    control={
                      <Checkbox
                        checked={Boolean(sel.checked)}
                        disabled={disabled}
                        onClick={(e) => e.stopPropagation()} // for MF table, don't want to popup App notes/EA when clicking on a selection
                        onChange={(e) => {
                          e.stopPropagation();
                          handleSelectableCheckboxClick(componentUUID, elementUUID, uuid, e.target.checked);
                        }}
                      />
                    }
                    label={sel.description || sel.text}
                    sx={{
                      alignItems: "flex-start",
                      "& .MuiCheckbox-root": { paddingTop: "9px" },
                    }}
                  />
                </div>
              );

              return;
            }

            // Nested selectable group
            if (selectableGroups?.[uuid]) {
              blockMode = true;
              const label = consumePendingLabel();
              nestedChildren.push(
                <div key={`group-${i}-${j}`} style={{ marginLeft: "3.5rem" }}>
                  {label && <div style={{ marginBottom: "2px" }}>{label}</div>}
                  {renderSelections(uuid, selectableGroups, selectables, depth + 1)}
                </div>
              );

              return;
            }
          });
        }
      });

      flushPostBlockInline(true);

      const groupDisabled = isNodeDisabled(element, selectionKey, parentMap);

      return (
        <div>
          <div style={{ paddingLeft: "2rem" }}>
            {labelParts.length > 0 ? (
              <FormControlLabel
                className='preview'
                disableTypography
                control={
                  <Checkbox
                    checked={Boolean(group.checked)}
                    disabled={groupDisabled}
                    onChange={(e) => handleSelectableGroupCheckboxClick(componentUUID, elementUUID, selectionKey, e.target.checked)}
                  />
                }
                label={<span>{labelParts}</span>}
                sx={{
                  alignItems: "flex-start",
                  "& .MuiCheckbox-root": { paddingTop: "9px" },
                }}
              />
            ) : (
              <div style={{ display: "flex", alignItems: "flex-start" }}>
                <Checkbox
                  checked={Boolean(group.checked)}
                  disabled={groupDisabled}
                  onChange={(e) => handleSelectableGroupCheckboxClick(componentUUID, elementUUID, selectionKey, e.target.checked)}
                  sx={{ paddingTop: "9px" }}
                />
              </div>
            )}
          </div>

          {nestedChildren}
        </div>
      );
    }

    // Handle flat selectables groups
    if (Array.isArray(group.groups) && group.groups.length > 0) {
      group.groups.forEach((uuid, idx) => {
        if (selectableGroups?.[uuid]) {
          // asBullets: each child selectableGroup gets a bullet marker (used for top-level
          // selection groups from renderTitleParts where children are complex selectables)
          if (asBullets) {
            children.push(
              <div key={`grp-${idx}`} style={{ display: "flex", alignItems: "flex-start", margin: "2px 0" }}>
                <span style={{ marginRight: "6px", flexShrink: 0, paddingTop: "6px" }}>•</span>
                <div style={{ flex: 1, minWidth: 0 }}>{renderSelections(uuid, selectableGroups, selectables, depth + 1)}</div>
              </div>
            );
          } else {
            children.push(<div key={`grp-${idx}`}>{renderSelections(uuid, selectableGroups, selectables, depth + 1)}</div>);
          }
        } else if (selectables?.[uuid]) {
          const sel = selectables[uuid];
          const parentDisabled = isNodeDisabled(element, uuid, parentMap);

          // For assignments in a flat group: only disable the textarea when
          // the assignment's own checkbox is unchecked, not the checkbox itself
          const textareaDisabled = parentDisabled || (sel.assignment && !sel.checked);

          children.push(
            <div key={`sel-${idx}`} style={{ paddingLeft: "2rem" }}>
              <FormControlLabel
                className='preview'
                disableTypography
                control={
                  <Checkbox
                    checked={Boolean(sel.checked)}
                    disabled={parentDisabled}
                    onClick={(e) => e.stopPropagation()} // for MF table, don't want to popup App notes/EA when clicking on a selection
                    onChange={(e) => {
                      e.stopPropagation();
                      handleSelectableCheckboxClick(componentUUID, elementUUID, uuid, e.target.checked);
                    }}
                  />
                }
                label={
                  sel.assignment ? (
                    renderAssignmentTextarea(sel, uuid, textareaDisabled)
                  ) : (
                    <span dangerouslySetInnerHTML={{ __html: sel.description || sel.text }} />
                  )
                }
                sx={{ alignItems: "flex-start", "& .MuiCheckbox-root": { paddingTop: "9px" } }}
              />
            </div>
          );
        }
      });
    }

    return <React.Fragment>{children}</React.Fragment>;
  }

  /**
   * Handles checkbox clicks for SFR selectables and dispatches update to the SFR worksheet UI
   * @param {string} componentUUID - the UUID of the component containing the element
   * @param {string} elementUUID - the UUID of the element containing the selectable
   * @param {string} selectableUUID - the UUID of the selectable that was clicked
   * @param {boolean} checked - the new checked state of the checkbox
   */
  const handleSelectableCheckboxClick = (componentUUID, elementUUID, selectableUUID, checked) => {
    try {
      if (!selectableUUID) return;

      const selectable = element?.selectables?.[selectableUUID];
      const containingGroupId = findContainingGroupId(element?.selectableGroups, selectableUUID);

      const siblingSelectedIds = getSelectedSiblingSelectableUUIDs(element?.selectableGroups, element?.selectables, containingGroupId, selectableUUID);

      const isExclusive = Boolean(selectable?.exclusive);

      // Warn only when turning an exclusive selectable "on" while other siblings are already selected
      if (checked && isExclusive && siblingSelectedIds.length > 0) {
        setExclusiveDialog({
          open: true,
          componentUUID,
          elementUUID,
          clickedId: selectableUUID,
          containingGroupId,
          checked,
          clickedType: "selectable",
        });
        return;
      }

      store.dispatch(
        UPDATE_SFR_SELECTION_WITH_GROUP_RULES({
          componentUUID,
          elementUUID,
          clickedId: selectableUUID,
          checked,
          containingGroupId,
          clickedType: "selectable",
        })
      );

      // If unchecking a checkbox+assignment combo, clear its assignment_text
      if (!checked && selectable?.assignment) {
        store.dispatch(UPDATE_SFR_SELECTABLE({ componentUUID, elementUUID, selectableUUID, updateMap: { assignment_text: "" } }));
      }

      handleSnackBarSuccess("Selection updated.");
    } catch (err) {
      handleSnackBarError(err);
    }
  };

  const handleConfirmExclusiveSelection = () => {
    try {
      const { componentUUID, elementUUID, clickedId, containingGroupId, checked, clickedType } = exclusiveDialog;

      if (!clickedId) return;

      store.dispatch(
        UPDATE_SFR_SELECTION_WITH_GROUP_RULES({
          componentUUID,
          elementUUID,
          clickedId,
          checked,
          containingGroupId,
          clickedType,
        })
      );

      setExclusiveDialog({
        open: false,
        componentUUID: null,
        elementUUID: null,
        clickedId: null,
        containingGroupId: null,
        checked: false,
        clickedType: null,
      });

      handleSnackBarSuccess("Exclusive selection applied.");
    } catch (err) {
      handleSnackBarError(err);
    }
  };

  const handleCloseExclusiveDialog = () => {
    setExclusiveDialog({
      open: false,
      componentUUID: null,
      elementUUID: null,
      selectableUUID: null,
      groupId: null,
      checked: false,
    });
  };

  /**
   * Handles checkbox clicks for selectable groups (complex selectable groups)
   * @param {string} componentUUID
   * @param {string} elementUUID
   * @param {string} groupId
   * @param {boolean} checked
   */
  const handleSelectableGroupCheckboxClick = (componentUUID, elementUUID, groupId, checked) => {
    try {
      if (!groupId) return;

      // When unchecking, use UPDATE_SELECTABLE_GROUP_CHECKED to clear descendants
      if (!checked) {
        store.dispatch(
          UPDATE_SELECTABLE_GROUP_CHECKED({
            componentUUID,
            elementUUID,
            groupId,
            updateMap: { checked },
          })
        );
        handleSnackBarSuccess("Selection group updated.");
        return;
      }

      // When checking, enforce onlyOne/exclusive sibling rules
      const containingGroupId = findContainingGroupId(element?.selectableGroups, groupId);
      const siblingSelectedIds = getSelectedSiblingSelectableUUIDs(element?.selectableGroups, element?.selectables, containingGroupId, groupId);
      const isExclusive = Boolean(element?.selectableGroups?.[groupId]?.exclusive);

      if (checked && isExclusive && siblingSelectedIds.length > 0) {
        setExclusiveDialog({
          open: true,
          componentUUID,
          elementUUID,
          clickedId: groupId,
          containingGroupId,
          checked,
          clickedType: "group",
        });
        return;
      }

      store.dispatch(
        UPDATE_SFR_SELECTION_WITH_GROUP_RULES({
          componentUUID,
          elementUUID,
          clickedId: groupId,
          checked,
          containingGroupId,
          clickedType: "group",
        })
      );

      handleSnackBarSuccess("Selection group updated.");
    } catch (err) {
      handleSnackBarError(err);
    }
  };

  /**
   * Render the title array of SFR element.
   *
   * Tracks when we're inside an open HTML list item so that selections and
   * assignments that follow render as indented content within that bullet,
   * rather than as separate floating blocks.
   *
   * @param {Array<Object>} titleArray
   * @param {Object} selectableGroups
   * @param {Object} selectables
   * @returns {JSX.Element|null}
   */
  function renderTitleParts(titleArray, selectableGroups, selectables) {
    if (!Array.isArray(titleArray)) return null;

    const output = [];
    let textBuffer = []; // pending inline text/assignment nodes
    let inBullet = false; // are we inside an open <li>?

    const flushTextBuffer = (key) => {
      if (textBuffer.length === 0) return;
      const nodes = [...textBuffer];
      textBuffer = [];
      if (inBullet) {
        // Inline content — tagged so closeBullet can flow it with prefix/suffix
        bulletContent.push({
          kind: "inline",
          node: (
            <span key={`tb-${key}`} style={{ display: "inline-flex", flexWrap: "wrap", alignItems: "baseline", gap: "4px" }}>
              {nodes}
            </span>
          ),
        });
      } else {
        output.push(
          <div key={`tb-${key}`} style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "4px", marginTop: "2px" }}>
            {nodes}
          </div>
        );
      }
    };

    // bulletContent accumulates the inner nodes of the current open <li>
    let bulletContent = [];
    let preBulletText = "";

    const openBullet = (prefixText) => {
      inBullet = true;
      bulletContent = [];
      preBulletText = prefixText;
    };

    const closeBullet = (suffixText, key) => {
      inBullet = false;
      afterBullet = true; // next selections may need bullets (continuing list context)
      const prefix = preBulletText.trim();
      const suffix = suffixText.trim();
      const content = [...bulletContent];
      bulletContent = [];
      preBulletText = "";

      // content items are tagged: { kind: "inline"|"block", node }
      const inlineItems = content.filter((c) => c?.kind === "inline").map((c) => c.node);
      const blockItems = content.filter((c) => c?.kind === "block").map((c) => c.node);

      // Prefix + inline assignments flow on the first line.
      // Block selections stack below.
      // Suffix (closing text like "and no other signature algorithms, and") appears
      // after all block content if there are block items, otherwise inline.
      const hasBlockContent = blockItems.length > 0;
      const hasInlineRow = prefix || inlineItems.length > 0 || (!hasBlockContent && suffix);

      output.push(
        <div key={`bullet-${key}`} style={{ display: "flex", alignItems: "flex-start", margin: "4px 0", fontSize: "1rem", lineHeight: 1.5 }}>
          <span style={{ marginRight: "8px", flexShrink: 0 }}>•</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            {hasInlineRow && (
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "4px" }}>
                {prefix && <span dangerouslySetInnerHTML={{ __html: prefix }} />}
                {inlineItems}
                {!hasBlockContent && suffix && <span dangerouslySetInnerHTML={{ __html: suffix }} />}
              </div>
            )}
            {blockItems}
            {hasBlockContent && suffix && (
              <div style={{ marginTop: "2px" }}>
                <span dangerouslySetInnerHTML={{ __html: suffix }} />
              </div>
            )}
          </div>
        </div>
      );
    };

    let afterBullet = false; // true right after closeBullet — next selections may use bullets

    titleArray.forEach((part, i) => {
      // Normal + rich text
      if (part?.text || part?.description) {
        if (!inBullet) afterBullet = false; // reset on non-bullet text outside bullet context
        const raw = (part.text || part.description).replace(/&lt;ctr[^&]*?&gt;:\s*(.*?)&lt;\/ctr&gt;/g, "$1");

        const hasLiOpen = /<li[\s>]/i.test(raw);
        const hasLiClose = /<\/li>/i.test(raw);
        const hasUlClose = /<\/ul>/i.test(raw);

        if (inBullet && (hasLiClose || hasUlClose)) {
          // This part closes the open bullet.
          // It may also immediately open the next bullet (e.g. "text</li> <li>next text").
          flushTextBuffer(i);
          const liCloseMatch = raw.match(/^([\s\S]*?)<\/li>/i);
          const suffix = liCloseMatch ? liCloseMatch[1] : "";
          const afterLiClose = liCloseMatch ? raw.slice(liCloseMatch[0].length) : "";

          // Check if another <li> opens immediately after the </li>
          const nextLiMatch = afterLiClose.match(/<li[^>]*>([\s\S]*)/i);
          const hasNextLi = nextLiMatch && !/<\/ul>/i.test(afterLiClose.slice(0, afterLiClose.search(/<li/i)));

          if (hasNextLi && !/<\/ul>/i.test(afterLiClose.split(/<li/i)[0])) {
            // Close current bullet with suffix, then immediately open next bullet
            closeBullet(suffix, i);
            const afterNextLiTag = nextLiMatch[1];
            // Check if next <li> also closes in same part
            if (/<\/li>/i.test(afterNextLiTag)) {
              // Self-contained next bullet
              const nextContent = afterNextLiTag.replace(/<\/li>[\s\S]*/i, "").trim();
              const afterNextClose = afterNextLiTag.replace(/^[\s\S]*?<\/ul>/i, "").trim();
              if (nextContent) {
                output.push(
                  <div key={`bullet-self2-${i}`} style={{ display: "flex", alignItems: "flex-start", margin: "4px 0", fontSize: "1rem", lineHeight: 1.5 }}>
                    <span style={{ marginRight: "8px", flexShrink: 0 }}>•</span>
                    <div style={{ flex: 1, minWidth: 0, display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "4px" }}>
                      <span dangerouslySetInnerHTML={{ __html: nextContent }} />
                    </div>
                  </div>
                );
              }
              if (afterNextClose) {
                output.push(<span key={`post-self2-${i}`} dangerouslySetInnerHTML={{ __html: afterNextClose }} />);
              }
            } else {
              // Next bullet stays open — accumulate following parts
              openBullet(afterNextLiTag);
            }
          } else {
            // Just closing — no new <li> opens
            const afterUl = raw.replace(/^[\s\S]*?<\/ul>/i, "").trim();
            closeBullet(suffix, i);
            if (afterUl) {
              const hasBlock = /<(ul|ol|li|div|p|table|h\d)\b/i.test(afterUl);
              if (hasBlock) {
                output.push(<div key={`post-ul-${i}`} className='preview' dangerouslySetInnerHTML={{ __html: afterUl }} />);
              } else {
                output.push(<span key={`post-ul-${i}`} dangerouslySetInnerHTML={{ __html: afterUl }} />);
              }
            }
          }
          return;
        }

        if (!inBullet && hasLiOpen) {
          // Opening a new bullet — split at <ul><li>
          flushTextBuffer(i);
          const ulIdx = raw.search(/<ul[\s>]/i);
          const liIdx = raw.search(/<li[\s>]/i);
          const beforeUl = ulIdx > 0 ? raw.slice(0, ulIdx).trim() : "";
          // Text inside <li> before any React nodes
          const liTag = raw.match(/<li[^>]*>/i)?.[0] || "<li>";
          const afterLi = raw.slice(liIdx + liTag.length);

          if (beforeUl) {
            const hasBlock = /<(div|p|table|h\d)\b/i.test(beforeUl);
            output.push(
              hasBlock ? (
                <div key={`pre-ul-${i}`} className='preview' dangerouslySetInnerHTML={{ __html: beforeUl }} />
              ) : (
                <span key={`pre-ul-${i}`} dangerouslySetInnerHTML={{ __html: beforeUl }} />
              )
            );
          }

          // Check if <li> also closes in the same part
          if (hasLiClose || hasUlClose) {
            // One part may contain multiple complete <li>...</li> pairs.
            // Split on </li> boundaries and render each as a bullet.
            const liSegments = afterLi.split(/<\/li>/i);
            liSegments.forEach((seg, si) => {
              const trimSeg = seg.trim();
              if (!trimSeg) return;
              // Skip if this is just the </ul> closer or whitespace after last </li>
              if (/^<\/ul>/i.test(trimSeg)) return;
              // Strip any leading <li> tag opening the next item
              const content = trimSeg
                .replace(/^<li[^>]*>/i, "")
                .replace(/<\/ul>[\s\S]*/i, "")
                .trim();
              if (!content) return;
              output.push(
                <div key={`bullet-self-${i}-${si}`} style={{ display: "flex", alignItems: "flex-start", margin: "4px 0", fontSize: "1rem", lineHeight: 1.5 }}>
                  <span style={{ marginRight: "8px", flexShrink: 0 }}>•</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span dangerouslySetInnerHTML={{ __html: content }} />
                  </div>
                </div>
              );
            });
            const afterClose = afterLi.replace(/^[\s\S]*?<\/ul>/i, "").trim();
            if (afterClose) {
              output.push(<span key={`post-self-${i}`} dangerouslySetInnerHTML={{ __html: afterClose }} />);
            }
          } else {
            openBullet(afterLi);
          }
          return;
        }

        // No list tags — plain text
        const trimmed = raw.trim();
        if (!trimmed) return;
        const hasBlock = /<(ul|ol|li|div|p|table|h\d)\b/i.test(trimmed);

        if (hasBlock) {
          flushTextBuffer(i);
          if (inBullet) {
            bulletContent.push({ kind: "block", node: <div key={`html-${i}`} className='preview' dangerouslySetInnerHTML={{ __html: trimmed }} /> });
          } else {
            output.push(<div key={`html-${i}`} className='preview' dangerouslySetInnerHTML={{ __html: trimmed }} />);
          }
        } else {
          textBuffer.push(<span key={`t-${i}`} dangerouslySetInnerHTML={{ __html: trimmed }} />);
        }
        return;
      }

      // Selectables
      if (part?.selections) {
        const pending = [...textBuffer];
        textBuffer = [];
        // asBullets: true when immediately following a closed bullet (continuing
        // the same list context) AND the group's children are mostly selectableGroups
        const topGroup = selectableGroups?.[part.selections];
        const groupChildCount = Array.isArray(topGroup?.groups) ? topGroup.groups.filter((uid) => selectableGroups?.[uid]).length : 0;
        const totalChildCount = topGroup?.groups?.length || 0;
        const mostlyGroups = totalChildCount > 0 && groupChildCount / totalChildCount >= 0.5 && groupChildCount >= 2;
        const useBullets = !inBullet && afterBullet && mostlyGroups;
        afterBullet = false;
        const selNode = renderSelections(part.selections, selectableGroups, selectables, 0, useBullets);

        if (inBullet) {
          // Pending text becomes a separator label inside the bullet (rendered as block)
          if (pending.length > 0) {
            bulletContent.push({
              kind: "block",
              node: (
                <div key={`bsep-${i}`} style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "4px", margin: "2px 0" }}>
                  {pending}
                </div>
              ),
            });
          }
          // Selections always render as a block div inside the bullet
          bulletContent.push({ kind: "block", node: <div key={`bsel-${i}`}>{selNode}</div> });
        } else {
          if (pending.length > 0) {
            output.push(
              <div key={`sel-label-${i}`} style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "4px", marginTop: "2px" }}>
                {pending}
              </div>
            );
          }
          output.push(<div key={`sel-${i}`}>{selNode}</div>);
        }
        return;
      }

      if (part?.selections) {
        // Flush any preceding inline text as a label above/before this selections block
        const pending = [...textBuffer];
        textBuffer = [];
        if (pending.length > 0) {
          output.push(
            <div key={`sel-label-${i}`} style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "4px" }}>
              {pending}
            </div>
          );
        }
        output.push(<div key={`sel-${i}`}>{renderSelections(part.selections, selectableGroups, selectables)}</div>);
        return;
      }

      // Assignment
      if (part?.assignment) {
        const assignable = selectables?.[part.assignment];
        if (assignable) {
          const disabled = isNodeDisabled(element, part.assignment, parentMap);
          textBuffer.push(<React.Fragment key={`assign-${i}`}>{renderAssignmentTextarea(assignable, part.assignment, disabled)}</React.Fragment>);
        }
        return;
      }

      // Tabularize
      if (part?.tabularize) {
        flushTextBuffer(i);
        if (inBullet) {
          closeBullet("", i);
        }
        output.push(<div key={`tab-${i}`}>{renderTabularizeTable(part.tabularize)}</div>);
        return;
      }
    });

    flushTextBuffer("end");
    if (inBullet) {
      closeBullet("", "end");
    }

    return <>{output}</>;
  }

  /**
   * Render crypto selection table cells
   * @param {*} parts
   * @param {*} selectableGroups
   * @param {*} selectables
   * @returns
   */
  const renderTabularizeCellParts = (parts, selectableGroups, selectables) => {
    if (!Array.isArray(parts)) return null;

    return parts.map((part, i) => {
      if (typeof part.text === "string" || typeof part.description === "string") {
        const html = typeof part.text === "string" ? part.text : part.description;
        const hasBlockTag = /<(ul|ol|li|div|p|table|h\d|pre|code)\b/i.test(html);

        return hasBlockTag ? (
          <div key={i} className='preview' dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <span key={i} dangerouslySetInnerHTML={{ __html: html }} />
        );
      }

      if (part.selections) {
        return <span key={i}>{renderSelections(part.selections, selectableGroups, selectables)}</span>;
      }

      if (part.assignment) {
        const assignable = selectables?.[part.assignment];
        if (!assignable) return null;

        const disabled = isNodeDisabled(element, part.assignment, parentMap);
        return <React.Fragment key={i}>{renderAssignmentTextarea(assignable, part.assignment, disabled)}</React.Fragment>;
      }

      return null;
    });
  };

  const getColumnStyleFromHeader = (col) => {
    const header = (col.headerName || "")
      .replace(/<[^>]*>/g, "")
      .trim()
      .toLowerCase();

    if (header.includes("selectable id")) {
      return { minWidth: "180px", width: "14%" };
    }

    if (header.includes("key type")) {
      return { minWidth: "120px", width: "10%" };
    }

    if (header.includes("input parameters")) {
      return { minWidth: "220px", width: "18%" };
    }

    if (header.includes("key derivation algorithm")) {
      return { minWidth: "220px", width: "18%" };
    }

    if (header.includes("key sizes")) {
      return { minWidth: "140px", width: "12%" };
    }

    if (header.includes("list of standards")) {
      return { minWidth: "260px", width: "28%" };
    }

    return { minWidth: "140px" };
  };

  /**
   * Render crypto selection table
   * @param {*} tabularizeUUID
   * @returns
   */
  const renderTabularizeTable = (tabularizeUUID) => {
    const table = element?.tabularize?.[tabularizeUUID];
    if (!table) return null;

    return (
      <div style={{ marginTop: "20px", overflowX: "auto" }}>
        {table.title && (
          <div style={{ marginBottom: "10px" }}>
            <Typography variant='subtitle2' sx={{ fontWeight: "bold", color: secondary }}>
              {table.title}
            </Typography>
          </div>
        )}

        <div
          className='table-scroll-container'
          style={{
            marginTop: "20px",
            overflow: "auto",
            maxHeight: "500px", // enables vertical scroll visibility
            border: "1px solid #ddd",
          }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.9rem",
              tableLayout: "auto",
            }}>
            <thead>
              <tr style={{ backgroundColor: "#f5f5f5" }}>
                {(table.columns || []).map((col, i) => {
                  const columnStyle = getColumnStyleFromHeader(col);

                  return (
                    <th
                      key={i}
                      style={{
                        border: "1px solid #ccc",
                        padding: "8px",
                        textAlign: "center",
                        fontWeight: "bold",
                        color: primary,
                        fontSize: "0.85rem",
                        verticalAlign: "middle",
                        position: "sticky",
                        top: 0,
                        zIndex: 2,
                        background: "#f5f5f5", // need to set background or it becomes transparent
                        ...columnStyle,
                      }}>
                      <span dangerouslySetInnerHTML={{ __html: col.headerName || "" }} />
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {(table.rows || []).map((rowData, rowIdx) => (
                <tr key={rowIdx}>
                  {(table.columns || []).map((col, colIdx) => {
                    const field = col.field;
                    const cellValue = rowData[field];
                    const columnStyle = getColumnStyleFromHeader(col);

                    return (
                      <td
                        key={colIdx}
                        style={{
                          border: "1px solid #ccc",
                          padding: "8px",
                          verticalAlign: "top",
                          whiteSpace: "normal",
                          wordBreak: "break-word",
                          overflowWrap: "break-word",
                          ...columnStyle,
                        }}>
                        {Array.isArray(cellValue) ? (
                          <div style={{ lineHeight: 1.6 }}>{renderTabularizeCellParts(cellValue, element.selectableGroups, element.selectables)}</div>
                        ) : typeof cellValue === "string" ? (
                          <div
                            className='preview'
                            style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
                            dangerouslySetInnerHTML={{ __html: cellValue }}
                          />
                        ) : (
                          cellValue || ""
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  /**
   * The requirements section
   * @returns {*}
   */
  const getRequirements = () => {
    const { requirementType } = props;

    if (requirementType === "title") {
      return (
        <CardTemplate
          type={"section"}
          header={
            <div className='w-full justify-start'>
              <label className='resize-none font-bold text-[14px] p-0' style={{ color: secondary }}>
                Requirement
              </label>
            </div>
          }
          body={
            <div style={{ padding: "8px 16px 16px", textAlign: "left" }}>
              <div
                style={{
                  marginBottom: "16px",
                  fontSize: "1rem",
                  fontWeight: "normal",
                  margin: 0,
                  lineHeight: 1.5,
                  textAlign: "left",
                  whiteSpace: "normal",
                }}>
                {Array.isArray(element.title)
                  ? renderTitleParts(element.title, element.selectableGroups, element.selectables)
                  : element.title || "No description"}
              </div>

              {/* Management Function Table */}
              {element?.isManagementFunction && element?.managementFunctions?.rows?.length > 0 && (
                <div style={{ marginTop: "24px" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#f5f5f5" }}>
                        {(element.managementFunctions.columns || []).map((col, i) => (
                          <th
                            key={i}
                            style={{
                              border: "1px solid #ccc",
                              padding: "8px",
                              textAlign: "center",
                              fontWeight: "bold",
                              color: primary,
                              fontSize: "0.85rem",
                            }}>
                            {col.headerName}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {element.managementFunctions.rows.map((row, rowIdx) => (
                        <tr key={rowIdx}>
                          {(element.managementFunctions.columns || []).map((col, colIdx) => {
                            const field = col.field;

                            // Row number column
                            if (col.type === "Index") {
                              return (
                                <td key={colIdx} style={{ border: "1px solid #ccc", padding: "8px", textAlign: "center" }}>
                                  {rowIdx + 1}
                                </td>
                              );
                            }

                            if (field === "id") {
                              return (
                                <td
                                  key={colIdx}
                                  style={{ border: "1px solid #ccc", padding: "8px", textAlign: "center", cursor: "pointer" }}
                                  onClick={() => setMfDialog({ open: true, row, rowIdx })}>
                                  <Tooltip title='Click to view application notes and evaluation activities' arrow>
                                    <span style={{ textDecoration: "underline dotted" }}>{row[field] || ""}</span>
                                  </Tooltip>
                                </td>
                              );
                            }

                            // Management Function column — render textArray with selections/assignments
                            if (field === "textArray") {
                              return (
                                <td key={colIdx} style={{ border: "1px solid #ccc", padding: "8px" }}>
                                  <div>{renderTitleParts(row.textArray || [], element.selectableGroups, element.selectables)}</div>
                                </td>
                              );
                            }

                            // Regular editable columns (I, U, A, AO, id)
                            return (
                              <td key={colIdx} style={{ border: "1px solid #ccc", padding: "8px", textAlign: "center" }}>
                                {row[field] || ""}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          }
        />
      );
    }
  };

  // Return Method
  return (
    <div className='min-w-full'>
      <span className='w-screen sm:max-w-screen-sm md:max-w-screen-sm lg:max-w-screen-lg'>{getRequirements()}</span>

      {/* Management Function Detail Dialog */}
      <Dialog open={mfDialog.open} onClose={() => setMfDialog({ open: false, row: null, rowIdx: null })} maxWidth='md' fullWidth>
        <DialogTitle sx={{ color: primary, fontWeight: "bold" }}>{mfDialog.row?.id || `Management Function ${(mfDialog.rowIdx ?? 0) + 1}`}</DialogTitle>
        <DialogContent dividers>
          {/* Function Text */}
          <div style={{ marginBottom: "16px" }}>
            <Typography variant='subtitle2' sx={{ fontWeight: "bold", color: secondary, marginBottom: "8px" }}>
              Management Function
            </Typography>
            <div style={{ fontSize: "0.9rem", lineHeight: 1.6 }}>
              {mfDialog.row && renderTitleParts(mfDialog.row.textArray || [], element.selectableGroups, element.selectables)}
            </div>
          </div>

          {/* Application Notes */}
          {mfDialog.row?.note?.length > 0 && mfDialog.row.note.some((n) => n.note) && (
            <div style={{ marginBottom: "16px" }}>
              <Typography variant='subtitle2' sx={{ fontWeight: "bold", color: secondary, marginBottom: "8px" }}>
                Application Notes
              </Typography>
              {mfDialog.row.note.map((n, i) =>
                n.note ? (
                  <div
                    key={i}
                    style={{
                      fontSize: "0.85rem",
                      lineHeight: 1.6,
                      marginBottom: "8px",
                      padding: "8px 12px",
                      backgroundColor: "#f9f9f9",
                      borderRadius: "4px",
                      border: "1px solid #eee",
                    }}
                    dangerouslySetInnerHTML={{ __html: n.note }}
                  />
                ) : null
              )}
            </div>
          )}

          {/* Evaluation Activities */}
          {mfDialog.row?.evaluationActivity && (
            <div>
              <Typography variant='subtitle2' sx={{ fontWeight: "bold", color: secondary, marginBottom: "8px" }}>
                Evaluation Activities
              </Typography>

              {mfDialog.row.evaluationActivity.tss && (
                <div style={{ marginBottom: "12px" }}>
                  <Typography variant='caption' sx={{ fontWeight: "bold", color: primary }}>
                    TSS
                  </Typography>
                  <div
                    className='preview'
                    style={{
                      fontSize: "0.85rem",
                      lineHeight: 1.6,
                      padding: "8px 12px",
                      backgroundColor: "#f9f9f9",
                      borderRadius: "4px",
                      border: "1px solid #eee",
                    }}
                    dangerouslySetInnerHTML={{ __html: mfDialog.row.evaluationActivity.tss }}
                  />
                </div>
              )}

              {mfDialog.row.evaluationActivity.guidance && (
                <div style={{ marginBottom: "12px" }}>
                  <Typography variant='caption' sx={{ fontWeight: "bold", color: primary }}>
                    Guidance
                  </Typography>
                  <div
                    className='preview'
                    style={{
                      fontSize: "0.85rem",
                      lineHeight: 1.6,
                      padding: "8px 12px",
                      backgroundColor: "#f9f9f9",
                      borderRadius: "4px",
                      border: "1px solid #eee",
                    }}
                    dangerouslySetInnerHTML={{ __html: mfDialog.row.evaluationActivity.guidance }}
                  />
                </div>
              )}

              {mfDialog.row.evaluationActivity.testIntroduction && (
                <div style={{ marginBottom: "12px" }}>
                  <Typography variant='caption' sx={{ fontWeight: "bold", color: primary }}>
                    Tests
                  </Typography>
                  <div
                    className='preview'
                    style={{
                      fontSize: "0.85rem",
                      lineHeight: 1.6,
                      padding: "8px 12px",
                      backgroundColor: "#f9f9f9",
                      borderRadius: "4px",
                      border: "1px solid #eee",
                    }}
                    dangerouslySetInnerHTML={{ __html: mfDialog.row.evaluationActivity.testIntroduction }}
                  />

                  {/* Individual test objectives */}
                  {Object.values(mfDialog.row.evaluationActivity.tests || {}).length > 0 && (
                    <div style={{ marginTop: "8px" }}>
                      {Object.values(mfDialog.row.evaluationActivity.tests).map((test, i) =>
                        test.objective ? (
                          <div
                            className='preview'
                            key={i}
                            style={{
                              fontSize: "0.85rem",
                              lineHeight: 1.6,
                              padding: "6px 12px",
                              marginTop: "4px",
                              backgroundColor: "#fff",
                              borderRadius: "4px",
                              border: "1px solid #eee",
                            }}
                            dangerouslySetInnerHTML={{ __html: `${i + 1}. ${test.objective}` }}
                          />
                        ) : null
                      )}
                    </div>
                  )}

                  {mfDialog.row.evaluationActivity.testClosing && (
                    <div
                      className='preview'
                      style={{ fontSize: "0.85rem", lineHeight: 1.6, padding: "8px 12px", marginTop: "8px" }}
                      dangerouslySetInnerHTML={{ __html: mfDialog.row.evaluationActivity.testClosing }}
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMfDialog({ open: false, row: null, rowIdx: null })} variant='contained' size='small'>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={exclusiveDialog.open} onClose={handleCloseExclusiveDialog}>
        <DialogTitle>Exclusive Selection</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This option is exclusive. Selecting it will remove any other selections already made in this group. Do you want to continue?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseExclusiveDialog}>Cancel</Button>
          <Button onClick={handleConfirmExclusiveSelection} variant='contained' color='warning'>
            Continue
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

// Export SfrRequirements.jsx
export default SfrRequirements;
