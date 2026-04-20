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

import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { SET_SFR_SECTIONS_INITIAL_STATE } from "../reducers/SFRs/sfrSectionSlice";
import { SET_SFRS_INITIAL_STATE } from "../reducers/SFRs/sfrSlice";
import { SET_SFR_BASE_PP_INITIAL_STATE } from "../reducers/SFRs/sfrBasePPsSlice";
import { SET_SARS_INITIAL_STATE } from "../reducers/sarsSlice";

/**
 * Extract sfrSections and sfrs from a JSON object
 * @param {Object} jsonData - The imported JSON data
 * @returns {Object} Object containing sfrSections and sfrs
 */
function extractSfrData(jsonData) {
  return {
    sfrSections: jsonData?.sfrSections || {},
    sfrs: jsonData?.sfrs || {},
  };
}

/**
 * Extract SAR data from a JSON object
 * @param {Object} jsonData - The imported JSON data
 * @returns {Object} The sars object
 */
function extractSarData(jsonData) {
  return jsonData?.sars || {};
}

/**
 * Generic merge function
 * Later objects override earlier ones if there are conflicts
 * @param {Array<Object>} objectsArray - Array of objects to merge
 * @returns {Object} - Merged object
 */
function mergeObjects(...objectsArray) {
  return Object.assign({}, ...objectsArray);
}

/**
 * Merge sfrSections, tagging each component with its source label
 * @param {...Object} sfrSectionsWithLabels - Array of objects with structure: { sfrSections: Object, label: string }
 * @returns {Object} - Merged sfrSections
 */
function mergeSfrSections(...sfrSectionsWithLabels) {
  const merged = {};

  sfrSectionsWithLabels.forEach(({ sfrSections, label }) => {
    Object.entries(sfrSections).forEach(([familyUUID, components]) => {
      // Merge components, tagging each with its source label
      const taggedComponents = {};
      Object.entries(components).forEach(([compUUID, compData]) => {
        taggedComponents[compUUID] = {
          ...compData,
          source: label,
        };
      });

      if (!merged[familyUUID]) {
        merged[familyUUID] = { ...taggedComponents };
      } else {
        merged[familyUUID] = {
          ...merged[familyUUID],
          ...taggedComponents,
        };
      }
    });
  });

  return merged;
}

/**
 * Deep merge SAR data from multiple sources.
 * Each SAR source is an object keyed by section UUIDs containing
 * { title, summary, components: { compUUID: { name, elements, ... } } }
 * Later sources override earlier ones for matching keys.
 *
 * @param {...Object} sarSources - SAR objects to merge
 * @returns {Object} - Merged SAR object
 */
function mergeSars(...sarSources) {
  const merged = {};

  sarSources.forEach((sars) => {
    if (!sars || typeof sars !== "object") return;

    Object.entries(sars).forEach(([sectionKey, sectionValue]) => {
      if (!sectionValue || typeof sectionValue !== "object") return;

      if (!merged[sectionKey]) {
        merged[sectionKey] = {
          ...sectionValue,
          components: { ...(sectionValue.components || {}) },
        };
      } else {
        // Merge section-level fields (title, summary, etc.)
        if (sectionValue.title) merged[sectionKey].title = sectionValue.title;
        if (sectionValue.summary) merged[sectionKey].summary = sectionValue.summary;

        // Merge components
        if (sectionValue.components) {
          merged[sectionKey].components = {
            ...merged[sectionKey].components,
            ...sectionValue.components,
          };
        }
      }
    });
  });

  return merged;
}

/**
 * Load SFR sections, SFRs, and SARs from selections and dispatch to Redux
 * @param {Object} dispatch - Redux dispatch function
 * @param {Object} selectedPP - Base PP JSON object (e.g., app, mdf)
 * @param {Array} selectedPackages - Array of selected package objects
 * @param {Array} selectedModules - Array of selected module objects
 * @returns {Object} Object with merged sfrSections, sfrs, and sars
 */
export function loadSfrSectionsFromSelections(dispatch, selectedPP, selectedPackages = [], selectedModules = []) {
  const allSfrSectionsWithLabels = [];
  const allSfrsSections = [];
  const allSfrBasePPs = [];
  const allSarSources = [];

  // Track the base PP label so we can exclude it from source chips
  let basePPLabel = null;

  // Maps familyUUID -> module label for additional/modified SFRs.
  // These families exist in the module's sfrSections but originate from
  // a base PP, so would be tagged with the base PP label.
  // This map lets us override with the correct module label.
  const additionalModifiedSourceOverrides = {};

  // Add base PP
  if (selectedPP) {
    const { sfrSections: ppSfrSections, sfrs: ppSfrs } = extractSfrData(selectedPP);
    const ppSars = extractSarData(selectedPP);
    const ppName = selectedPP?.accordionPane?.metadata?.ppName || "Base PP";
    basePPLabel = ppName;

    if (Object.keys(ppSfrSections).length > 0) {
      allSfrSectionsWithLabels.push({
        sfrSections: ppSfrSections,
        label: ppName,
      });
    }

    if (ppSfrs?.sections && Object.keys(ppSfrs.sections).length > 0) {
      allSfrsSections.push(ppSfrs.sections);
    }

    if (Object.keys(ppSars).length > 0) {
      allSarSources.push(ppSars);
    }
  }

  // Add packages
  selectedPackages.forEach((pkg) => {
    if (pkg.pkgJson && pkg.pkgJson !== "none") {
      const { sfrSections: pkgSfrSections, sfrs: pkgSfrs } = extractSfrData(pkg.pkgJson);
      const pkgSars = extractSarData(pkg.pkgJson);

      // Resolve package label
      const pkgMeta = pkg.pkgJson?.accordionPane?.metadata;
      const pkgLabel = pkg.label || pkgMeta?.ppName || pkgMeta?.xmlTagMeta?.attributes?.name || "Package";

      if (Object.keys(pkgSfrSections).length > 0) {
        allSfrSectionsWithLabels.push({
          sfrSections: pkgSfrSections,
          label: pkgLabel,
        });
      }

      if (pkgSfrs?.sections && Object.keys(pkgSfrs.sections).length > 0) {
        allSfrsSections.push(pkgSfrs.sections);
      }

      if (Object.keys(pkgSars).length > 0) {
        allSarSources.push(pkgSars);
      }
    }
  });

  // Identify the selected base PP's name for matching against module sfrBasePPs
  const selectedPPName = selectedPP?.accordionPane?.metadata?.xmlTagMeta?.attributes?.name || selectedPP?.accordionPane?.metadata?.ppName || null;

  // Add modules
  selectedModules.forEach((mod) => {
    if (mod.pkgJson && mod.pkgJson !== "none") {
      const { sfrSections: modSfrSections, sfrs: modSfrs } = extractSfrData(mod.pkgJson);
      const modSars = extractSarData(mod.pkgJson);

      // Resolve module label: use mod.label, fall back to JSON metadata
      const modMeta = mod.pkgJson?.accordionPane?.metadata;
      const modLabel = mod.label || modMeta?.ppName || modMeta?.xmlTagMeta?.attributes?.name || "Module";

      // Build a set of family UUIDs from sfrBasePPs entries that do NOT match
      // the selected base PP. These families should be excluded from sfrSections.
      const excludedFamilyUUIDs = new Set();

      const modSfrBasePPs = mod.pkgJson?.sfrBasePPs || {};
      Object.entries(modSfrBasePPs).forEach(([_, bp]) => {
        if (!bp || typeof bp !== "object") return;

        const decl = bp?.declarationAndRef || {};
        const bpName = decl.name || "";
        const isMatchingBP = !selectedPPName || bpName === selectedPPName;

        // Only care about additional/modified SFRs for the base PP that has been selected
        ["additionalSfrs", "modifiedSfrs"].forEach((sfrType) => {
          const sfrSections = bp?.[sfrType]?.sfrSections || {};
          Object.keys(sfrSections).forEach((familyUUID) => {
            if (isMatchingBP) {
              additionalModifiedSourceOverrides[familyUUID] = modLabel;
            } else {
              excludedFamilyUUIDs.add(familyUUID);
            }
          });
        });
      });

      // Filter module sfrSections to exclude families from non-selected base PPs
      const filteredModSfrSections = {};
      Object.entries(modSfrSections).forEach(([familyUUID, components]) => {
        if (!excludedFamilyUUIDs.has(familyUUID)) {
          filteredModSfrSections[familyUUID] = components;
        }
      });

      if (Object.keys(filteredModSfrSections).length > 0) {
        allSfrSectionsWithLabels.push({
          sfrSections: filteredModSfrSections,
          label: modLabel,
        });
      }

      if (modSfrs?.sections && Object.keys(modSfrs.sections).length > 0) {
        allSfrsSections.push(modSfrs.sections);
      }

      if (modSfrBasePPs && typeof modSfrBasePPs === "object") {
        allSfrBasePPs.push(modSfrBasePPs);
      }

      if (Object.keys(modSars).length > 0) {
        allSarSources.push(modSars);
      }
    }
  });

  // Merge SFR data
  const mergedSfrSections = mergeSfrSections(...allSfrSectionsWithLabels);
  const mergedSfrs = { sections: mergeObjects(...allSfrsSections) };

  // Post-process mergedSfrSections:
  // 1. Remove source from base PP components (no chip for base PP SFRs)
  // 2. Override source with module label for additional/modified SFR families
  Object.entries(mergedSfrSections).forEach(([familyUUID, components]) => {
    const moduleOverride = additionalModifiedSourceOverrides[familyUUID];

    Object.entries(components).forEach(([_, compData]) => {
      if (moduleOverride) {
        // This is an additional/modified SFR family — use the module label
        compData.source = moduleOverride;
      } else if (compData.source === basePPLabel) {
        // Base PP component — remove the source so no chip appears
        delete compData.source;
      }
    });
  });

  // Merge SAR data
  const mergedSars = mergeSars(...allSarSources);

  // Dispatch to Redux
  dispatch(SET_SFR_SECTIONS_INITIAL_STATE(mergedSfrSections));
  dispatch(SET_SFRS_INITIAL_STATE(mergedSfrs));
  dispatch(SET_SARS_INITIAL_STATE(mergedSars));

  // Merge and dispatch sfrBasePPs from all modules
  if (allSfrBasePPs.length > 0) {
    const mergedSfrBasePPs = mergeObjects(...allSfrBasePPs);
    dispatch(SET_SFR_BASE_PP_INITIAL_STATE(mergedSfrBasePPs));
  }

  return { sfrSections: mergedSfrSections, sfrs: mergedSfrs, sars: mergedSars };
}

/**
 * React hook to automatically load SFR sections when selections change
 * @param {Object} selectedPP - Base PP selection
 * @param {Array} selectedPackages - Package selections
 * @param {Array} selectedModules - Module selections
 */
export function useLoadSfrSections(selectedPP, selectedPackages, selectedModules) {
  const dispatch = useDispatch();

  useEffect(() => {
    loadSfrSectionsFromSelections(dispatch, selectedPP, selectedPackages, selectedModules);
  }, [selectedPP, selectedPackages, selectedModules]);
}
