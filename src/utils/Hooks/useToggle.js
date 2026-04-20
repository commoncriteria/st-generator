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

import { useState } from "react";

function useToggle(defaultValue) {
  const [value, setValue] = useState(defaultValue);

  function handleToggleValue() {
    setValue((currentValue) => !currentValue);
  }

  return [value, handleToggleValue];
}

export default useToggle;
