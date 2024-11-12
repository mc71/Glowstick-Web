import { useState, useRef } from "preact/hooks";

const LEDPatternDesigner = () => {
  const [dimensions, setDimensions] = useState({
    leftWing: { width: 29, height: 8, x: 0, y: 0 },
    rightWing: { width: 29, height: 8, x: 60, y: 0 },
    leftTail: { width: 9, height: 4, x: 20, y: 10 },
    rightTail: { width: 9, height: 4, x: 40, y: 10 },
  });

  const [patterns, setPatterns] = useState({
    leftWing: Array(8)
      .fill()
      .map(() => Array(29).fill("#0FFF")),
    rightWing: Array(8)
      .fill()
      .map(() => Array(29).fill("#0FFF")),
    leftTail: Array(4)
      .fill()
      .map(() => Array(9).fill("#0FFF")),
    rightTail: Array(4)
      .fill()
      .map(() => Array(9).fill("#0FFF")),
  });

  const [activeColor, setActiveColor] = useState("#FFFFFF");
  const [error, setError] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedSections, setSelectedSections] = useState({
    leftWing: true,
    rightWing: true,
    leftTail: true,
    rightTail: true,
  });
  const canvasRef = useRef(null);

  // Add new state for LED spacing and image spanning
  const [ledSpacing, setLedSpacing] = useState({
    pixelSize: 10, // pixels per LED
    wingGap: 2, // gap between wings in LED units
    tailGap: 2, // gap between tails in LED units
    wingTailGap: 1, // vertical gap between wings and tails in LED units
  });

  const [imageSpanning, setImageSpanning] = useState({
    spanWings: true, // span image across both wings
    spanTails: true, // span image across both tails
    preserveAspectRatio: true,
  });

  const updateDimensions = (section, property, value) => {
    const numValue = parseInt(value);
    if (isNaN(numValue)) return;

    if (
      ["width", "height"].includes(property) &&
      (numValue < 1 || numValue > 100)
    ) {
      setError("Dimensions must be between 1 and 100");
      return;
    }
    setError("");

    setDimensions((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [property]: numValue,
      },
    }));

    if (["width", "height"].includes(property)) {
      setPatterns((prev) => {
        const newPattern = Array(
          property === "height" ? numValue : prev[section].length
        )
          .fill()
          .map(() =>
            Array(
              property === "width" ? numValue : prev[section][0].length
            ).fill("#0FFF")
          );

        for (
          let i = 0;
          i < Math.min(newPattern.length, prev[section].length);
          i++
        ) {
          for (
            let j = 0;
            j < Math.min(newPattern[0].length, prev[section][0].length);
            j++
          ) {
            newPattern[i][j] = prev[section][i][j];
          }
        }

        return {
          ...prev,
          [section]: newPattern,
        };
      });
    }
  };

  const handleColorCell = (section, row, col) => {
    setPatterns((prev) => ({
      ...prev,
      [section]: prev[section].map((r, i) =>
        i === row
          ? r.map((j, index) =>
              index === col ? activeColor.replace("#", "0x") : j
            )
          : r
      ),
    }));
  };

  const rgbToHex = (r, g, b) => {
    const componentToHex = (c) => {
      const hex = Math.round(c).toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    };
    return `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`;
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setImagePreview(img.src);
        processImage(img);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Add function to calculate physical layout
  const calculatePhysicalLayout = () => {
    const { pixelSize, wingGap, tailGap, wingTailGap } = ledSpacing;
    const totalWidth = (dimensions.leftWing.width * 2 + wingGap) * pixelSize;
    const totalHeight = (dimensions.leftWing.height + wingTailGap + dimensions.leftTail.height) * pixelSize;

    return {
      leftWing: {
        x: 0,
        y: 0,
        width: dimensions.leftWing.width * pixelSize,
        height: dimensions.leftWing.height * pixelSize,
      },
      rightWing: {
        x: (dimensions.leftWing.width + wingGap) * pixelSize,
        y: 0,
        width: dimensions.rightWing.width * pixelSize,
        height: dimensions.rightWing.height * pixelSize,
      },
      leftTail: {
        x: dimensions.leftWing.width * pixelSize / 2,
        y: (dimensions.leftWing.height + wingTailGap) * pixelSize,
        width: dimensions.leftTail.width * pixelSize,
        height: dimensions.leftTail.height * pixelSize,
      },
      rightTail: {
        x: (dimensions.leftWing.width + wingGap) * pixelSize / 2,
        y: (dimensions.leftWing.height + wingTailGap) * pixelSize,
        width: dimensions.rightTail.width * pixelSize,
        height: dimensions.rightTail.height * pixelSize,
      },
    };
  };

  // Modify the processImage function
  const processImage = (img) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const layout = calculatePhysicalLayout();

    // Calculate canvas dimensions based on physical layout
    canvas.width = (dimensions.leftWing.width * 2 + ledSpacing.wingGap) * ledSpacing.pixelSize;
    canvas.height = (dimensions.leftWing.height + ledSpacing.wingTailGap + dimensions.leftTail.height) * ledSpacing.pixelSize;

    // Clear canvas
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw image according to spanning settings
    if (imageSpanning.preserveAspectRatio) {
      const scale = Math.min(
        canvas.width / img.width,
        canvas.height / img.height
      );
      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;
      const x = (canvas.width - scaledWidth) / 2;
      const y = (canvas.height - scaledHeight) / 2;
      ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
    } else {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }

    // Update patterns based on physical layout
    Object.entries(layout).forEach(([section, coords]) => {
      if (!selectedSections[section]) return;

      const newPattern = Array(dimensions[section].height)
        .fill()
        .map((_, row) =>
          Array(dimensions[section].width)
            .fill()
            .map((_, col) => {
              const x = Math.floor(coords.x + (col * ledSpacing.pixelSize));
              const y = Math.floor(coords.y + (row * ledSpacing.pixelSize));
              const pixelData = ctx.getImageData(x, y, ledSpacing.pixelSize, ledSpacing.pixelSize).data;
              
              // Average color over pixel area
              let r = 0, g = 0, b = 0;
              for (let i = 0; i < ledSpacing.pixelSize; i++) {
                for (let j = 0; j < ledSpacing.pixelSize; j++) {
                  const idx = ((y + j) * canvas.width + (x + i)) * 4;
                  r += pixelData[idx];
                  g += pixelData[idx + 1];
                  b += pixelData[idx + 2];
                }
              }
              const area = ledSpacing.pixelSize * ledSpacing.pixelSize;
              const hex = rgbToHex(r/area, g/area, b/area);
              return hex.replace("#", "0x");
            })
        );

      setPatterns(prev => ({
        ...prev,
        [section]: newPattern
      }));
    });
  };

  const generateCode = () => {
    const sections = ["leftWing", "rightWing", "leftTail", "rightTail"];
    let code = "#include <avr/pgmspace.h>\n#define PCOUNT 1\n\n";

    sections.forEach((section) => {
      const pattern = patterns[section];
      const totalSize = pattern.length * pattern[0].length;

      code += `const unsigned short\n    ${section}1[${totalSize}] PROGMEM =\n        {\n`;
      pattern.forEach((row, rowIndex) => {
        code += "         ";
        code += row.join(", ");
        code += ",\n";
      });
      code += "};\n\n";
    });

    code += "const unsigned short *leftTailBitmaps[] = {lefttail1};\n";
    code += "const unsigned short *rightTailBitmaps[] = {righttail1};\n";
    code += "const unsigned short *leftWingBitmaps[] = {leftwing1};\n";
    code += "const unsigned short *rightWingBitmaps[] = {rightwing1};\n";

    return code;
  };

  const downloadFile = () => {
    try {
      const code = generateCode();
      const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
      const element = document.createElement("a");
      element.href = window.URL.createObjectURL(blob);
      element.download = "patterns.h";
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      window.URL.revokeObjectURL(element.href);
    } catch (error) {
      console.error("Download failed:", error);
      setError("Failed to download file. Please try again.");
    }
  };

  const renderSection = (section, title) => (
    <div className="border border-gray-200 p-4 rounded-lg">
      <h3 className="font-bold mb-2">{title}</h3>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <label className="block text-sm font-medium mb-1">Width</label>
          <input
            type="number"
            value={dimensions[section].width}
            onChange={(e) => updateDimensions(section, "width", e.target.value)}
            min="1"
            max="100"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Height</label>
          <input
            type="number"
            value={dimensions[section].height}
            onChange={(e) =>
              updateDimensions(section, "height", e.target.value)
            }
            min="1"
            max="100"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">X Position</label>
          <input
            type="number"
            value={dimensions[section].x}
            onChange={(e) => updateDimensions(section, "x", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Y Position</label>
          <input
            type="number"
            value={dimensions[section].y}
            onChange={(e) => updateDimensions(section, "y", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
      </div>
      <div
        className="grid gap-1"
        style={{
          gridTemplateColumns: `repeat(${dimensions[section].width}, 1.1em)`,
        }}
      >
        {patterns[section].map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className="w-5 h-5 border border-gray-300 cursor-pointer"
              style={{
                backgroundColor: cell.replace("0x", "#"),
              }}
              onClick={() => handleColorCell(section, rowIndex, colIndex)}
            />
          ))
        )}
      </div>
    </div>
  );

  // Add spacing controls to the UI
  const renderSpacingControls = () => (
    <div className="mb-6 grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium mb-1">LED Pixel Size (px)</label>
        <input
          type="number"
          value={ledSpacing.pixelSize}
          onChange={(e) => setLedSpacing(prev => ({...prev, pixelSize: parseInt(e.target.value)}))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>
      {/* Add similar controls for wingGap, tailGap, and wingTailGap */}
    </div>
  );

  // Add spanning controls to the UI
  const renderSpanningControls = () => (
    <div className="mb-6">
      <h3 className="font-bold mb-2">Image Spanning Options</h3>
      <div className="space-y-2">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={imageSpanning.spanWings}
            onChange={(e) => setImageSpanning(prev => ({...prev, spanWings: e.target.checked}))}
          />
          <span>Span across wings</span>
        </label>
      </div>
    </div>
  );

  return (
    <div className="p-4 max-w-12xl mx-auto font-sans">
      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-6">
          <h2 className="text-3xl font-bold mb-6 text-gray-800">Glowstick LED Pattern Designer</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 text-gray-700">
              Paint Color
            </label>
            <input
              type="color"
              value={activeColor}
              onChange={(e) => setActiveColor(e.target.value)}
              className="w-full h-12 rounded-md shadow-sm"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 text-gray-700">
              Image Upload
            </label>
            <div className="flex gap-4 items-center">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100"
              />
              {imagePreview && (
                <div className="border p-2 rounded-md">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="h-20 object-contain"
                  />
                </div>
              )}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              {Object.entries(selectedSections).map(([section, checked]) => (
                <div key={section} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={section}
                    checked={checked}
                    onChange={(e) =>
                      setSelectedSections((prev) => ({
                        ...prev,
                        [section]: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor={section} className="text-sm text-gray-700">
                    {section}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <canvas ref={canvasRef} className="hidden" />

          {renderSpacingControls()}
          {renderSpanningControls()}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {renderSection("leftWing", "Left Wing")}
            {renderSection("rightWing", "Right Wing")}
            {renderSection("leftTail", "Left Tail")}
            {renderSection("rightTail", "Right Tail")}
          </div>

          <button
            onClick={downloadFile}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-md transition duration-150 ease-in-out mb-6"
          >
            Download patterns.h
          </button>

          <div className="mt-6">
            <label className="block text-sm font-medium mb-2 text-gray-700">
              Preview of patterns.h:
            </label>
            <pre className="mt-2 p-4 bg-gray-100 rounded-md overflow-x-auto text-sm">
              {generateCode()}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LEDPatternDesigner;
