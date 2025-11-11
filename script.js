// Theme: apply on load and enable toggle
(function initTheme(){
  try {
    const saved = localStorage.getItem('theme');
    const initial = saved ? saved : 'dark'; // Default to dark theme
    document.documentElement.setAttribute('data-theme', initial);
    const fab = document.getElementById('theme-switch');
    if (fab) {
      fab.addEventListener('click', () => {
        const cur = document.documentElement.getAttribute('data-theme') || 'light';
        const next = cur === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
      });
    }
  } catch {}
})();
    function parseFields(dev) {
      const pMatch = dev.match(/-p(\d+)-/i);
      const rMatch = dev.match(/-r(\d+)/i);
      const P = pMatch ? Number(pMatch[1]) : NaN;
      const R = rMatch ? Number(rMatch[1]) : NaN;
      return { P, R };
    }
    
    
    function validate(n, min, max, name) {
      if (Number.isNaN(n)) return name + " is required.";
      if (n < min || n > max) return name + " must be in " + min + "–" + max + ".";
      return "";
    }
    
    function setFieldError(id, msg) {
      const el = document.getElementById(id);
      if (el) el.textContent = msg || '';
    }
    
    // Parse combined JRP/Channel input (format: "30-1" or just "30")
    function parseJRPChannel(input) {
      const trimmed = input.trim();
      if (!trimmed) return { j: NaN, channel: 1, error: '' };
      
      // Check if it contains a dash
      if (trimmed.includes('-')) {
        const parts = trimmed.split('-');
        if (parts.length !== 2) {
          return { j: NaN, channel: NaN, error: 'Invalid format. Use JRP-Channel (e.g., 30-1)' };
        }
        const j = Number(parts[0]);
        const channel = Number(parts[1]);
        if (Number.isNaN(j) || Number.isNaN(channel)) {
          return { j: NaN, channel: NaN, error: 'JRP and Channel must be numbers' };
        }
        return { j, channel, error: '' };
      } else {
        // No dash, treat as JRP only, default channel to 1
        const j = Number(trimmed);
        if (Number.isNaN(j)) {
          return { j: NaN, channel: NaN, error: 'JRP must be a number' };
        }
        return { j, channel: 1, error: '' };
      }
    }
    
    function liveValidate() {
      const dev = document.getElementById('dev').value.trim();
      const jrpInput = document.getElementById('jrp').value.trim();
      const { j, channel, error: jrpParseError } = parseJRPChannel(jrpInput);
      const { P, R } = parseFields(dev);
    
      const devErr = dev && !dev.toLowerCase().includes('-t1-') ? 'Device must include -t1-.' : (!dev ? '' : '');
      const pErr = validate(P, 1, 16, 'Switch number (p#)');
      const rErr = validate(R, 1, 128, 'Rack number (r#)');
      const jErr = jrpParseError || validate(j, 17, 32, 'JRP / Port');
      const cErr = validate(channel, 1, 4, 'Channel');
    
      setFieldError('errDev', dev ? (devErr || '') : '');
      setFieldError('errJrp', jrpParseError || jErr || cErr ? (jrpParseError || jErr || cErr) : '');
    
      const hasErrors = Boolean(devErr || pErr || rErr || jrpParseError || jErr || cErr || !dev);
      const calcBtn = document.getElementById('calc');
      if (calcBtn) calcBtn.disabled = hasErrors;
    }
    
    function compute() {
    console.log('=== compute() called ===');
      const dev = document.getElementById('dev').value.trim();
    const jrpInput = document.getElementById('jrp').value.trim();
    const { j, channel, error: jrpParseError } = parseJRPChannel(jrpInput);
      const { P, R } = parseFields(dev);
    console.log(`Input: dev="${dev}", jrpInput="${jrpInput}", parsed: j=${j}, channel=${channel}, P=${P}, R=${R}`);
      
      // NDF Mapping supported for Racks 1–42, 51, 61–85, 86–98, 99–100, 101–102, 106–107, 111–112, 114
      const isExplicitlyMapped = (R >= 1 && R <= 42) || (R === 51) || 
                           (R >= 61 && R <= 70) || (R >= 71 && R <= 79) || 
                           (R >= 80 && R <= 85) || (R >= 86 && R <= 98) || (R >= 99 && R <= 100) || 
                           (R === 101) || (R === 102) || (R === 106) || (R === 107) || (R === 111) || (R === 112) || (R === 114);
      const allowNDF = isExplicitlyMapped; 
      
      if (!dev.toLowerCase().includes("-t1-")) {
        const errorBox = document.getElementById('error');
        const out = document.getElementById('out');
        errorBox.textContent = "Please enter a T1 device name (e.g., sbn100-104-es-m1-p5-t1-r89)";
        errorBox.style.display = 'block';
        out.style.display = 'none';
        const outT2 = document.getElementById('outT2');
        if (outT2) outT2.style.display = 'none';
        return;
      }
    
      let errs = [];
      if (!dev) errs.push("Device name is required.");
      if (jrpParseError) errs.push(jrpParseError);
      errs.push(validate(P, 1, 16, "Switch number (p#)"));
      errs.push(validate(R, 1, 128, "Rack number (r#)"));
      errs.push(validate(j, 17, 32, "JRP / Port"));
      errs.push(validate(channel, 1, 4, "Channel"));
      errs = errs.filter(Boolean);
    
      const errorBox = document.getElementById('error');
      const out = document.getElementById('out');
    
      if (errs.length) {
        errorBox.textContent = errs.join(" ");
        errorBox.style.display = 'block';
        out.style.display = 'none';
        const outT2 = document.getElementById('outT2');
        if (outT2) outT2.style.display = 'none';
        return;
      } else {
        errorBox.style.display = 'none';
      }
    
      const k = Math.floor((P - 1) / 2);
      const block_start = 18 * k + 1;
      const offset = (P % 2 === 0) ? 8 : 0;
      const i = Math.floor((j - 17) / 2);
      const MMC = block_start + offset + i;
      const Spare1 = 18 * k + 17;
      const Spare2 = 18 * k + 18;
    
      // ───────────── T2 Mapping Logic ─────────────
      const RU_T2 = 4 * (j - 17) + channel;      // 1–64
      const JRP_T2 = Math.floor((R - 1) / 4) + 1; // 1–32
      const CH_T2 = ((R - 1) % 4) + 1;            // 1–4
      const PLANE_T2 = P;                         // same as P
    
      // ───────────── NDF Mapping Logic (Updated for R1-R29, R41-R42) ─────────────
      if (allowNDF) {
        let NDF_MMC = null;
        let NDF_range = null;
        let cable = null;
    
        // Initialize NDF_GROUP to 0 or use a fallback value.
        let NDF_GROUP = 0; 
    
        // 1. Determine NDF Group (Custom Mapping for RU41/RU39 Racks)
        if (R >= 1 && R <= 24) {
          // Logic for Racks 1-24 (RU45, RU44, RU43)
          NDF_GROUP = Math.ceil(R / 4);
        } else if (R >= 25 && R <= 28) {
            // Racks 25, 26, 27, 28 map to NDF Group 7 (RU41)
            NDF_GROUP = 7;
        } else if (R === 29) {
            // Rack 29 maps explicitly to NDF Group 8 (RU41)
            NDF_GROUP = 8;
        } else if (R >= 30 && R <= 32) {
            // R30, R31, R32 map to NDF Group 8 (RU39)
            NDF_GROUP = 8;
        } else if (R >= 33 && R <= 35) {
            // R33, R34, R35 map to NDF Group 9 (RU39)
            NDF_GROUP = 9;
        } else if (R === 36) {
            // R36 maps to NDF Group 9 (RU37)
            NDF_GROUP = 9;
        } else if (R >= 37 && R <= 40) {
            // R37, R38, R39, R40 map to NDF Group 10 (RU37)
            NDF_GROUP = 10;
        } else if (R >= 41 && R <= 42) {
            // Racks 41, 42 map explicitly to NDF Group 11 (RU41)
            NDF_GROUP = 11;
        } else if (R === 51) {
            // R51 maps explicitly to NDF Group 13 (RU39)
            NDF_GROUP = 13;
        } else if (R === 101) {
            // R101 maps to NDF Group 26 (RU39)
            NDF_GROUP = 26;
        // RU26/RU28 Mappings (Groups 16-20)
        } else if (R === 63) {
            // R63 maps to NDF Group 16 (RU26)
            NDF_GROUP = 16;
        } else if (R === 62) {
            // R62 maps to NDF Group 16 (RU28)
            NDF_GROUP = 16;
        } else if (R === 64) {
            // R64 maps to NDF Group 16 (RU28)
            NDF_GROUP = 16;
        } else if (R === 65) {
            // R65 maps to NDF Group 17 (RU26)
            NDF_GROUP = 17;
        } else if (R === 66) {
            // R66 maps to NDF Group 17 (RU26)
            NDF_GROUP = 17;
        } else if (R === 67) {
            // R67 maps to NDF Group 17 (RU26)
            NDF_GROUP = 17;
        } else if (R === 68) {
            // R68 maps to NDF Group 17 (RU28)
            NDF_GROUP = 17;
        } else if (R === 69) {
            // R69 maps to NDF Group 18 (RU28)
            NDF_GROUP = 18;
        } else if (R === 70) {
            // R70 maps to NDF Group 18 (RU26)
            NDF_GROUP = 18;
        } else if (R === 74) {
            // R74 maps to NDF Group 19 (RU26)
            NDF_GROUP = 19;
        } else if (R === 76) {
            // R76 maps to NDF Group 19 (RU26)
            NDF_GROUP = 19;
        } else if (R === 79) {
            // R79 maps to NDF Group 20 (RU26)
            NDF_GROUP = 20;
        // RU24 Mappings (Groups 18, 19, 20, 21)
        } else if (R === 77) {
            // R77 maps to NDF Group 20 (RU24)
            NDF_GROUP = 20;
        } else if (R === 75) {
            // R75 maps to NDF Group 19 (RU24)
            NDF_GROUP = 19;
        } else if (R === 72) {
            // R72 maps to NDF Group 18 (RU24)
            NDF_GROUP = 18;
        } else if (R === 73) {
            // R73 maps to NDF Group 19 (RU24)
            NDF_GROUP = 19;
        } else if (R === 78) {
            // R78 maps to NDF Group 20 (RU24)
            NDF_GROUP = 20;
        } else if (R === 71) {
            // R71 maps to NDF Group 18 (RU24)
            NDF_GROUP = 18;
        } else if (R === 81) {
            // R81 maps to NDF Group 21 (RU24)
            NDF_GROUP = 21;
        } else if (R === 82) {
            // R82 maps to NDF Group 21 (RU24)
            NDF_GROUP = 21;
        // RU22 Mappings (Groups 20, 21, 22, 23, 24, 25, 29)
        } else if (R === 114) {
            // R114 maps to NDF Group 29 (RU22)
            NDF_GROUP = 29;
        } else if (R === 98) {
            // R98 maps to NDF Group 25 (RU22)
            NDF_GROUP = 25;
        } else if (R === 80) {
            // R80 maps to NDF Group 20 (RU22)
            NDF_GROUP = 20;
        } else if (R === 83) {
            // R83 maps to NDF Group 21 (RU22)
            NDF_GROUP = 21;
        } else if (R === 93) {
            // R93 maps to NDF Group 24 (RU22)
            NDF_GROUP = 24;
        } else if (R === 97) {
            // R97 maps to NDF Group 25 (RU22)
            NDF_GROUP = 25;
        } else if (R === 89) {
            // R89 maps to NDF Group 23 (RU22)
            NDF_GROUP = 23;
        } else if (R === 88) {
            // R88 maps to NDF Group 22 (RU22) - corrected from R96
            NDF_GROUP = 22;
        // RU20 Mappings (Groups 21, 22, 23, 24, 25, 27)
        } else if (R === 94) {
            // R94 maps to NDF Group 24 (RU20)
            NDF_GROUP = 24;
        } else if (R === 99 || R === 100) {
            // R99, R100 map to NDF Group 25 (RU20)
            NDF_GROUP = 25;
        } else if (R === 107) {
            // R107 maps to NDF Group 27 (RU20)
            NDF_GROUP = 27;
        } else if (R === 84) {
            // R84 maps to NDF Group 21 (RU20)
            NDF_GROUP = 21;
        } else if (R === 85) {
            // R85 maps to NDF Group 22 (RU20)
            NDF_GROUP = 22;
        } else if (R === 87) {
            // R87 maps to NDF Group 22 (RU20)
            NDF_GROUP = 22;
        } else if (R === 90) {
            // R90 maps to NDF Group 23 (RU20)
            NDF_GROUP = 23;
        // RU18 Mappings (Groups 22, 23, 24, 26, 27, 28)
        } else if (R === 95) {
            // R95 maps to NDF Group 24 (RU18)
            NDF_GROUP = 24;
        } else if (R === 92) {
            // R92 maps to NDF Group 23 (RU18)
            NDF_GROUP = 23;
        } else if (R === 112) {
            // R112 maps to NDF Group 28 (RU18)
            NDF_GROUP = 28;
        } else if (R === 91) {
            // R91 maps to NDF Group 23 (RU18)
            NDF_GROUP = 23;
        } else if (R === 106) {
            // R106 maps to NDF Group 27 (RU18)
            NDF_GROUP = 27;
        } else if (R === 86) {
            // R86 maps to NDF Group 22 (RU18)
            NDF_GROUP = 22;
        } else if (R === 102) {
            // R102 maps to NDF Group 26 (RU18)
            NDF_GROUP = 26;
        } else if (R === 96) {
            // R96 maps to NDF Group 24 (RU18) - Note: was RU22, now RU18
            NDF_GROUP = 24;
        // RU16 Mappings (Group 28)
        } else if (R === 111) {
            // R111 maps to NDF Group 28 (RU16)
            NDF_GROUP = 28;
        } 
        
        // Fallback: If no explicit mapping found NDF_GROUP remains 0
        
        const key = `${NDF_GROUP}-${CH_T2}`;
    
        // 2. Determine NDF Rack Unit (RU) based on the rack number (Group 8 has mixed RU41/RU39)
        let NDF_RU = '—';
        if (NDF_GROUP >= 1 && NDF_GROUP <= 6) {
          // Groups 1-6: Standard mapping
          const standardRU = { 1: 45, 2: 45, 3: 44, 4: 44, 5: 43, 6: 43 };
          NDF_RU = standardRU[NDF_GROUP] || '—';
        } else if (NDF_GROUP === 7) {
          NDF_RU = 41; // RU41 for R25-R28
        } else if (NDF_GROUP === 8) {
          // Group 8: Mixed - R29 is RU41, R30-R32 are RU39
          NDF_RU = (R === 29) ? 41 : 39;
        } else if (NDF_GROUP === 9) {
          // Group 9: Mixed - R36 is RU37, R33-R35 are RU39
          NDF_RU = (R === 36) ? 37 : 39;
        } else if (NDF_GROUP === 10) {
          NDF_RU = 37; // RU37 for R37-R40
        } else if (NDF_GROUP === 11) {
          NDF_RU = 41; // RU41 for R41-R42
        } else if (NDF_GROUP === 13) {
          NDF_RU = 39; // RU39 for R51
        } else if (NDF_GROUP === 26) {
          if (R === 101) {
            NDF_RU = 39; // R101=RU39
          } else if (R === 102) {
            NDF_RU = 18; // R102=RU18
          }
        } else if (NDF_GROUP >= 16 && NDF_GROUP <= 21) {
          // Groups 16-21: Mixed RU28, RU26, RU24, RU22, and RU20
          if (NDF_GROUP === 16) {
            if (R === 63) {
              NDF_RU = 26; // R63=RU26
            } else if (R === 62 || R === 64) {
              NDF_RU = 28; // R62, R64=RU28
            }
          } else if (NDF_GROUP === 17) {
            NDF_RU = (R >= 65 && R <= 67) ? 26 : 28; // R65-R67=RU26, R68=RU28
          } else if (NDF_GROUP === 18) {
            if (R === 69) {
              NDF_RU = 28; // R69=RU28
            } else if (R === 70) {
              NDF_RU = 26; // R70=RU26
            } else if (R === 71 || R === 72) {
              NDF_RU = 24; // R71-R72=RU24
            }
          } else if (NDF_GROUP === 19) {
            if (R === 74 || R === 76) {
              NDF_RU = 26; // R74, R76=RU26
            } else if (R === 75 || R === 73) {
              NDF_RU = 24; // R75, R73=RU24
            }
          } else if (NDF_GROUP === 20) {
            if (R === 79) {
              NDF_RU = 26; // R79=RU26
            } else if (R === 77 || R === 78) {
              NDF_RU = 24; // R77-R78=RU24
            } else if (R === 80) {
              NDF_RU = 22; // R80=RU22
            }
          } else if (NDF_GROUP === 21) {
            if (R === 81 || R === 82) {
              NDF_RU = 24; // R81-R82=RU24
            } else if (R === 83) {
              NDF_RU = 22; // R83=RU22
            } else if (R === 84) {
              NDF_RU = 20; // R84=RU20
            }
          }
        } else if (NDF_GROUP >= 22 && NDF_GROUP <= 29) {
          // Groups 22-29: Mixed RU22, RU20, and RU18
          if (NDF_GROUP === 22) {
            if (R === 88) {
              NDF_RU = 22; // R88=RU22
            } else if (R === 85 || R === 87) {
              NDF_RU = 20; // R85, R87=RU20
            } else if (R === 86) {
              NDF_RU = 18; // R86=RU18
            }
          } else if (NDF_GROUP === 23) {
            if (R === 89) {
              NDF_RU = 22; // R89=RU22
            } else if (R === 90) {
              NDF_RU = 20; // R90=RU20
            } else if (R === 91 || R === 92) {
              NDF_RU = 18; // R91, R92=RU18
            }
          } else if (NDF_GROUP === 24) {
            if (R === 93) {
              NDF_RU = 22; // R93=RU22
            } else if (R === 94) {
              NDF_RU = 20; // R94=RU20
            } else if (R === 95 || R === 96) {
              NDF_RU = 18; // R95, R96=RU18
            }
          } else if (NDF_GROUP === 25) {
            if (R === 97 || R === 98) {
              NDF_RU = 22; // R97, R98=RU22
            } else if (R === 99 || R === 100) {
              NDF_RU = 20; // R99, R100=RU20
            }
          } else if (NDF_GROUP === 26) {
            NDF_RU = 18; // R102=RU18
          } else if (NDF_GROUP === 27) {
            if (R === 107) {
              NDF_RU = 20; // R107=RU20
            } else if (R === 106) {
              NDF_RU = 18; // R106=RU18
            }
          } else if (NDF_GROUP === 28) {
            if (R === 111) {
              NDF_RU = 16; // R111=RU16
            } else if (R === 112) {
              NDF_RU = 18; // R112=RU18
            }
          } else if (NDF_GROUP === 29) {
            NDF_RU = 22; // R114=RU22
          }
        } 
    
        // 3. Table for NDF range blocks (Expanded for RU28)
        const ndfRanges = {
          // STANDARD REPEATING RANGES (Groups 1-6)
          "1-1": [1,16], "3-1": [1,16], "5-1": [1,16],
          "1-2": [19,34], "3-2": [19,34], "5-2": [19,34],
          "1-3": [37,52], "3-3": [37,52], "5-3": [37,52],
          "1-4": [55,70], "3-4": [55,70], "5-4": [55,70],
          "2-1": [73,88], "4-1": [73,88], "6-1": [73,88],
          "2-2": [91,106], "4-2": [91,106], "6-2": [91,106],
          "2-3": [109,124], "4-3": [109,124], "6-3": [109,124],
          "2-4": [127,142], "4-4": [127,142], "6-4": [127,142],
          
          // RU41/RU39 SPECIFIC RANGES (Groups 7, 8, 9, 11, 13)
          "11-1": [1,16],  
          "7-1": [37,52],   
          "7-2": [55,70],   
          "11-2": [73,88], 
          "7-3": [91,106],  
          "7-4": [109,124], 
          "8-1": [127,142],  // RU41: R29 
          
          "8-2": [19,34],    // RU39: R30 (CH2)
          "8-3": [37,52],    // RU39: R31 (CH3)
          "8-4": [55,70],    // RU39: R32 (CH4)
          "9-1": [73,88],    // RU39: R33 (CH1)
          "9-2": [91,106],   // RU39: R34 (CH2)
          "13-3": [109,124],  // RU39: R51 (CH3)
          "9-3": [127,142],   // RU39: R35 (CH3)
          "26-1": [1,16],     // RU39: R101 (CH1)
          
          // RU37 (Group 9, 10)
          "9-4": [1,16],      // RU37: R36
          "10-1": [19,34],    // RU37: R37
          "10-2": [55,70],    // RU37: R38
          "10-3": [73,88],    // RU37: R39
          "10-4": [91,106],   // RU37: R40
          
          // RU28 (Groups 16, 17)
          "16-2": [109,124],  // RU28: R62 (CH2)
          "16-4": [127,142],  // RU28: R64 (CH4)
          "17-4": [73,88],    // RU28: R68 (CH4)
          
          // RU26 (Groups 16, 17, 18, 19, 20)
          "17-2": [1,16],     // RU26: R66 (CH2)
          "17-1": [19,34],    // RU26: R65 (CH1)
          "17-3": [37,52],    // RU26: R67 (CH3)
          "16-3": [55,70],    // RU26: R63 (CH3)
          "18-1": [91,106],   // RU28: R69 (CH1)
          "18-2": [73,88],    // RU26: R70 (CH2)
          "20-3": [91,106],   // RU26: R79 (CH3)
          "19-2": [109,124],  // RU26: R74 (CH2)
          "19-4": [127,142],  // RU26: R76 (CH4)
          
          // RU24 (Groups 18, 19, 20, 21)
          "20-1": [1,16],     // RU24: R77 (CH1)
          "19-3": [19,34],    // RU24: R75 (CH3)
          "18-4": [37,52],    // RU24: R72 (CH4)
          "19-1": [55,70],    // RU24: R73 (CH1)
          "20-2": [73,88],    // RU24: R78 (CH2)
          "18-3": [91,106],   // RU24: R71 (CH3)
          "21-1": [109,124],  // RU24: R81 (CH1)
          "21-2": [127,142],  // RU24: R82 (CH2)
          
          // RU22 (Groups 20, 21, 22, 23, 24, 25, 29)
          "29-2": [1,16],     // RU22: R114 (CH2)
          "25-2": [19,34],    // RU22: R98 (CH2)
          "20-4": [37,52],    // RU22: R80 (CH4)
          "21-3": [55,70],    // RU22: R83 (CH3)
          "24-1": [73,88],    // RU22: R93 (CH1)
          "25-1": [91,106],   // RU22: R97 (CH1)
          "23-1": [109,124],  // RU22: R89 (CH1)
          "22-4": [127,142],  // RU22: R88 (CH4) - corrected from R96
          
          // RU20 (Groups 21, 22, 23, 24, 25, 27)
          "24-2": [1,16],     // RU20: R94 (CH2)
          "25-3": [19,34],    // RU20: R99 (CH3)
          "25-4": [37,52],    // RU20: R100 (CH4)
          "27-3": [55,70],    // RU20: R107 (CH3)
          "21-4": [73,88],    // RU20: R84 (CH4)
          "23-2": [91,106],   // RU20: R90 (CH2)
          "22-3": [109,124],  // RU20: R87 (CH3)
          "22-1": [127,142],  // RU20: R85 (CH1)
          
          // RU18 (Groups 22, 23, 24, 26, 27, 28)
          "24-3": [1,16],     // RU18: R95 (CH3)
          "23-4": [19,34],    // RU18: R92 (CH4)
          "28-4": [37,52],    // RU18: R112 (CH4)
          "23-3": [55,70],    // RU18: R91 (CH3)
          "27-2": [73,88],    // RU18: R106 (CH2)
          "22-2": [91,106],   // RU18: R86 (CH2)
          "24-4": [109,124],  // RU18: R96 (CH4) - Note: was RU22, now RU18
          "26-2": [127,142],  // RU18: R102 (CH2)
          
          // RU16 (Group 28)
          "28-3": [1,16]      // RU16: R111 (CH3)
        };
    
        // Odd/even plane determines lower or upper half of the range
        const pair = ndfRanges[key];
        if (pair && NDF_GROUP > 0) { // Only proceed if a valid group was found
          const [rangeStart, rangeEnd] = pair;
          const span = rangeEnd - rangeStart + 1; // 16
          const half = span / 2; // 8
          const planeType = (P % 2 === 0) ? 'even' : 'odd';
          const base = planeType === 'odd' ? rangeStart : rangeStart + half;
          const activeRange = [base, base + half - 1];
          NDF_range = activeRange;
    
          // Determine cable from T1 JRP
          const t1CableMap = {17:1,18:1,19:2,20:2,21:3,22:3,23:4,24:4,25:5,26:5,27:6,28:6,29:7,30:7,31:8,32:8};
          cable = t1CableMap[j];
    
          // Calculate NDF MMC: start of active range + (cable-1)
          if (cable) NDF_MMC = activeRange[0] + (cable - 1);
          
          // Store results only if we successfully calculated all values
          window._ndfResult = {RU: NDF_RU, MMC: NDF_MMC, Range: NDF_range, Cable: cable, Group: NDF_GROUP };
          // Debug log for successful calculation
          console.log(`✓ NDF → R${R}, Group ${NDF_GROUP}, Key ${key}, Pair found: true, RU ${NDF_RU}, MMC ${NDF_MMC}, Range [${NDF_range[0]}, ${NDF_range[1]}], Plane ${(P%2===0)?'even':'odd'}, Cable ${cable}`);
        } else {
          // No valid pair found - store with null values but keep Group for error message
          window._ndfResult = {RU: NDF_RU, MMC: null, Range: [null, null], Cable: null, Group: NDF_GROUP };
          // Debug log for failed lookup
          console.log(`✗ NDF → R${R}, Group ${NDF_GROUP}, Key ${key}, Pair found: false, RU ${NDF_RU}, MMC null - KEY NOT FOUND IN ndfRanges!`);
        }
      } else {
        window._ndfResult = null;
      }
    
      // Call function to calculate and display all 4 channels
      if (allowNDF && window._ndfResult && window._ndfResult.Group > 0) {
        // Pass core parameters JRP 'j', Switch 'P', and Rack 'R'
        computeNdfChannelSummary(dev, j, P, R);
      } else {
        const summaryWrapper = document.getElementById('ndfChannelSummary');
        if (summaryWrapper) summaryWrapper.style.display = 'none';
      }
    
      document.getElementById('oDev').textContent = dev;
      document.getElementById('oSwitch').textContent = "P" + P;
      document.getElementById('oRack').textContent = "R" + R;
      document.getElementById('oPort').textContent = "JRP " + j;
      document.getElementById('oMMC').textContent = MMC;
      document.getElementById('oSp1').textContent = Spare1;
      document.getElementById('oSp2').textContent = Spare2;
      // Clear previous highlights then emphasize MMC and Spares
      document.querySelectorAll('.kv').forEach(el => el.classList.remove('highlight-primary','highlight-secondary'));
      document.getElementById('oMMC').parentElement.classList.add('highlight-primary');
      document.getElementById('oSp1').parentElement.classList.add('highlight-secondary');
      document.getElementById('oSp2').parentElement.classList.add('highlight-secondary');
      document.getElementById('oNotes').textContent =
        (P % 2 === 0)
          ? "Even switch in pair (offset 8)."
          : "Odd switch in pair (offset 0).";
      const logicComputed = document.getElementById('logicComputed');
      if (logicComputed) {
        logicComputed.textContent = `Computed with: k=${k}, block_start=${block_start}, offset=${offset}, i=${i}.`;
      }
    
      // Show results with subtle transition
      showWithTransition(out);
    
      // Smooth scroll to results
      setTimeout(() => scrollToElement(out, 100), 150);
    
      // Populate T2 concise emphasis with formatted device names
      const t2Title = document.getElementById('t2Title');
      if (t2Title) {
        // Extract base name (everything before -t1-)
        const baseMatch = dev.match(/^(.+)-t1-/i);
        const baseName = baseMatch ? baseMatch[1] : dev.replace(/-t1-.*/i, '');
        
        // Build T2 device name: baseName-t2-r{RU_T2}
        const t2DevName = `${baseName}-t2-r${RU_T2}`;
        
        // Format: T1_device · JRP j-channel <-> T2_device · JRP JRP_T2-CH_T2
        // Preserve the tick mark
        const tickSpan = document.getElementById('t2Tick');
        const tickHtml = tickSpan ? tickSpan.outerHTML : '';
        t2Title.innerHTML = `${dev} · JRP ${j}-${channel} <-> ${t2DevName} · JRP ${JRP_T2}-${CH_T2} ${tickHtml}`;
      }
      document.getElementById('t2RU').textContent = RU_T2;
      document.getElementById('t2JRP').textContent = JRP_T2;
      document.getElementById('t2CH').textContent = CH_T2;
      document.getElementById('t2Plane').textContent = 'P' + PLANE_T2;
      document.getElementById('t2Sub').textContent = '';
      // Show T2 with subtle transition
      const outT2El = document.getElementById('outT2');
      showWithTransition(outT2El);
    
      // ───────────── Display NDF Mapping ─────────────
      const ndf = window._ndfResult;
      const ndfOut = document.getElementById('outNDF');
      const ndfTitle = document.getElementById('ndfTitle');
      const ndfRU = document.getElementById('ndfRU');
      const ndfMMC = document.getElementById('ndfMMC');
      const ndfCable = document.getElementById('ndfCable');
      const ndfRange = document.getElementById('ndfRange');
      const ndfNote = document.getElementById('ndfNote');
      
      if (ndfOut && ndfRU && ndfMMC && ndfCable && ndfRange && ndfNote) {
        showWithTransition(ndfOut);
        ndfOut.classList.remove('show');
        void ndfOut.offsetWidth;
        if (allowNDF && ndf && ndf.MMC != null && ndf.Cable != null && Array.isArray(ndf.Range) && ndf.Range[0] != null && ndf.Range[1] != null) {
          ndfTitle.textContent = 'NDF — Active Mapping';
          ndfRU.textContent = ndf.RU;
          ndfMMC.textContent = ndf.MMC;
          // Apply channel-based color to MMC (channel 1-4 maps to cable colors 1-4)
          ndfMMC.className = 'ndfVal'; // Reset classes
          if (CH_T2 >= 1 && CH_T2 <= 4) {
            ndfMMC.classList.add(`cable${CH_T2}`);
          }
          ndfCable.textContent = ndf.Cable;
          ndfRange.textContent = `${ndf.Range[0]}–${ndf.Range[1]}`;
          // Display uses T2 JRP and Channel
          ndfNote.textContent = `Derived from JRP ${j} (cable ${ndf.Cable}) in JRP_T2 ${JRP_T2}-${CH_T2}.`;
          ndfOut.classList.add('show');
          
          // Update and show data flow diagram
          updateFlowDiagram(dev, P, R, j, channel, MMC, ndf.RU, ndf.MMC, JRP_T2, CH_T2, RU_T2);
        } else {
          ndfTitle.textContent = 'NDF — Under Development';
          
          // Logic to display RU for Racks that are explicitly mapped but don't have a formula
          let displayedRU = '—';
          let tempNDFGroup = 0;
          
          if (R >= 1 && R <= 24) {
            tempNDFGroup = Math.ceil(R / 4);
            const standardRU = { 1: 45, 2: 45, 3: 44, 4: 44, 5: 43, 6: 43 };
            displayedRU = standardRU[tempNDFGroup] || '—';
          } else if (R >= 25 && R <= 28) {
            tempNDFGroup = 7;
            displayedRU = 41; // RU41
          } else if (R === 29) {
            tempNDFGroup = 8;
            displayedRU = 41; // RU41 for R29
          } else if (R >= 30 && R <= 32) {
            tempNDFGroup = 8;
            displayedRU = 39; // RU39 for R30-R32
          } else if (R >= 33 && R <= 35) {
            tempNDFGroup = 9;
            displayedRU = 39; // RU39
          } else if (R === 36) {
            tempNDFGroup = 9;
            displayedRU = 37; // RU37 for R36
          } else if (R >= 37 && R <= 40) {
            tempNDFGroup = 10;
            displayedRU = 37; // RU37 for R37-R40
          } else if (R >= 41 && R <= 42) {
            tempNDFGroup = 11;
            displayedRU = 41; // RU41
          } else if (R === 51) {
            tempNDFGroup = 13;
            displayedRU = 39; // RU39
          } else if (R === 63) {
            tempNDFGroup = 16;
            displayedRU = 26; // RU26 for R63
          } else if (R === 62) {
            tempNDFGroup = 16;
            displayedRU = 28; // RU28 for R62
          } else if (R === 64) {
            tempNDFGroup = 16;
            displayedRU = 28; // RU28 for R64
          } else if (R === 65 || R === 66 || R === 67) {
            tempNDFGroup = 17;
            displayedRU = 26; // RU26 for R65-R67
          } else if (R === 68) {
            tempNDFGroup = 17;
            displayedRU = 28; // RU28 for R68
          } else if (R === 69) {
            tempNDFGroup = 18;
            displayedRU = 28; // RU28 for R69
          } else if (R === 70) {
            tempNDFGroup = 18;
            displayedRU = 26; // RU26 for R70
          } else if (R === 74 || R === 76) {
            tempNDFGroup = 19;
            displayedRU = 26; // RU26 for R74, R76
          } else if (R === 79) {
            tempNDFGroup = 20;
            displayedRU = 26; // RU26 for R79
          } else if (R === 77) {
            tempNDFGroup = 20;
            displayedRU = 24; // RU24 for R77
          } else if (R === 75) {
            tempNDFGroup = 19;
            displayedRU = 24; // RU24 for R75
          } else if (R === 72) {
            tempNDFGroup = 18;
            displayedRU = 24; // RU24 for R72
          } else if (R === 73) {
            tempNDFGroup = 19;
            displayedRU = 24; // RU24 for R73
          } else if (R === 78) {
            tempNDFGroup = 20;
            displayedRU = 24; // RU24 for R78
          } else if (R === 71) {
            tempNDFGroup = 18;
            displayedRU = 24; // RU24 for R71
          } else if (R === 81 || R === 82) {
            tempNDFGroup = 21;
            displayedRU = 24; // RU24 for R81-R82
          } else if (R === 114) {
            tempNDFGroup = 29;
            displayedRU = 22; // RU22 for R114
          } else if (R === 98) {
            tempNDFGroup = 25;
            displayedRU = 22; // RU22 for R98
          } else if (R === 80) {
            tempNDFGroup = 20;
            displayedRU = 22; // RU22 for R80
          } else if (R === 83) {
            tempNDFGroup = 21;
            displayedRU = 22; // RU22 for R83
          } else if (R === 93) {
            tempNDFGroup = 24;
            displayedRU = 22; // RU22 for R93
          } else if (R === 97) {
            tempNDFGroup = 25;
            displayedRU = 22; // RU22 for R97
          } else if (R === 89) {
            tempNDFGroup = 23;
            displayedRU = 22; // RU22 for R89
          } else if (R === 88) {
            tempNDFGroup = 22;
            displayedRU = 22; // RU22 for R88 - corrected from R96
          } else if (R === 94) {
            tempNDFGroup = 24;
            displayedRU = 20; // RU20 for R94
          } else if (R === 99 || R === 100) {
            tempNDFGroup = 25;
            displayedRU = 20; // RU20 for R99-R100
          } else if (R === 107) {
            tempNDFGroup = 27;
            displayedRU = 20; // RU20 for R107
          } else if (R === 84) {
            tempNDFGroup = 21;
            displayedRU = 20; // RU20 for R84
          } else if (R === 85) {
            tempNDFGroup = 22;
            displayedRU = 20; // RU20 for R85
          } else if (R === 87) {
            tempNDFGroup = 22;
            displayedRU = 20; // RU20 for R87
          } else if (R === 90) {
            tempNDFGroup = 23;
            displayedRU = 20; // RU20 for R90
          } else if (R === 95) {
            tempNDFGroup = 24;
            displayedRU = 18; // RU18 for R95
          } else if (R === 92) {
            tempNDFGroup = 23;
            displayedRU = 18; // RU18 for R92
          } else if (R === 112) {
            tempNDFGroup = 28;
            displayedRU = 18; // RU18 for R112
          } else if (R === 91) {
            tempNDFGroup = 23;
            displayedRU = 18; // RU18 for R91
          } else if (R === 106) {
            tempNDFGroup = 27;
            displayedRU = 18; // RU18 for R106
          } else if (R === 86) {
            tempNDFGroup = 22;
            displayedRU = 18; // RU18 for R86
          } else if (R === 102) {
            tempNDFGroup = 26;
            displayedRU = 18; // RU18 for R102
          } else if (R === 101) {
            tempNDFGroup = 26;
            displayedRU = 39; // RU39 for R101
          } else if (R === 96) {
            tempNDFGroup = 24;
            displayedRU = 18; // RU18 for R96 - Note: was RU22, now RU18
          } else if (R === 111) {
            tempNDFGroup = 28;
            displayedRU = 16; // RU16 for R111
          }
          
          // Hide channel summary when main NDF fails, but still show flow diagram
          const summaryWrapper = document.getElementById('ndfChannelSummary');
          if (summaryWrapper) summaryWrapper.style.display = 'none';
          
          // Still show flow diagram even if NDF mapping is incomplete
          // Use displayedRU or '—' for ndfRU, and null for ndfMMC
          const ndfRUForDiagram = (R < 1 || R > 128) ? '—' : displayedRU;
          updateFlowDiagram(dev, P, R, j, channel, MMC, ndfRUForDiagram, null, JRP_T2, CH_T2, RU_T2);
          
          ndfRU.textContent = (R < 1 || R > 51) ? '—' : displayedRU; 
          ndfMMC.textContent = '—';
          ndfMMC.className = 'ndfVal'; // Clear cable color classes
          ndfCable.textContent = '—';
          ndfRange.textContent = '—';
          const isSupported = allowNDF;
          ndfNote.textContent = !isSupported
            ? `NDF mapping is supported for Racks 1–42, 51, 61–85, 86–98, 99–100, 101–102, 106–107, 111–112, and 114 of T1. R${R} mapping is not defined.`
            : `R${R} found in T2 JRP ${window._ndfResult ? window._ndfResult.Group : tempNDFGroup} but an explicit mapping is missing (key ${tempNDFGroup}-${CH_T2}).`;
          
          // Still show flow diagram even if NDF is not supported
          if (!isSupported) {
            updateFlowDiagram(dev, P, R, j, channel, MMC, '—', null, JRP_T2, CH_T2, RU_T2);
          }
        }
      }
      
      // Always show flow diagram after compute completes (even if NDF panel wasn't shown)
      // This ensures the diagram appears for all searches
      if (!ndfOut) {
        console.log('NDF panel not found, showing flow diagram anyway');
        updateFlowDiagram(dev, P, R, j, channel, MMC, '—', null, JRP_T2, CH_T2, RU_T2);
      }
    
      // Render MMC mini-diagram
      window._currentBlockStart = block_start;
      renderMMCDiagram({ MMC, Spare1, Spare2, blockStart: block_start });
    
      // Show T2 checkmark briefly
      const tick = document.getElementById('t2Tick');
      if (tick) {
        tick.classList.remove('show');
        // force reflow to restart animation
        void tick.offsetWidth;
        tick.classList.add('show');
        setTimeout(() => tick.classList.remove('show'), 900);
      }
    
      window._copyText = `Device ${dev} → MMC ${MMC} (Spare1 ${Spare1}, Spare2 ${Spare2}); Switch P${P}, Rack R${R}, Port JRP${j}; T2 → Plane P${PLANE_T2}, RU ${RU_T2}, JRP ${JRP_T2}, CH ${CH_T2}.`;
    
      // Update permalink
      try {
        const params = new URLSearchParams();
        params.set('dev', dev);
        params.set('jrp', String(j));
        params.set('channel', String(channel));
        history.replaceState(null, '', location.pathname + '?' + params.toString());
      } catch {}
    
      // Update recent history
      try {
        const entry = {
          dev,
          j,
          channel,
          P,
          R,
          MMC,
          Spare1,
          Spare2,
          t2: { RU: RU_T2, JRP: JRP_T2, CH: CH_T2, Plane: PLANE_T2 },
          ts: Date.now()
        };
        addToHistory(entry);
        renderHistory();
      } catch {}
    }
    
    function computeNdfChannelSummary(dev, j, P, R) {
      const summaryList = document.getElementById('ndfSummaryList');
      const summaryWrapper = document.getElementById('ndfChannelSummary');
      const ndfT2JrpNumEl = document.getElementById('ndfT2JrpNum');
      
      summaryList.innerHTML = '';
      
      // --- Define Mapping Constants (Updated) ---
      // Note: Group 8 has mixed RU (R29=RU41, R30-R32=RU39), so we determine RU by rack number
      const ndfRanges = {
          "1-1": [1,16], "3-1": [1,16], "5-1": [1,16], "1-2": [19,34], "3-2": [19,34], "5-2": [19,34],
          "1-3": [37,52], "3-3": [37,52], "5-3": [37,52], "1-4": [55,70], "3-4": [55,70], "5-4": [55,70],
          "2-1": [73,88], "4-1": [73,88], "6-1": [73,88], "2-2": [91,106], "4-2": [91,106], "6-2": [91,106],
          "2-3": [109,124], "4-3": [109,124], "6-3": [109,124], "2-4": [127,142], "4-4": [127,142], "6-4": [127,142],
          "11-1": [1,16], "7-1": [37,52], "7-2": [55,70], "11-2": [73,88], 
          "7-3": [91,106], "7-4": [109,124], "8-1": [127,142], 
          "8-2": [19,34], "8-3": [37,52], "8-4": [55,70],
          "9-1": [73,88], "9-2": [91,106], "13-3": [109,124], "9-3": [127,142],
          // RU37 (Group 9, 10)
          "9-4": [1,16],      // RU37: R36
          "10-1": [19,34],    // RU37: R37
          "10-2": [55,70],    // RU37: R38
          "10-3": [73,88],    // RU37: R39
          "10-4": [91,106],   // RU37: R40
          
          // RU28 (Groups 16, 17)
          "16-2": [109,124],  // RU28: R62 (CH2)
          "16-4": [127,142],  // RU28: R64 (CH4)
          "17-4": [73,88],    // RU28: R68 (CH4)
          
          // RU26 (Groups 16, 17, 18, 19, 20)
          "17-2": [1,16],     // RU26: R66 (CH2)
          "17-1": [19,34],    // RU26: R65 (CH1)
          "17-3": [37,52],    // RU26: R67 (CH3)
          "16-3": [55,70],    // RU26: R63 (CH3)
          "18-1": [91,106],   // RU28: R69 (CH1)
          "18-2": [73,88],    // RU26: R70 (CH2)
          "20-3": [91,106],   // RU26: R79 (CH3)
          "19-2": [109,124],  // RU26: R74 (CH2)
          "19-4": [127,142],  // RU26: R76 (CH4)
          
          // RU24 (Groups 18, 19, 20, 21)
          "20-1": [1,16],     // RU24: R77 (CH1)
          "19-3": [19,34],    // RU24: R75 (CH3)
          "18-4": [37,52],    // RU24: R72 (CH4)
          "19-1": [55,70],    // RU24: R73 (CH1)
          "20-2": [73,88],    // RU24: R78 (CH2)
          "18-3": [91,106],   // RU24: R71 (CH3)
          "21-1": [109,124],  // RU24: R81 (CH1)
          "21-2": [127,142],  // RU24: R82 (CH2)
          
          // RU22 (Groups 20, 21, 22, 23, 24, 25, 29)
          "29-2": [1,16],     // RU22: R114 (CH2)
          "25-2": [19,34],    // RU22: R98 (CH2)
          "20-4": [37,52],    // RU22: R80 (CH4)
          "21-3": [55,70],    // RU22: R83 (CH3)
          "24-1": [73,88],    // RU22: R93 (CH1)
          "25-1": [91,106],   // RU22: R97 (CH1)
          "23-1": [109,124],  // RU22: R89 (CH1)
          "22-4": [127,142],  // RU22: R88 (CH4) - corrected from R96
          
          // RU20 (Groups 21, 22, 23, 24, 25, 27)
          "24-2": [1,16],     // RU20: R94 (CH2)
          "25-3": [19,34],    // RU20: R99 (CH3)
          "25-4": [37,52],    // RU20: R100 (CH4)
          "27-3": [55,70],    // RU20: R107 (CH3)
          "21-4": [73,88],    // RU20: R84 (CH4)
          "23-2": [91,106],   // RU20: R90 (CH2)
          "22-3": [109,124],  // RU20: R87 (CH3)
          "22-1": [127,142],  // RU20: R85 (CH1)
          
          // RU18 (Groups 22, 23, 24, 26, 27, 28)
          "24-3": [1,16],     // RU18: R95 (CH3)
          "23-4": [19,34],    // RU18: R92 (CH4)
          "28-4": [37,52],    // RU18: R112 (CH4)
          "23-3": [55,70],    // RU18: R91 (CH3)
          "27-2": [73,88],    // RU18: R106 (CH2)
          "22-2": [91,106],   // RU18: R86 (CH2)
          "24-4": [109,124],  // RU18: R96 (CH4) - Note: was RU22, now RU18
          "26-2": [127,142],  // RU18: R102 (CH2)
          
          // RU16 (Group 28)
          "28-3": [1,16]      // RU16: R111 (CH3)
      };
      const t1CableMap = {17:1,18:1,19:2,20:2,21:3,22:3,23:4,24:4,25:5,26:5,27:6,28:6,29:7,30:7,31:8,32:8};
      const cable = t1CableMap[j];
      const planeType = (P % 2 === 0) ? 'even' : 'odd';
      
      // Determine the base rack (R_base) corresponding to the start of the 4-rack block
      const R_input_group_index = ((R - 1) % 4); 
      const R_base = R - R_input_group_index; 
      
      let isFullyMapped = true;
      let baseT2Jrp = 0; 
      for (let c = 1; c <= 4; c++) {
          const R_temp = R_base + (c - 1);
          
          // Skip racks outside the supported range or in gaps
          const isExplicitlyMapped = (R_temp >= 1 && R_temp <= 42) || (R_temp === 51) || 
                           (R_temp >= 61 && R_temp <= 70) || (R_temp >= 71 && R_temp <= 79) || 
                           (R_temp >= 80 && R_temp <= 85) || (R_temp >= 86 && R_temp <= 98) || (R_temp >= 99 && R_temp <= 100) || 
                           (R_temp === 101) || (R_temp === 102) || (R_temp === 106) || (R_temp === 107) || (R_temp === 111) || (R_temp === 112) || (R_temp === 114);
          if (!isExplicitlyMapped) {
              isFullyMapped = false;
              break; 
          }
          // --- Determine NDF Group and Key (Custom Logic - Must mirror compute()) ---
          let NDF_GROUP = 0;
          if (R_temp >= 1 && R_temp <= 24) { NDF_GROUP = Math.ceil(R_temp / 4); } 
          else if (R_temp >= 25 && R_temp <= 28) { NDF_GROUP = 7; } 
          else if (R_temp === 29) { NDF_GROUP = 8; } 
          else if (R_temp >= 30 && R_temp <= 32) { NDF_GROUP = 8; } 
          else if (R_temp >= 33 && R_temp <= 35) { NDF_GROUP = 9; }
          else if (R_temp === 36) { NDF_GROUP = 9; }
          else if (R_temp >= 37 && R_temp <= 40) { NDF_GROUP = 10; }
          else if (R_temp >= 41 && R_temp <= 42) { NDF_GROUP = 11; } 
          else if (R_temp === 51) { NDF_GROUP = 13; }
          else if (R_temp === 63) { NDF_GROUP = 16; }
          else if (R_temp === 62) { NDF_GROUP = 16; }
          else if (R_temp === 64) { NDF_GROUP = 16; }
          else if (R_temp === 65 || R_temp === 66 || R_temp === 67) { NDF_GROUP = 17; }
          else if (R_temp === 68) { NDF_GROUP = 17; }
          else if (R_temp === 69) { NDF_GROUP = 18; }
          else if (R_temp === 70) { NDF_GROUP = 18; }
          else if (R_temp === 74 || R_temp === 76) { NDF_GROUP = 19; }
          else if (R_temp === 79) { NDF_GROUP = 20; }
          else if (R_temp === 77) { NDF_GROUP = 20; }
          else if (R_temp === 75) { NDF_GROUP = 19; }
          else if (R_temp === 72) { NDF_GROUP = 18; }
          else if (R_temp === 73) { NDF_GROUP = 19; }
          else if (R_temp === 78) { NDF_GROUP = 20; }
          else if (R_temp === 71) { NDF_GROUP = 18; }
          else if (R_temp === 81 || R_temp === 82) { NDF_GROUP = 21; }
          else if (R_temp === 114) { NDF_GROUP = 29; }
          else if (R_temp === 98) { NDF_GROUP = 25; }
          else if (R_temp === 80) { NDF_GROUP = 20; }
          else if (R_temp === 83) { NDF_GROUP = 21; }
          else if (R_temp === 93) { NDF_GROUP = 24; }
          else if (R_temp === 97) { NDF_GROUP = 25; }
          else if (R_temp === 89) { NDF_GROUP = 23; }
          else if (R_temp === 88) { NDF_GROUP = 22; }
          else if (R_temp === 94) { NDF_GROUP = 24; }
          else if (R_temp === 99 || R_temp === 100) { NDF_GROUP = 25; }
          else if (R_temp === 107) { NDF_GROUP = 27; }
          else if (R_temp === 84) { NDF_GROUP = 21; }
          else if (R_temp === 85) { NDF_GROUP = 22; }
          else if (R_temp === 87) { NDF_GROUP = 22; }
          else if (R_temp === 90) { NDF_GROUP = 23; }
          else if (R_temp === 95) { NDF_GROUP = 24; }
          else if (R_temp === 92) { NDF_GROUP = 23; }
          else if (R_temp === 112) { NDF_GROUP = 28; }
          else if (R_temp === 91) { NDF_GROUP = 23; }
          else if (R_temp === 106) { NDF_GROUP = 27; }
          else if (R_temp === 86) { NDF_GROUP = 22; }
          else if (R_temp === 102) { NDF_GROUP = 26; }
          else if (R_temp === 101) { NDF_GROUP = 26; }
          else if (R_temp === 96) { NDF_GROUP = 24; }
          else if (R_temp === 111) { NDF_GROUP = 28; }
          
          if (NDF_GROUP === 0) { isFullyMapped = false; break; } // Safety check 
          
          const CH_T2_temp = ((R_temp - 1) % 4) + 1;
          const key = `${NDF_GROUP}-${CH_T2_temp}`;
          const pair = ndfRanges[key];
          
          // Determine RU based on rack number (Group 8 has mixed RU41/RU39)
          let NDF_RU = '—';
          if (NDF_GROUP >= 1 && NDF_GROUP <= 6) {
            const standardRU = { 1: 45, 2: 45, 3: 44, 4: 44, 5: 43, 6: 43 };
            NDF_RU = standardRU[NDF_GROUP] || '—';
          } else if (NDF_GROUP === 7) {
            NDF_RU = 41; // RU41 for R25-R28
          } else if (NDF_GROUP === 8) {
            // Group 8: Mixed - R29 is RU41, R30-R32 are RU39
            NDF_RU = (R_temp === 29) ? 41 : 39;
          } else if (NDF_GROUP === 9) {
            // Group 9: Mixed - R36 is RU37, R33-R35 are RU39
            NDF_RU = (R_temp === 36) ? 37 : 39;
          } else if (NDF_GROUP === 10) {
            NDF_RU = 37; // RU37 for R37-R40
          } else if (NDF_GROUP === 11) {
            NDF_RU = 41; // RU41 for R41-R42
          } else if (NDF_GROUP === 13) {
            NDF_RU = 39; // RU39 for R51
          } else if (NDF_GROUP >= 16 && NDF_GROUP <= 21) {
            // Groups 16-21: Mixed RU28, RU26, RU24, RU22, and RU20
            if (NDF_GROUP === 16) {
              if (R_temp === 63) {
                NDF_RU = 26; // R63=RU26
              } else if (R_temp === 62 || R_temp === 64) {
                NDF_RU = 28; // R62, R64=RU28
              }
            } else if (NDF_GROUP === 17) {
              NDF_RU = (R_temp >= 65 && R_temp <= 67) ? 26 : 28; // R65-R67=RU26, R68=RU28
            } else if (NDF_GROUP === 18) {
              if (R_temp === 69) {
                NDF_RU = 28; // R69=RU28
              } else if (R_temp === 70) {
                NDF_RU = 26; // R70=RU26
              } else if (R_temp === 71 || R_temp === 72) {
                NDF_RU = 24; // R71-R72=RU24
              }
            } else if (NDF_GROUP === 19) {
              if (R_temp === 74 || R_temp === 76) {
                NDF_RU = 26; // R74, R76=RU26
              } else if (R_temp === 75 || R_temp === 73) {
                NDF_RU = 24; // R75, R73=RU24
              }
            } else if (NDF_GROUP === 20) {
              if (R_temp === 79) {
                NDF_RU = 26; // R79=RU26
              } else if (R_temp === 77 || R_temp === 78) {
                NDF_RU = 24; // R77-R78=RU24
              } else if (R_temp === 80) {
                NDF_RU = 22; // R80=RU22
              }
            } else if (NDF_GROUP === 21) {
              if (R_temp === 81 || R_temp === 82) {
                NDF_RU = 24; // R81-R82=RU24
              } else if (R_temp === 83) {
                NDF_RU = 22; // R83=RU22
              } else if (R_temp === 84) {
                NDF_RU = 20; // R84=RU20
              }
            }
          } else if (NDF_GROUP >= 22 && NDF_GROUP <= 29) {
            // Groups 22-29: Mixed RU22, RU20, and RU18
            if (NDF_GROUP === 22) {
              if (R_temp === 88) {
                NDF_RU = 22; // R88=RU22
              } else if (R_temp === 85 || R_temp === 87) {
                NDF_RU = 20; // R85, R87=RU20
              } else if (R_temp === 86) {
                NDF_RU = 18; // R86=RU18
              }
            } else if (NDF_GROUP === 23) {
              if (R_temp === 89) {
                NDF_RU = 22; // R89=RU22
              } else if (R_temp === 90) {
                NDF_RU = 20; // R90=RU20
              } else if (R_temp === 91 || R_temp === 92) {
                NDF_RU = 18; // R91, R92=RU18
              }
            } else if (NDF_GROUP === 24) {
              if (R_temp === 93) {
                NDF_RU = 22; // R93=RU22
              } else if (R_temp === 94) {
                NDF_RU = 20; // R94=RU20
              } else if (R_temp === 95 || R_temp === 96) {
                NDF_RU = 18; // R95, R96=RU18
              }
            } else if (NDF_GROUP === 25) {
              if (R_temp === 97 || R_temp === 98) {
                NDF_RU = 22; // R97, R98=RU22
              } else if (R_temp === 99 || R_temp === 100) {
                NDF_RU = 20; // R99, R100=RU20
              }
            } else if (NDF_GROUP === 26) {
              if (R_temp === 101) {
                NDF_RU = 39; // R101=RU39
              } else if (R_temp === 102) {
                NDF_RU = 18; // R102=RU18
              }
            } else if (NDF_GROUP === 27) {
              if (R_temp === 107) {
                NDF_RU = 20; // R107=RU20
              } else if (R_temp === 106) {
                NDF_RU = 18; // R106=RU18
              }
            } else if (NDF_GROUP === 28) {
              if (R_temp === 111) {
                NDF_RU = 16; // R111=RU16
              } else if (R_temp === 112) {
                NDF_RU = 18; // R112=RU18
              }
            } else if (NDF_GROUP === 29) {
              NDF_RU = 22; // R114=RU22
            }
          }
          
          baseT2Jrp = Math.floor((R_temp - 1) / 4) + 1; // T2 JRP is constant for R_base to R_base+3
          if (!pair) {
              isFullyMapped = false;
              break;
          } 
          // --- Calculate MMC ---
          const [rangeStart] = pair;
          const half = 8;
          const base = (planeType === 'odd') ? rangeStart : rangeStart + half;
          const NDF_MMC = base + (cable - 1);
          // --- Format Output ---
          const item = document.createElement('div');
          const isCurrent = (R_temp === R);
          // Map channel to cable color (channel 1 = cable 1, channel 2 = cable 2, etc.)
          const cableNum = CH_T2_temp; // Channel 1-4 maps to Cable 1-4
          const cableClass = `cable${cableNum}`;
          
          // Apply cable color class and add current rack highlight
          let inlineStyle = '';
          if (isCurrent) {
            // Add extra emphasis for current rack
            inlineStyle = 'font-weight: 700; box-shadow: 0 0 0 2px rgba(245,158,11,0.5);';
          }
          
          // Format: jrp1-1 → Unit 45 MMC 9
          const styleAttr = inlineStyle ? ` style="${inlineStyle}"` : '';
          item.innerHTML = `<span class="${cableClass}"${styleAttr}>jrp${baseT2Jrp}-${CH_T2_temp} &rarr; Unit ${NDF_RU} MMC ${NDF_MMC}</span>`;
          summaryList.appendChild(item);
      }
      // --- Final Display Logic ---
      if (isFullyMapped && summaryList.children.length === 4) {
          if (ndfT2JrpNumEl) ndfT2JrpNumEl.textContent = baseT2Jrp;
          if (summaryWrapper) summaryWrapper.style.display = 'block';
          if (summaryList) summaryList.style.gridTemplateColumns = 'repeat(2, 1fr)';
      } else {
          if (summaryWrapper) summaryWrapper.style.display = 'none';
      }
    }
    
    // Subtle UI helper functions
    function showWithTransition(element) {
      if (!element) return;
      element.style.display = 'block';
      // Trigger CSS transition by forcing reflow
      void element.offsetWidth;
    }
    
    function scrollToElement(element, offset = 100) {
      if (!element) return;
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      const offsetPosition = elementPosition - offset;
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }
    
    // Global storage for associated rack data (for click interactions)
    window._flowDiagramData = {};
    
    // Render data flow diagram with associated racks and cables (8 T2 RUs for JRP Pairs)
    function updateFlowDiagram(dev, P, R, j, channel, MMC, ndfRU, ndfMMC, JRP_T2, CH_T2, RU_T2) {
      console.log('updateFlowDiagram called with:', { dev, P, R, j, channel, MMC, ndfRU, ndfMMC, JRP_T2, CH_T2, RU_T2 });
      const flowContainer = document.getElementById('flowDiagramContainer');
      if (!flowContainer) {
        console.error('flowDiagramContainer not found!');
        return;
      }
      console.log('flowDiagramContainer found, proceeding...');
      
      // Extract base name for T2 device construction
      const baseMatch = dev.match(/^(.+)-t1-/i);
      const baseName = baseMatch ? baseMatch[1] : dev.replace(/-t1-.*/i, '');
      
      // Determine base rack (R_base) for the 4-rack block
      const R_input_group_index = ((R - 1) % 4);
      const R_base = R - R_input_group_index;
      
      // Calculate associated JRP (pairs: 17-18, 19-20, 21-22, etc.)
      const jIsOdd = (j % 2 === 1);
      const associatedJRP = jIsOdd ? j + 1 : j - 1;
      const showJRPPair = (j >= 17 && j <= 32);
      
      // Determine the T1 JRPs in this pair (e.g., [17, 18])
      const JRP_PAIR_ARRAY = jIsOdd ? [j, associatedJRP] : [associatedJRP, j];
      
      // Initialize flow diagram data storage
      window._flowDiagramData = { ndfData: {} };
      
      // --- 1. Update NDF & Mini-Rack Labels ---
      const mmcLabel = document.getElementById('mmcLabel');
      const ndfLabel = document.getElementById('ndfLabel');
      const ndfCableLabel = document.getElementById('ndfCableLabel');
      
      if (mmcLabel) mmcLabel.textContent = `MMC ${MMC}`;
      if (ndfLabel) ndfLabel.textContent = ndfRU && ndfMMC ? `RU${ndfRU} · MMC ${ndfMMC}` : 'RU · MMC';
      
      const cableClass = (CH_T2 >= 1 && CH_T2 <= 4) ? `cable${CH_T2}` : '';
      ['mmcLabel', 'ndfLabel', 'ndfCableLabel'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.classList.remove('cable1', 'cable2', 'cable3', 'cable4');
          if (cableClass) el.classList.add(cableClass);
          if (id === 'ndfCableLabel' && CH_T2 >= 1 && CH_T2 <= 4) {
            el.textContent = `cable${CH_T2}`;
          } else if (id === 'ndfCableLabel') {
            el.textContent = 'cable';
          }
        }
      });
      
      // Color coding for flow paths (only coloring the active T1 Rack's path)
      ['trunkPath', 'miniToNdfPath'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.classList.remove('cable1', 'cable2', 'cable3', 'cable4', 'inactive', 'active');
          if (cableClass) el.classList.add(cableClass, 'active');
          else el.classList.add('inactive');
        }
      });
      
      // --- 2. T1 Racks (Left Side - Remains 4 Blocks) ---
      const t1RackGroups = ['t1Rack1', 't1Rack2', 't1Rack3', 't1Rack4'];
      const t1RackLabels = ['t1R1Label', 't1R2Label', 't1R3Label', 't1R4Label'];
      const t1Arrows = ['t1Arrow1', 't1Arrow2', 't1Arrow3', 't1Arrow4'];
      
      for (let i = 0; i < 4; i++) {
        const R_temp = R_base + i;
        const CH_T2_temp = ((R_temp - 1) % 4) + 1;
        const labelEl = document.getElementById(t1RackLabels[i]);
        const jrpLabelEl = document.getElementById(`t1R${i+1}Jrp`);
        const rackGroup = document.getElementById(t1RackGroups[i]);
        const rackRect = rackGroup ? rackGroup.querySelector('rect') : null;
        const arrowEl = document.getElementById(t1Arrows[i]);
        
        // Setup T1 rack labels and colors
        if (rackRect) {
          const isCurrentT1 = (R_temp === R);
          rackRect.classList.remove('cable1', 'cable2', 'cable3', 'cable4', 'active', 'highlight', 'userRequested');
          if (CH_T2_temp >= 1 && CH_T2_temp <= 4) rackRect.classList.add(`cable${CH_T2_temp}`);
          if (isCurrentT1) {
            rackRect.classList.add('active', 'highlight', 'userRequested');
          }
          // Click handlers will be set by attachT1RackClickHandlers() at the end
          if (rackGroup) {
            rackGroup.style.cursor = 'pointer';
          }
        }
        
        // Update T1 to Mini-Rack arrows - only highlight the user-requested one
        if (arrowEl) {
          const isCurrentT1 = (R_temp === R);
          const arrowCableClass = (CH_T2_temp >= 1 && CH_T2_temp <= 4) ? `cable${CH_T2_temp}` : '';
          
          arrowEl.classList.remove('cable1', 'cable2', 'cable3', 'cable4', 'active', 'inactive');
          arrowEl.style.display = '';
          arrowEl.setAttribute('stroke-dasharray', '6 3');
          
          if (isCurrentT1) {
            // User-requested arrow: fully visible with cable color
            arrowEl.classList.add('active', arrowCableClass);
            arrowEl.style.opacity = '1';
            arrowEl.style.strokeWidth = '3.5';
            if (CH_T2_temp >= 1 && CH_T2_temp <= 4) {
              arrowEl.setAttribute('marker-end', `url(#arrowhead${CH_T2_temp})`);
            }
          } else {
            // Other arrows: very faded
            arrowEl.classList.add('inactive');
            arrowEl.style.opacity = '0.15';
            arrowEl.style.strokeWidth = '2';
            arrowEl.setAttribute('marker-end', 'url(#arrowhead)');
          }
        }
        
        // Store NDF data for each associated rack (Needed for click handler)
        window._flowDiagramData.ndfData[`rack${R_temp}`] = calculateNDFForRack(P, R_temp, j, CH_T2_temp);
        // Store rack metadata separately for reference
        window._flowDiagramData[`rack${R_temp}_meta`] = {
          dev, P, R: R_temp, j, channel, CH_T2: CH_T2_temp
        };
        
        // Update labels
        if (labelEl) labelEl.textContent = `P${P}-R${R_temp}`;
        if (jrpLabelEl) jrpLabelEl.textContent = showJRPPair ? `JRP ${JRP_PAIR_ARRAY.join(',')}` : `JRP ${j}`;
        
        // Update corresponding Mini-Rack box (MMC value is the same for all 4, but we show it in each box)
        const miniRackRect = document.getElementById(`miniRackRect${i+1}`);
        const miniRackMmcLabel = document.getElementById(`mmcLabel${i+1}`);
        const isCurrentT1ForMiniRack = (R_temp === R);
        if (miniRackRect) {
          miniRackRect.classList.remove('cable1', 'cable2', 'cable3', 'cable4', 'active', 'highlight', 'userRequested', 'inactive');
          if (CH_T2_temp >= 1 && CH_T2_temp <= 4) miniRackRect.classList.add(`cable${CH_T2_temp}`);
          if (isCurrentT1ForMiniRack) {
            miniRackRect.classList.add('active', 'highlight', 'userRequested');
          } else {
            miniRackRect.classList.add('inactive');
          }
        }
        if (miniRackMmcLabel) {
          miniRackMmcLabel.textContent = `MMC ${MMC}`;
          miniRackMmcLabel.classList.remove('cable1', 'cable2', 'cable3', 'cable4');
          if (CH_T2_temp >= 1 && CH_T2_temp <= 4) {
            miniRackMmcLabel.classList.add(`cable${CH_T2_temp}`);
          }
        }
        
        // Update Mini-Rack to NDF paths - each path uses its corresponding cable color
        const miniToNdfPath = document.getElementById(`miniToNdfPath${i+1}`);
        if (miniToNdfPath) {
          const pathCableClass = (CH_T2_temp >= 1 && CH_T2_temp <= 4) ? `cable${CH_T2_temp}` : '';
          miniToNdfPath.classList.remove('cable1', 'cable2', 'cable3', 'cable4', 'active', 'inactive');
          miniToNdfPath.setAttribute('stroke-dasharray', '6 3');
          miniToNdfPath.style.display = '';
          if (isCurrentT1ForMiniRack) {
            miniToNdfPath.classList.add('active', pathCableClass);
            miniToNdfPath.style.opacity = '1';
            if (CH_T2_temp >= 1 && CH_T2_temp <= 4) {
              miniToNdfPath.setAttribute('marker-end', `url(#arrowhead${CH_T2_temp})`);
            }
          } else {
            miniToNdfPath.classList.add('inactive');
            miniToNdfPath.style.opacity = '0.15';
            miniToNdfPath.setAttribute('marker-end', 'url(#arrowhead)');
          }
        }
        
        // T1 to Mini-Rack arrows are already handled above in the setup section (lines 1532-1556)
        // No need to process them again here
      }
      
      // Remove any existing merge arrow (no longer needed)
      const existingMerge = document.getElementById('t1MergeArrow');
      if (existingMerge) existingMerge.remove();
      
      // --- 3. T2 Channels (Right Side - Expanded to 8 Blocks) ---
      const T2_CHANNEL_IDS = ['t2Channel1', 't2Channel2', 't2Channel3', 't2Channel4', 't2Channel5', 't2Channel6', 't2Channel7', 't2Channel8'];
      const T2_LABEL_IDS = ['t2Ch1Label', 't2Ch2Label', 't2Ch3Label', 't2Ch4Label', 't2Ch5Label', 't2Ch6Label', 't2Ch7Label', 't2Ch8Label'];
      const T2_JRP_IDS = ['t2Ch1Jrp', 't2Ch2Jrp', 't2Ch3Jrp', 't2Ch4Jrp', 't2Ch5Jrp', 't2Ch6Jrp', 't2Ch7Jrp', 't2Ch8Jrp'];
      const NDF_TO_T2_PATHS = ['ndfToT2Path1', 'ndfToT2Path2', 'ndfToT2Path3', 'ndfToT2Path4', 'ndfToT2Path5', 'ndfToT2Path6', 'ndfToT2Path7', 'ndfToT2Path8'];
      
      let totalConnectionCount = 0;
      
      // Loop through the two T1 JRPs (e.g., 17, 18)
      JRP_PAIR_ARRAY.forEach(current_jrp => {
        // Loop through the four channels (1, 2, 3, 4) for EACH JRP
        for (let c = 1; c <= 4; c++) {
          if (totalConnectionCount >= T2_CHANNEL_IDS.length) break;
          
          const T2_RU_temp = 4 * (current_jrp - 17) + c; // R1-R8 for JRP 17/18
          const T2_JRP_temp = JRP_T2; // T2 JRP is constant for T1 Rack group
          const labelEl = document.getElementById(T2_LABEL_IDS[totalConnectionCount]);
          const jrpEl = document.getElementById(T2_JRP_IDS[totalConnectionCount]);
          const pathEl = document.getElementById(NDF_TO_T2_PATHS[totalConnectionCount]);
          const channelGroup = document.getElementById(T2_CHANNEL_IDS[totalConnectionCount]);
          const channelRect = channelGroup ? channelGroup.querySelector('rect') : null;
          
          // Highlight determination: Is this the specific JRP/Channel the user entered?
          const isCurrent = (current_jrp === j && c === channel);
          
          // Show channel (hide unused ones later)
          if (channelGroup) channelGroup.style.display = 'block';
          
          // Calculate T2 Channel for this connection (based on T1 rack group)
          // Note: T2 JRP is constant for the rack group, but T2 Channel varies by rack position
          const CH_T2_for_this = CH_T2; // All 8 connections share same T2 channel (based on input rack)
          
          // Calculate which T1 JRP-channel corresponds to this block (0-7)
          const jrp_idx = Math.floor(totalConnectionCount / 4); // 0 or 1
          const t1_channel = (totalConnectionCount % 4) + 1; // 1-4
          const t1_jrp = JRP_PAIR_ARRAY[jrp_idx];
          
          // Update T2 Channel Box - T2 info on left, T1 info on right
          // Left side: P#-T2-R# (top), JRP #-# (bottom)
          if (labelEl) {
            labelEl.textContent = `P${P}-T2-R${T2_RU_temp}`;
            labelEl.classList.remove('cable1', 'cable2', 'cable3', 'cable4', 'cable5', 'cable6', 'cable7', 'cable8', 'highlight');
            const labelCable = totalConnectionCount + 1; // Sequential: 1-8
            if (labelCable >= 1 && labelCable <= 8) labelEl.classList.add(`cable${labelCable}`);
            if (isCurrent) labelEl.classList.add('highlight');
          }
          if (jrpEl) {
            jrpEl.textContent = `JRP ${T2_JRP_temp}-${CH_T2_for_this}`;
            jrpEl.classList.remove('cable1', 'cable2', 'cable3', 'cable4', 'cable5', 'cable6', 'cable7', 'cable8', 'highlight');
            const jrpCable = totalConnectionCount + 1; // Sequential: 1-8
            if (jrpCable >= 1 && jrpCable <= 8) jrpEl.classList.add(`cable${jrpCable}`);
            if (isCurrent) jrpEl.classList.add('highlight');
          }
          
          // Right side: T1 JRP-channel (top-right corner)
          const t1InfoEl = document.getElementById(`t2Ch${totalConnectionCount + 1}T1Info`);
          if (t1InfoEl) {
            t1InfoEl.textContent = `T1:${t1_jrp}-${t1_channel}`;
          }
          
          // Color T2 Rect - use sequential cable color (1-8) and highlight if current
          if (channelRect) {
            const rectCable = totalConnectionCount + 1; // Sequential: 1-8
            channelRect.classList.remove('cable1', 'cable2', 'cable3', 'cable4', 'cable5', 'cable6', 'cable7', 'cable8', 'highlight', 'active');
            if (rectCable >= 1 && rectCable <= 8) channelRect.classList.add(`cable${rectCable}`);
            if (isCurrent) {
              channelRect.classList.add('highlight', 'active');
            }
          }
          
          // Update NDF to T2 path (dotted line) - use sequential cable color (1-8)
          if (pathEl) {
            // Use sequential cable number (1-8) based on path index
            const pathCable = totalConnectionCount + 1; // 1-8
            const pathCableClass = (pathCable >= 1 && pathCable <= 8) ? `cable${pathCable}` : 'cable1';
            
            pathEl.classList.remove('inactive', 'cable1', 'cable2', 'cable3', 'cable4', 'cable5', 'cable6', 'cable7', 'cable8');
            pathEl.classList.add('active', pathCableClass);
            // Ensure dotted line style (like T1 to Mini-Rack)
            pathEl.setAttribute('stroke-dasharray', '6 3');
            // Ensure path is always visible
            pathEl.style.display = '';
            // All paths use their sequential cable colors - active one is brighter
            if (isCurrent) {
              pathEl.style.opacity = '1';
              // Use cable-based marker for current path
              if (pathCable >= 1 && pathCable <= 8) {
                pathEl.setAttribute('marker-end', `url(#arrowhead${pathCable})`);
              } else {
                pathEl.setAttribute('marker-end', 'url(#arrowhead)');
              }
            } else {
              // Other paths visible with their cable colors but slightly dimmed
              pathEl.style.opacity = '0.75';
              pathEl.setAttribute('marker-end', 'url(#arrowhead)');
            }
          }
          
          // Make box clickable (re-runs compute with the T1 JRP pair data)
          if (channelGroup) {
            channelGroup.style.cursor = 'pointer';
            channelGroup.onclick = () => {
              console.log(`T2 channel clicked -> idx ${totalConnectionCount + 1}, T2_RU ${T2_RU_temp}, j=${current_jrp}, c=${c}`);
              handleRackClick(dev, P, R, current_jrp, c);
            };
          }
          
          totalConnectionCount++;
        }
      });
      
      // Hide any unused blocks
      for (let i = totalConnectionCount; i < T2_CHANNEL_IDS.length; i++) {
        const channelGroup = document.getElementById(T2_CHANNEL_IDS[i]);
        if (channelGroup) channelGroup.style.display = 'none';
      }
      
      // Ensure ALL 8 paths are visible (even if not all channels are used)
      // All paths should be active, dotted, and visible
      NDF_TO_T2_PATHS.forEach((pathId) => {
        const path = document.getElementById(pathId);
        if (path) {
          path.classList.remove('inactive');
          path.classList.add('active');
          path.setAttribute('stroke-dasharray', '6 3');
          path.style.display = '';
          path.style.opacity = '1';
          // If not colored yet, set to brighter gray to ensure visibility
          if (!path.classList.contains('cable1') && !path.classList.contains('cable2') && 
              !path.classList.contains('cable3') && !path.classList.contains('cable4')) {
            path.setAttribute('stroke', '#9ca3af');
            path.style.opacity = '0.8';
          }
        }
      });
      
      // Highlight racks
      const racks = ['miniRackRect', 'ndfRect'];
      racks.forEach(id => {
        const rack = document.getElementById(id);
        if (rack) rack.classList.add('highlight');
      });
      
      // Ensure click handlers are properly attached after diagram is fully updated
      attachT1RackClickHandlers();
      
      // Show diagram - use multiple methods to ensure it's visible
      console.log('Setting flowContainer.style.display = "block"');
      flowContainer.style.display = 'block';
      flowContainer.style.visibility = 'visible';
      flowContainer.setAttribute('style', 'display: block !important; margin-top: 20px;');
      console.log('flowContainer display after setting:', flowContainer.style.display);
      console.log('flowContainer computed style:', window.getComputedStyle(flowContainer).display);
      
      // Force a reflow to ensure the display change takes effect
      void flowContainer.offsetWidth;
    }
    
    // Calculate NDF for a specific rack (reusable function)
    function calculateNDFForRack(P, R, j, CH_T2) {
      const isExplicitlyMapped = (R >= 1 && R <= 42) || (R === 51) || 
                           (R >= 61 && R <= 70) || (R >= 71 && R <= 79) || 
                           (R >= 80 && R <= 85) || (R >= 86 && R <= 98) || (R >= 99 && R <= 100) || 
                           (R === 101) || (R === 102) || (R === 106) || (R === 107) || (R === 111) || (R === 112) || (R === 114);
      const allowNDF = isExplicitlyMapped;
      if (!allowNDF) return { RU: '—', MMC: null, Range: [null, null], Cable: null, Group: 0 };
      
      let NDF_GROUP = 0;
      if (R >= 1 && R <= 24) {
        NDF_GROUP = Math.ceil(R / 4);
      } else if (R >= 25 && R <= 28) {
        NDF_GROUP = 7;
      } else if (R === 29) {
        NDF_GROUP = 8;
      } else if (R >= 30 && R <= 32) {
        NDF_GROUP = 8;
      } else if (R >= 33 && R <= 35) {
        NDF_GROUP = 9;
      } else if (R === 36) {
        NDF_GROUP = 9;
      } else if (R >= 37 && R <= 40) {
        NDF_GROUP = 10;
      } else if (R >= 41 && R <= 42) {
        NDF_GROUP = 11;
      } else if (R === 51) {
        NDF_GROUP = 13;
      } else if (R === 63) {
        NDF_GROUP = 16;
      } else if (R === 62) {
        NDF_GROUP = 16;
      } else if (R === 65) {
        NDF_GROUP = 17;
      } else if (R === 66) {
        NDF_GROUP = 17;
      } else if (R === 67) {
        NDF_GROUP = 17;
      } else if (R === 68) {
        NDF_GROUP = 17;
      } else if (R === 69) {
        NDF_GROUP = 18;
      } else if (R === 70) {
        NDF_GROUP = 18;
      } else if (R === 74) {
        NDF_GROUP = 19;
      } else if (R === 76) {
        NDF_GROUP = 19;
      } else if (R === 79) {
        NDF_GROUP = 20;
      } else if (R === 77) {
        NDF_GROUP = 20;
      } else if (R === 75) {
        NDF_GROUP = 19;
      } else if (R === 72) {
        NDF_GROUP = 18;
      } else if (R === 73) {
        NDF_GROUP = 19;
      } else if (R === 78) {
        NDF_GROUP = 20;
      } else if (R === 71) {
        NDF_GROUP = 18;
      } else if (R === 81 || R === 82) {
        NDF_GROUP = 21;
      } else if (R === 114) {
        NDF_GROUP = 29;
      } else if (R === 98) {
        NDF_GROUP = 25;
      } else if (R === 80) {
        NDF_GROUP = 20;
      } else if (R === 83) {
        NDF_GROUP = 21;
      } else if (R === 93) {
        NDF_GROUP = 24;
      } else if (R === 97) {
        NDF_GROUP = 25;
      } else if (R === 89) {
        NDF_GROUP = 23;
      } else if (R === 88) {
        NDF_GROUP = 22; // R88 - corrected from R96
      } else if (R === 94) {
        NDF_GROUP = 24;
      } else if (R === 99 || R === 100) {
        NDF_GROUP = 25;
      } else if (R === 107) {
        NDF_GROUP = 27;
      } else if (R === 84) {
        NDF_GROUP = 21;
      } else if (R === 85) {
        NDF_GROUP = 22;
      } else if (R === 87) {
        NDF_GROUP = 22;
      } else if (R === 90) {
        NDF_GROUP = 23;
      } else if (R === 95) {
        NDF_GROUP = 24;
      } else if (R === 92) {
        NDF_GROUP = 23;
      } else if (R === 112) {
        NDF_GROUP = 28;
      } else if (R === 91) {
        NDF_GROUP = 23;
      } else if (R === 106) {
        NDF_GROUP = 27;
      } else if (R === 86) {
        NDF_GROUP = 22;
      } else if (R === 102) {
        NDF_GROUP = 26;
      } else if (R === 101) {
        NDF_GROUP = 26; // R101 - RU39
      } else if (R === 96) {
        NDF_GROUP = 24; // R96 - Note: was RU22, now RU18
      } else if (R === 111) {
        NDF_GROUP = 28; // R111 - RU16
      }
      
      let NDF_RU = '—';
      if (NDF_GROUP >= 1 && NDF_GROUP <= 6) {
        const standardRU = { 1: 45, 2: 45, 3: 44, 4: 44, 5: 43, 6: 43 };
        NDF_RU = standardRU[NDF_GROUP] || '—';
      } else if (NDF_GROUP === 7 || NDF_GROUP === 11) {
        NDF_RU = 41;
      } else if (NDF_GROUP === 8) {
        NDF_RU = (R === 29) ? 41 : 39;
      } else if (NDF_GROUP === 9) {
        NDF_RU = (R === 36) ? 37 : 39;
      } else if (NDF_GROUP === 10) {
        NDF_RU = 37;
      } else if (NDF_GROUP === 13) {
        NDF_RU = 39;
      } else if (NDF_GROUP >= 16 && NDF_GROUP <= 21) {
        // Groups 16-21: Mixed RU28, RU26, RU24, RU22, and RU20
        if (NDF_GROUP === 16) {
          if (R === 63) {
            NDF_RU = 26; // R63=RU26
          } else if (R === 62 || R === 64) {
            NDF_RU = 28; // R62, R64=RU28
          }
        } else if (NDF_GROUP === 17) {
          NDF_RU = (R >= 65 && R <= 67) ? 26 : 28; // R65-R67=RU26, R68=RU28
        } else if (NDF_GROUP === 18) {
          if (R === 69) {
            NDF_RU = 28; // R69=RU28
          } else if (R === 70) {
            NDF_RU = 26; // R70=RU26
          } else if (R === 71 || R === 72) {
            NDF_RU = 24; // R71-R72=RU24
          }
        } else if (NDF_GROUP === 19) {
          if (R === 74 || R === 76) {
            NDF_RU = 26; // R74, R76=RU26
          } else if (R === 75 || R === 73) {
            NDF_RU = 24; // R75, R73=RU24
          }
        } else if (NDF_GROUP === 20) {
          if (R === 79) {
            NDF_RU = 26; // R79=RU26
          } else if (R === 77 || R === 78) {
            NDF_RU = 24; // R77-R78=RU24
          } else if (R === 80) {
            NDF_RU = 22; // R80=RU22
          }
        } else if (NDF_GROUP === 21) {
          if (R === 81 || R === 82) {
            NDF_RU = 24; // R81-R82=RU24
          } else if (R === 83) {
            NDF_RU = 22; // R83=RU22
          } else if (R === 84) {
            NDF_RU = 20; // R84=RU20
          }
        }
      } else if (NDF_GROUP >= 22 && NDF_GROUP <= 29) {
        // Groups 22-29: Mixed RU22, RU20, and RU18
        if (NDF_GROUP === 22) {
          if (R === 88) {
            NDF_RU = 22; // R88=RU22
          } else if (R === 85 || R === 87) {
            NDF_RU = 20; // R85, R87=RU20
          } else if (R === 86) {
            NDF_RU = 18; // R86=RU18
          }
        } else if (NDF_GROUP === 23) {
          if (R === 89) {
            NDF_RU = 22; // R89=RU22
          } else if (R === 90) {
            NDF_RU = 20; // R90=RU20
          } else if (R === 91 || R === 92) {
            NDF_RU = 18; // R91, R92=RU18
          }
        } else if (NDF_GROUP === 24) {
          if (R === 93) {
            NDF_RU = 22; // R93=RU22
          } else if (R === 94) {
            NDF_RU = 20; // R94=RU20
          } else if (R === 95 || R === 96) {
            NDF_RU = 18; // R95, R96=RU18
          }
        } else if (NDF_GROUP === 25) {
          if (R === 97 || R === 98) {
            NDF_RU = 22; // R97, R98=RU22
          } else if (R === 99 || R === 100) {
            NDF_RU = 20; // R99, R100=RU20
          }
        } else if (NDF_GROUP === 26) {
          NDF_RU = 18; // R102=RU18
        } else if (NDF_GROUP === 27) {
          if (R === 107) {
            NDF_RU = 20; // R107=RU20
          } else if (R === 106) {
            NDF_RU = 18; // R106=RU18
          }
        } else if (NDF_GROUP === 28) {
          if (R === 111) {
            NDF_RU = 16; // R111=RU16
          } else if (R === 112) {
            NDF_RU = 18; // R112=RU18
          }
        } else if (NDF_GROUP === 29) {
          NDF_RU = 22; // R114=RU22
        }
      }
      
      const ndfRanges = {
        "1-1": [1,16], "3-1": [1,16], "5-1": [1,16], "1-2": [19,34], "3-2": [19,34], "5-2": [19,34],
        "1-3": [37,52], "3-3": [37,52], "5-3": [37,52], "1-4": [55,70], "3-4": [55,70], "5-4": [55,70],
        "2-1": [73,88], "4-1": [73,88], "6-1": [73,88], "2-2": [91,106], "4-2": [91,106], "6-2": [91,106],
        "2-3": [109,124], "4-3": [109,124], "6-3": [109,124], "2-4": [127,142], "4-4": [127,142], "6-4": [127,142],
        "11-1": [1,16], "7-1": [37,52], "7-2": [55,70], "11-2": [73,88], "7-3": [91,106], "7-4": [109,124],
        "8-1": [127,142], "8-2": [19,34], "8-3": [37,52], "8-4": [55,70],
        "9-1": [73,88], "9-2": [91,106], "13-3": [109,124], "9-3": [127,142],
        "9-4": [1,16], "10-1": [19,34], "10-2": [55,70], "10-3": [73,88], "10-4": [91,106],
        "16-2": [109,124], "16-4": [127,142], "17-4": [73,88],
        "17-2": [1,16], "17-1": [19,34], "17-3": [37,52], "16-3": [55,70],
        "18-1": [91,106], "18-2": [73,88], "20-3": [91,106], "19-2": [109,124], "19-4": [127,142],
        "20-1": [1,16], "19-3": [19,34], "18-4": [37,52], "19-1": [55,70], 
        "20-2": [73,88], "18-3": [91,106], "21-1": [109,124], "21-2": [127,142],
        "29-2": [1,16], "25-2": [19,34], "20-4": [37,52], "21-3": [55,70], 
        "24-1": [73,88], "25-1": [91,106], "23-1": [109,124], "22-4": [127,142], // R88 - corrected from R96
        "24-2": [1,16], "25-3": [19,34], "25-4": [37,52], "27-3": [55,70], 
        "21-4": [73,88], "23-2": [91,106], "22-3": [109,124], "22-1": [127,142],
        "24-3": [1,16], "23-4": [19,34], "28-4": [37,52], "23-3": [55,70], 
        "27-2": [73,88], "22-2": [91,106], "24-4": [109,124], "26-2": [127,142],
        "28-3": [1,16],  // RU16: R111 (CH3)
        "26-1": [1,16]   // RU39: R101 (CH1)
      };
      
      const key = `${NDF_GROUP}-${CH_T2}`;
      const pair = ndfRanges[key];
      let NDF_MMC = null;
      let NDF_range = null;
      let cable = null;
      
      if (pair && NDF_GROUP > 0) {
        const [rangeStart, rangeEnd] = pair;
        const span = rangeEnd - rangeStart + 1;
        const half = span / 2;
        const planeType = (P % 2 === 0) ? 'even' : 'odd';
        const base = planeType === 'odd' ? rangeStart : rangeStart + half;
        const activeRange = [base, base + half - 1];
        NDF_range = activeRange;
        
        const t1CableMap = {17:1,18:1,19:2,20:2,21:3,22:3,23:4,24:4,25:5,26:5,27:6,28:6,29:7,30:7,31:8,32:8};
        cable = t1CableMap[j];
        if (cable) NDF_MMC = activeRange[0] + (cable - 1);
      }
      
      return { RU: NDF_RU, MMC: NDF_MMC, Range: NDF_range || [null, null], Cable: cable, Group: NDF_GROUP };
    }
    
    // Ensure T1 rack click handlers are always properly attached
    function attachT1RackClickHandlers() {
      const dev = document.getElementById('dev').value.trim();
      const jrpInput = document.getElementById('jrp').value.trim();
      const { j, channel } = parseJRPChannel(jrpInput);
      const { P, R } = parseFields(dev);
      
      // Calculate R_base from current input R
      const R_base = R - ((R - 1) % 4);
      
      const t1RackGroups = ['t1Rack1', 't1Rack2', 't1Rack3', 't1Rack4'];
      for (let i = 0; i < 4; i++) {
        const R_temp = R_base + i;
        const rackGroup = document.getElementById(t1RackGroups[i]);
        if (rackGroup) {
          // Remove any existing click handlers first
          rackGroup.onclick = null;
          rackGroup.style.cursor = 'pointer';
          // Use a closure with the correct R_temp value
          (function(rackNum) {
            rackGroup.onclick = () => {
              console.log(`T1 rack clicked -> R${rackNum} (base R${R_base}), j=${j}, channel=${channel}`);
              handleRackClick(dev, P, rackNum, j, channel);
            };
          })(R_temp);
        }
      }
    }
    
    // Handle click on T1 rack or T2 channel
    function handleRackClick(dev, P, R_clicked, j_clicked, channel_clicked) {
      console.log(`handleRackClick called: R_clicked=${R_clicked}, j=${j_clicked}, channel=${channel_clicked}`);
      // Calculate T2 details for clicked rack
      const CH_T2_clicked = ((R_clicked - 1) % 4) + 1;
      const JRP_T2_clicked = Math.floor((R_clicked - 1) / 4) + 1;
      
      // Recalculate NDF with correct j_clicked and channel_clicked for clicked rack
      const calculated = calculateNDFForRack(P, R_clicked, j_clicked, CH_T2_clicked);
      
      // ALWAYS update highlights and colors - these are visual feedback, not dependent on NDF validity
      updateFlowDiagramHighlights(R_clicked);
      updateFlowDiagramColors(R_clicked, CH_T2_clicked, j_clicked, channel_clicked);
      
      // ALWAYS update NDF display - show "Not defined yet" if MMC is null
      updateNDFDisplay(calculated, R_clicked, CH_T2_clicked, j_clicked);
      
      // Only update T2 channel labels if we have valid NDF data
      if (calculated.MMC !== null) {
        // Update T2 channel labels to reflect clicked rack's channel
        updateT2ChannelLabels(P, R_clicked, JRP_T2_clicked, CH_T2_clicked, j_clicked, channel_clicked);
      } else {
        console.log(`  ⚠ calculateNDFForRack returned MMC=null for R${R_clicked}, NDF mapping not defined`);
      }
      
      // Reattach click handlers after all updates
      attachT1RackClickHandlers();
    }
    
    // Update T2 channel labels when a different T1 rack is clicked
    function updateT2ChannelLabels(P, R_clicked, JRP_T2_clicked, CH_T2_clicked, j_clicked, channel_clicked) {
      const T2_CHANNEL_IDS = ['t2Channel1', 't2Channel2', 't2Channel3', 't2Channel4', 't2Channel5', 't2Channel6', 't2Channel7', 't2Channel8'];
      const T2_LABEL_IDS = ['t2Ch1Label', 't2Ch2Label', 't2Ch3Label', 't2Ch4Label', 't2Ch5Label', 't2Ch6Label', 't2Ch7Label', 't2Ch8Label'];
      const T2_JRP_IDS = ['t2Ch1Jrp', 't2Ch2Jrp', 't2Ch3Jrp', 't2Ch4Jrp', 't2Ch5Jrp', 't2Ch6Jrp', 't2Ch7Jrp', 't2Ch8Jrp'];
      
      // Determine JRP pair
      const jIsOddClick = (j_clicked % 2 === 1);
      const associatedJRP = jIsOddClick ? j_clicked + 1 : j_clicked - 1;
      const JRP_PAIR_ARRAY_CLICK = jIsOddClick ? [j_clicked, associatedJRP] : [associatedJRP, j_clicked];
      
      // Extract base name
      const devMatch = document.getElementById('dev').value.trim();
      const baseMatch = devMatch.match(/^(.+)-t1-/i);
      const baseName = baseMatch ? baseMatch[1] : devMatch.replace(/-t1-.*/i, '');
      
      let totalConnectionCount = 0;
      
      // Loop through JRP pairs and channels to update labels
      JRP_PAIR_ARRAY_CLICK.forEach(current_jrp => {
        for (let c = 1; c <= 4; c++) {
          if (totalConnectionCount >= T2_CHANNEL_IDS.length) break;
          
          const T2_RU_temp = 4 * (current_jrp - 17) + c;
          const labelEl = document.getElementById(T2_LABEL_IDS[totalConnectionCount]);
          const jrpEl = document.getElementById(T2_JRP_IDS[totalConnectionCount]);
          const channelGroup = document.getElementById(T2_CHANNEL_IDS[totalConnectionCount]);
          const channelRect = channelGroup ? channelGroup.querySelector('rect') : null;
          
          // Calculate which T1 JRP-channel corresponds to this block (0-7)
          const jrp_idx = Math.floor(totalConnectionCount / 4); // 0 or 1
          const t1_channel = (totalConnectionCount % 4) + 1; // 1-4
          const t1_jrp = JRP_PAIR_ARRAY_CLICK[jrp_idx];
          
          // Update T2 Channel Box - T2 info on left, T1 info on right
          // Left side: P#-T2-R# (top), JRP #-# (bottom)
          if (labelEl) {
            labelEl.textContent = `P${P}-T2-R${T2_RU_temp}`;
            labelEl.classList.remove('cable1', 'cable2', 'cable3', 'cable4', 'cable5', 'cable6', 'cable7', 'cable8', 'highlight');
            const labelCableClick = totalConnectionCount + 1; // Sequential: 1-8
            if (labelCableClick >= 1 && labelCableClick <= 8) {
              labelEl.classList.add(`cable${labelCableClick}`);
            }
            const isCurrent = (current_jrp === j_clicked && c === channel_clicked);
            if (isCurrent) labelEl.classList.add('highlight');
          }
          if (jrpEl) {
            jrpEl.textContent = `JRP ${JRP_T2_clicked}-${CH_T2_clicked}`;
            jrpEl.classList.remove('cable1', 'cable2', 'cable3', 'cable4', 'cable5', 'cable6', 'cable7', 'cable8', 'highlight');
            const jrpCableClick = totalConnectionCount + 1; // Sequential: 1-8
            if (jrpCableClick >= 1 && jrpCableClick <= 8) {
              jrpEl.classList.add(`cable${jrpCableClick}`);
            }
            const isCurrent = (current_jrp === j_clicked && c === channel_clicked);
            if (isCurrent) jrpEl.classList.add('highlight');
          }
          
          // Right side: T1 JRP-channel (top-right corner)
          const t1InfoEl = document.getElementById(`t2Ch${totalConnectionCount + 1}T1Info`);
          if (t1InfoEl) {
            t1InfoEl.textContent = `T1:${t1_jrp}-${t1_channel}`;
          }
          
          // Update T2 Rect color - use sequential cable color (1-8) and highlight if current
          if (channelRect) {
            const rectCableClick = totalConnectionCount + 1; // Sequential: 1-8
            channelRect.classList.remove('cable1', 'cable2', 'cable3', 'cable4', 'cable5', 'cable6', 'cable7', 'cable8', 'highlight', 'active');
            if (rectCableClick >= 1 && rectCableClick <= 8) {
              channelRect.classList.add(`cable${rectCableClick}`);
            }
            const isCurrent = (current_jrp === j_clicked && c === channel_clicked);
            if (isCurrent) {
              channelRect.classList.add('highlight', 'active');
            }
          }
          
          totalConnectionCount++;
        }
      });
    }
    
    // Update NDF display with clicked rack's data
    function updateNDFDisplay(ndfData, R_clicked, CH_T2_clicked, j) {
      const ndfRU = document.getElementById('ndfRU');
      const ndfMMC = document.getElementById('ndfMMC');
      const ndfCable = document.getElementById('ndfCable');
      const ndfRange = document.getElementById('ndfRange');
      const ndfNote = document.getElementById('ndfNote');
      const ndfLabel = document.getElementById('ndfLabel');
      const mmcLabel = document.getElementById('mmcLabel');
      
      // Check if NDF mapping is defined (MMC is not null)
      const isDefined = ndfData.MMC !== null && ndfData.MMC !== undefined;
      const NDF_GROUP = ndfData.Group || 0;
      const key = `${NDF_GROUP}-${CH_T2_clicked}`;
      
      if (ndfRU) {
        if (isDefined) {
          ndfRU.textContent = ndfData.RU || '—';
        } else {
          ndfRU.textContent = '—';
        }
      }
      
      if (ndfMMC) {
        if (isDefined) {
          ndfMMC.textContent = ndfData.MMC || '—';
          // Apply channel-based color
          ndfMMC.className = 'ndfVal';
          if (CH_T2_clicked >= 1 && CH_T2_clicked <= 4) {
            ndfMMC.classList.add(`cable${CH_T2_clicked}`);
          }
        } else {
          // Show "Not defined yet" message
          ndfMMC.textContent = 'Not defined yet';
          ndfMMC.className = 'ndfVal';
          ndfMMC.classList.remove('cable1', 'cable2', 'cable3', 'cable4');
        }
      }
      
      if (ndfCable) {
        if (isDefined) {
          ndfCable.textContent = ndfData.Cable || '—';
        } else {
          ndfCable.textContent = '—';
        }
      }
      
      if (ndfRange) {
        if (isDefined && ndfData.Range && ndfData.Range[0]) {
          ndfRange.textContent = `${ndfData.Range[0]}–${ndfData.Range[1]}`;
        } else {
          ndfRange.textContent = '—';
        }
      }
      
      if (ndfNote) {
        if (isDefined) {
          ndfNote.textContent = `Derived from JRP ${j} (cable ${ndfData.Cable || '—'}) in JRP_T2 ${Math.floor((R_clicked - 1) / 4) + 1}-${CH_T2_clicked}.`;
        } else {
          ndfNote.textContent = `NDF mapping for key ${key} (R${R_clicked}, CH${CH_T2_clicked}) is not defined yet.`;
        }
      }
      
      // Update flow diagram labels with color
      if (ndfLabel) {
        if (isDefined && ndfData.RU && ndfData.MMC) {
          ndfLabel.textContent = `RU${ndfData.RU} · MMC ${ndfData.MMC}`;
        } else {
          ndfLabel.textContent = 'RU · MMC';
        }
        ndfLabel.classList.remove('cable1', 'cable2', 'cable3', 'cable4');
        if (isDefined && CH_T2_clicked >= 1 && CH_T2_clicked <= 4) {
          ndfLabel.classList.add(`cable${CH_T2_clicked}`);
        }
      }
      
      // Update cable number label when clicked
      const ndfCableLabel = document.getElementById('ndfCableLabel');
      if (ndfCableLabel) {
        if (isDefined && CH_T2_clicked >= 1 && CH_T2_clicked <= 4) {
          ndfCableLabel.textContent = `cable${CH_T2_clicked}`;
          ndfCableLabel.classList.remove('cable1', 'cable2', 'cable3', 'cable4');
          ndfCableLabel.classList.add(`cable${CH_T2_clicked}`);
        } else {
          ndfCableLabel.textContent = 'cable';
          ndfCableLabel.classList.remove('cable1', 'cable2', 'cable3', 'cable4');
        }
      }
      
      // Update colors for paths based on clicked rack's channel  
      // Note: j and channel should be j_clicked and channel_clicked but we use them from the updateNDFDisplay context
      // Actually, this should be called from handleRackClick with correct parameters
    }
    
    // Update all flow diagram colors based on clicked rack
    function updateFlowDiagramColors(R_clicked, CH_T2_clicked, j_clicked, channel_clicked) {
      const R_base = R_clicked - ((R_clicked - 1) % 4);
      const rackIndex = R_clicked - R_base;
      const cableClass = (CH_T2_clicked >= 1 && CH_T2_clicked <= 4) ? `cable${CH_T2_clicked}` : '';
      
      if (!cableClass) return;
      
      // Determine JRP pair array
      const jIsOdd = (j_clicked % 2 === 1);
      const JRP_PAIR_ARRAY = jIsOdd ? [j_clicked, j_clicked + 1] : [j_clicked - 1, j_clicked];
      
      // Calculate which of the 8 T2 paths corresponds to clicked rack
      // Each JRP has 4 channels, so we need to find the index in the 8-channel array
      let t2PathIndex = -1;
      JRP_PAIR_ARRAY.forEach((jrp, pairIdx) => {
        if (jrp === j_clicked) {
          // This is the JRP we're looking for
          t2PathIndex = pairIdx * 4 + (channel_clicked - 1);
        }
      });
      
      // Update all T1 arrows - only highlight the user-requested one, fade others
      const t1Arrows = ['t1Arrow1', 't1Arrow2', 't1Arrow3', 't1Arrow4'];
      const t1RackGroups = ['t1Rack1', 't1Rack2', 't1Rack3', 't1Rack4'];
      
      t1Arrows.forEach((id, idx) => {
        const arrow = document.getElementById(id);
        if (arrow) {
          const R_temp = R_base + idx;
          const CH_T2_temp = ((R_temp - 1) % 4) + 1;
          const arrowCableClass = (CH_T2_temp >= 1 && CH_T2_temp <= 4) ? `cable${CH_T2_temp}` : '';
          
          // Remove all classes
          arrow.classList.remove('cable1', 'cable2', 'cable3', 'cable4', 'inactive', 'active');
          arrow.style.display = '';
          arrow.setAttribute('stroke-dasharray', '6 3');
          
          if (idx === rackIndex) {
            // User-requested arrow: fully visible with cable color
            arrow.classList.add('active', cableClass);
            arrow.style.opacity = '1';
            arrow.style.strokeWidth = '3.5';
            if (CH_T2_clicked >= 1 && CH_T2_clicked <= 4) {
              arrow.setAttribute('marker-end', `url(#arrowhead${CH_T2_clicked})`);
            }
          } else {
            // Other arrows: very faded
            arrow.classList.add('inactive');
            arrow.style.opacity = '0.15';
            arrow.style.strokeWidth = '2';
            arrow.setAttribute('marker-end', 'url(#arrowhead)');
          }
        }
      });
      
      // Update T1 rack blocks - add animation to requested one and ensure colors are correct
      t1RackGroups.forEach((groupId, idx) => {
        const rackGroup = document.getElementById(groupId);
        if (rackGroup) {
          const rackRect = rackGroup.querySelector('rect');
          if (rackRect) {
            const R_temp = R_base + idx;
            const CH_T2_temp = ((R_temp - 1) % 4) + 1;
            
            // Remove all highlight classes first
            rackRect.classList.remove('active', 'highlight', 'userRequested');
            
            if (idx === rackIndex) {
              // This is the clicked rack - add all highlight classes
              rackRect.classList.add('active', 'highlight', 'userRequested');
            }
            
            // Ensure cable color class is correct (should already be set, but ensure it's there)
            rackRect.classList.remove('cable1', 'cable2', 'cable3', 'cable4');
            if (CH_T2_temp >= 1 && CH_T2_temp <= 4) {
              rackRect.classList.add(`cable${CH_T2_temp}`);
            }
          }
        }
      });
      
      // Color trunk cable (if it exists)
      const trunkPath = document.getElementById('trunkPath');
      if (trunkPath) {
        trunkPath.classList.remove('cable1', 'cable2', 'cable3', 'cable4');
        trunkPath.classList.add(cableClass);
      }
      
      // Color Mini-Rack boxes and paths (4 separate boxes)
      const R_base_clicked = R_clicked - ((R_clicked - 1) % 4);
      for (let i = 0; i < 4; i++) {
        const R_temp = R_base_clicked + i;
        const CH_T2_temp = ((R_temp - 1) % 4) + 1;
        const isClicked = (R_temp === R_clicked);
        const cableClassTemp = (CH_T2_temp >= 1 && CH_T2_temp <= 4) ? `cable${CH_T2_temp}` : '';
        
        // Update Mini-Rack box
        const miniRackRect = document.getElementById(`miniRackRect${i+1}`);
        if (miniRackRect) {
          miniRackRect.classList.remove('cable1', 'cable2', 'cable3', 'cable4', 'active', 'highlight', 'userRequested', 'inactive');
          if (cableClassTemp) miniRackRect.classList.add(cableClassTemp);
          if (isClicked) {
            miniRackRect.classList.add('active', 'highlight', 'userRequested');
          } else {
            miniRackRect.classList.add('inactive');
          }
        }
        
        // Update Mini-Rack MMC label
        const mmcLabel = document.getElementById(`mmcLabel${i+1}`);
        if (mmcLabel) {
          mmcLabel.classList.remove('cable1', 'cable2', 'cable3', 'cable4');
          if (cableClassTemp) mmcLabel.classList.add(cableClassTemp);
        }
        
        // Update Mini-Rack to NDF path
        const miniToNdfPath = document.getElementById(`miniToNdfPath${i+1}`);
        if (miniToNdfPath) {
          miniToNdfPath.classList.remove('cable1', 'cable2', 'cable3', 'cable4', 'active', 'inactive');
          miniToNdfPath.setAttribute('stroke-dasharray', '6 3');
          miniToNdfPath.style.display = '';
          if (isClicked) {
            miniToNdfPath.classList.add('active', cableClassTemp);
            miniToNdfPath.style.opacity = '1';
            if (CH_T2_temp >= 1 && CH_T2_temp <= 4) {
              miniToNdfPath.setAttribute('marker-end', `url(#arrowhead${CH_T2_temp})`);
            }
          } else {
            miniToNdfPath.classList.add('inactive');
            miniToNdfPath.style.opacity = '0.15';
            miniToNdfPath.setAttribute('marker-end', 'url(#arrowhead)');
          }
        }
      }
      
      // Update all NDF to T2 paths - each path uses sequential cable color (1-8)
      const ndfToT2Paths = ['ndfToT2Path1', 'ndfToT2Path2', 'ndfToT2Path3', 'ndfToT2Path4', 'ndfToT2Path5', 'ndfToT2Path6', 'ndfToT2Path7', 'ndfToT2Path8'];
      
      // Determine which path corresponds to clicked rack
      const jIsOddClick = (j_clicked % 2 === 1);
      const JRP_PAIR_ARRAY_CLICK = jIsOddClick ? [j_clicked, j_clicked + 1] : [j_clicked - 1, j_clicked];
      
      let clickedPathIndex = -1;
      let pathIdx = 0;
      JRP_PAIR_ARRAY_CLICK.forEach(jrp => {
        for (let ch = 1; ch <= 4; ch++) {
          if (pathIdx >= ndfToT2Paths.length) break;
          if (jrp === j_clicked && ch === channel_clicked) {
            clickedPathIndex = pathIdx;
          }
          pathIdx++;
        }
      });
      
      // Apply sequential cable colors (1-8) to each path
      ndfToT2Paths.forEach((pathId, idx) => {
        const path = document.getElementById(pathId);
        if (path) {
          const pathCable = idx + 1; // Sequential: 1, 2, 3, 4, 5, 6, 7, 8
          const pathCableClass = `cable${pathCable}`;
          
          path.classList.remove('cable1', 'cable2', 'cable3', 'cable4', 'cable5', 'cable6', 'cable7', 'cable8', 'inactive');
          path.classList.add('active', pathCableClass);
          // Ensure dotted line style is maintained
          path.setAttribute('stroke-dasharray', '6 3');
          path.style.display = '';
          
          if (idx === clickedPathIndex) {
            // Current path - full brightness
            path.style.opacity = '1';
            path.setAttribute('marker-end', `url(#arrowhead${pathCable})`);
          } else {
            // Other paths - visible with cable color but dimmed
            path.style.opacity = '0.75';
            path.setAttribute('marker-end', 'url(#arrowhead)');
          }
        }
      });
    }
    
    // Update flow diagram highlights when rack is clicked
    function updateFlowDiagramHighlights(R_clicked) {
      console.log(`updateFlowDiagramHighlights called with R_clicked=${R_clicked}`);
      const R_base = R_clicked - ((R_clicked - 1) % 4);
      const CH_T2_clicked = ((R_clicked - 1) % 4) + 1;
      console.log(`  R_base=${R_base}, CH_T2_clicked=${CH_T2_clicked}`);
      
      // Update T1 rack highlights
      const t1RackGroups = ['t1Rack1', 't1Rack2', 't1Rack3', 't1Rack4'];
      for (let i = 0; i < 4; i++) {
        const R_temp = R_base + i;
        const rackGroup = document.getElementById(t1RackGroups[i]);
        const rackRect = rackGroup ? rackGroup.querySelector('rect') : null;
        
        if (rackRect) {
          // Remove all highlight classes
          rackRect.classList.remove('active', 'highlight', 'userRequested');
          
          if (R_temp === R_clicked) {
            // Add all highlight classes for the clicked rack
            rackRect.classList.add('active', 'highlight', 'userRequested');
            console.log(`  ✓ Highlighted R${R_temp} (box ${i+1})`);
          }
        }
      }
      
      // Update T2 channel highlights (all 8 channels, highlight based on matching R, j, channel)
      // Note: T2 highlights are now determined by JRP/Channel combination, not just R
      // This is handled in updateFlowDiagram, so we just ensure highlights are cleared properly
      const t2ChannelGroups = ['t2Channel1', 't2Channel2', 't2Channel3', 't2Channel4', 't2Channel5', 't2Channel6', 't2Channel7', 't2Channel8'];
      t2ChannelGroups.forEach(id => {
        const channelGroup = document.getElementById(id);
        if (channelGroup && channelGroup.style.display !== 'none') {
          const channelRect = channelGroup.querySelector('rect');
          if (channelRect) {
            channelRect.classList.remove('highlight');
          }
        }
      });
    }
    
    function renderMMCDiagram(ctx) {
      const { MMC, Spare1, Spare2, blockStart } = ctx;
      const wrap = document.getElementById('mmcDiagram');
      if (!wrap) return;
      wrap.innerHTML = '';
      for (let pos = 1; pos <= 18; pos++) {
        const num = blockStart + pos - 1;
        const div = document.createElement('div');
        div.className = 'slot';
        div.dataset.num = String(num);
        if (pos <= 16) div.classList.add('mmc'); else div.classList.add('spare');
        if (num === MMC) div.classList.add('active');
        if (num === Spare1 || num === Spare2) div.classList.add('spare');
        div.textContent = String(num);
        wrap.appendChild(div);
      }
    }
    
    function hideReversePanel() {
      const panel = document.getElementById('reversePanel');
      if (panel) panel.style.display = 'none';
    }
    
    document.getElementById('calc').addEventListener('click', () => {
      console.log('🖱️ Calculate button clicked!');
      hideReversePanel();
      compute();
    });
    document.getElementById('reset').addEventListener('click', () => {
      hideReversePanel();
      document.getElementById('dev').value = '';
      document.getElementById('jrp').value = '';
      document.getElementById('out').style.display = 'none';
      document.getElementById('error').style.display = 'none';
      document.getElementById('outT2').style.display = 'none';
      const ndfOut = document.getElementById('outNDF');
      if (ndfOut) ndfOut.style.display = 'none';
      const summaryWrapper = document.getElementById('ndfChannelSummary');
      if (summaryWrapper) summaryWrapper.style.display = 'none';
      const flowContainer = document.getElementById('flowDiagramContainer');
      if (flowContainer) {
        flowContainer.style.display = 'none';
        // Reset flow diagram animations
        ['t1Arrow1', 't1Arrow2', 't1Arrow3', 't1Arrow4', 'miniToNdfPath', 'ndfToT2Path1', 'ndfToT2Path2', 'ndfToT2Path3', 'ndfToT2Path4', 'ndfToT2Path5', 'ndfToT2Path6', 'ndfToT2Path7', 'ndfToT2Path8'].forEach(id => {
          const path = document.getElementById(id);
          if (path) {
            path.classList.remove('active', 'cable1', 'cable2', 'cable3', 'cable4');
            path.classList.add('inactive');
          }
        });
        // Remove dynamically created merge arrow
        const mergeArrow = document.getElementById('t1MergeArrow');
        if (mergeArrow) mergeArrow.remove();
        ['miniRackRect', 'ndfRect'].forEach(id => {
          const rack = document.getElementById(id);
          if (rack) rack.classList.remove('highlight');
        });
        // Reset T1 rack labels
        ['t1R1Label', 't1R2Label', 't1R3Label', 't1R4Label'].forEach(id => {
          const label = document.getElementById(id);
          if (label) label.textContent = 'P-R · JRP';
        });
        // Reset T1 JRP labels
        ['t1R1Jrp', 't1R2Jrp', 't1R3Jrp', 't1R4Jrp'].forEach(id => {
          const label = document.getElementById(id);
          if (label) label.textContent = '';
        });
        // Reset T2 channel labels (8 channels now)
        ['t2Ch1Label', 't2Ch2Label', 't2Ch3Label', 't2Ch4Label', 't2Ch5Label', 't2Ch6Label', 't2Ch7Label', 't2Ch8Label'].forEach(id => {
          const label = document.getElementById(id);
          if (label) label.textContent = 'P-R · JRP-CH';
        });
        // Reset T2 channel highlights and show all
        ['t2Channel1', 't2Channel2', 't2Channel3', 't2Channel4', 't2Channel5', 't2Channel6', 't2Channel7', 't2Channel8'].forEach(id => {
          const channel = document.getElementById(id);
          if (channel) {
            channel.style.display = 'block';
            const rect = channel.querySelector('rect');
            if (rect) {
              rect.classList.remove('highlight', 'cable1', 'cable2', 'cable3', 'cable4');
            }
          }
        });
      }
      setFieldError('errDev','');
      setFieldError('errJrp','');
      liveValidate();
    });
    document.getElementById('copy').addEventListener('click', async () => {
      hideReversePanel();
      const copyBtn = document.getElementById('copy');
      const txt = window._copyText || 'Run a calculation first.';
      try { 
        await navigator.clipboard.writeText(txt);
        copyBtn.classList.add('copy-success');
        copyBtn.textContent = '✓ Copied!';
        setTimeout(() => {
          copyBtn.classList.remove('copy-success');
          copyBtn.textContent = 'Copy Result';
        }, 2000);
      }
      catch (e) { alert('Copy failed. ' + e); }
    });
    
    document.getElementById('toggleReverse').addEventListener('click', () => {
      const panel = document.getElementById('reversePanel');
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    });
    
    // Auto example: prefill inputs without computing
    document.getElementById('autoExample').addEventListener('click', () => {
      hideReversePanel();
      document.getElementById('dev').value = 'sbn100-104-es-m1-p3-t1-r7';
      document.getElementById('jrp').value = '20-1';
      compute();
    });
    
    function reverseMMC() {
      const mmc = Number(document.getElementById('mmcInput').value);
      const err = document.getElementById('errorMMC');
      const out = document.getElementById('outMMC');
    
      if (Number.isNaN(mmc) || mmc < 1 || mmc > 144) {
        err.textContent = "Please enter a valid MMC number between 1 and 144.";
        err.style.display = 'block';
        out.style.display = 'none';
        return;
      } else {
        err.style.display = 'none';
      }
    
      const k = Math.floor((mmc - 1) / 18);
      const block_start = 18 * k + 1;
      const pos = mmc - block_start + 1;
      let P = null, ports = [], spare = false;
    
      if (pos >= 1 && pos <= 8) {
        P = 2 * k + 1;
        const i = pos - 1;
        ports = [17 + 2 * i, 18 + 2 * i];
      } else if (pos >= 9 && pos <= 16) {
        P = 2 * k + 2;
        const i = pos - 9;
        ports = [17 + 2 * i, 18 + 2 * i];
      } else {
        spare = true;
      }
    
      document.getElementById('rMMC').textContent = mmc;
      // Clear previous highlights, then emphasize
      document.querySelectorAll('#outMMC .kv').forEach(el => el.classList.remove('highlight-primary','highlight-secondary'));
      document.getElementById('rMMC').parentElement.classList.add('highlight-primary');
      document.getElementById('rSwitch').parentElement.classList.add('highlight-secondary');
      document.getElementById('rPorts').parentElement.classList.add('highlight-secondary');
      if (spare) {
        document.getElementById('rSwitch').textContent = "—";
        document.getElementById('rPorts').textContent = "—";
      } else {
        document.getElementById('rSwitch').textContent = "P" + P;
        document.getElementById('rPorts').textContent = ports[0] + " & " + ports[1];
      }
    
      document.getElementById('rMore').textContent =
        `Block start = ${block_start}, pos = ${pos}, k = ${k}`;
      out.style.display = 'block';
    }
    
    document.getElementById('findMMC').addEventListener('click', reverseMMC);
    document.getElementById('resetMMC').addEventListener('click', () => {
      document.getElementById('mmcInput').value = '';
      document.getElementById('errorMMC').style.display = 'none';
      document.getElementById('outMMC').style.display = 'none';
    });
    
    // Enter-to-submit: forward and reverse inputs
    ['dev','jrp'].forEach(id => {
      const el = document.getElementById(id);
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          hideReversePanel();
          compute();
        }
      });
      el.addEventListener('input', () => {
        liveValidate();
      });
    });
    document.getElementById('mmcInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        reverseMMC();
      }
    });
    
    // Persist highlight on the last clicked button until another is clicked.
    const allButtons = Array.from(document.querySelectorAll('button'));
    allButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        allButtons.forEach(b => b.classList.remove('activeBtn'));
        btn.classList.add('activeBtn');
      });
    });
    
    // Click-to-map from MMC mini-diagram
    (function attachMMCDiagramClick(){
      const wrap = document.getElementById('mmcDiagram');
      if (!wrap) return;
      wrap.addEventListener('click', (e) => {
        const slot = e.target.closest('.slot');
        if (!slot) return;
        const mmc = Number(slot.dataset.num);
        if (Number.isNaN(mmc)) return;
        // Determine block, position and P/j from clicked MMC
        const k = Math.floor((mmc - 1) / 18);
        const block_start = 18 * k + 1;
        const pos = mmc - block_start + 1;
        let P = null, i = null;
        if (pos >= 1 && pos <= 8) { P = 2 * k + 1; i = pos - 1; }
        else if (pos >= 9 && pos <= 16) { P = 2 * k + 2; i = pos - 9; }
        else { return; } // ignore spares
    
        const currentJ = Number(document.getElementById('jrp').value);
        const base = 17 + 2 * i; // pair base
        const newJ = !Number.isNaN(currentJ) ? (currentJ % 2 === 0 ? base + 1 : base) : base;
    
        // Update dev's -p#- while keeping rest
        const devInput = document.getElementById('dev');
        let dev = devInput.value.trim();
        if (/-p\d+-/i.test(dev)) {
          dev = dev.replace(/-p(\d+)-/i, `-p${P}-`);
        }
        devInput.value = dev;
        document.getElementById('jrp').value = String(newJ);
        hideReversePanel();
        compute();
      });
    })();
    
    // Copy T2 details
    document.getElementById('copyT2').addEventListener('click', async () => {
      const copyBtn = document.getElementById('copyT2');
      const originalText = copyBtn.textContent;
      const ru = document.getElementById('t2RU').textContent;
      const jrp = document.getElementById('t2JRP').textContent;
      const ch = document.getElementById('t2CH').textContent;
      const plane = document.getElementById('t2Plane').textContent;
      const title = document.getElementById('t2Title').textContent;
      const txt = `${title}: RU ${ru}, JRP ${jrp}, CH ${ch}, Plane ${plane}`;
      try { 
        await navigator.clipboard.writeText(txt);
        copyBtn.classList.add('copy-success');
        copyBtn.textContent = '✓ Copied!';
        setTimeout(() => {
          copyBtn.classList.remove('copy-success');
          copyBtn.textContent = originalText;
        }, 2000);
      }
      catch (e) { alert('Copy failed. ' + e); }
    });
    
    // Copy NDF details
    document.getElementById('copyNDF').addEventListener('click', async () => {
      const copyBtn = document.getElementById('copyNDF');
      const originalText = copyBtn.textContent;
      const title = document.getElementById('ndfTitle').textContent;
      const ru = document.getElementById('ndfRU').textContent;
      const mmc = document.getElementById('ndfMMC').textContent;
      const cable = document.getElementById('ndfCable').textContent;
      const range = document.getElementById('ndfRange').textContent;
      const txt = `${title}: RU ${ru}, MMC ${mmc}, Cable ${cable}, Range ${range}`;
      try { 
        await navigator.clipboard.writeText(txt);
        copyBtn.classList.add('copy-success');
        copyBtn.textContent = '✓ Copied!';
        setTimeout(() => {
          copyBtn.classList.remove('copy-success');
          copyBtn.textContent = originalText;
        }, 2000);
      }
      catch (e) { alert('Copy failed. ' + e); }
    });
    
    // Permalink: prefill on load
    (function prefillFromURL(){
      try {
        const params = new URLSearchParams(location.search);
        const dev = params.get('dev');
        const jrp = params.get('jrp');
        const channel = params.get('channel');
        if (dev) document.getElementById('dev').value = dev;
        if (jrp) {
          const channelVal = channel ? Number(channel) : 1;
          document.getElementById('jrp').value = `${jrp}-${channelVal}`;
        }
        if (dev && jrp) compute(); else { liveValidate(); renderHistory(); }
      } catch { /* ignore */ }
    })();
    
    // History utilities
    function readHistory() {
      try {
        const raw = localStorage.getItem('t1_mapper_history');
        return raw ? JSON.parse(raw) : [];
      } catch { return []; }
    }
    function writeHistory(list) {
      try { localStorage.setItem('t1_mapper_history', JSON.stringify(list)); } catch {}
    }
    function addToHistory(entry) {
      const list = readHistory();
      const key = (e) => `${e.dev}|${e.j}|${e.channel}`;
      const filtered = list.filter(e => key(e) !== key(entry));
      filtered.unshift(entry);
      writeHistory(filtered.slice(0,5));
    }
    function renderHistory() {
      const list = readHistory();
      const wrap = document.getElementById('historyList');
      if (!wrap) return;
      if (!list.length) { wrap.innerHTML = '<div class="muted">No recent lookups yet.</div>'; return; }
      wrap.innerHTML = '';
      list.forEach((e) => {
        const item = document.createElement('div');
        item.className = 'histItem';
        const left = document.createElement('div');
        left.innerHTML = `<div class="main">${e.dev}</div><div class="meta">JRP ${e.j}-${e.channel} · MMC ${e.MMC} · T2 RU ${e.t2.RU}, JRP ${e.t2.JRP}, CH ${e.t2.CH}</div>`;
        const right = document.createElement('div');
        right.className = 'histActions';
        const runBtn = document.createElement('button');
        runBtn.className = 'secondary';
        runBtn.textContent = 'Re-run';
        runBtn.addEventListener('click', () => {
          document.getElementById('dev').value = e.dev;
          document.getElementById('jrp').value = `${e.j}-${e.channel || 1}`;
          compute();
        });
        right.appendChild(runBtn);
        item.appendChild(left);
        item.appendChild(right);
        wrap.appendChild(item);
      });
    }
    
    document.getElementById('clearHistory').addEventListener('click', () => {
      writeHistory([]);
      renderHistory();
    });
    
    // Tooltip for Associated T1 Racks explanation
    (function initT1RacksTooltip(){
      const associatedT1Racks = document.getElementById('associatedT1Racks');
      const tooltipRect = document.getElementById('t1RacksTooltip');
      const tooltipContent = document.querySelector('#associatedT1Racks foreignObject');
      
      if (!associatedT1Racks || !tooltipRect || !tooltipContent) return;
      
      let tooltipVisible = false;
      
      function showTooltip() {
        tooltipVisible = true;
        tooltipRect.setAttribute('opacity', '1');
        tooltipContent.style.opacity = '1';
      }
      
      function hideTooltip() {
        tooltipVisible = false;
        tooltipRect.setAttribute('opacity', '0');
        tooltipContent.style.opacity = '0';
      }
      
      // Show on hover over the title or any part of the associated racks section
      associatedT1Racks.addEventListener('mouseenter', showTooltip);
      associatedT1Racks.addEventListener('mouseleave', hideTooltip);
    })();
    
    // Tab switching for NDF/T2
    (function initTabs(){
      const tabNDF = document.getElementById('tabNDF');
      const tabT2 = document.getElementById('tabT2');
      const paneNDF = document.getElementById('ndfTab');
      const paneT2 = document.getElementById('t2Tab');
      
      function switchTab(target) {
        // Remove active class from all tabs and panes
        [tabNDF, tabT2].forEach(btn => btn.classList.remove('active'));
        [paneNDF, paneT2].forEach(pane => pane.classList.remove('active'));
        
        // Add active class to selected tab and pane
        if (target === 'ndf') {
          tabNDF.classList.add('active');
          paneNDF.classList.add('active');
        } else {
          tabT2.classList.add('active');
          paneT2.classList.add('active');
        }
      }
      
      if (tabNDF) tabNDF.addEventListener('click', () => switchTab('ndf'));
      if (tabT2) tabT2.addEventListener('click', () => switchTab('t2'));
    })();
