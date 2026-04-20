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
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import MetadataTD from "./stComponents/MetadataTD.jsx";
import PPSelections from "./stComponents/PPSelections.jsx";
import Requirements from "./stComponents/Requirements.jsx";
import SingleAccordion from "./accordionComponents/SingleAccordion.jsx";
import {
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  Input,
  InputLabel,
  Typography,
} from "@mui/material";
import ResetDataConfirmation from "./modalComponents/ResetDataConfirmation.jsx";
import { useEffect, useRef, useState } from "react";
import { loadSfrSectionsFromSelections } from "../utils/loadSfrSections.js";
import {
  UPDATE_ST_METADATA,
  SET_SELECTED_PP,
  SET_SELECTED_PACKAGES,
  SET_SELECTED_MODULES,
  SET_SELECTED_PLATFORMS,
  SET_SHOW_REQUIREMENTS,
  UPDATE_PLATFORMS,
} from "../reducers/accordionPaneSlice.js";
import { Card, CardBody } from "@material-tailwind/react";
import store from "../app/store.js";

/**
 *
 * @param {string} type
 * @returns {JSX.Element}
 */
function ContentPane({ type }) {
  // Prop Validation
  ContentPane.propTypes = {
    type: PropTypes.string.isRequired,
  };

  // Constants
  const dispatch = useDispatch();
  const {
    selectedPP,
    selectedPackages,
    selectedModules,
    selectedPlatforms,
    showRequirements,
    stMetadata,
  } = useSelector((state) => state.accordionPane);

  const title = type === "builder" ? "Security Target Generator" : "Preview";
  const [openPreview, setOpenPreview] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);

  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [pendingSelection, setPendingSelection] = useState(null);

  const platformData = useSelector(
    (state) => state.accordionPane?.platformData,
  );
  const isPreviewToggled = useSelector(
    (state) => state.navBar.isPreviewToggled,
  );

  const { primary } = useSelector((state) => state.styling);

  const metadataFields = [
    { label: "ST Title", field: "stTitle" },
    { label: "ST Version", field: "stVersion" },
    { label: "ST Date", field: "stDate" },
    { label: "ST Author", field: "stAuthor" },
    { label: "TOE Developer", field: "toeDeveloper" },
    { label: "TOE Identifier", field: "toeIdentifier" },
  ];

  // For debugging
  const state = useSelector((state) => state);
  useEffect(() => {
    console.log(state);
  }, [state]);

  // Refs
  const scrollContainerRef = useRef(null);

  // Use Effects
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;
    const handleScroll = (event) => {
      if (event.target.scrollTop > 0) {
        setIsScrolling(true);
      } else {
        setIsScrolling(false);
      }
    };
    scrollContainer.addEventListener("scroll", handleScroll);
    return () => scrollContainer.removeEventListener("scroll", handleScroll);
  }, []);

  // Don't reload SFR data if it already has persisted data
  const prevSelectionsRef = useRef({
    pp: undefined,
    pkgs: undefined,
    mods: undefined,
  });

  useEffect(() => {
    const prev = prevSelectionsRef.current;
    const isFirstMount = prev.pp === undefined;

    // Check if selections actually changed
    const ppChanged = prev.pp !== selectedPP;
    const pkgsChanged = prev.pkgs !== selectedPackages;
    const modsChanged = prev.mods !== selectedModules;

    // Update ref
    prevSelectionsRef.current = {
      pp: selectedPP,
      pkgs: selectedPackages,
      mods: selectedModules,
    };

    // On first mount with existing data, skip reload
    if (isFirstMount) {
      const currentSfrSections = store.getState().sfrSections;
      if (currentSfrSections && Object.keys(currentSfrSections).length > 0) {
        return;
      }
    }

    // Only reload if something actually changed (not just a StrictMode re-run)
    if (isFirstMount || ppChanged || pkgsChanged || modsChanged) {
      loadSfrSectionsFromSelections(
        dispatch,
        selectedPP,
        selectedPackages,
        selectedModules,
      );
    }
  }, [selectedPP, selectedPackages, selectedModules]);

  // Update platforms when PP changes
  const hasInitialized = useRef(false);
  const previousPPRef = useRef(selectedPP);

  useEffect(() => {
    const ppChanged = previousPPRef.current !== selectedPP;
    previousPPRef.current = selectedPP;

    if (selectedPP?.accordionPane?.platformData) {
      const pd = selectedPP.accordionPane.platformData;
      const allPlatformIds = (pd.platforms || []).map((p) => p.id);

      // On first mount, just load platform metadata but preserve existing selections
      if (!hasInitialized.current) {
        hasInitialized.current = true;
        dispatch(
          UPDATE_PLATFORMS({
            description: pd.description || "",
            platforms: pd.platforms || [],
            xml: pd.xml || "",
            selectedPlatforms: selectedPlatforms,
          }),
        );
        // Only default to all if no platforms were persisted
        if (selectedPlatforms.length === 0) {
          dispatch(SET_SELECTED_PLATFORMS(allPlatformIds));
        }
        return;
      }

      // On PP change, default all selected
      if (ppChanged) {
        dispatch(SET_SELECTED_PLATFORMS(allPlatformIds));
        dispatch(
          UPDATE_PLATFORMS({
            description: pd.description || "",
            platforms: pd.platforms || [],
            xml: pd.xml || "",
            selectedPlatforms: allPlatformIds,
          }),
        );
      }
    } else {
      dispatch(SET_SELECTED_PLATFORMS([]));
      dispatch(
        UPDATE_PLATFORMS({
          description: "",
          platforms: [],
          xml: "",
          selectedPlatforms: [],
        }),
      );
    }
  }, [selectedPP]);

  // Methods
  const handleOpenPreview = () => setOpenPreview(!openPreview);

  /**
   * Update platform selections
   * @param {*} platformId
   */
  const handlePlatformToggle = (platformId) => {
    const updated = selectedPlatforms.includes(platformId)
      ? selectedPlatforms.filter((id) => id !== platformId)
      : [...selectedPlatforms, platformId];

    dispatch(SET_SELECTED_PLATFORMS(updated));

    dispatch(
      UPDATE_PLATFORMS({
        description: platformData?.description || "",
        platforms: platformData?.platforms || [],
        xml: platformData?.xml || "",
        selectedPlatforms: updated,
      }),
    );
  };

  /**
   * Opens modal when changing PP selections and stores callback to run, if modal is clicked through
   * @param {Function} callback
   */
  const triggerResetConfirmation = (callback) => {
    setPendingSelection(() => callback);
    setResetModalOpen(true);
  };

  return (
    <div className="h-full min-w-full" key={type + "ContentPane"}>
      <div className="rounded-lg min-h-full flex flex-col">
        <div className="border-2 border-gray-400 rounded-xl p-3 bg-base-200 h-20">
          <div
            className={`text-2xl font-bold text-secondary flex justify-center items-center ${title === "Preview" ? "ml-3 pt-1" : "pt-2"}`}
          >
            {title}
          </div>
        </div>

        <div className="mt-4 border-2 border-gray-300 rounded-lg p-3 bg-gray-300 text-black flex flex-1 min-h-screen min-w-full">
          <div
            className={`min-w-full ${isPreviewToggled ? " h-screen overflow-y-scroll scrollbar scrollbar-thumb-gray-100 scrollbar-track-gray " : ""}`}
            ref={scrollContainerRef}
          >
            <div className="min-w-full space-y-4">
              {/* ST Metadata */}
              <SingleAccordion title="ST Metadata">
                <div className="flex flex-wrap gap-5 w-full p-4">
                  {metadataFields.map(({ label, field }) => (
                    <FormControl
                      key={field}
                      sx={{ flex: "1 1 200px" }}
                      required
                    >
                      <InputLabel>{label}</InputLabel>
                      <Input
                        style={{ height: "40px" }}
                        placeholder={`Enter ${label}...`}
                        value={stMetadata?.[field] || ""}
                        onChange={(e) =>
                          dispatch(
                            UPDATE_ST_METADATA({
                              field,
                              value: e.target.value,
                            }),
                          )
                        }
                      />
                    </FormControl>
                  ))}
                </div>
              </SingleAccordion>

              {/* PP Selections */}
              <SingleAccordion title="PP, Package, and Module Selections">
                <div className="p-4">
                  <PPSelections
                    selectedPP={selectedPP}
                    setSelectedPP={(value) => dispatch(SET_SELECTED_PP(value))}
                    selectedPackages={selectedPackages}
                    setSelectedPackages={(value) =>
                      dispatch(SET_SELECTED_PACKAGES(value))
                    }
                    selectedModules={selectedModules}
                    setSelectedModules={(value) =>
                      dispatch(SET_SELECTED_MODULES(value))
                    }
                    showSecond={showRequirements}
                    triggerResetConfirmation={triggerResetConfirmation}
                  />

                  {/* Platform Selection */}
                  {platformData?.platforms?.length > 0 && (
                    <Card className="mt-4 border border-gray-300 rounded-lg shadow-sm hover:shadow-md transition-all">
                      <CardBody className="p-4">
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: "bold",
                            color: primary,
                            fontSize: "15px",
                            marginBottom: "8px",
                          }}
                        >
                          Platforms
                        </Typography>
                        <div className="flex flex-col gap-1">
                          {platformData.platforms.map((platform) => (
                            <FormControlLabel
                              key={platform.id}
                              control={
                                <Checkbox
                                  checked={selectedPlatforms.includes(
                                    platform.id,
                                  )}
                                  onChange={() =>
                                    handlePlatformToggle(platform.id)
                                  }
                                  color="primary"
                                />
                              }
                              label={
                                <Typography sx={{ fontSize: "0.9rem" }}>
                                  {platform.name}
                                </Typography>
                              }
                            />
                          ))}
                        </div>
                      </CardBody>
                    </Card>
                  )}

                  {/* Buttons under PP Selections */}
                  <div className="flex items-center gap-3 mt-4">
                    {!showRequirements && selectedPP && (
                      <Button
                        size="small"
                        variant="contained"
                        color="primary"
                        sx={{
                          fontSize: "12px",
                          px: 2,
                          borderRadius: "4px",
                          textTransform: "none",
                        }}
                        onClick={() => dispatch(SET_SHOW_REQUIREMENTS(true))}
                      >
                        Generate Requirements
                      </Button>
                    )}
                  </div>
                </div>
              </SingleAccordion>

              {/* Requirements Accordion */}
              {showRequirements && (
                <SingleAccordion title="ST Requirements">
                  <div className="p-4">
                    <SingleAccordion
                      title="Technical Decisions"
                      defaultOpen={false}
                    >
                      <div className="p-4">
                        {selectedPP && (
                          <MetadataTD
                            selectedPP={selectedPP}
                            selectedPackages={selectedPackages}
                            selectedModules={selectedModules}
                            sfrs={selectedPP?.sfrs || {}}
                            triggerResetConfirmation={triggerResetConfirmation}
                          />
                        )}
                      </div>
                    </SingleAccordion>

                    {selectedPP && <Requirements />}
                  </div>
                </SingleAccordion>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      <ResetDataConfirmation
        title="Changing Selections will Regenerate Requirements"
        text="Changing the Base PP, Functional Packages, or Modules will regenerate all requirements and erase any selections you've made so far. Do you wish to proceed?"
        open={resetModalOpen}
        handleOpen={() => {
          setResetModalOpen(false);
          setPendingSelection(null);
        }}
        handleSubmit={() => {
          if (pendingSelection) pendingSelection();
          setPendingSelection(null);
          setResetModalOpen(false);
        }}
      />
    </div>
  );
}

export default ContentPane;
