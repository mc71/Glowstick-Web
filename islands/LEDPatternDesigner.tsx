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

  const processImage = (img) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    Object.entries(dimensions).forEach(([section, dims]) => {
      if (selectedSections[section]) {
        minX = Math.min(minX, dims.x);
        minY = Math.min(minY, dims.y);
        maxX = Math.max(maxX, dims.x + dims.width);
        maxY = Math.max(maxY, dims.y + dims.height);
      }
    });

    canvas.width = maxX - minX;
    canvas.height = maxY - minY;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    Object.entries(dimensions).forEach(([section, dims]) => {
      if (!selectedSections[section]) return;

      const newPattern = Array(dims.height)
        .fill()
        .map((_, row) =>
          Array(dims.width)
            .fill()
            .map((_, col) => {
              const x = dims.x - minX + col;
              const y = dims.y - minY + row;

              if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) {
                return "#0FFF";
              }

              const pixelData = ctx.getImageData(x, y, 1, 1).data;
              const hex = rgbToHex(pixelData[0], pixelData[1], pixelData[2]);
              return hex.replace("#", "0x");
            })
        );

      setPatterns((prev) => ({
        ...prev,
        [section]: newPattern,
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
