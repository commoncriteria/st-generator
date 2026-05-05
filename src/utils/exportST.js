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

import { checkTitlesAndGroups } from "../../src/components/stComponents/Validator.jsx";
import { getSelectionDependencyInfo, buildSelectableLookup } from "../../src/components/stComponents/Requirements.jsx";
import { buildParentMap } from "../components/editorComponents/securityComponents/sfrComponents/sfrElement/SfrElement.jsx";

// Constants
export const TABLE_STYLE = 'style="border: 1px solid #dddddd;text-align: left;padding: 8px; font-family: TimesNewRoman;"';
export const CELL_STYLE = 'style="border: 1px solid #dddddd;text-align: left;padding: 8px;"';
const HEADER_CELL_STYLE = 'style="border: 1px solid #dddddd;text-align: left;padding: 8px; font-weight: bold;"';

function tableCaption(title) {
  return `
    <p style="margin-bottom: 6px; text-align: center; font-size: 12pt;">
      <b>${title}</b>
    </p>
  `;
}

// Table counter — reset at the start of each buildSTHtml call
let _tableCounter = 0;

// Table generation — auto-numbers and prepends a caption
function table_from_matrix(content, header = true, captionTitle = "") {
  _tableCounter += 1;
  const caption = tableCaption(`Table ${_tableCounter}${captionTitle ? `. ${captionTitle}` : ""}`);

  let rows = [];
  content.forEach((row, index) => {
    if (index === 0 && header) {
      rows.push(`<tr>${row.map((s) => `<td ${HEADER_CELL_STYLE}><b>${s.toUpperCase()}</b></td>`).join("")}</tr>`);
    } else {
      rows.push(`<tr>${row.map((s) => `<td ${CELL_STYLE}>${String(s ?? "")}</td>`).join("")}</tr>`);
    }
  });

  return `
    ${caption}
    <table ${TABLE_STYLE}>
      <tbody>
        ${rows.join("")}
      </tbody>
    </table>
  `;
}

/**
 * SFR Helpers
 */

// Selectable / assignment serializer
function serializeSelectionGroup(groupKey, selectableGroups, selectables) {
  const group = selectableGroups?.[groupKey];
  if (!group) return "";

  // Complex group with array description
  if (Array.isArray(group.description)) {
    if (!group.checked) return "";
    return serializeTitleParts(group.description, selectableGroups, selectables);
  }

  // Flat group — collect checked children
  if (Array.isArray(group.groups) && group.groups.length > 0) {
    const parts = group.groups
      .map((uuid) => {
        // Nested selectableGroup
        if (selectableGroups?.[uuid]) {
          return serializeSelectionGroup(uuid, selectableGroups, selectables);
        }

        // Selectable / assignment entry
        if (selectables?.[uuid]) {
          const sel = selectables[uuid];

          if (sel.assignment) {
            const val = sel.assignment_text?.trim() || "";
            return val ? ` [<b>${val}</b>] ` : "";
          }

          // Normal selectable must be checked to render
          if (!sel.checked) return "";

          // Intro selectable text
          const baseText = sel.description || sel.text || "";
          // If base text exists, render it wrapped in square brackets and bold+italic
          const renderedBaseText = baseText ? ` [<b><i>${baseText}</i></b>] ` : "";

          // Render any nested groups hanging off this selectable
          const nestedText = (sel.nestedGroups || [])
            .map((nestedKey) => {
              if (selectableGroups?.[nestedKey]) {
                return serializeSelectionGroup(nestedKey, selectableGroups, selectables);
              }
              if (selectables?.[nestedKey]) {
                const nestedSel = selectables[nestedKey];
                if (nestedSel.assignment) {
                  const val = nestedSel.assignment_text?.trim() || "";
                  return val ? ` [<b>${val}</b>] ` : "";
                }
                if (!nestedSel.checked) return "";
                const nestedText = nestedSel.description || nestedSel.text || "";
                return nestedText ? ` [<b><i>${nestedText}</i></b>] ` : "";
              }
              return "";
            })
            .filter(Boolean)
            .join("");

          return `${renderedBaseText}${nestedText}`;
        }

        return "";
      })
      .filter(Boolean);

    return parts.join(", ");
  }

  return "";
}

// Serialize title/description array into HTML
function serializeTitleParts(parts, selectableGroups, selectables, renderTabularize) {
  if (!Array.isArray(parts)) return String(parts ?? "");

  return parts
    .map((part) => {
      // If this title part has text/description and the overall parts
      // array contains at least one groups array, treat this text as the
      // intro text for the following group(s) and render it in the
      // bracketed bold/italic form.
      if ((part?.text || part?.description) && Array.isArray(parts) && parts.some((p) => Array.isArray(p?.groups))) {
        let html = part.text || part.description;
        html.replace(/&lt;ctr[^&]*?&gt;:\s*(.*?)&lt;\/ctr&gt;/g, "$1");
        html = ` [<b><i>${html}</i></b>]`;
        return html;
      } else if (part?.text || part?.description) {
        let html = part.text || part.description;
        return html.replace(/&lt;ctr[^&]*?&gt;:\s*(.*?)&lt;\/ctr&gt;/g, "$1");
      }

      if (Array.isArray(part?.groups)) {
        const rendered = part.groups
          .map((groupKey) => {
            if (selectableGroups?.[groupKey]) {
              return serializeSelectionGroup(groupKey, selectableGroups, selectables);
            }

            const sel = selectables?.[groupKey];
            if (!sel) return "";

            if (sel.assignment) {
              const val = sel.assignment_text?.trim() || "";
              return val ? ` [<b>${val}</b>] ` : "";
            }

            if (!sel.checked && sel.type === "selectable") return "";
            const text = sel.description || sel.text || "";
            return text ? ` [<b><i>${text}</i></b>] ` : "";
          })
          .filter(Boolean)
          .join(", ");
        // Ensure a leading space so the result doesn't run into the
        // preceding text node
        return rendered ? ` ${rendered}` : "";
      }

      if (part?.assignment) {
        const sel = selectables?.[part.assignment];
        const val = sel?.assignment_text?.trim() || "";
        return val ? ` [<b>${val}</b>] ` : "";
      }

      if (part?.selections) {
        return serializeSelectionGroup(part.selections, selectableGroups, selectables);
      }

      if (part?.tabularize && renderTabularize) {
        return renderTabularize(part.tabularize);
      }

      return "";
    })
    .join("");
}

function makeElementSerializer(element) {
  const { selectableGroups = {}, selectables = {}, tabularize = {} } = element || {};

  function renderTabularize(tabUUID) {
    const tbl = tabularize?.[tabUUID];
    if (!tbl) return "";

    const titleHtml = tbl.title ? `<div style="margin-bottom:6px;font-weight:bold;">${tbl.title}</div>` : "";

    const visibleColumns = (tbl.columns || []).filter((col) => {
      const header = (col.headerName || "").trim().toLowerCase();
      return header !== "selectable id";
    });

    const headers = visibleColumns.map((col) => col.headerName || "");
    const rows = (tbl.rows || []).map((row) =>
      visibleColumns.map((col) => {
        const cell = row[col.field];
        if (!Array.isArray(cell)) return typeof cell === "string" ? cell : "";
        return serializeTitleParts(cell, selectableGroups, selectables);
      })
    );

    return titleHtml + table_from_matrix([headers, ...rows]);
  }

  return (titleArray) => serializeTitleParts(titleArray, selectableGroups, selectables, renderTabularize);
}

function serializeMFTable(element) {
  const { managementFunctions } = element || {};
  if (!managementFunctions?.rows?.length) return "";
  const serialize = makeElementSerializer(element);
  const columns = managementFunctions.columns || [];
  const headers = columns.map((col) => col.headerName || "");
  const rows = managementFunctions.rows.map((row, rowIdx) =>
    columns.map((col) => {
      if (col.type === "Index") return String(rowIdx + 1);
      if (col.field === "textArray") return serialize(row.textArray || []);
      return row[col.field] || "";
    })
  );
  return `<br/>${table_from_matrix([headers, ...rows])}`;
}

function hasSelectionsOrAssignments(element) {
  if (!element) return false;

  const titleHas = Array.isArray(element.title) && element.title.some((t) => t?.selections || t?.assignment);

  const tableHas = Object.values(element.tabularize || {}).some((table) =>
    (table.rows || []).some((row) =>
      (table.columns || []).some((col) => {
        const cellValue = row[col.field];
        return Array.isArray(cellValue) && cellValue.some((part) => part?.selections || part?.assignment);
      })
    )
  );

  return titleHas || tableHas;
}

export function isIncomplete(element) {
  if (!element) return false;
  if (!hasSelectionsOrAssignments(element)) return false;

  try {
    const parentMap = buildParentMap(element);
    return !checkTitlesAndGroups(element.title || [], element.selectableGroups || {}, element.selectables || {}, parentMap || {});
  } catch (e) {
    console.error("Element validation error:", e);
    return true;
  }
}

// Remove spaces that were inserted before punctuation characters
function fixSpacing(html) {
  return html.replace(/ +([.,;:!?)\]])/g, "$1");
}

function elementToHTML(element) {
  const serialize = makeElementSerializer(element);
  const titleHtml = fixSpacing(serialize(element?.title || []));
  const mfHtml = element?.isManagementFunction && element?.managementFunctions?.rows?.length ? serializeMFTable(element) : "";
  return `
        <div>
            <h5 style="font-weight:normal; font-size: 16px; margin-bottom:0; margin-top:0">${titleHtml}${mfHtml}</h5>
        </div>
        `;
}

function getAssuranceClassTitle(sectionTitle = "") {
  // "Class AGD: Guidance Documentation" -> "Guidance Documentation"
  return sectionTitle.replace(/^Class\s+[^:]+:\s*/, "").trim();
}

function getSarDescription(componentName = "") {
  // "Operational User Guidance (AGD_OPE.1)" -> "Operational User Guidance"
  return componentName.replace(/\s*\([^)]+\)\s*$/, "").trim();
}

function getSarComponentCode(comp = {}) {
  return (comp.ccID || "").toUpperCase();
}

function buildSarRequirementRows(sars) {
  const rows = [];

  Object.entries(sars?.sections || {}).forEach(([_, section]) => {
    if (!section || !Array.isArray(section.componentIDs) || section.componentIDs.length === 0) return;

    const assuranceClass = getAssuranceClassTitle(section.title || "");

    section.componentIDs.forEach((compUUID, index) => {
      const comp = sars?.components?.[compUUID];
      if (!comp) return;

      rows.push({
        assuranceClass,
        showAssuranceClass: index === 0,
        component: getSarComponentCode(comp),
        description: getSarDescription(comp.name || ""),
      });
    });
  });

  return rows;
}

function sarRequirementsTable(sars) {
  const rows = buildSarRequirementRows(sars);

  if (!rows.length) {
    return "<p>There are no Security Assurance Requirements defined.</p>";
  }

  const bodyRows = rows
    .map(
      (row) => `
        <tr>
          <td ${CELL_STYLE}>${row.showAssuranceClass ? row.assuranceClass : ""}</td>
          <td ${CELL_STYLE}>${row.component}</td>
          <td ${CELL_STYLE}>${row.description}</td>
        </tr>
      `
    )
    .join("");

  return `
    <table ${TABLE_STYLE}>
      <tbody>
        <tr>
          <th ${HEADER_CELL_STYLE}><b>Assurance Class</b></th>
          <th ${HEADER_CELL_STYLE}><b>Components</b></th>
          <th ${HEADER_CELL_STYLE}><b>Description</b></th>
        </tr>
        ${bodyRows}
      </tbody>
    </table>
  `;
}

function componentToHTML(compName, compDesc, elements, elementMaps) {
  const { elementNames = [], elementNameMap = {} } = elementMaps || {};
  const incomplete = elementNames.some((name) => isIncomplete(elements?.[elementNameMap[name]]));
  const status = incomplete ? `<i style="color:red;">- INCOMPLETE</i>` : "";

  // Precompute type counters for elements in their original order so the
  // numbering matches the original SAR-style rendering logic.
  const counters = { C: 0, D: 0, E: 0 };
  const countMap = {}; // element name -> counter for its type
  const typeMap = {}; // element name -> type

  for (const n of elementNames) {
    const uuid = elementNameMap[n];
    const candidate = elements?.[uuid];
    if (!candidate) continue;
    if (candidate.type) {
      const t = candidate.type || "C";
      counters[t]++;
      countMap[n] = counters[t];
      typeMap[n] = t;
    }
  }

  // New ordering: Primary -> counter (numeric ascending, elements without
  // a counter sort after), Secondary -> type (alphabetical ascending,
  // elements without a type sort after), Tertiary -> name (case-insensitive).
  const hasTypes = Object.keys(typeMap).length > 0;
  const orderedNames = hasTypes
    ? [...elementNames].sort((a, b) => {
        // Primary: counter (elements without counters sort after)
        const ca = countMap[a] ?? Number.POSITIVE_INFINITY;
        const cb = countMap[b] ?? Number.POSITIVE_INFINITY;
        if (ca !== cb) return ca - cb;

        // Secondary: type (alphabetical). Elements without a type come after.
        const ta = typeMap[a] || "";
        const tb = typeMap[b] || "";
        if (ta !== tb) {
          if (!ta) return 1; // a has no type -> after b
          if (!tb) return -1; // b has no type -> after a
          return ta.localeCompare(tb);
        }

        // Tertiary: name (case-insensitive)
        const na = (a || "").toLowerCase();
        const nb = (b || "").toLowerCase();
        if (na < nb) return -1;
        if (na > nb) return 1;

        return 0;
      })
    : elementNames;

  // Render as a list: each item shows the (possibly SAR-styled) name and the
  // element HTML. Keep rendering logic for displayName consistent with the
  // original implementation by using the precomputed counters.
  const elHtml = orderedNames
    .map((name) => {
      const elUUID = elementNameMap[name];
      const el = elements?.[elUUID];
      if (!el) return "";

      let displayName = name;
      if (el && el.type) {
        const type = el.type || "C";
        const comp = elementMaps?.componentName || "";
        const num = countMap[name] || "";
        displayName = `${comp}.${num} (${type})`;
      }

      return `
        <div>
          <div style="font-weight: bold; font-size: 14px; margin-top: 8px; margin-bottom: 4px;">
            ${displayName}
          </div>
          ${elementToHTML(el)}
        </div>
      `;
    })
    .join("\n");

  return `
        <div>
            <h3>${compName}: ${compDesc}${status}</h3>
            ${elHtml}
        </div>
        `;
}

// CC class grouping
const CC_CLASS_LABELS = {
  FAU: "Class: Security Audit (FAU)",
  FCS: "Class: Cryptographic Support (FCS)",
  FDP: "Class: User Data Protection (FDP)",
  FIA: "Class: Identification and Authentication (FIA)",
  FMT: "Class: Security Management (FMT)",
  FPT: "Class: Protection of the TSF (FPT)",
  FPR: "Class: Privacy (FPR)",
  FTP: "Class: Trusted Path/Channel (FTP)",
  ADV: "Class: Development (ADV)",
  AGD: "Class: Guidance Documentation (AGD)",
  ALC: "Class: Life-Cycle Support (ALC)",
  ASE: "Class: Security Target (ASE)",
  ATE: "Class: Tests (ATE)",
  AVA: "Class: Vulnerability Assessment (AVA)",
};

function groupByClass(components) {
  const map = new Map();
  components.forEach((comp) => {
    const m = (comp.name || "").match(/^([A-Z]+)_/);
    const cls = m ? m[1] : "OTHER";
    if (!map.has(cls)) map.set(cls, []);
    map.get(cls).push(comp);
  });
  let idx = 1;
  return Array.from(map.entries()).map(([cls, comps]) => ({
    label: CC_CLASS_LABELS[cls] || `Class: ${cls}`,
    index: idx++,
    components: comps,
  }));
}

// Builds the lookup maps used to render ordered element names for a component.
function buildGenericElementMaps({ elementUUIDs = [], elementsByUUID = {}, componentName = "", nameBuilder }) {
  const elementNameMap = {};
  const elementUUIDMap = {};
  const elementNames = [];

  elementUUIDs.forEach((uuid, index) => {
    const element = elementsByUUID[uuid];
    const name = nameBuilder({ uuid, element, index, componentName });

    elementNameMap[name] = uuid;
    elementUUIDMap[uuid] = name;
    elementNames.push(name);
  });

  return {
    elementNames,
    elementNameMap,
    elementUUIDMap,
    componentName,
  };
}

export function buildElementMaps(component, ccId, iterationId = "") {
  const elements = component?.elements || {};
  const elementUUIDs = component?.elementOrder || Object.keys(elements);
  const componentName = iterationId ? `${ccId}/${iterationId}` : ccId;

  return buildGenericElementMaps({
    elementUUIDs,
    elementsByUUID: elements,
    componentName,
    nameBuilder: ({ index }) => (iterationId ? `${ccId}.${index + 1}/${iterationId}` : `${ccId}.${index + 1}`),
  });
}

function buildSarElementMaps(comp, sarSlice, componentName) {
  const elementsByUUID = sarSlice?.elements || {};
  const elementUUIDs = comp?.elementIDs || [];

  return buildGenericElementMaps({
    elementUUIDs,
    elementsByUUID,
    componentName,
    nameBuilder: ({ element, index, componentName }) => `${componentName}.${index + 1}${element?.type || ""}`,
  });
}

function getSectionByTitle(spdObj, title) {
  return Object.values(spdObj || {}).find((value) => typeof value === "object" && value?.title === title && value?.terms);
}

function termsToRows(section) {
  return {
    intro: section?.definition || "",
    rows: Object.values(section?.terms || {}).map((term) => ({
      id: term?.title || "",
      description: term?.definition || "",
    })),
  };
}

// Redux state filering
function selectData(state) {
  const { metadata: meta = {}, stMetadata: stMeta = {}, selectedPP } = state?.accordionPane || {};
  const sfrs = state?.sfrs || {};
  const sfrSections = state?.sfrSections || {};
  const sars = state?.sars || {};

  // CClaims
  const conformanceClaims = selectedPP.conformanceClaims || {};
  const ccVersionRaw = conformanceClaims?.cClaimsXMLTagMeta?.attributes?.["cc-version"] || "";
  const ccErrataRaw = conformanceClaims?.cClaimsXMLTagMeta?.attributes?.["cc-errata"] || conformanceClaims?.cc_errata || "";

  const selectedPackages = state?.accordionPane?.selectedPackages || [];
  const selectedModules = state?.accordionPane?.selectedModules || [];

  // Match a packageClaim text against a selected functional package.
  // Uses the package's ppName, stripping any trailing abbreviation in parentheses
  const packageClaimMatchesSelection = (claimText, pkg) => {
    const ppName = pkg.pkgJson?.accordionPane?.metadata?.ppName || "";
    const normalized = ppName.replace(/\s*\([^)]+\)\s*$/, "").trim();
    return normalized && claimText.toLowerCase().includes(normalized.toLowerCase());
  };

  // Match a ppClaim text against a selected module.
  // Uses the module's "target-product" attribute (e.g., "VPN client")
  const moduleClaimMatchesSelection = (claimText, mod) => {
    const metadata = mod.pkgJson?.accordionPane?.metadata || {};
    const targetProduct = metadata.xmlTagMeta?.attributes?.["target-product"] || "";
    return targetProduct && claimText.toLowerCase().includes(targetProduct.toLowerCase());
  };

  // Build the base PP's own conformance claim from its metadata
  const basePPMeta = selectedPP?.accordionPane?.metadata || {};
  const basePPClaimText = [basePPMeta.ppName, basePPMeta.version ? `Version ${basePPMeta.version}` : ""].filter(Boolean).join(", ");

  // Include the base PP itself, then any package/mods
  const conformancePPClaims = [
    ...(basePPClaimText ? [{ text: basePPClaimText }] : []),
    ...(conformanceClaims?.ppClaims || []).filter((claim) => selectedModules.some((mod) => moduleClaimMatchesSelection(claim.text, mod))),
  ];

  // Filter packageClaims based on selected ones
  const conformancePackageClaims = (conformanceClaims?.packageClaims || []).filter((claim) =>
    selectedPackages.some((pkg) => packageClaimMatchesSelection(claim.text, pkg))
  );

  // ST reference
  const { stTitle = "", stVersion = "", stDate = "", stAuthor = "", toeDeveloper = "", toeIdentifier = "" } = stMeta;

  // Technical Decisions
  const stTD = state?.stTD || {};
  const tdDefaults = Array.isArray(stTD.tdDefaults) ? stTD.tdDefaults : [];

  const formatUniquePP = (val) =>
    val
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "_")
      .trim();

  const ppMeta = selectedPP?.accordionPane?.metadata || {};
  const ppValue = `${ppMeta.ppName ?? ""} ${ppMeta.version ?? ""}`.trim();

  // Build TD rows for one source (PP, package, or module) — mirrors MetadataTD logic
  const buildTdRows = (sfrSections, uniquePP, sourceName) => {
    const matched = {};
    Object.entries(sfrSections || {}).forEach(([, components]) => {
      Object.entries(components || {}).forEach(([, component]) => {
        const compCcId = (component?.cc_id || "").toString();
        tdDefaults.forEach((tdDefault) => {
          const ccIds = Array.isArray(tdDefault.cc_ids) ? tdDefault.cc_ids : tdDefault.cc_ids ? [tdDefault.cc_ids] : [];
          const sectionVal = (tdDefault.section || "").toString();
          const uniqueEndsWithSection = sectionVal ? uniquePP.endsWith(sectionVal) : true;
          ccIds.forEach((cc) => {
            const ccVal = (cc || "").toString();
            const isSingleSpace = ccVal === " ";
            const isMatch = (isSingleSpace || (compCcId && ccVal.toLowerCase().startsWith(compCcId.toLowerCase()))) && uniqueEndsWithSection;
            if (isMatch) {
              const key = `${tdDefault.tdNumber}-${uniquePP}`;
              if (!matched[key]) {
                const saved = Object.values(stTD).find(
                  (v) => v && typeof v === "object" && !Array.isArray(v) && v.uniquePP === uniquePP && v.tdNumber === tdDefault.tdNumber
                );
                matched[key] = {
                  source: sourceName,
                  tdNumber: tdDefault.tdNumber,
                  td: tdDefault.title,
                  applied: saved?.applied || "Yes",
                  reason: saved?.tdReason || "",
                };
              }
            }
          });
        });
      });
    });
    return Object.values(matched);
  };

  const uniquePPValue = formatUniquePP(ppValue);
  const technicalDecisions = [
    ...buildTdRows(selectedPP?.sfrSections || {}, uniquePPValue, ppValue),
    ...selectedPackages.flatMap((pkg) => buildTdRows(pkg?.pkgJson?.sfrSections || {}, formatUniquePP(`${ppValue}-${pkg.value}`), pkg.label)),
    ...selectedModules.flatMap((mod) => buildTdRows(mod?.pkgJson?.sfrSections || {}, formatUniquePP(`${ppValue}-${mod.value}`), mod.label)),
  ];

  // Security problem definition
  const threatsSlice = selectedPP?.threats || {};

  const threatsSection = getSectionByTitle(threatsSlice, "Threats");
  const assumptionsSection = getSectionByTitle(threatsSlice, "Assumptions");
  const ospsSection = getSectionByTitle(threatsSlice, "Organizational Security Policies");

  const { intro: threatsIntro, rows: threats } = termsToRows(threatsSection);
  const { intro: assumptionsIntro, rows: assumptions } = termsToRows(assumptionsSection);
  const { intro: ospsIntro, rows: osps } = termsToRows(ospsSection);

  const securityProblemDefinitionText = threatsSlice.securityProblemDefinition || "";

  // Security objectives
  const objectivesSlice = selectedPP?.objectives || {};

  const toeObjectivesSection = getSectionByTitle(objectivesSlice, "Security Objectives for the TOE");
  const oeObjectivesSection = getSectionByTitle(objectivesSlice, "Security Objectives for the Operational Environment");

  const { intro: toeObjectivesIntro, rows: toeObjectives } = termsToRows(toeObjectivesSection);
  const { intro: oeObjectivesIntro, rows: oeObjectives } = termsToRows(oeObjectivesSection);

  const securityObjectivesDefinitionText = objectivesSlice.objectiveDefinition || "";

  // SFR components
  const sfrComponents = [];
  const sfrData = {};
  const selectableLookup = buildSelectableLookup(sfrSections);

  Object.entries(sfrSections || {}).forEach(([familyUUID, familyComponents]) => {
    const sectionData = sfrs.sections?.[familyUUID];
    if (!sectionData || !familyComponents) return;

    Object.entries(familyComponents).forEach(([compUUID, comp]) => {
      if (!comp || comp.invisible) return;

      // Only export enabled SFRs
      // Mandatory SFRs won't have `enabled` set, so treat undefined as enabled
      // Determine enabled state
      const isOptional = comp.optional;
      const isObjective = comp.objective;
      const isSelectionBased = comp.selectionBased;
      const isToggleable = isOptional || isObjective;
      const hasInstances = Array.isArray(comp.instances) && comp.instances.length > 0;

      const manualEnabled = comp.enabled ?? false;
      const selectionInfo = isSelectionBased ? getSelectionDependencyInfo(comp.selections, selectableLookup) : { met: false, sources: [] };
      const autoEnabled = isSelectionBased && selectionInfo.met;
      const isDisabled = hasInstances || ((isToggleable || isSelectionBased) && !(manualEnabled || autoEnabled));

      if (isDisabled) return;

      const ccId = comp.cc_id || "";
      const iterationId = comp.iteration_id ? `/${comp.iteration_id}` : "";
      const compName = `${ccId}${iterationId}`;

      sfrComponents.push({
        uuid: compUUID,
        familyUUID,
        name: compName,
        description: comp.title || comp.definition || "",
        familyTitle: sectionData.title || "",
        elementMaps: buildElementMaps(comp, ccId, comp.iteration_id || ""),
      });

      sfrData[compUUID] = {
        elements: comp.elements || {},
      };
    });
  });

  // SAR components
  const sarComponents = [];
  const sarData = {};

  Object.entries(sars.sections || {}).forEach(([sectionUUID, sectionData]) => {
    if (!sectionData) return;

    (sectionData.componentIDs || []).forEach((compUUID) => {
      const comp = sars.components?.[compUUID];
      if (!comp) return;

      const compName = getSarComponentCode(comp);

      sarComponents.push({
        uuid: compUUID,
        sectionUUID,
        assuranceClass: getAssuranceClassTitle(sectionData.title || ""),
        name: compName,
        description: getSarDescription(comp.name || ""),
        elementMaps: buildSarElementMaps(comp, sars, compName),
      });

      sarData[compUUID] = {
        elements: Object.fromEntries((comp.elementIDs || []).map((elementUUID) => [elementUUID, sars.elements?.[elementUUID]]).filter(([, el]) => el)),
      };
    });
  });
  return {
    stTitle,
    stVersion,
    stDate,
    stAuthor,
    toeDeveloper,
    toeIdentifier,
    conformanceClaims,
    ccVersionRaw,
    ccErrataRaw,
    conformancePPClaims,
    conformancePackageClaims,
    technicalDecisions,
    securityProblemDefinitionText,
    threatsIntro,
    assumptionsIntro,
    ospsIntro,
    toeObjectivesIntro,
    oeObjectivesIntro,
    threats,
    assumptions,
    osps,
    securityObjectivesDefinitionText,
    toeObjectives,
    oeObjectives,
    sfrComponents,
    sfrs: sfrData,
    sarComponents,
    sarSlice: sars,
    sars: sarData,
    sfrSections,
    // Platform selection data (used by TOE Overview export)
    selectedPlatforms: state?.accordionPane?.platformData?.selectedPlatforms || [],
    availablePlatforms: state?.accordionPane?.platformData?.platforms || [],
  };
}

// Render a simple TOE Overview listing the selected platform names.
// selectedPlatformNames array from the platformData in the redux state.
function renderToeOverview(d) {
  const selectedPlatforms = d?.selectedPlatforms || [];
  const availablePlatforms = d?.availablePlatforms || [];

  const selectedPlatformNames = availablePlatforms.filter((platform) => selectedPlatforms.includes(platform.id)).map((platform) => platform.name);

  if (!selectedPlatformNames.length) {
    return `
        <h2> TOE Overview</h2>
        <div>
            <p>No platforms selected.</p>
        </div>
    `;
  }

  // Render each selected platform as a paragraph prefixed with a bullet
  const items = selectedPlatformNames.map((n) => `<p style="font-family: 'Times New Roman', Times, serif !important;">&#8226;&nbsp;${n}</p>`).join("\n");

  return `
        <h2> TOE Overview</h2>
        <div style="font-family: 'Times New Roman', Times, serif !important;">
            <h3>Selected Platforms</h3>
            ${items}
        </div>
    `;
}

// Section Builders
function section1(d) {
  const rows = [
    ["ST Name", d.stTitle],
    ["ST Version", d.stVersion],
    ["ST Date", d.stDate],
    ["ST Author", d.stAuthor],
    ["TOE Developer", d.toeDeveloper],
    ["TOE Identifier", d.toeIdentifier],
  ];
  return `
        <h2> 1) Security Target Introduction</h2>
        <h3> 1.1)  Security Target and TOE Reference</h3>
        <div>
            <p>This section provides the identification and version control information for the ST and this TOE.</p>
            ${table_from_matrix([["Category", "Identifier"], ...rows], true, "Security Target Metadata")}
        </div>
            ${renderToeOverview(d)}
    `;
}

// Conformance Claims
function mapCCVersion(ccVersionRaw) {
  if (!ccVersionRaw) return "";

  const map = {
    "cc-31r5": "CC version 3.1 revision 5",
    "cc-31r4": "CC version 3.1 revision 4",
    "cc-2022r1": "Common Criteria 2022, Revision 1",
    "cc-2022r2": "Common Criteria 2022, Revision 2",
  };

  if (map[ccVersionRaw]) {
    return map[ccVersionRaw];
  }
}

function renderCCConformanceClaims(d) {
  const { ccVersionRaw, ccErrataRaw } = d;
  const { part2Conformance, part3Conformance } = d.conformanceClaims || {};

  const ccVersionText = mapCCVersion(ccVersionRaw);
  const rows = [];

  if (ccVersionText) {
    rows.push(ccErrataRaw && ccErrataRaw !== "N/A" ? `${ccVersionText} (${ccErrataRaw})` : ccVersionText);
  }

  if (part2Conformance) {
    rows.push(`CC Part 2 ${part2Conformance}`);
  }

  if (part3Conformance) {
    rows.push(`CC Part 3 ${part3Conformance}`);
  }

  if (!rows.length) return "";

  return rows
    .map((text, idx) => {
      const letter = String.fromCharCode(97 + idx);
      return `<p>${letter})&nbsp;&nbsp;&nbsp;&nbsp;${text}</p>`;
    })
    .join("");
}

function section2(d) {
  const tdRows = (d.technicalDecisions || []).map((td) => [td.source, td.tdNumber, td.td, td.applied, td.reason]);
  const ccClaimsHtml = renderCCConformanceClaims(d);
  // Using paragraph tags to avoid Microsoft Word autoformat for list items
  // Paragraph tags ensure the font stays Times new Roman
  const ppAndPackageItems = [...(d.conformancePPClaims || []), ...(d.conformancePackageClaims || [])]
    .map((claim) => (typeof claim === "string" ? claim : claim?.text || ""))
    .filter(Boolean)
    .map((text) => `<p style="font-family: 'Times New Roman', Times, serif !important;">&#8226;&nbsp;${text}</p>`)
    .join("\n");

  return `
        <h2> 2) Conformance Claims</h2>
        <h3> 2.1) CC Conformance Claim</h3>
        <p>This ST supports the following conformance claims:</p>
        ${ccClaimsHtml}

        <h3> 2.2) PP Claims/Package Claims</h3>
        <p>This TOE is conformant to:</p>
        ${ppAndPackageItems}

        <h3> 2.3) NIAP Technical Decisions</h3>
        ${table_from_matrix([["PP", "TD", "TD Name", "Applied", "Rationale"], ...tdRows], true, "Technical Decisions")}

        <h3> 2.4) Conformance Rationale</h3>
`;
}

// Security Problem Definition
function section3(d) {
  const tRows = d.threats.map((t) => [t.id, t.description]);
  const aRows = d.assumptions.map((a) => [a.id, a.description]);
  const oRows = d.osps.map((o) => [o.id, o.description]);

  return `
        <h2> 3) Security Problem Definition</h2>

        ${
          d.securityProblemDefinitionText?.trim()
            ? `<p>${d.securityProblemDefinitionText}</p>`
            : `<p>
                The security problem definition has been taken from the base PP and is reproduced here for the
                convenience of the reader.
              </p>`
        }

        <h3> 3.1) Threats</h3>
        ${d.threatsIntro?.trim() ? `<p>${d.threatsIntro}</p>` : ""}
        ${tRows.length ? table_from_matrix([["ID", "Threat"], ...tRows], true, "Threats") : "There are no Threats defined for the TOE."}

        <h3> 3.2) Assumptions</h3>
        ${d.assumptionsIntro?.trim() ? `<p>${d.assumptionsIntro}</p>` : ""}
        ${aRows.length ? table_from_matrix([["ID", "Assumption"], ...aRows], true, "Assumptions") : "There are no Assumptions defined for the TOE."}

        <h3> 3.3) OSPs</h3>
        ${d.ospsIntro?.trim() ? `<p>${d.ospsIntro}</p>` : ""}
        ${oRows.length ? table_from_matrix([["ID", "OSP"], ...oRows], true, "Organizational Security Policies") : "There are no OSPs defined for the TOE."}
`;
}

// Security Objectives
function section4(d) {
  const toeRows = d.toeObjectives.map((o) => [o.id, o.description]);
  const oeRows = d.oeObjectives.map((o) => [o.id, o.description]);

  return `
        <h2> 4) Security Objectives</h2>

        ${
          d.securityObjectivesText?.trim()
            ? `<p>${d.securityObjectivesText}</p>`
            : `<p>The security objectives have been taken from the base PP and are reproduced here for the convenience of the reader.</p>`
        }

        <h3> 4.1) Security Objectives of the TOE</h3>
        ${d.toeObjectivesIntro?.trim() ? `<p>${d.toeObjectivesIntro}</p>` : ""}
        ${toeRows.length ? table_from_matrix([["ID", "TOE Objective"], ...toeRows], true, "Security Objectives for the TOE") : "There are no Security Objectives defined for the TOE."}

        <h3> 4.2) Security Objectives of the Operational Environment</h3>
        ${d.oeObjectivesIntro?.trim() ? `<p>${d.oeObjectivesIntro}</p>` : ""}
        ${oeRows.length ? table_from_matrix([["ID", "OE Objective"], ...oeRows], true, "Security Objectives for the Operational Environment") : "There are no Security Objectives defined for the Operational Environment."}

        <h3> 4.3) Security Objectives Rationale</h3>
`;
}

// Audit events table — rendered after all SFR blocks
function auditEventsTable(sfrSections) {
  const rows = [];

  Object.values(sfrSections || {}).forEach((family) => {
    Object.entries(family || {}).forEach(([compUUID, comp]) => {
      if (!comp || comp.invisible) return;

      const ccId = comp.cc_id || "";
      const iterationId = comp.iteration_id ? `/${comp.iteration_id}` : "";
      const compName = `${ccId}${iterationId}`;
      const auditEvents = comp.auditEvents || {};

      if (!Object.keys(auditEvents).length) {
        rows.push([compName, "No events specified", ""]);
        return;
      }

      Object.values(auditEvents).forEach((event) => {
        // Optional event: only export if checked, otherwise "No events specified"
        const descriptionCell = event.optional ? (event.checked ? event.description || "" : "No events specified") : event.description || "No events specified";

        const checkedItems = (event.items || []).filter((item) => item?.checked);
        const noneSelected = event.noneSelected;
        const hasOptionalItems = (event.items || []).some((item) => item?.optional);
        let additionalInfo;

        if (!event.items?.length) {
          // No items defined at all
          additionalInfo = "No additional information";
        } else if (!hasOptionalItems) {
          // All items are mandatory, show them
          additionalInfo = event.items
            .map((item) => item?.info || item?.text || item?.description || "")
            .filter(Boolean)
            .join("; ");
        } else if (noneSelected) {
          additionalInfo = "No additional information";
        } else if (checkedItems.length) {
          additionalInfo = checkedItems
            .map((item) => item?.info || item?.text || item?.description || "")
            .filter(Boolean)
            .join("; ");
        } else {
          // Optional items exist but nothing selected
          additionalInfo = "No events specified";
        }

        rows.push([compName, descriptionCell, additionalInfo]);
      });
    });
  });

  if (!rows.length) return "";

  return `
    <h3>Audit Events</h3>
    ${table_from_matrix([["Requirement", "Auditable Events", "Additional Audit Record Contents"], ...rows], true, "Auditable Security Events")}
  `;
}

// Security Requirements
function section5(d) {
  const { sfrComponents, sarComponents, sfrs, sars, sarSlice, sfrSections } = d;

  const sfrSummary = `
  ${table_from_matrix([["Requirement", "Description"], ...sfrComponents.map((c) => [c.name, c.description])], true, "Summary of Security Functional Requirements (SFRs)")}
`;

  const auditTable = auditEventsTable(sfrSections);

  let sfrBlocks = "";
  let funcCounter = 0;
  groupByClass(sfrComponents).forEach(({ label, components }) => {
    funcCounter++;
    sfrBlocks += `<div><h3> 5.1.${funcCounter}) ${label}</h3>`;
    components.forEach((comp) => {
      sfrBlocks += componentToHTML(comp.name, comp.description, sfrs[comp.uuid]?.elements || {}, comp.elementMaps);
      // Append audit events table after the last FAU_GEN element
      if (comp.name.startsWith("FAU_GEN")) {
        const isLastFauGen = !components.slice(components.indexOf(comp) + 1).some((c) => c.name.startsWith("FAU_GEN"));
        if (isLastFauGen) {
          sfrBlocks += auditTable;
        }
      }
    });
    sfrBlocks += `</div>`;
  });
  const sarSummary = sarRequirementsTable(sarSlice);

  let sarBlocks = "";
  let sarCounter = 0;
  groupByClass(sarComponents).forEach(({ label, components }) => {
    sarCounter++;
    sarBlocks += `<div><h3> 5.2.${sarCounter}) ${label}</h3>`;
    components.forEach((comp) => {
      sarBlocks += componentToHTML(comp.name, comp.description, sars[comp.uuid]?.elements || {}, comp.elementMaps);
    });
    sarBlocks += `</div>`;
  });

  return `
        <h2> 5) Security Requirements</h2>
        <h3> 5.1) Security Functional Requirements</h3>
        ${sfrSummary}
        ${sfrBlocks}
        <h3> 5.2) Security Assurance Requirements</h3>
        ${sarSummary}
        ${sarBlocks}
`;
}

// Custom free form area for user to enter based on ST
function section6() {
  return `
        <h3>TOE Summary Specification</h3>
        <h4>TOE Overview [freeform text]:</h4>
        <h4>TOE Description [freeform text]:</h4>
`;
}

/**
 * Build the ST HTML from the Redux stateObject.
 *
 * @param   {Object} stateObject  Full Redux state
 * @returns {string}
 */
export function buildSTHtml(stateObject) {
  _tableCounter = 0; // Reset for each export
  const d = selectData(stateObject);
  return [section1(d), section2(d), section3(d), section4(d), section5(d), section6()].join("\n\n");
}
