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
import { useTheme } from "@mui/material/styles";
import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Box, Chip, FormControl, InputLabel, ListSubheader, MenuItem, Select } from "@mui/material";

// Style
function getStyles(name, selections, theme) {
  return {
    fontWeight: typeof selections !== "string" && selections.indexOf(name) === -1 ? theme.typography.fontWeightRegular : theme.typography.fontWeightMedium,
  };
}

/**
 * The MultiSelectDropdown class that a generic multiselect dropdown
 * @returns {JSX.Element} the content
 * @constructor passes in props to the class
 */
function MultiSelectDropdown(props) {
  // Prop Validation
  MultiSelectDropdown.propTypes = {
    title: PropTypes.string.isRequired,
    selectId: PropTypes.string,
    selectionOptions: PropTypes.oneOfType([PropTypes.array.isRequired, PropTypes.object.isRequired]),
    selections: PropTypes.oneOfType([PropTypes.array.isRequired, PropTypes.string.isRequired]),
    handleSelections: PropTypes.func.isRequired,
    elementData: PropTypes.object,
    groupID: PropTypes.string,
    multiple: PropTypes.bool,
    disabled: PropTypes.bool,
    index: PropTypes.number,
    style: PropTypes.string,
    required: PropTypes.bool,
    handleOpenModal: PropTypes.func,
    defaultValue: PropTypes.oneOfType([PropTypes.array, PropTypes.string]),
  };

  // Constants
  const theme = useTheme();
  const headerStyle = { color: props.style === "primary" ? "#d926a9" : "#1FB2A6", fontSize: "13px", fontWeight: 600 };
  const [menuStyle, setMenuStyle] = useState({ fontSize: "13px", fontWeight: 500 });

  const msdId = useMemo(() => (props.id || props.selectId ? [props.selectId, props.id].filter((v) => v).join("_") : undefined), [props.selectId, props.id]);
  const msdLabelId = useMemo(() => (msdId ? `${msdId}_label` : undefined), [msdId]);

  // Use Effects
  useEffect(() => {
    if (props.style === "primary") {
      setMenuStyle({
        "&.Mui-selected": { backgroundColor: "#F8D8EF", opacity: "0.9", "&:hover": { backgroundColor: "#FCEFF9", opacity: "0.9" } },
        "&:hover": { backgroundColor: "#FCEFF9", opacity: "0.9" },
        fontSize: "13px",
        fontWeight: 500,
      });
    }
  }, [props.style]);

  // Methods
  const handleChange = (event) => {
    const {
      target: { value },
    } = event;
    let newSelections = typeof value === "string" ? value.split(",") : value;

    if (props.elementData) {
      props.handleSelections({ selections: newSelections }, props.elementData.uuid, props.elementData.index, "update");
    } else {
      props.handleSelections(props.title, newSelections, props.index);
    }
  };
  const getSelectionMenu = () => {
    return Object.entries(props.selectionOptions).map(([key, value]) => {
      let title = key === "complexSelectables" || key === "ComplexSelectablesEA" ? "Complex Selectables" : key.charAt(0).toUpperCase() + key.slice(1);
      const includesDisabled = typeof value !== "string" && value.hasOwnProperty("disabled") && value.hasOwnProperty("label");
      const noMenuItems = (title === "Groups" && value.length === 1 && value[0] === props.groupID) || value.length === 0;

      if (noMenuItems) {
        return;
      } else if (typeof value !== "string" && !value.hasOwnProperty("disabled")) {
        return [
          <ListSubheader sx={headerStyle}>{title}</ListSubheader>,
          value?.map((option) => {
            if (
              (key !== "groups" || (key === "groups" && props.groupID !== option)) &&
              (key !== "complexSelectables" || (key === "complexSelectables" && props.groupID !== option))
            ) {
              return (
                <MenuItem style={getStyles(option, props.selections, theme)} sx={menuStyle} key={option} value={option}>
                  {option}
                </MenuItem>
              );
            }
          }),
        ];
      } else if (includesDisabled) {
        const { label, disabled } = value;

        return (
          <MenuItem style={getStyles(label, props.selections, theme)} sx={menuStyle} key={label} value={label} disabled={disabled}>
            {label}
          </MenuItem>
        );
      } else if (typeof value === "string") {
        return (
          <MenuItem style={getStyles(value, props.selections, theme)} sx={menuStyle} key={value} value={value}>
            {value}
          </MenuItem>
        );
      }
    });
  };

  // Return Method
  return (
    <div key={`${props.id}-multi-select-dropdown`} className='w-full'>
      <FormControl fullWidth>
        <InputLabel
          id={msdLabelId}
          required={props.required !== undefined ? props.required : false}
          color={props.style === "primary" ? "secondary" : "primary"}>
          {props.title}
        </InputLabel>
        <Select
          defaultValue={props.defaultValue !== undefined ? props.defaultValue : null}
          color={props.style === "primary" ? "secondary" : "primary"}
          key={props.id}
          id={msdId}
          labelId={msdLabelId}
          MenuProps={msdId ? { "data-testid": `${msdId}_menu` } : undefined}
          label={props.title}
          multiple={props.multiple !== undefined ? props.multiple : true}
          disabled={props.disabled !== undefined ? props.disabled : false}
          value={props.selections}
          onChange={handleChange}
          autoWidth
          sx={{ textAlign: "left" }}
          renderValue={(selected) => (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
              {typeof selected === "object"
                ? selected?.map((value) =>
                    props.multiple !== undefined && props.multiple === false ? (
                      value
                    ) : (
                      <Chip
                        sx={{
                          padding: theme.spacing(1),
                          height: "100%",
                          display: "flex",
                          flexDirection: "row",
                          "& .MuiChip-label": { overflowWrap: "break-word", whiteSpace: "normal", textOverflow: "clip", fontSize: "12px" },
                        }}
                        key={value}
                        label={value}
                      />
                    )
                  )
                : selected}
            </Box>
          )}>
          {getSelectionMenu()}
        </Select>
      </FormControl>
    </div>
  );
}

// Export MultiSelectDropdown.jsx
export default MultiSelectDropdown;
