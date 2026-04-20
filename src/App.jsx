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
import { useSelector } from "react-redux";
import { createTheme, ThemeProvider } from "@mui/material";
import ContentPane from "./components/ContentPane.jsx";
import SideBar from "./components/SideBar.jsx";
import SnackBar from "./components/SnackBar.jsx";
import NavBar from "./components/NavBar.jsx";
import "tw-elements-react/dist/css/tw-elements-react.min.css";
import Validator from "./components/stComponents/Validator.jsx";
import "../index.css";

/**
 * The theme of the mui controls
 * @type {Theme}
 */
const theme = createTheme({
  palette: {
    primary: {
      main: "#1FB2A6",
    },
    secondary: {
      main: "#d926a9",
    },
  },
  components: {
    MuiTooltip: {
      defaultProps: {
        placement: "top",
        arrow: true,
      },
      styleOverrides: {
        tooltip: {
          fontSize: "12px",
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          fontSize: "14px",
        },
      },
    },
    MuiInputLabel: {
      defaultProps: {
        sx: {
          fontSize: "13px",
        },
      },
    },
    MuiOutlinedInput: {
      defaultProps: {
        sx: {
          fontSize: "13px",
        },
      },
    },
    MuiMenuItem: {
      defaultProps: {
        sx: {
          fontSize: "13px",
        },
      },
    },
  },
});

/**
 * The App class that runs the XML Builder project
 * @returns {JSX.Element}   the app element
 * @constructor             the App constructor
 */
function App() {
  // Constants
  const isPreviewToggled = useSelector((state) => state.navBar.isPreviewToggled);
  const isNavOpen = useSelector((state) => state.navBar.isNavOpen);

  // Return Function
  return (
    <div
      className={"object-scale-down min-w-full min-h-screen bg-base-300" + (isNavOpen ? " grid grid-cols-[max-content_1fr]" : "")}
      style={{ padding: "var(--base-padding)" }}>
      <ThemeProvider theme={theme}>
        <div className={isNavOpen ? "min-w-[300px] max-w-[300px]" : ""}>
          <SideBar />
        </div>
        <div className='min-w-full min-h-screen p-1'>
          {/* The Navigation Bar */}
          <div className='bg-base-300 min-w-full p-2 sticky top-0 z-30 rounded-sm min-w-[853px]'>
            <NavBar />
          </div>
          {/* The SideBar Menu */}
          <div className={"w-full rounded-xl min-h-screen p-1" + (isPreviewToggled ? " grid grid-cols-3 gap-3" : "")}>
            {/* The Content Pane */}
            <div className={"col-span-2 bg-neutral border-2 border-gray-500 rounded-lg p-4 w-full overflow-x-hidden min-h-screen min-w-full"}>
              <ContentPane type={"builder"} />
            </div>
            {/* The Preview Pane */}
            {isPreviewToggled && (
              <div className={"bg-neutral border-2 border-gray-500 rounded-lg p-4  w-full ml-2 min-h-screen overflow-auto min-w-full"}>
                <Validator />
              </div>
            )}
          </div>
        </div>
        <SnackBar />
      </ThemeProvider>
    </div>
  );
}

// Export Class
export default App;
