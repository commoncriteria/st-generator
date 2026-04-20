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
import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Slide } from "@mui/material";

/**
 * The dialog slide transition
 * @type {React.ForwardRefExoticComponent<React.PropsWithoutRef<{}> & React.RefAttributes<unknown>>}
 */
const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction='up' ref={ref} {...props} />;
});

/**
 * The Modal class that displays the generic modal
 * @returns {JSX.Element} the modal content
 * @constructor passes in props to the class
 */
function Modal(props) {
  // Prop Validation
  Modal.propTypes = {
    title: PropTypes.oneOfType([PropTypes.string, PropTypes.node]).isRequired,
    content: PropTypes.node.isRequired,
    dialogActions: PropTypes.node,
    open: PropTypes.bool.isRequired,
    disabled: PropTypes.bool,
    hideSubmit: PropTypes.bool,
    fullscreen: PropTypes.bool,
    closeButtonId: PropTypes.string,
    handleClose: PropTypes.func.isRequired,
    handleSubmit: PropTypes.func,
    handleDialogActions: PropTypes.node,
    handleIsScrolling: PropTypes.func,
  };

  // Constants
  const [isScrolling, setIsScrolling] = useState(false);
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
  useEffect(() => {
    if (props.hasOwnProperty("handleIsScrolling")) {
      props.handleIsScrolling(isScrolling);
    }
  }, [isScrolling]);

  // Return Method
  return (
    <div>
      <Dialog
        open={props.open}
        TransitionComponent={Transition}
        fullScreen={props.fullscreen && props.fullscreen === true ? true : false}
        keepMounted
        onClose={props.handleClose}
        aria-describedby='alert-dialog-slide-description'
        style={{ borderRadius: "100px" }}
        maxWidth={"lg"}>
        <DialogTitle
          color='secondary'
          sx={{
            margin: 0,
            textAlign: "center",
            fontWeight: "bold",
            fontSize: "16px",
            lineHeight: "1.6",
            letterSpacing: "0.0075em",
            padding: "16px 24px",
            flex: "auto",
            backgroundColor: "#F3F4F6",
          }}>
          {props.title}
        </DialogTitle>
        <DialogContent
          ref={scrollContainerRef}
          sx={{
            margin: 0,
            textAlign: "center",
            color: "black",
            fontWeight: "normal",
            fontSize: "12px",
            flex: "auto",
            marginTop: "20px",
          }}>
          {props.content}
        </DialogContent>
        <DialogActions
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
            "& > *": {
              marginBottom: 1,
            },
            "& > *:last-child": {
              marginBottom: 0,
            },
            marginTop: "4px",
            marginBottom: "8px",
          }}>
          {props.dialogActions ? <span style={{ alignItems: "stretch" }}>{props.dialogActions}</span> : null}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: "8px",
            }}>
            <Button
              id={props.closeButtonId || "modal-close-button"}
              onClick={props.handleClose}
              variant={`${props.hideSubmit ? "contained" : "outlined"}`}
              color={"primary"}
              sx={{ fontSize: "12px", color: props.hideSubmit ? "white" : "primary" }}>
              <span>Close</span>
            </Button>
            {props.hideSubmit ? null : (
              <Button
                variant='contained'
                color={"primary"}
                onClick={props.handleSubmit}
                disabled={props.disabled}
                sx={{ fontSize: "12px", color: "white", marginLeft: "16px" }}>
                <span>Confirm</span>
              </Button>
            )}
          </div>
        </DialogActions>
      </Dialog>
    </div>
  );
}

// Export Modal.jsx
export default Modal;
