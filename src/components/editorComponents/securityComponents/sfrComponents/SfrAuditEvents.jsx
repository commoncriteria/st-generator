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
import { useState } from "react";
import { useSelector } from "react-redux";
import { Checkbox, FormControlLabel } from "@mui/material";
import store from "../../../../app/store.js";
import { UPDATE_SFR_AUDIT_EVENT, UPDATE_SFR_ADDITIONAL_AUDIT } from "../../../../reducers/SFRs/sfrSectionSlice.js";
import CardTemplate from "../CardTemplate.jsx";

/**
 * The SfrAuditEvents class that displays the audit events table (under FAU_GEN) for all SFRs
 * @returns {JSX.Element}
 */
function SfrAuditEvents() {
  const { component } = useSelector((state) => state.sfrWorksheetUI);
  const sfrSections = useSelector((state) => state.sfrSections);
  const { primary } = useSelector((state) => state.styling);
  const [open, setOpen] = useState(true);

  const isFauGen = (component?.cc_id || "").startsWith("FAU_GEN");
  if (!isFauGen) return null;

  // Collect all audit events from every SFR
  const rows = [];
  Object.values(sfrSections || {}).forEach((family) => {
    Object.entries(family || {}).forEach(([compUUID, comp]) => {
      if (!comp || comp.invisible) return;

      const ccId = comp.cc_id || "";
      const iterationId = comp.iteration_id ? `/${comp.iteration_id}` : "";
      const compName = `${ccId}${iterationId}`;
      const sfrFamilyUUID = Object.keys(sfrSections).find((fUUID) => sfrSections[fUUID]?.[compUUID]);
      const auditEvents = comp.auditEvents || {};

      if (!Object.keys(auditEvents).length) {
        rows.push({ compUUID, eventUUID: null, compName, sfrUUID: sfrFamilyUUID, description: null, items: [], optional: false, checked: false });
      } else {
        Object.entries(auditEvents).forEach(([eventUUID, event]) => {
          rows.push({
            compUUID,
            eventUUID,
            compName,
            sfrUUID: sfrFamilyUUID,
            description: event.description || "",
            items: event.items || [],
            optional: event.optional || false,
            checked: event.checked || false,
            noneSelected: event.noneSelected || false,
          });
        });
      }
    });
  });

  if (!rows.length) return null;

  const handleEventCheck = (row, checked) => {
    // Toggles like a radio button
    store.dispatch(
      UPDATE_SFR_AUDIT_EVENT({
        sfrUUID: row.sfrUUID,
        componentUUID: row.compUUID,
        eventUUID: row.eventUUID,
        checked,
        noneSelected: checked ? false : row.noneSelected,
      })
    );
  };

  const handleAdditionalEventCheck = (row, itemIndex, checked) => {
    // Toggles like a radio button
    store.dispatch(
      UPDATE_SFR_ADDITIONAL_AUDIT({
        sfrUUID: row.sfrUUID,
        componentUUID: row.compUUID,
        eventUUID: row.eventUUID,
        itemIndex,
        checked,
      })
    );
    if (checked && row.noneSelected) {
      store.dispatch(
        UPDATE_SFR_AUDIT_EVENT({
          sfrUUID: row.sfrUUID,
          componentUUID: row.compUUID,
          eventUUID: row.eventUUID,
          checked: row.checked,
          noneSelected: false,
        })
      );
    }
  };

  const handleNoneCheck = (row, checked) => {
    // Toggles like a radio button

    store.dispatch(
      UPDATE_SFR_AUDIT_EVENT({
        sfrUUID: row.sfrUUID,
        componentUUID: row.compUUID,
        eventUUID: row.eventUUID,
        checked: checked ? false : row.checked,
        noneSelected: checked,
      })
    );
  };

  const cellStyle = {
    border: "1px solid #ccc",
    padding: "8px 12px",
    verticalAlign: "top",
    fontSize: "0.9rem",
  };

  const headerCellStyle = {
    ...cellStyle,
    fontWeight: "bold",
    backgroundColor: "#f5f5f5",
    color: primary,
    fontSize: "0.85rem",
  };

  const renderAdditionalInfo = (row) => {
    if (row.description === null) return null;

    // Check if any items are optional (optional indicates a checkbox)
    const hasOptionalItems = row.items.some((item) => item?.optional === true);

    if (!hasOptionalItems) {
      // All mandatory — render as plain text
      const text = row.items
        .map((item) => (typeof item === "string" ? item : item?.info || item?.text || item?.description || ""))
        .filter(Boolean)
        .join("; ");
      return text ? <span>{text}</span> : <span style={{ color: "#888", fontStyle: "italic" }}>No additional information</span>;
    }

    // Has optional items — render each as checkbox, plus a "No additional information" checkbox
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {row.items.map((item, idx) => {
          const label = typeof item === "string" ? item : item?.info || item?.text || item?.description || "";
          if (!item?.optional) {
            // Mandatory item — plain text
            return <span key={idx}>{label}</span>;
          }
          return (
            <FormControlLabel
              key={idx}
              disableTypography
              onClick={(e) => e.stopPropagation()}
              control={
                <Checkbox
                  id={`item-${row.compUUID}-${row.eventUUID}-${idx}`}
                  size='small'
                  checked={Boolean(item.checked)}
                  onChange={(e) => handleAdditionalEventCheck(row, idx, e.target.checked)}
                  sx={{ paddingTop: "2px", paddingBottom: "2px" }}
                />
              }
              label={<span style={{ fontSize: "0.9rem" }}>{label}</span>}
              sx={{ alignItems: "flex-start", margin: 0 }}
            />
          );
        })}
        {/* "No additional information" as a mutually exclusive option */}
        <FormControlLabel
          disableTypography
          onClick={(e) => e.stopPropagation()}
          control={
            <Checkbox
              id={`item-none-${row.compUUID}-${row.eventUUID}`}
              size='small'
              checked={Boolean(row.noneSelected)}
              onChange={(e) => {
                const checked = e.target.checked;
                // Selecting "No additional information" unchecks all optional items
                if (checked) {
                  row.items.forEach((item, idx) => {
                    if (item?.optional && item?.checked) {
                      store.dispatch(
                        UPDATE_SFR_ADDITIONAL_AUDIT({
                          sfrUUID: row.sfrUUID,
                          componentUUID: row.compUUID,
                          eventUUID: row.eventUUID,
                          itemIndex: idx,
                          checked: false,
                        })
                      );
                    }
                  });
                }
                store.dispatch(
                  UPDATE_SFR_AUDIT_EVENT({
                    sfrUUID: row.sfrUUID,
                    componentUUID: row.compUUID,
                    eventUUID: row.eventUUID,
                    checked: row.checked,
                    noneSelected: checked,
                  })
                );
              }}
              sx={{ paddingTop: "2px", paddingBottom: "2px" }}
            />
          }
          label={<span style={{ fontSize: "0.9rem", color: "#888", fontStyle: "italic" }}>No additional information</span>}
          sx={{ alignItems: "flex-start", margin: 0 }}
        />
      </div>
    );
  };

  const renderAuditEvent = (row) => {
    if (!row.description) {
      return <span style={{ color: "#888", fontStyle: "italic" }}>No events specified</span>;
    }
    if (!row.optional) {
      return <span dangerouslySetInnerHTML={{ __html: row.description }} />;
    }
    // Optional event — checkbox + None option
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        <FormControlLabel
          disableTypography
          onClick={(e) => e.stopPropagation()}
          control={
            <Checkbox
              id={`event-${row.compUUID}-${row.eventUUID}`}
              size='small'
              checked={Boolean(row.checked)}
              onChange={(e) => handleEventCheck(row, e.target.checked)}
              sx={{ paddingTop: "2px", paddingBottom: "2px" }}
            />
          }
          label={<span style={{ fontSize: "0.9rem" }} dangerouslySetInnerHTML={{ __html: row.description }} />}
          sx={{ alignItems: "flex-start", margin: 0 }}
        />
        <FormControlLabel
          disableTypography
          onClick={(e) => e.stopPropagation()}
          control={
            <Checkbox
              id={`event-none-${row.compUUID}-${row.eventUUID}`}
              size='small'
              checked={Boolean(row.noneSelected)}
              onChange={(e) => handleNoneCheck(row, e.target.checked)}
              sx={{ paddingTop: "2px", paddingBottom: "2px" }}
            />
          }
          label={<span style={{ fontSize: "0.9rem", color: "#888", fontStyle: "italic" }}>None</span>}
          sx={{ alignItems: "flex-start", margin: 0 }}
        />
      </div>
    );
  };

  return (
    <CardTemplate
      type={"parent"}
      title={"Audit Events"}
      tooltip={"Audit Events"}
      collapse={open}
      collapseHandler={() => setOpen(!open)}
      body={
        <div style={{ padding: "8px 16px 16px" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
              <thead>
                <tr>
                  <th style={headerCellStyle}>Requirement</th>
                  <th style={headerCellStyle}>Auditable Events</th>
                  <th style={headerCellStyle}>Additional Audit Record Contents</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.compUUID}-${row.eventUUID ?? "empty"}`}>
                    <td style={cellStyle}>{row.compName}</td>
                    <td style={cellStyle}>{renderAuditEvent(row)}</td>
                    <td style={cellStyle}>{renderAdditionalInfo(row)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      }
    />
  );
}

export default SfrAuditEvents;
