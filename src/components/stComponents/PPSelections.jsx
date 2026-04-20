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
import { useState, useEffect } from "react";
import { FormControl, RadioGroup, FormControlLabel, Radio, Checkbox, Typography } from "@mui/material";
import PropTypes from "prop-types";
import { Card, CardBody } from "@material-tailwind/react";
import { useSelector } from "react-redux";
import { BASE_PPS, PACKAGES, MODULES } from "../../utils/ppData.js";

/**
 * The PPSelections class
 * @returns {JSX.Element}
 */
function PPSelections(props) {
  // Prop Validation
  PPSelections.propTypes = {
    selectedPP: PropTypes.object,
    setSelectedPP: PropTypes.func.isRequired,
    selectedPackages: PropTypes.array,
    setSelectedPackages: PropTypes.func.isRequired,
    selectedModules: PropTypes.array,
    setSelectedModules: PropTypes.func.isRequired,
    showSecond: PropTypes.bool,
    triggerResetConfirmation: PropTypes.func.isRequired,
  };

  // Constants
  const { primary } = useSelector((state) => state.styling);

  // Build PP display names
  const ppNames = Object.entries(BASE_PPS).map(([key, pp], idx) => {
    const { metadata } = pp.accordionPane;
    const { ppName, version, xmlTagMeta } = metadata;
    const short = xmlTagMeta?.attributes?.short?.toUpperCase?.();
    const shortSuffix = short ? ` (${short})` : "";

    return {
      id: `pp-${idx + 1}`,
      key, // "app", "mdf", etc.
      value: `${ppName.replace(/\s+/g, "_")}_${version}`,
      label: `${ppName} ${version}${shortSuffix}`,
    };
  });

  const [availablePackages, setAvailablePackages] = useState([]);
  const [availableModules, setAvailableModules] = useState([]);

  // Update packages and modules based on PP selected
  useEffect(() => {
    if (!props.selectedPP) {
      setAvailablePackages([]);
      setAvailableModules([]);
      return;
    }

    // Parse includePackage section
    const linkedPackages = props.selectedPP?.includePackage?.packages || [];
    const pkgNames = linkedPackages
      .map((pkg, idx) => {
        const gitUrl = pkg.payload.pkg.git.url;
        const pkgKey = gitUrl.split("/").pop(); // last part of URL
        let pkgJson = PACKAGES[pkgKey] || MODULES[pkgKey];

        if (pkgJson) {
          const { metadata } = pkgJson.accordionPane;
          const short = metadata.xmlTagMeta?.attributes?.short?.toUpperCase();
          const suffix = short ? ` (${short})` : "";

          return {
            id: `pkg-${idx + 1}`,
            value: MODULES[pkgKey]
              ? `${metadata.xmlTagMeta?.attributes?.name?.replace(/\s+/g, "_")}_${metadata.version}`
              : `${metadata.ppName.replace(/\s+/g, "_")}_${metadata.version}`,
            label: MODULES[pkgKey]
              ? `${metadata.xmlTagMeta?.attributes?.name} ${metadata.version}${suffix}`
              : `${metadata.ppName} ${metadata.version}${suffix}`,
            type: MODULES[pkgKey] ? "module" : "package",
            pkgJson: pkgJson || "none",
          };
        }
      })
      .filter(Boolean);

    setAvailablePackages(pkgNames.filter((p) => p.type === "package"));
    setAvailableModules(pkgNames.filter((p) => p.type === "module"));
  }, [props.selectedPP]);

  // Methods
  /**
   * Updates Functional Packages and Modules based on PP selection
   * @param {*} e HTML event
   * @returns
   */
  const handlePPChange = (e) => {
    const chosenPPMeta = ppNames.find((pp) => pp.value === e.target.value);
    if (!chosenPPMeta) return;

    const chosenPP = BASE_PPS[chosenPPMeta.key];

    const updateSelection = () => {
      props.setSelectedPP(chosenPP);
      // clear previous selections when PP changes
      props.setSelectedPackages([]);
      props.setSelectedModules([]);
    };

    // If this isn’t a first time selection and a PP has already been selected, confirm reset first
    if (props.showSecond && props.selectedPP) {
      props.triggerResetConfirmation(updateSelection);
    } else {
      updateSelection();
    }
  };

  /**
   * Handle toggling of selected packages
   * @param {*} e
   * @param {*} pkg
   */
  const handlePackageChange = (e, pkg) => {
    const isChecked = e.target.checked; // Store checked state (original event is gone by the time the callback runs)

    const updatePackages = () => {
      if (isChecked) {
        props.setSelectedPackages([...props.selectedPackages, pkg]);
      } else {
        props.setSelectedPackages(props.selectedPackages.filter((p) => p.value !== pkg.value));
      }
    };

    if (props.showSecond && (props.selectedPackages.length > 0 || props.selectedModules.length > 0 || props.selectedPP)) {
      props.triggerResetConfirmation(updatePackages);
    } else {
      updatePackages();
    }
  };

  const handleModuleChange = (e, mod) => {
    const isChecked = e.target.checked; // Store checked state (original event is gone by the time the callback runs)

    const updateModules = () => {
      if (isChecked) {
        props.setSelectedModules([...props.selectedModules, mod]);
      } else {
        props.setSelectedModules(props.selectedModules.filter((m) => m.value !== mod.value));
      }
    };

    if (props.showSecond && (props.selectedModules.length > 0 || props.selectedPackages.length > 0 || props.selectedPP)) {
      props.triggerResetConfirmation(updateModules);
    } else {
      updateModules();
    }
  };

  return (
    <div className='space-y-4 w-full'>
      {/* Base PP Card */}
      <Card className='border border-gray-300 rounded-lg shadow-sm hover:shadow-md transition-all'>
        <CardBody className='p-4'>
          <Typography variant='h6' sx={{ fontWeight: "bold", color: primary, fontSize: "15px", marginBottom: "8px" }}>
            Base Protection Profile
          </Typography>
          <FormControl fullWidth>
            <RadioGroup
              name='basePP'
              value={
                props.selectedPP
                  ? `${props.selectedPP.accordionPane.metadata.ppName.replace(/\s+/g, "_")}_${props.selectedPP.accordionPane.metadata.version}`
                  : ""
              }
              onChange={handlePPChange}>
              {ppNames.map((pp) => (
                <FormControlLabel
                  key={pp.id}
                  value={pp.value}
                  control={<Radio color='primary' />}
                  label={<Typography sx={{ fontSize: "0.9rem" }}>{pp.label}</Typography>}
                />
              ))}
            </RadioGroup>
          </FormControl>
        </CardBody>
      </Card>

      {/* Functional Packages Card */}
      {availablePackages.length > 0 && (
        <Card className='border border-gray-300 rounded-lg shadow-sm hover:shadow-md transition-all'>
          <CardBody className='p-4'>
            <Typography variant='h6' sx={{ fontWeight: "bold", color: primary, fontSize: "15px", marginBottom: "8px" }}>
              Functional Packages
            </Typography>

            <div className='flex flex-col gap-1'>
              {availablePackages.map((pkg) => (
                <FormControlLabel
                  key={pkg.id}
                  control={
                    <Checkbox
                      checked={props.selectedPackages.some((p) => p.value === pkg.value)}
                      onChange={(e) => handlePackageChange(e, pkg)}
                      color='primary'
                    />
                  }
                  label={<Typography sx={{ fontSize: "0.9rem" }}>{pkg.label}</Typography>}
                />
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Modules Card */}
      {availableModules.length > 0 && (
        <Card className='border border-gray-300 rounded-lg shadow-sm hover:shadow-md transition-all'>
          <CardBody className='p-4'>
            <Typography variant='h6' sx={{ fontWeight: "bold", color: primary, fontSize: "15px", marginBottom: "8px" }}>
              Modules
            </Typography>

            <div className='flex flex-col gap-1'>
              {availableModules.map((mod) => (
                <FormControlLabel
                  key={mod.id}
                  control={
                    <Checkbox checked={props.selectedModules.some((m) => m.value === mod.value)} onChange={(e) => handleModuleChange(e, mod)} color='primary' />
                  }
                  label={<Typography sx={{ fontSize: "0.9rem" }}>{mod.label}</Typography>}
                />
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

export default PPSelections;
