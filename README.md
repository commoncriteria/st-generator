# Security Target Generator

A React/Redux based web application for generating Security Targets (STs). The tool allows security evaluators and ST authors to select a base Protection Profile (PP), Functional Packages, and PP Modules, then configure Security Functional Requirements (SFRs) and Security Assurance Requirements (SARs) through an interactive worksheet interface.

## Overview

The Security Target Generator streamlines the process of creating Security Targets by:

- Loading and merging SFR/SAR data from base Protection Profiles, Functional Packages, and PP Modules
- Providing an interactive worksheet for selecting and configuring security requirements
- Validating SFR element completion status in real time
- Supporting SFR instancing for requirements that need multiple instances of an SFR
- Managing optional, objective, and selection based SFR dependencies
- Tracking Technical Decision (TD) modifications to SFRs _(Still in prototype stage as there aren't any PP XMLs that support the TD scheme)_
- Exporting completed Security Targets

## Supported Protection Profiles

### Base Protection Profiles

- Application Software 2.0
- Mobile Device Fundamentals 4.0
- Mobile Device Management 5.0
- General Purpose Computing Platforms 2.0
- General Purpose Operating Systems 5.0
- Virtualization 2.0

### Functional Packages

- Secure Shell (SSH) 2.0
- Transport Layer Security (TLS) 2.1

### PP-Modules

- Virtual Private Network (VPN) Client 3.0
- File Encryption (FE) 2.0
- File Encryption-Enterprise Management (FEEM) 2.0
- Voice and Video over IP (VVoIP) 2.0
- Endpoint Detection and Response (EDR) 2.0
- Host Agent 2.0
- Light Fidelity (LiFi) Access System 1.0
- Enterprise Session Controller (ESC) 2.0
- Session Border Controller (SBC) 2.0
- Intrusion Prevention Systems (IPS) 2.0

> **Note:** Available Functional Packages and PP Modules are determined by the selected Base Protection Profile. Not all packages/modules are compatible with every PP.

## Features

### PP Selection and Merging

Select a base Protection Profile, optional Functional Packages, and PP Modules. SFRs from all sources are merged into a unified view with source labels indicating where each requirement originates.

- **Base PP SFRs**: No label (default source)
- **Package SFRs**: Label showing package name
- **Module SFRs**: Label showing module name
- **Modified SFRs**: Module label overrides base PP label

### Platform Selection

When a PP defines target platforms (e.g., Android, Windows, iOS, Linux, macOS), checkboxes appear for selecting which platforms the TOE targets. Platform specific evaluation activities are filtered accordingly.

### SFR Component Types

Components are visually distinguished with colored chips (labels):

| Type                | Color  | Behavior                                           |
| ------------------- | ------ | -------------------------------------------------- |
| **Optional**        | Orange | Manual toggle to enable/disable                    |
| **Objective**       | Purple | Manual toggle to enable/disable                    |
| **Selection-Based** | Blue   | Auto-enabled when referenced selectable is checked |
| **Instanced**       | Grey   | Original disabled, two editable copies created     |

### Selection-Based Dependencies

Selection based SFRs are automatically enabled/disabled based on whether their referenced selection(s) are checked in other SFRs. Hover over a selection based component to see which SFRs it depends on.

### SFR Instancing

Create two independent copies of an SFR component for requirements that are satisfied by more than one instance. Instancing:

- Disables the original SFR
- Preserves SFR element structure, selection dependencies, and evaluation activities
- Supports renaming of each instance
- Deleting either instance removes both and re-enables the original SFR

### SFR Worksheet

Click the wand icon on any enabled SFR component to open the worksheet modal:

- **Element Selector**: Dropdown with element validation indicators (green check / red error)
- **Requirements Card**: Renders the element's security requirements, with interactive checkboxes and assignment text fields
- **Audit Events Card**: Displays the consolidated audit events table for all SFRs. Only shown when a FAU_GEN component is open.
- **Selection Rules**: Enforces `onlyOne` and `exclusive` constraints with confirmation dialogs
- **Parent-Child Dependencies**: Nested selections are disabled until their parent group is checked
- **Assignment Validation**: Simple validation such as warning on integer fields when values don't match placeholder rules

### Validation

Real-time validation checks that each SFR element has:

- At least one checkbox selected in each top level selection group
- Nested groups under checked parents also have selections that are checked
- Assignment fields filled in (both standalone and when their parent is selected)

Validation status is shown:

- Next to the element dropdown in the worksheet (large icon)
- In each dropdown menu item (small icon)
- In the Validator summary panel in the top right toggle (per SFR)

The Validator summary panel reflects all enabled SFRs, and updates as new SFRs become enabled or satisfied. Entries in the Validator summary panel can be clicked on to navigate to the worksheet for each enabled SFR.

### Technical Decisions

SFR components modified by NIAP Technical Decisions display a "Modified by TD {number}" label. SFR Class level accordions show "Modified by TDs" when any component within has an associated TD.

### SAR Rendering

Security Assurance Requirements are rendered in their own accordion, with expandable sections showing summaries and component cards with worksheet access.

### File Input/Output

The following files can be created by the ST Generator:

- ST Progress file (JSON) that can be used to save and restore the state of STs in development.
- ST Document (Word) that reflects all choices made using the ST Generator.
- Evaluation Activity (EA) Document (Word) that contains the list of EAs corresponding to all the SFRs in the ST that can be used by evaluators to guide testing and log results.

File operations are controlled through the main Menu.
