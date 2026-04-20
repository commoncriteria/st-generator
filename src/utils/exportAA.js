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

import { getSelectionDependencyInfo, buildSelectableLookup } from "../components/stComponents/Requirements.jsx";
import { buildElementMaps, isIncomplete, TABLE_STYLE, CELL_STYLE } from "./exportST.js";
import { parseTests, generateTestHTML } from "./testParsing.js";

const COMP_HEADING_STYLE = 'style="border-top: 3px solid black"';
const ELEM_HEADING_STYLE = 'style="border-top: 1px dashed black; margin-bottom: 3px;"';
const ELEM_HEADING_STYLE2 = 'STYLE="BORDER-TOP: 1PX DASHED BLACK;"'; // used when there is content

// Helpers
function cell(label, content) {
  return `<tr>
    <td ${CELL_STYLE}>${label}</td>
    <td ${CELL_STYLE}>${content || ""}</td>
  </tr>`;
}

function activityTable(tss, guidance, tests) {
  return `<table ${TABLE_STYLE}>
    ${cell("TSS", tss)}
    ${cell("TSS Evidence", "")}
    ${cell("Guidance", guidance)}
    ${cell("Guidance Evidence", "")}
    ${cell("Tests", tests)}
    ${cell("Summary Test Description &amp; Results", "")}
  </table>`;
}

// Renders a single SFR element's evaluation activity block as HTML.
// Returns "No Assurance Activities" if no EA content exists.
function elementToAA(elementName, status, evaluationActivities, elementUUID, component = null, selectedPlatformNames = [], platformLookup = {}) {
  const ea = evaluationActivities?.[elementUUID] || {};
  const tss = ea.tss || "";
  const guidance = ea.guidance || "";

  // Build tests HTML using shared parsing/generation utilities when tests exist
  let testsHtml = ea.tests || ea.test || "";
  const anyTestLists = ea.testLists || {};

  if (ea.testIntroduction || (anyTestLists && Object.keys(anyTestLists).length) || (ea.tests && typeof ea.tests === "object")) {
    const activityObject = {
      testIntroduction: ea.testIntroduction,
      tests: ea.tests || ea.test || {},
      testLists: ea.testLists || ea.testsList || ea.testsLists || {},
      testClosing: ea.testClosing,
    };
    const parsed = parseTests(activityObject);
    testsHtml = generateTestHTML(parsed, {
      componentCcId: component?.compName || component?.cc_id || "",
      selectedPlatformNames,
      platformLookup,
      testLabelPrefix: elementName || "",
    });
  }

  const hasContent = tss || guidance || testsHtml;

  if (!hasContent) {
    return `<h3 ${ELEM_HEADING_STYLE}>${elementName}${status}: <span style="font-weight:normal;">No Assurance Activities</span></h3> `;
  }

  return `<H3 ${ELEM_HEADING_STYLE2}>${elementName}${status}:</H3>${activityTable(tss, guidance, testsHtml)} `;
}

// Renders component-level and element-level evaluation activity blocks under a component heading
// Accepts either the new signature (componentObj, compTitle, elements, elementMaps, evaluationActivities)
// or the old signature (compTitle, elements, elementMaps, evaluationActivities) for backwards compatibility.
function componentToAA(
  componentOrTitle,
  compTitleOrElements,
  elementsOrElementMaps,
  elementMapsOrEval,
  evaluationActivitiesParam,
  selectedPlatformNames = [],
  platformLookup = {}
) {
  // Normalize arguments to support both call styles
  let component = null;
  let compTitle = componentOrTitle;
  let elements = compTitleOrElements;
  let elementMaps = elementsOrElementMaps;
  let evaluationActivities = elementMapsOrEval || evaluationActivitiesParam;

  // If first arg is an object, treat it as the component object (new callsite in buildAAHtml passes the component)
  if (componentOrTitle && typeof componentOrTitle === "object" && componentOrTitle.compUUID) {
    component = componentOrTitle;
    compTitle = compTitleOrElements;
    elements = elementsOrElementMaps;
    elementMaps = elementMapsOrEval;
    evaluationActivities = evaluationActivitiesParam;
  }

  const { elementNames = [], elementNameMap = {} } = elementMaps || {};
  let status = ` - COMPLETE`;

  // Element-level blocks
  const elementBlocks = elementNames
    .map((name) => {
      const incomplete = elementNames.some((name) => isIncomplete(elements?.[elementNameMap[name]]));
      status = incomplete ? `<i style="color:red;"> - INCOMPLETE</i>` : "";
      const elementUUID = elementNameMap[name];
      const element = elements?.[elementUUID];
      if (!element) return "";
      return elementToAA(name, status, evaluationActivities, elementUUID, component, selectedPlatformNames, platformLookup);
    })
    .join("\n");

  // Component-level block (if present) — reuse elementToAA rendering but only include when it contains real content
  let compBlock = "";
  const compUUID = component?.compUUID;
  const cc_id = component?.compName || component?.cc_id || compTitle;
  if (compUUID) {
    const maybeCompBlock = elementToAA(cc_id, status, evaluationActivities, compUUID, component, selectedPlatformNames, platformLookup);
    // elementToAA returns a "No Assurance Activities" message when there's no content; skip that
    if (maybeCompBlock && !maybeCompBlock.includes("No Assurance Activities")) {
      compBlock = maybeCompBlock;
    }
  }

  if (!compBlock && !elementBlocks.trim()) return "";

  return `<h2 ${COMP_HEADING_STYLE}>${String(compTitle || "").toUpperCase()}</h2>${compBlock}${elementBlocks}`;
}

// Get all enabled SFR components
function selectEnabledComponents(state) {
  const sfrs = state?.sfrs || {};
  const sfrSections = state?.sfrSections || {};

  const selectableLookup = buildSelectableLookup(sfrSections);
  const components = [];

  Object.entries(sfrSections || {}).forEach(([familyUUID, familyComponents]) => {
    const sectionData = sfrs.sections?.[familyUUID];
    if (!sectionData || !familyComponents) return;

    Object.entries(familyComponents).forEach(([compUUID, comp]) => {
      if (!comp || comp.invisible) return;

      const isOptional = comp.optional;
      const isObjective = comp.objective;
      const isSelectionBased = comp.selectionBased;
      const isToggleable = isOptional || isObjective;
      const hasInstances = Array.isArray(comp.instances) && comp.instances.length > 0;

      const manualEnabled = comp.enabled ?? false;
      const selectionInfo = isSelectionBased ? getSelectionDependencyInfo(comp.selections, selectableLookup) : { met: false };
      const autoEnabled = isSelectionBased && selectionInfo.met;
      const isDisabled = hasInstances || ((isToggleable || isSelectionBased) && !(manualEnabled || autoEnabled));

      if (isDisabled) return;

      const ccId = comp.cc_id || "";
      const iterationId = comp.iteration_id ? `/${comp.iteration_id}` : "";
      const compName = `${ccId}${iterationId}`;
      const compTitle = comp.title || comp.definition || compName;

      components.push({
        compUUID,
        compName,
        compTitle,
        elements: comp.elements || {},
        elementMaps: buildElementMaps(comp, ccId, comp.iteration_id || ""),
        evaluationActivities: comp.evaluationActivities || {},
      });
    });
  });

  return components;
}

/**
 * Builds the EA HTML from the Redux state.
 *
 * @param   {Object} stateObject  Redux state
 * @returns {string}
 */
export function buildAAHtml(stateObject) {
  const components = selectEnabledComponents(stateObject);

  if (!components.length) {
    return "<h1>Evaluation Activities Report</h1><p>No enabled SFR components found.</p>";
  }

  // Recreate the platform selection context used by the in-app SFR Evaluation Activity Card
  const selectedPlatforms = stateObject?.accordionPane?.platformData?.selectedPlatforms || [];
  const availablePlatforms = stateObject?.accordionPane?.platformData?.platforms || [];
  const selectedPlatformNames = availablePlatforms.filter((platform) => selectedPlatforms.includes(platform.id)).map((platform) => platform.name);

  const platformLookup = {};
  availablePlatforms.forEach((p) => {
    platformLookup[p.name] = p;
  });

  const blocks = components
    .map((c) => componentToAA(c, c.compTitle, c.elements, c.elementMaps, c.evaluationActivities, selectedPlatformNames, platformLookup))
    .filter(Boolean)
    .join("\n");

  return `<h1>Evaluation Activities Report</h1>${blocks}`;
}
