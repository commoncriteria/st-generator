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

import PropTypes from "prop-types";
import { useState } from "react";
import { useSelector } from "react-redux";
import { Card, CardBody, CardFooter } from "@material-tailwind/react";
import { Button, TextField } from "@mui/material";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import { handleSnackBarSuccess, handleSnackBarError } from "../../utils/securityComponents.jsx";
import Modal from "./Modal";
import { buildMhtDocx } from "../../utils/buildMhtDocx.js";

/**
 * The XML Exporter class that exports to docx
 * @returns {JSX.Element}   the XML exporter modal content
 * @constructor             passes in props to the class
 */
function XMLExporter({ open, handleOpen, title, buildHtml, successMessage }) {
  XMLExporter.propTypes = {
    open: PropTypes.bool,
    handleOpen: PropTypes.func,
    title: PropTypes.string,
    buildHtml: PropTypes.func,
    successMessage: PropTypes.string,
  };

  // Constants
  const stateObject = useSelector((state) => state);

  const [fileName, setFileName] = useState("download");
  const [exportingDocx, setExportingDocx] = useState(false);

  const fileNameValid = !!(fileName && fileName !== "");
  const label = title === "Evaluation Activities Exporter" ? "Export EAs" : "Export ST";

  // DOCX export
  // Uses w:altChunk + MHT - Word renders the embedded HTML natively
  const handleExportDocx = async () => {
    if (exportingDocx) return;
    setExportingDocx(true);
    try {
      const bytes = await buildMhtDocx(buildHtml(stateObject));
      const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${fileName || "download"}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      handleSnackBarSuccess(successMessage || "Exported Successfully");
    } catch (e) {
      console.error("Export failed:", e);
      handleSnackBarError(e);
    } finally {
      setExportingDocx(false);
      handleOpen();
    }
  };

  return (
    <div>
      <Modal
        title={title}
        content={
          <div className='w-screen-md'>
            <Card className='rounded-lg border-2 border-gray-200'>
              <CardBody className='border-b-2 rounded-b-sm border-gray-300 text-secondary'>
                <div className='w-full' style={{ display: "inline-block", padding: 1 }}>
                  <span className='flex justify-stretch min-w-full'>
                    <TextField
                      fullWidth
                      required
                      color={"secondary"}
                      label={"File Name"}
                      value={fileName}
                      onChange={(e) => setFileName(e.target.value.replace(/[/\\?%*:|"<>]/g, "-"))}
                    />
                    <div className='pl-2 text-[14px] mt-8 text-black'>.docx</div>
                  </span>
                </div>
              </CardBody>

              <CardFooter className='flex justify-center items-center'>
                <Button
                  id={"final-export-docx-button"}
                  sx={{ fontSize: "12px" }}
                  disabled={!fileNameValid || exportingDocx}
                  component='label'
                  variant='contained'
                  color='secondary'
                  startIcon={<CloudDownloadIcon />}
                  style={{ color: "white", marginTop: "0px", marginBottom: "5px" }}
                  onClick={handleExportDocx}>
                  {exportingDocx ? "Exporting…" : label}
                </Button>
              </CardFooter>
            </Card>
          </div>
        }
        open={open}
        handleClose={() => handleOpen()}
        hideSubmit={true}
      />
    </div>
  );
}

export default XMLExporter;
