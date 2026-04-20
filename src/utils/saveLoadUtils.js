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

// Utility helpers shared between save/load progress components
export const normalizeComponentId = (component) => {
  if (!component) return "component";
  if (component.xml_id && component.xml_id !== "") return String(component.xml_id);
  const cc = component.cc_id ? String(component.cc_id).toLowerCase() : "component";
  const iter = component.iteration_id ? String(component.iteration_id) : "";
  return iter && iter !== "" ? `${cc}.${iter}` : cc;
};

/**
 * Ensure a unique key for export based on existing actions.
 * If baseKey is not present in actions, returns baseKey. Otherwise appends
 * a suffix with the type and numeric disambiguator (e.g. ':assignment:1').
 */
export const getUniqueKey = (actions, baseKey, type) => {
  if (!actions || !baseKey) return baseKey;
  if (!actions[baseKey]) return baseKey;
  const baseSuffix = `:${type}`;
  let candidate = `${baseKey}${baseSuffix}`;
  let i = 1;
  while (actions[candidate]) {
    candidate = `${baseKey}${baseSuffix}:${i++}`;
  }
  return candidate;
};

/**
 * Find the stored action key that corresponds to the given baseKey and type.
 * Returns the exact key present in actions (could be the baseKey or a
 * suffixed/numbered variant), or null if none found.
 */
export const findActionKey = (actions, baseKey, type) => {
  if (!actions || !baseKey) return null;
  const baseSuffix = `:${type}`;
  const suffixed = `${baseKey}${baseSuffix}`;
  if (Object.prototype.hasOwnProperty.call(actions, suffixed)) return suffixed;
  if (Object.prototype.hasOwnProperty.call(actions, baseKey)) return baseKey;
  // check number based keys
  let i = 1;
  while (i <= 1000) {
    const candidate = `${baseSuffix}:${i++}`;
    const key = `${baseKey}${candidate}`;
    if (Object.prototype.hasOwnProperty.call(actions, key)) return key;
  }
  // as a last resort, try any action key that starts with baseKey + ':'
  const prefix = `${baseKey}:`;
  for (const k of Object.keys(actions)) {
    if (k.startsWith(prefix)) return k;
  }
  return null;
};

export default { normalizeComponentId, getUniqueKey, findActionKey };
