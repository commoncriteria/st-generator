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
import { createSlice } from "@reduxjs/toolkit";
import { alpha } from "@mui/material";

// Constants
const primary = "#d926a9";
const secondary = "#1FB2A6";
const lightGray = "#9E9E9E";
const grayText = "#4d4d4d";

// Local Methods
const getToggleSwitch = (color) => {
  return {
    "& .MuiSwitch-switchBase.Mui-checked": {
      color: color,
      "&:hover": {
        backgroundColor: alpha(color, 0.04),
      },
    },
    "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
      backgroundColor: color,
    },
    "& .MuiSwitch-track": {
      backgroundColor: "lightGrey",
    },
  };
};
const getCheckbox = (color) => {
  return {
    color: lightGray,
    paddingLeft: "4px",
    "&.Mui-checked": {
      color: color,
    },
    "&:hover": {
      backgroundColor: "transparent",
    },
  };
};
const getCheckboxNoPad = (color) => {
  return {
    color: lightGray,
    "&.Mui-checked": {
      color: color,
    },
    "&:hover": {
      backgroundColor: "transparent",
    },
  };
};
const getToggleTypography = (color, type) => {
  return {
    color: color,
    fontSize: type === "small" ? "11px" : "12px",
    fontWeight: 600,
  };
};
const getHover = (open) => {
  const color = open ? "#E8E8E8" : "#C8C8C8";
  return {
    backgroundColor: color,
    outline: `6px solid ${color}`,
    borderRadius: "37%",
  };
};
const getRequirementsStyling = (styling, isNotTitle) => {
  const {
    primaryMenu,
    checkboxPrimary,
    checkboxPrimaryNoPad,
    primaryToggleSwitch,
    primaryToggleTypography,
    primaryToggleTypographyLarge,
    checkboxSecondary,
    checkboxSecondaryNoPad,
    secondaryToggleSwitch,
    secondaryToggleTypography,
    secondaryToggleTypographyLarge,
  } = styling;

  // Return requirements styling based on type
  return {
    isNotTitle: isNotTitle,
    largeToggleTypography: isNotTitle ? primaryToggleTypographyLarge : secondaryToggleTypographyLarge,
    primaryColor: isNotTitle ? primary : secondary,
    primaryMenu: isNotTitle ? { fontSize: "13px" } : primaryMenu,
    primaryCheckbox: isNotTitle ? checkboxPrimary : checkboxSecondary,
    primaryCheckboxNoPad: isNotTitle ? checkboxPrimaryNoPad : checkboxSecondaryNoPad,
    primaryTextField: isNotTitle ? "secondary" : "primary",
    primaryToggleSwitch: isNotTitle ? secondaryToggleSwitch : primaryToggleSwitch,
    primaryToggleTypography: isNotTitle ? primaryToggleTypography : secondaryToggleTypography,
    secondaryColor: isNotTitle ? secondary : primary,
    secondaryMenu: isNotTitle ? primaryMenu : { fontSize: "13px" },
    secondaryCheckbox: isNotTitle ? checkboxSecondary : checkboxPrimary,
    secondaryCheckboxNoPad: isNotTitle ? checkboxSecondaryNoPad : checkboxPrimaryNoPad,
    secondaryTextField: isNotTitle ? "primary" : "secondary",
    secondaryToggleTypography: isNotTitle ? secondaryToggleTypography : primaryToggleTypography,
    secondaryToggleSwitch: isNotTitle ? primaryToggleSwitch : secondaryToggleSwitch,
  };
};

// Initial state
const initialState = (() => {
  // Generate general styling
  const generalStyling = {
    primary: primary,
    secondary: secondary,
    linkText: "#7c3aed",
    grayText: grayText,
    lightGray: lightGray,
    textFieldBorder: "#bdbdbd",
    borderColor: "#9CA3AF",
    white: "#fcfcfc",
    primaryMenu: {
      fontSize: "13px",
      "&.Mui-selected": {
        backgroundColor: "#F8D8EF",
        opacity: "0.9",
        "&:hover": {
          backgroundColor: "#FCEFF9",
          opacity: "0.9",
        },
      },
      "&:hover": {
        backgroundColor: "#FCEFF9",
        opacity: "0.9",
      },
    },
    primaryToggleSwitch: getToggleSwitch(primary),
    primaryToggleTypography: getToggleTypography(primary, "small"),
    primaryToggleTypographyLarge: getToggleTypography(primary, "large"),
    checkboxPrimary: getCheckbox(primary),
    checkboxPrimaryNoPad: getCheckboxNoPad(primary),
    secondaryToggleSwitch: getToggleSwitch(secondary),
    secondaryToggleTypography: getToggleTypography(secondary, "small"),
    secondaryToggleTypographyLarge: getToggleTypography(secondary, "large"),
    checkboxSecondary: getCheckbox(secondary),
    checkboxSecondaryNoPad: getCheckboxNoPad(secondary),
    grayTitle: {
      color: grayText,
      paddingX: 1,
    },
    hoverOpen: getHover(true),
    hoverClosed: getHover(false),
    icons: {
      extraLarge: {
        width: 30,
        height: 30,
      },
      large: {
        width: 26,
        height: 26,
      },
      medium: {
        width: 24,
        height: 24,
      },
      small: {
        width: 22,
        height: 22,
      },
      xSmall: {
        width: 20,
        height: 20,
      },
      textEditor: {
        width: "14px",
        height: "14px",
      },
      color: {
        primary: {
          filter: "brightness(0) saturate(100%) invert(53%) sepia(88%) saturate(7440%) hue-rotate(299deg) brightness(90%) contrast(92%)",
        },
        secondary: {
          filter: "brightness(0) saturate(100%) invert(50%) sepia(95%) saturate(371%) hue-rotate(126deg) brightness(96%) contrast(87%)",
        },
      },
    },
  };

  // Generate requirements styling
  const titleStyling = getRequirementsStyling(generalStyling, false);
  const otherStyling = getRequirementsStyling(generalStyling, true);
  const requirementsStyling = {
    title: titleStyling,
    other: otherStyling,
  };

  // Return values
  return {
    ...generalStyling,
    requirementsStyling,
  };
})();

export const stylingSlice = createSlice({
  name: "styling",
  initialState,
  reducers: {},
});

// Action creators are generated for each case reducer function
export default stylingSlice.reducer;
