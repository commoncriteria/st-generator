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
import PropTypes from "prop-types";
import { Card, CardContent, Typography, List } from "@mui/material";
import EditableTable from "../editorComponents/EditableTable.jsx";
import { useSelector } from "react-redux";
import { CREATE_TD, UPDATE_TD, ADD_SFR_TO_TD_DEFAULT } from "../../reducers/ST/tdSlice.js";
import { handleSnackBarError, handleSnackBarSuccess } from "../../utils/securityComponents.jsx";

/**
 * The MetadataTD class that displays the PPs Selected with their TDs
 * @param {*} props
 * @returns
 */
function MetadataTD(props) {
  // Prop Validation
  MetadataTD.propTypes = {
    selectedPP: PropTypes.object.isRequired,
    selectedPackages: PropTypes.array.isRequired,
    selectedModules: PropTypes.array.isRequired,
  };

  // Constants
  const tds = useSelector((state) => state.stTD);

  const ppMeta = props.selectedPP?.accordionPane?.metadata;

  const columnData = [
    { headerName: "TD Number", field: "tdNumber", editable: false, resizable: true, type: "Editor", flex: 1 },
    { headerName: "Technical Decision", field: "td", editable: false, resizable: true, type: "Editor", flex: 2 },
    { headerName: "Sfrs", field: "components", editable: false, resizable: true, type: "Editor", flex: 3 },
    { headerName: "Reason", field: "reason", editable: true, resizable: true, type: "Multiline", flex: 3 },
  ];
  const editable = { addColumn: false, addRow: false, removeColumn: false, removeRow: false };
  const defaultReasonValue = "Edit Reason";
  const state = store.getState();

  // Methods

  /**
   * Formats the uniquePP which will be the ppName+ppversion + mod.value or pkg.value
   * @param uniquePP the uniquePP
   */
  const formatUniquePP = (uniquePP) => {
    return uniquePP
      .toLowerCase() // make all lower case
      .replace(/[^\w\s-]/g, "") // remove punctuation except _ and -
      .replace(/\s+/g, "_") // replace spaces with _
      .trim(); // optional: remove leading/trailing spaces
  };

  /**
   * Populates TD Rows for Editable Table
   * @param sfrs sfrs from selected pps, pkg, or mod
   * @param sfrSections sfrSections from selected pps, pkg, or mod
   * @param rowArray row array for editable table
   * @param uniquePP unique identifier for selected PP that associates tdNumber with pp
   */
  const tdRows = (sfrs, sfrSections, rowArray, uniquePP) => {
    let tdRows = {};
    Object.entries(sfrSections || {}).map(([familyKey, components], i) => {
      // Build list of matching SFRs for this TD default entry.
      // Only include SFRs whose cc_id is present in the tdDefaults cc_ids array
      // AND only when the uniquePP ends with the tdDefaults section value.
      for (const [sfrKey, component] of Object.entries(components || {})) {
        const compCcId = component?.cc_id || "";
        // temporary dictionary keyed by `${tdNumber}-${uniquePP}` to collect matched SFRs/components
        const tdDefaults = tds?.tdDefaults || {};
        try {
          Object.entries(tdDefaults).forEach(([tdDefaultKey, tdDefaultVal]) => {
            const ccIds = Array.isArray(tdDefaultVal?.cc_ids) ? tdDefaultVal.cc_ids : tdDefaultVal?.cc_ids ? [tdDefaultVal.cc_ids] : [];
            if (!ccIds || ccIds.length === 0) return;
            ccIds.forEach((cc) => {
              const ccVal = (cc || "").toString();
              const compVal = (compCcId || "").toString();
              // Only consider this a match when the component cc_id matches
              // AND the uniquePP ends with the tdDefault section (if provided).
              const sectionVal = (tdDefaultVal?.section || "").toString();
              const uniqueEndsWithSection = sectionVal ? uniquePP.endsWith(sectionVal) : true;
              // Allow a match when ccVal is a single space (" ") OR when the cc_id
              // starts with the component value (case-insensitive)
              const isSingleSpace = ccVal === " ";
              const isMatch = (isSingleSpace || (compVal && ccVal.toLowerCase().startsWith(compVal.toLowerCase()))) && uniqueEndsWithSection;
              // when a tdDefault cc matches this component, record it in the tdRows dictionary
              if (isMatch) {
                const tdNumberLocal = tdDefaultVal?.tdNumber || "";
                const dictKey = `${tdNumberLocal}-${uniquePP}`;
                if (!tdRows[dictKey]) {
                  tdRows[dictKey] = {
                    tdNumber: tdNumberLocal,
                    td: tdDefaultVal?.title || sfrs?.sections?.[familyKey]?.title || familyKey,
                    components: [],
                    reason: defaultReasonValue,
                    uniquePP: uniquePP,
                    sfrs: [],
                  };
                }
                // push SFR uuid and component cc (keep unique)
                if (!tdRows[dictKey].sfrs.includes(sfrKey)) tdRows[dictKey].sfrs.push(sfrKey);
                if (!tdRows[dictKey].components.includes(ccVal)) tdRows[dictKey].components.push(ccVal || "");

                // only dispatch if the matched TD entry doesn't already include this uuid
                const already = tdDefaultVal?.sfrs?.includes(sfrKey);
                if (!already) {
                  store.dispatch(ADD_SFR_TO_TD_DEFAULT({ tdNumber: tdNumberLocal, uuid: sfrKey }));
                }

                // attach reason if present in existing state
                let matchReason = Object.entries(state.stTD).find(([k, v]) => v.uniquePP === uniquePP && v.tdNumber === tdNumberLocal);
                if (matchReason) {
                  const [, matchedValue] = matchReason;
                  tdRows[dictKey].reason = matchedValue?.tdReason || defaultReasonValue;
                }
              }
            });
          });
        } catch (err) {
          console.error("Error processing tdDefaults cc_ids:", err);
        }
      }
    });
    // After processing all components in this family, merge tdRows entries into rowArray
    try {
      Object.entries(tdRows)
        .sort((a, b) => b[0].localeCompare(a[0]))
        .forEach(([dictKey, dictVal]) => {
          const { tdNumber: dTdNumber, td: dTd, components: dComps, reason: dReason, uniquePP: dUniquePP, sfrs: dSfrs } = dictVal;
          const components = (dComps || []).join(", ");
          const sfrs = (dSfrs || []).join(", ");

          rowArray.push({ tdNumber: dTdNumber, td: dTd, components: components, reason: dReason, uniquePP: dUniquePP, sfrs: sfrs });
        });
    } catch (err) {
      // Log any unexpected error during merge so UI doesn't crash
      console.error("Error merging tdRows into rowArray:", err);
    }
  };
  let rowPP = [];

  // Build a safe, trimmed PP value from name and version
  // Using nullish coalescing operator ??
  // Missing values become empty strings and we don't accidentally get undefined
  const ppValue = `${ppMeta?.ppName ?? ""} ${ppMeta?.version ?? ""}`.trim(); // Name + Version to ensure unique PP
  const uniquePPValue = formatUniquePP(ppValue);
  tdRows(props.selectedPP?.sfrs || {}, props.selectedPP.sfrSections || {}, rowPP, uniquePPValue);

  let rowPackages = [];
  for (const pkg of props.selectedPackages) {
    let uniquePkgValue = formatUniquePP(ppValue + "-" + pkg.value);
    tdRows(pkg?.pkgJson?.sfrs || {}, pkg?.pkgJson?.sfrSections || {}, rowPackages, uniquePkgValue);
  }

  let rowModules = [];
  for (const mod of props.selectedModules) {
    let uniqueModValue = formatUniquePP(ppValue + "-" + mod.value);
    tdRows(mod?.pkgJson?.sfrs || {}, mod?.pkgJson?.sfrSections || {}, rowModules, uniqueModValue);
  }

  /**
   * Handles updating the table row(s)
   * @param event the event
   */
  const handleUpdateTableRow = async (event) => {
    try {
      const { data, newValue } = event;
      const { td, tdNumber, uniquePP, sfrs } = data;

      // first create or get existing td, make empty if none
      let reasonValue = newValue || "";

      let currentTd = await store.dispatch(
        CREATE_TD({
          title: td,
          tdNumber: tdNumber,
          tdReason: reasonValue,
          sfrs: sfrs,
          uniquePP: uniquePP,
        })
      ).payload;

      //then update it
      const uuid = currentTd.uuid;
      let updatedTd = await store.dispatch(
        UPDATE_TD({
          uuid: uuid,
          tdReason: reasonValue,
        })
      ).payload;

      handleSnackBarSuccess(`TD reason updated.`);
    } catch (err) {
      handleSnackBarError(err);
    }
  };

  /**
   * Handles the local collapse of the editable for tds
   */
  const handleCollapse = () => {
    // TODO make this save reason on collapse
    // console.log("td table closing");
  };

  return (
    <div>
      <Card sx={{ mt: 2 }}>
        <CardContent>
          {/* Base PP */}
          <Typography variant='subtitle1' color='primary'>
            Base Protection Profile TDs
          </Typography>
          {ppMeta ? (
            <EditableTable
              collapse={false}
              title={`${ppMeta.ppName} ${ppMeta.version}`}
              editable={editable}
              columnData={columnData}
              rowData={rowPP}
              handleCollapse={handleCollapse}
              handleUpdateTableRow={handleUpdateTableRow}
            />
          ) : (
            <Typography variant='body2' sx={{ mb: 2 }}>
              None selected
            </Typography>
          )}

          {/* Functional Packages */}
          <Typography variant='subtitle1' color='primary'>
            Packages/Modules TDs
          </Typography>
          {props.selectedPackages.length > 0 ? (
            <List className='w-full mt-2'>
              {props.selectedPackages.map((pkg) => (
                <EditableTable
                  key={pkg.id}
                  collapse={false}
                  title={`Functional Package: ${pkg.label}`}
                  editable={editable}
                  columnData={columnData}
                  rowData={rowPackages.filter((row) => row.uniquePP === formatUniquePP(ppValue + "-" + pkg.value))}
                  handleCollapse={handleCollapse}
                  handleUpdateTableRow={handleUpdateTableRow}
                />
              ))}
            </List>
          ) : (
            <Typography variant='body2' sx={{ mb: 2 }}>
              None selected
            </Typography>
          )}

          {/* Modules */}
          {props.selectedModules.length > 0 ? (
            <List className='w-full mt-2'>
              {props.selectedModules.map((mod) => (
                <EditableTable
                  key={mod.id}
                  collapse={false}
                  title={`Module: ${mod.label}`}
                  editable={editable}
                  columnData={columnData}
                  rowData={rowModules.filter((row) => row.uniquePP === formatUniquePP(ppValue + "-" + mod.value))}
                  handleCollapse={handleCollapse}
                  handleUpdateTableRow={handleUpdateTableRow}
                />
              ))}
            </List>
          ) : (
            <Typography variant='body2'>None selected</Typography>
          )}
        </CardContent>
      </Card>{" "}
    </div>
  );
}

export default MetadataTD;
