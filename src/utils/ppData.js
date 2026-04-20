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

// Base PPs
import app from "../../public/data/state/basePP/app.json";
import gpcp from "../../public/data/state/basePP/gpcp.json";
import mdf from "../../public/data/state/basePP/mdf.json";
import mdm from "../../public/data/state/basePP/mdm.json";
import os from "../../public/data/state/basePP/os.json";
import virtualization from "../../public/data/state/basePP/virtualization.json";

// Packages/mods
import esc from "../../public/data/state/packages/esc.json";
import esm_edr from "../../public/data/state/packages/esm-edr.json";
import esm_ha from "../../public/data/state/packages/esm-ha.json";
import ips from "../../public/data/state/packages/ips.json";
import lifi from "../../public/data/state/packages/lifi.json";
import tls from "../../public/data/state/packages/tls.json";
import sbc from "../../public/data/state/packages/sbc.json";
import ssh from "../../public/data/state/packages/ssh.json";
import vpnclient from "../../public/data/state/packages/vpnclient.json";
import fe from "../../public/data/state/packages/fe.json";
import feem from "../../public/data/state/packages/feem.json";
import vvoip from "../../public/data/state/packages/vvoip.json";

export const BASE_PPS = { app, gpcp, mdf, mdm, os, virtualization };
export const PACKAGES = { tls, ssh };
export const MODULES = { esc, esm_edr, esm_ha, fe, feem, ips, lifi, sbc, vpnclient, vvoip };
