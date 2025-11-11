# T1 to Mini-Rack Mapper

A web-based tool for mapping T1 device names to Mini-Rack MMC (Multi-Module Connector) values, NDF (Network Distribution Frame) Rack Units, and T2 uplink details.

## Features

- **T1 to Mini-Rack Mapping**: Enter a T1 device name and JRP/Port-Channel to get Mini-Rack MMC and spares
- **NDF Mapping**: Supports 13 different Rack Units (RU45, RU44, RU43, RU41, RU39, RU37, RU28, RU26, RU24, RU22, RU20, RU18, RU16)
- **T2 Uplink Details**: Automatically calculates T2 device information
- **Interactive Flow Diagram**: Visual representation of data flow from T1 → Mini-Rack → NDF → T2
- **Dark/Light Mode**: Toggle between dark and light themes
- **Reverse Lookup**: Find T1 devices from MMC values
- **4-Channel Port Connections**: View all 4 channels for a given T1 rack

## Supported Rack Units

### Standard Rack Units (R1-R24):
- **RU45:** R1-R8 (T2 JRP 1-2)
- **RU44:** R9-R16 (T2 JRP 3-4)
- **RU43:** R17-R24 (T2 JRP 5-6)

### Higher Rack Units:
- **RU41:** R25-R29, R41-R42 (7 racks)
- **RU39:** R30-R35, R51, R101 (7 racks)
- **RU37:** R36-R40 (5 racks)
- **RU28:** R62, R64, R68, R69 (4 racks)
- **RU26:** R63, R65-R67, R70, R74, R76, R79 (7 racks)
- **RU24:** R71-R73, R75, R77-R78, R81-R82 (8 racks)
- **RU22:** R80, R83, R88-R89, R93, R97-R98, R114 (8 racks)
- **RU20:** R84-R85, R87, R90, R94, R99-R100, R107 (7 racks)
- **RU18:** R86, R91-R92, R95-R96, R102, R106, R112 (6 racks)
- **RU16:** R111 (1 rack)

## Usage

1. Open `index.html` in a web browser (all CSS and JavaScript files are linked automatically)
2. Enter a T1 device name (e.g., `sbn100-104-es-m1-p5-t1-r89`)
3. Enter JRP/Port-Channel (e.g., `30-1` or just `30` for channel 1)
4. Click "Calculate" to see results

**Note:** All files (`index.html`, `styles.css`, and `script.js`) must be in the same directory for the application to work correctly.

## File Structure

- `index.html` - Main HTML structure and markup
- `styles.css` - All CSS styles and theme definitions
- `script.js` - All JavaScript functionality and logic
- `RACK_UNIT_MAPPINGS.md` - Complete documentation of all rack unit mappings
- `README.md` - This file

## Technologies

- Pure HTML, CSS, and JavaScript (no dependencies)
- SVG for flow diagrams
- Glass morphism UI design
- Responsive layout
- Modular file structure for better maintainability

## License

[Add your license here]

